import { sumCents } from '../../src/domain/money.ts'
import { monthOfDate } from '../../src/domain/month.ts'
import type { Contribution, GroupId, MonthEndBalance } from '../../src/domain/types.ts'
import type { OmfRow, OmfSheet } from './omfSheet.ts'
import { cashFlowRef } from './sourceRef.ts'

// Each payment is an external contribution in the calendar month of its date; the first row is the balance transferred in.
// Payments of one month share a key, so they become one row with their sum, as bills do.
export function omfContributions(omf: OmfSheet, group: GroupId): Contribution[] {
  const rowsByMonthAndKind = new Map<string, { kind: Contribution['kind']; rows: OmfRow[] }>()

  omf.rows.forEach((row, index) => {
    const kind = index === 0 ? 'opening' : 'contribution'
    const key = `${monthOfDate(row.date)}|${kind}`
    const monthRows = rowsByMonthAndKind.get(key) ?? { kind, rows: [] }
    monthRows.rows.push(row)
    rowsByMonthAndKind.set(key, monthRows)
  })

  return [...rowsByMonthAndKind.values()].map(({ kind, rows }): Contribution => ({
    month: monthOfDate(rows[0].date),
    group,
    balance: null,
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
export function omfMonthEndBalances(omf: OmfSheet, group: GroupId): MonthEndBalance[] {
  return omf.rows.flatMap(row => {
    if (row.balance === null)
      return []

    const monthEndBalance: MonthEndBalance = {
      month: monthOfDate(row.date),
      group,
      balance: null,
      value: row.balance.cents,
      asOf: row.date,
      source: 'import',
      sourceRef: cashFlowRef(omf.sheet.name, [row.balance.address]),
      note: row.balance.formula === null ? null : `legacy formula =${row.balance.formula}`,
      ref: null,
    }

    return [monthEndBalance]
  })
}
