import {
  DataError,
  type CellUpdate,
  type CellValue,
  type SpreadsheetRef,
  type SpreadsheetTabs,
  type TabLayout,
  type TabRows,
} from '../types'
import { a1Cell } from './a1Cell'
import type { GoogleSession } from './googleSession'
import { tabFormatRequests } from './tabFormatRequests'

const sheetsBaseUrl = 'https://sheets.googleapis.com/v4/spreadsheets'

interface SpreadsheetResponse {
  spreadsheetId: string
  properties: { title: string }
  sheets?: { properties: { sheetId: number; title: string } }[]
}

interface BatchGetResponse {
  valueRanges?: { values?: CellValue[][] }[]
}

interface GoogleErrorBody {
  error?: { code?: number; message?: string; status?: string }
}

interface SheetList {
  spreadsheet: SpreadsheetRef
  sheetIdsByTitle: Map<string, number>
}

class ApiError extends DataError {
  readonly status: number

  constructor(status: number, message: string) {
    super('failed', message)
    this.status = status
  }
}

// Thin wrapper over the Sheets REST API with fetch, so the app needs no Google client library for data calls.
export class SheetsApi {
  private readonly session: GoogleSession

  constructor(session: GoogleSession) {
    this.session = session
  }

  async appendRows(spreadsheetId: string, tab: string, rows: readonly CellValue[][]): Promise<void> {
    const range = encodeURIComponent(`${quoteTabName(tab)}!A1`)
    const query = new URLSearchParams({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })

    await this.send(`${this.spreadsheetUrl(spreadsheetId)}/values/${range}:append?${query}`, {
      method: 'POST',
      body: JSON.stringify({ majorDimension: 'ROWS', values: rows }),
    })
  }

  async createSpreadsheet(title: string, tabNames: readonly string[]): Promise<SpreadsheetRef> {
    // Listing the sheets replaces the default "Sheet1", so the new spreadsheet has exactly these tabs.
    const created = await this.send<SpreadsheetResponse>(`${sheetsBaseUrl}?fields=spreadsheetId,properties.title`, {
      method: 'POST',
      body: JSON.stringify({ properties: { title }, sheets: tabNames.map(tabName => ({ properties: { title: tabName } })) }),
    })

    return { id: created.spreadsheetId, name: created.properties.title }
  }

  async formatTabs(spreadsheetId: string, layouts: readonly TabLayout[]): Promise<void> {
    const { sheetIdsByTitle } = await this.listSheets(spreadsheetId)

    const requests = layouts.flatMap(layout => {
      const sheetId = sheetIdsByTitle.get(layout.tab)

      if (sheetId === undefined)
        throw new DataError('failed', `The spreadsheet has no tab named ${layout.tab} to format.`)

      return tabFormatRequests(sheetId, layout)
    })

    await this.send(`${this.spreadsheetUrl(spreadsheetId)}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests }) })
  }

  async getSpreadsheet(spreadsheetId: string): Promise<SpreadsheetRef> {
    return (await this.listSheets(spreadsheetId)).spreadsheet
  }

  async readTabs(spreadsheetId: string, tabNames: readonly string[]): Promise<SpreadsheetTabs> {
    // batchGet fails as a whole when one range names a missing tab, so only existing tabs are requested.
    const { spreadsheet, sheetIdsByTitle } = await this.listSheets(spreadsheetId)
    const existingTabs = tabNames.filter(tabName => sheetIdsByTitle.has(tabName))
    const values: Record<string, CellValue[][]> = {}
    const tabLinks: Record<string, string> = {}

    for (const tabName of existingTabs)
      tabLinks[tabName] = `${spreadsheetEditUrl(spreadsheetId)}#gid=${sheetIdsByTitle.get(tabName)}`

    if (existingTabs.length === 0)
      return { spreadsheet, values, tabLinks }

    // Unformatted values keep numbers as numbers whatever the sheet's locale (no '1.234,56' strings), and dates
    // arrive as serial numbers.
    const query = new URLSearchParams({
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })

    for (const tabName of existingTabs)
      query.append('ranges', quoteTabName(tabName))

    const response = await this.send<BatchGetResponse>(`${this.spreadsheetUrl(spreadsheetId)}/values:batchGet?${query}`)

    existingTabs.forEach((tabName, index) => {
      values[tabName] = response.valueRanges?.[index]?.values ?? []
    })

    return { spreadsheet, values, tabLinks }
  }

  async updateCells(spreadsheetId: string, updates: readonly CellUpdate[]): Promise<void> {
    const data = updates.map(update => ({
      range: `${quoteTabName(update.tab)}!${a1Cell(update.row, update.column)}`,
      majorDimension: 'ROWS',
      values: [[update.value]],
    }))

    await this.send(`${this.spreadsheetUrl(spreadsheetId)}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    })
  }

  async writeTabs(spreadsheetId: string, tabs: readonly TabRows[]): Promise<void> {
    const data = tabs.map(tab => ({ range: `${quoteTabName(tab.tab)}!A1`, majorDimension: 'ROWS', values: tab.rows }))

    await this.send(`${this.spreadsheetUrl(spreadsheetId)}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    })
  }

  private async fetchWithToken(url: string, init: RequestInit, accessToken: string): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      throw new DataError('failed', `Could not reach Google Sheets: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async listSheets(spreadsheetId: string): Promise<SheetList> {
    const fields = encodeURIComponent('spreadsheetId,properties.title,sheets.properties(sheetId,title)')

    try {
      const response = await this.send<SpreadsheetResponse>(`${this.spreadsheetUrl(spreadsheetId)}?fields=${fields}`)

      return {
        spreadsheet: { id: response.spreadsheetId, name: response.properties.title },
        sheetIdsByTitle: new Map((response.sheets ?? []).map(sheet => [sheet.properties.title, sheet.properties.sheetId])),
      }
    } catch (error) {
      // With the drive.file scope a spreadsheet the user has never chosen in the picker answers 403 or 404,
      // even when the user can open it in Google Sheets.
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        const hint = 'This app can only open spreadsheets it created or that were chosen with "Choose spreadsheet".'
        throw new DataError('failed', `${error.message} ${hint}`)
      }

      throw error
    }
  }

  private async send<T>(url: string, init: RequestInit = {}): Promise<T> {
    let response = await this.fetchWithToken(url, init, await this.session.accessToken())

    if (response.status === 401) {
      this.session.forgetToken()
      response = await this.fetchWithToken(url, init, await this.session.accessToken())
    }

    if (!response.ok)
      throw new ApiError(response.status, await readErrorMessage(response))

    return response.json() as Promise<T>
  }

  private spreadsheetUrl(spreadsheetId: string): string {
    return `${sheetsBaseUrl}/${encodeURIComponent(spreadsheetId)}`
  }
}

function spreadsheetEditUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`
}

function quoteTabName(tabName: string): string {
  return `'${tabName.replaceAll("'", "''")}'`
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GoogleErrorBody

    const statusLabel = [response.status, body.error?.status].filter(Boolean).join(' ')

    if (body.error?.message)
      return `Google Sheets said (${statusLabel}): ${body.error.message}`
  } catch {
    // Not a JSON error body; fall through to the HTTP status.
  }

  return `Google Sheets answered HTTP ${response.status} ${response.statusText}.`
}
