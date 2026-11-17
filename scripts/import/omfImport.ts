import { sumCents } from '../../src/domain/money.ts'
import { monthOfDate } from '../../src/domain/month.ts'
import type { Contribution, PotId, Snapshot } from '../../src/domain/types.ts'
import type { OmfRow, OmfSheet } from './omfSheet.ts'
import { cashFlowRef } from './sourceRef.ts'

// Each payment is an external contribution in the calendar month of its date; the first row is the balance transferred in.
// Payments of one month share a key, so they become one row with their sum, as bills do.
export function omfContributions(omf: OmfSheet, pot: PotId): Contribution[] {
  const rowsByMonthAndKind = new Map<string, { kind: Contribution['kind']; rows: OmfRow[] }>()

  omf.rows.forEach((row, index) => {
    const kind = index === 0 ? 'opening' : 'contribution'
    const key = `${monthOfDate(row.date)}|${kind}`
    const group = rowsByMonthAndKind.get(key) ?? { kind, rows: [] }
    group.rows.push(row)
    rowsByMonthAndKind.set(key, group)
  })

  return [...rowsByMonthAndKind.values()].map(({ kind, rows }): Contribution => ({
    month: monthOfDate(rows[0].date),
    pot,
    holding: null,
    amount: sumCents(rows.map(row => row.payment.cents)),
    kind,
    funding: 'external',
    date: rows.length === 1 ? rows[0].date : null,
    source: 'import',
    sourceRef: cashFlowRef(omf.sheet.name, rows.map(row => row.payment.address)),
    note: rows.length === 1 ? null : `${rows.length} payments: ${rows.map(row => row.date).join(', ')}`,
    ref: null,
  }))
}

// The balances typed on some rows. They keep the calendar month of their date, like the payments beside them, because the
// legacy return on that row compares the balance with the payments up to and including that row.
export function omfBalanceSnapshots(omf: OmfSheet, pot: PotId): Snapshot[] {
  return omf.rows.flatMap(row => {
    if (row.balance === null)
      return []

    const snapshot: Snapshot = {
      month: monthOfDate(row.date),
      pot,
      holding: null,
      value: row.balance.cents,
      asOf: row.date,
      source: 'import',
      sourceRef: cashFlowRef(omf.sheet.name, [row.balance.address]),
      note: row.balance.formula === null ? null : `legacy formula =${row.balance.formula}`,
      ref: null,
    }

    return [snapshot]
  })
}
