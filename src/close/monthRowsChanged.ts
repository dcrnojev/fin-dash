import type { NumberedRow } from '../domain/schema/rowsByKey.ts'
import { snapshotsTab } from '../domain/schema/snapshotsTab.ts'
import type { Month, Snapshot } from '../domain/types.ts'
import { displayMonth } from '../format.ts'

// The month's rows, named by pot and holding, that the fresh read has and `expected` lacks, or the reverse, or that
// carry another value or date there.
export function monthRowsChanged(
  month: Month,
  expected: readonly Snapshot[],
  fresh: ReadonlyMap<string, readonly NumberedRow<Snapshot>[]>
): string[] {
  const expectedRows = expected.filter(snapshot => snapshot.month === month)
  const freshRows = [...fresh.values()].map(rows => rows[0].value).filter(snapshot => snapshot.month === month)
  const expectedByKey = new Map(expectedRows.map(snapshot => [snapshotsTab.key(snapshot), snapshot]))
  const freshByKey = new Map(freshRows.map(snapshot => [snapshotsTab.key(snapshot), snapshot]))

  const differs = (snapshot: Snapshot) => {
    const before = expectedByKey.get(snapshotsTab.key(snapshot))
    const now = freshByKey.get(snapshotsTab.key(snapshot))

    return before === undefined || now === undefined || before.value !== now.value || before.asOf !== now.asOf
  }

  const onlyFresh = freshRows.filter(snapshot => !expectedByKey.has(snapshotsTab.key(snapshot)))

  return [...expectedRows, ...onlyFresh]
    .filter(differs)
    .map(snapshot => (snapshot.holding === null ? snapshot.pot : `${snapshot.pot}/${snapshot.holding}`))
    .sort()
}

export function monthRowsChangedMessage(month: Month, changedRows: readonly string[]): string {
  const changed = `Since this screen read the sheet, the snapshot rows for ${displayMonth(month)} changed (${changedRows.join(', ')}).`
  const why = 'Most likely someone else closed or edited it at the same time; two people should not close or edit a month at once.'

  return `${changed} ${why}`
}
