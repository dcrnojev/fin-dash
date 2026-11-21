import type { IsoDate, Month, MonthEndBalance, MonthRecord } from '../domain/types.ts'
import type { EnteredField } from './closeEntries.ts'

export interface CloseRows {
  // Only for fields the sheet has no row for yet.
  monthEndBalances: MonthEndBalance[]
  // Fields the sheet already had a row for, kept as they are.
  keptCount: number
  // Appended after the month-end balances: a month is closed only once all its rows are in.
  monthRecord: MonthRecord
}

export function closeRows(month: Month, fields: readonly EnteredField[], closedOn: IsoDate, closedBy: string): CloseRows {
  const toWrite = fields.filter(({ field }) => field.alreadyWritten === null)
  const monthEndBalances = toWrite.map(entered => monthEndBalanceRow(month, entered, closedOn))
  const monthRecord: MonthRecord = { month, status: 'closed', closedOn, closedBy, frozenPlan: null, note: null }

  return { monthEndBalances, keptCount: fields.length - toWrite.length, monthRecord }
}

// Cash and investment values are as of the write; a pension value is as of its statement.
export function monthEndBalanceRow(month: Month, { field, entered }: EnteredField, writtenOn: IsoDate): MonthEndBalance {
  return {
    month,
    group: field.group.id,
    balance: field.balance?.id ?? null,
    value: entered.value,
    asOf: field.group.kind === 'pension' ? entered.asOf : writtenOn,
    source: 'app',
    sourceRef: null,
    note: null,
    ref: null,
  }
}
