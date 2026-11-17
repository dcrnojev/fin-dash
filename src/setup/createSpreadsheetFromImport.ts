import { dataStore, type SpreadsheetRef } from '../data'
import type { CellValue } from '../domain/schema/tabSpec'
import { tabNames, type TabName } from '../domain/types'
import { tabLayouts } from './tabLayouts'

export const newSpreadsheetTitle = 'fin-dash'

export type SetupStep = 'creating' | 'writing-tabs' | 'writing-meta' | 'formatting'

export interface CreatedSpreadsheet {
  spreadsheet: SpreadsheetRef
  // Formatting comes after `_meta`, so a failure there leaves a complete spreadsheet that only looks plainer.
  formattingProblem: string | null
}

// A failure before `_meta` was written. `spreadsheet` is the half-built one, or null when none was created.
export class SetupError extends Error {
  readonly spreadsheet: SpreadsheetRef | null

  constructor(message: string, spreadsheet: SpreadsheetRef | null) {
    super(message)
    this.name = 'SetupError'
    this.spreadsheet = spreadsheet
  }
}

// `_meta` is written last: a spreadsheet without a schema_version is one whose setup did not finish.
export async function createSpreadsheetFromImport(
  tabs: Record<TabName, CellValue[][]>,
  onStep: (step: SetupStep) => void
): Promise<CreatedSpreadsheet> {
  let spreadsheet: SpreadsheetRef | null = null

  try {
    onStep('creating')
    spreadsheet = await dataStore.createSpreadsheet(newSpreadsheetTitle, tabNames)

    onStep('writing-tabs')
    const dataTabs = tabNames.filter(tab => tab !== '_meta').map(tab => ({ tab, rows: tabs[tab] }))
    await dataStore.writeTabs(spreadsheet.id, dataTabs)

    onStep('writing-meta')
    await dataStore.writeTabs(spreadsheet.id, [{ tab: '_meta', rows: tabs._meta }])
  } catch (error) {
    throw new SetupError(error instanceof Error ? error.message : String(error), spreadsheet)
  }

  try {
    onStep('formatting')
    await dataStore.formatTabs(spreadsheet.id, tabLayouts())
    return { spreadsheet, formattingProblem: null }
  } catch (error) {
    return { spreadsheet, formattingProblem: error instanceof Error ? error.message : String(error) }
  }
}
