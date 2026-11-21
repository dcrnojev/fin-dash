import { sumCents } from '../../src/domain/money.ts'
import type { BalanceId, Cents, Month, MonthEndBalance } from '../../src/domain/types.ts'
import { cashBalanceSheetName, type LegacyAmount, type LegacyReadingRow } from './cashBalanceSheet.ts'
import type { MonthEndChoice } from './monthEndChoice.ts'
import { cashFlowRef } from './sourceRef.ts'

export interface AssignedValue {
  balance: BalanceId | null
  value: Cents
  note: string | null
}

// Turns one legacy amount cell into the rows it imports as. Splitting inline sums into balances by the owner's labels is a
// different assigner; everything else stays the same.
export type AssignParts = (amount: LegacyAmount) => AssignedValue[]

export const keepAtGroupLevel: AssignParts = amount => [
  {
    balance: null,
    value: sumCents(amount.parts.map(part => part.cents)),
    note: amount.form === 'inline-sum' ? `inline sum of ${amount.parts.length} parts` : null,
  },
]

export function buildMonthEndBalances(choices: readonly MonthEndChoice<LegacyReadingRow>[], assignParts: AssignParts): MonthEndBalance[] {
  return choices.flatMap(choice => (choice.chosen === null ? [] : rowMonthEndBalances(choice.month, choice.chosen.item, assignParts)))
}

function rowMonthEndBalances(month: Month, row: LegacyReadingRow, assignParts: AssignParts): MonthEndBalance[] {
  return row.amounts.flatMap(amount =>
    assignParts(amount).map((assigned): MonthEndBalance => ({
      month,
      group: amount.group,
      balance: assigned.balance,
      value: assigned.value,
      asOf: row.date,
      source: 'import',
      sourceRef: cashFlowRef(cashBalanceSheetName, [amount.address]),
      note: assigned.note,
      ref: null,
    }))
  )
}
