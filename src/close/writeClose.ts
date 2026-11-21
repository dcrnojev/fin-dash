import { dataStore, type CellValue } from '../data'
import { decodeTab } from '../domain/schema/decodeTab'
import { monthEndBalancesTab } from '../domain/schema/monthEndBalancesTab'
import { monthsTab } from '../domain/schema/monthsTab'
import { rowsByKey } from '../domain/schema/rowsByKey'
import { rowsForHeader } from '../domain/schema/rowsForHeader'
import type { Month, MonthEndBalance, MonthRecord } from '../domain/types'
import { countOf, displayMonth } from '../format'
import type { CloseRows } from './closeRows'
import { messageOf } from './messageOf'
import { monthRowsChanged, monthRowsChangedMessage } from './monthRowsChanged'

export interface WrittenClose {
  monthEndBalanceRowsWritten: number
  // Rows the sheet already had for the month when the form opened, shown read-only and left as they were.
  monthEndBalanceRowsKept: number
}

type TabValues = Record<string, CellValue[][]>

const nothingWritten = 'Nothing was written.'
const finishLater = 'Read the sheet again, then close again to finish; the rows already written are kept.'

// Reads `months` and `month_end_balances` again right before each append, and stops when the month got a months row or its
// month-end balance rows changed since the form opened. The month-end balance rows go first and the months row last, so a close that fails
// midway leaves the month open, and closing again after reading the sheet finishes it. Every error says what was written.
export async function writeClose(spreadsheetId: string, rows: CloseRows, openedWith: readonly MonthEndBalance[]): Promise<WrittenClose> {
  const { month } = rows.monthRecord
  const written = { monthEndBalanceRowsWritten: rows.monthEndBalances.length, monthEndBalanceRowsKept: rows.keptCount }
  const beforeMonthEndBalances = await readTabs(spreadsheetId, failure => `Reading the sheet again failed: ${failure} ${nothingWritten}`)
  const problem = closeProblem(beforeMonthEndBalances, month, openedWith)

  if (problem !== null)
    throw new Error(`${problem} ${nothingWritten}`)

  let monthEndBalanceCells: CellValue[][]

  try {
    monthEndBalanceCells = rowsForHeader(monthEndBalancesTab, beforeMonthEndBalances[monthEndBalancesTab.name]?.[0] ?? [], rows.monthEndBalances)
    // Only checks, before anything is written, that the months tab can take the row.
    monthCells(beforeMonthEndBalances, rows.monthRecord)
  } catch (error) {
    throw new Error(`${messageOf(error)} ${nothingWritten}`)
  }

  if (rows.monthEndBalances.length === 0) {
    await appendMonthRow(spreadsheetId, beforeMonthEndBalances, rows.monthRecord, failure => `${failure} ${nothingWritten}`)
    return written
  }

  const rowCount = countOf(rows.monthEndBalances.length, 'month-end balance row')

  try {
    await dataStore.appendRows(spreadsheetId, monthEndBalancesTab.name, monthEndBalanceCells)
  } catch (error) {
    const failed = `Writing ${rowCount} failed: ${messageOf(error)}`
    throw new Error(`${failed} ${displayMonth(month)} is not closed.`)
  }

  const wrote = `${rowCount} for ${displayMonth(month)} went into the sheet, but the month is not closed.`
  const afterWrote = (failure: string) => `${wrote} ${failure} ${finishLater}`
  const beforeMonthRow = await readTabs(spreadsheetId, failure => afterWrote(`Reading the sheet again failed: ${failure}`))
  const laterProblem = closeProblem(beforeMonthRow, month, [...openedWith, ...rows.monthEndBalances])

  if (laterProblem !== null)
    throw new Error(afterWrote(laterProblem))

  await appendMonthRow(spreadsheetId, beforeMonthRow, rows.monthRecord, afterWrote)
  return written
}

async function readTabs(spreadsheetId: string, failureMessage: (failure: string) => string): Promise<TabValues> {
  try {
    return (await dataStore.readTabs(spreadsheetId, [monthsTab.name, monthEndBalancesTab.name])).values
  } catch (error) {
    throw new Error(failureMessage(messageOf(error)))
  }
}

async function appendMonthRow(
  spreadsheetId: string,
  values: TabValues,
  record: MonthRecord,
  failureMessage: (failure: string) => string
): Promise<void> {
  try {
    await dataStore.appendRows(spreadsheetId, monthsTab.name, monthCells(values, record))
  } catch (error) {
    throw new Error(failureMessage(`Marking the month closed failed: ${messageOf(error)}`))
  }
}

function monthCells(values: TabValues, record: MonthRecord): CellValue[][] {
  return rowsForHeader(monthsTab, values[monthsTab.name]?.[0] ?? [], [record])
}

// Why the month cannot be closed now, or null. Problems in these tabs already show in Data health; here only the
// readable rows matter.
function closeProblem(values: TabValues, month: Month, expectedMonthEndBalances: readonly MonthEndBalance[]): string | null {
  const monthName = displayMonth(month)
  const existingRecord = decodeTab(monthsTab, values[monthsTab.name] ?? [], []).find(record => record.month === month)

  if (existingRecord?.status === 'closed') {
    const closedBy = existingRecord.closedBy === null ? '' : ` by ${existingRecord.closedBy}`
    return `${monthName} is already closed${closedBy}; two people should not close a month at once.`
  }

  if (existingRecord !== undefined) {
    const problem = `The months tab already has a row for ${monthName} with status ${existingRecord.status}.`
    return `${problem} The app cannot change that row: delete it in the months tab, then close again.`
  }

  const changedRows = monthRowsChanged(month, expectedMonthEndBalances, rowsByKey(monthEndBalancesTab, values[monthEndBalancesTab.name] ?? []))

  return changedRows.length === 0 ? null : `${monthRowsChangedMessage(month, changedRows)} Read the sheet again to see them.`
}
