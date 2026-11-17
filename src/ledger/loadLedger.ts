import { dataStore, type SpreadsheetRef } from '../data'
import { appSchemaVersion } from '../domain/schema/meta'
import { readLedger } from '../domain/schema/readLedger'
import { tabNames, type Ledger } from '../domain/types'

export type SchemaCheck =
  // No `_meta` tab: a spreadsheet the app did not create.
  | { status: 'not-set-up' }
  // `_meta` without schema_version: the app was interrupted while creating the spreadsheet.
  | { status: 'setup-unfinished' }
  // `_meta` is there but unreadable; the data health panel says why.
  | { status: 'invalid-meta' }
  // Written by a newer version of the app, so this one must not change it.
  | { status: 'newer'; version: number }
  | { status: 'ok' }

export interface LoadedLedger {
  spreadsheet: SpreadsheetRef
  ledger: Ledger
  tabLinks: Record<string, string>
  schema: SchemaCheck
}

export async function loadLedger(spreadsheetId: string): Promise<LoadedLedger> {
  const { spreadsheet, values, tabLinks } = await dataStore.readTabs(spreadsheetId, tabNames)
  const ledger = readLedger(values)

  return { spreadsheet, ledger, tabLinks, schema: checkSchema(ledger, '_meta' in values) }
}

function checkSchema(ledger: Ledger, hasMetaTab: boolean): SchemaCheck {
  if (!hasMetaTab)
    return { status: 'not-set-up' }

  if (ledger.meta === null) {
    const setupUnfinished = ledger.issues.some(issue => issue.code === 'missing-schema-version')
    return setupUnfinished ? { status: 'setup-unfinished' } : { status: 'invalid-meta' }
  }

  if (ledger.meta.schemaVersion > appSchemaVersion)
    return { status: 'newer', version: ledger.meta.schemaVersion }

  return { status: 'ok' }
}
