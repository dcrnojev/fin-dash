import { sumCents } from '../../../src/domain/money.ts'
import type { Cents, Snapshot } from '../../../src/domain/types.ts'

// The total imported from each legacy cell, keyed by `source_ref`.
export function importedTotalsBySourceRef(snapshots: readonly Snapshot[]): Map<string, Cents> {
  const valuesBySourceRef = new Map<string, Cents[]>()

  for (const snapshot of snapshots) {
    if (snapshot.sourceRef !== null)
      valuesBySourceRef.set(snapshot.sourceRef, [...(valuesBySourceRef.get(snapshot.sourceRef) ?? []), snapshot.value])
  }

  return new Map([...valuesBySourceRef].map(([sourceRef, values]) => [sourceRef, sumCents(values)]))
}
