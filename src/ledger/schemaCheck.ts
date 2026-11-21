import { appSchemaVersion } from '../domain/schema/meta.ts'
import { readLedger } from '../domain/schema/readLedger.ts'
import type { Ledger } from '../domain/types.ts'
import { planSchemaUpdate, storedSchemaVersion, type SchemaUpdatePlan, type TabValues } from '../schemaUpdate/schemaUpdatePlan.ts'

export type SchemaCheck =
  // No `_meta` tab: a spreadsheet the app did not create.
  | { status: 'not-set-up' }
  // `_meta` without schema_version: the app was interrupted while creating the spreadsheet.
  | { status: 'setup-unfinished' }
  // `_meta` is there but unreadable; the data health panel says why.
  | { status: 'invalid-meta' }
  // Written by a newer version of the app, so this one must not change it.
  | { status: 'newer'; version: number }
  // Written by an older version of the app: its data is neither read nor written until the spreadsheet is updated.
  | { status: 'older'; version: number; plan: SchemaUpdatePlan }
  | { status: 'ok' }

export interface CheckedSpreadsheet {
  // Null exactly when the schema is older.
  ledger: Ledger | null
  schema: SchemaCheck
}

export function checkSpreadsheet(values: TabValues): CheckedSpreadsheet {
  const version = storedSchemaVersion(values)

  if (version !== null && version < appSchemaVersion)
    return { ledger: null, schema: { status: 'older', version, plan: planSchemaUpdate(values) } }

  const ledger = readLedger(values)

  return { ledger, schema: checkSchema(ledger, '_meta' in values) }
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
