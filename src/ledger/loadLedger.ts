import { dataStore, type SpreadsheetRef } from '../data'
import { tabNames } from '../domain/types'
import { schemaUpdateTabs } from '../schemaUpdate/schemaUpdatePlan'
import { checkSpreadsheet, type CheckedSpreadsheet } from './schemaCheck'

export interface LoadedLedger extends CheckedSpreadsheet {
  spreadsheet: SpreadsheetRef
  tabLinks: Record<string, string>
}

// The tabs of an older schema come in the same request, so an older spreadsheet needs no second read.
export async function loadLedger(spreadsheetId: string): Promise<LoadedLedger> {
  const { spreadsheet, values, tabLinks } = await dataStore.readTabs(spreadsheetId, [...new Set([...tabNames, ...schemaUpdateTabs])])

  return { spreadsheet, tabLinks, ...checkSpreadsheet(values) }
}
