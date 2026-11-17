import { sumCents } from '../../src/domain/money.ts'
import type { Cents, HoldingId, Month, Snapshot } from '../../src/domain/types.ts'
import { cashBalanceSheetName, type LegacyAmount, type LegacySnapshotRow } from './cashBalanceSheet.ts'
import type { MonthEndChoice } from './monthEndChoice.ts'
import { cashFlowRef } from './sourceRef.ts'

export interface AssignedValue {
  holding: HoldingId | null
  value: Cents
  note: string | null
}

// Turns one legacy amount cell into the rows it imports as. Splitting inline sums into holdings by the owner's labels is a
// different assigner; everything else stays the same.
export type AssignParts = (amount: LegacyAmount) => AssignedValue[]

export const keepAtPotLevel: AssignParts = amount => [
  {
    holding: null,
    value: sumCents(amount.parts.map(part => part.cents)),
    note: amount.form === 'inline-sum' ? `inline sum of ${amount.parts.length} parts` : null,
  },
]

export function buildSnapshots(choices: readonly MonthEndChoice<LegacySnapshotRow>[], assignParts: AssignParts): Snapshot[] {
  return choices.flatMap(choice => (choice.chosen === null ? [] : rowSnapshots(choice.month, choice.chosen.item, assignParts)))
}

function rowSnapshots(month: Month, row: LegacySnapshotRow, assignParts: AssignParts): Snapshot[] {
  return row.amounts.flatMap(amount =>
    assignParts(amount).map((assigned): Snapshot => ({
      month,
      pot: amount.pot,
      holding: assigned.holding,
      value: assigned.value,
      asOf: row.date,
      source: 'import',
      sourceRef: cashFlowRef(cashBalanceSheetName, [amount.address]),
      note: assigned.note,
      ref: null,
    }))
  )
}
