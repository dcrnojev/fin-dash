import { sumCents } from '../../../src/domain/money.ts'
import type { Cents, MonthEndBalance } from '../../../src/domain/types.ts'

// The total imported from each legacy cell, keyed by `source_ref`.
export function importedTotalsBySourceRef(monthEndBalances: readonly MonthEndBalance[]): Map<string, Cents> {
  const valuesBySourceRef = new Map<string, Cents[]>()

  for (const monthEndBalance of monthEndBalances) {
    if (monthEndBalance.sourceRef !== null)
      valuesBySourceRef.set(monthEndBalance.sourceRef, [...(valuesBySourceRef.get(monthEndBalance.sourceRef) ?? []), monthEndBalance.value])
  }

  return new Map([...valuesBySourceRef].map(([sourceRef, values]) => [sourceRef, sumCents(values)]))
}
