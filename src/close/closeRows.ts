import type { IsoDate, Month, MonthRecord, Snapshot } from '../domain/types.ts'
import type { EnteredField } from './closeEntries.ts'

export interface CloseRows {
  // Only for fields the sheet has no row for yet.
  snapshots: Snapshot[]
  // Fields the sheet already had a row for, kept as they are.
  keptCount: number
  // Appended after the snapshots: a month is closed only once all its rows are in.
  monthRecord: MonthRecord
}

export function closeRows(month: Month, fields: readonly EnteredField[], closedOn: IsoDate, closedBy: string): CloseRows {
  const toWrite = fields.filter(({ field }) => field.alreadyWritten === null)
  const snapshots = toWrite.map(entered => snapshotRow(month, entered, closedOn))
  const monthRecord: MonthRecord = { month, status: 'closed', closedOn, closedBy, frozenPlan: null, note: null }

  return { snapshots, keptCount: fields.length - toWrite.length, monthRecord }
}

// Cash and investment values are as of the write; a pension value is as of its statement.
export function snapshotRow(month: Month, { field, entered }: EnteredField, writtenOn: IsoDate): Snapshot {
  return {
    month,
    pot: field.pot.id,
    holding: field.holding?.id ?? null,
    value: entered.value,
    asOf: field.pot.kind === 'pension' ? entered.asOf : writtenOn,
    source: 'app',
    sourceRef: null,
    note: null,
    ref: null,
  }
}
