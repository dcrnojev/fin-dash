import { monthEndBalancesTab } from '../domain/schema/monthEndBalancesTab.ts'
import type { NumberedRow } from '../domain/schema/rowsByKey.ts'
import type { Month, MonthEndBalance } from '../domain/types.ts'
import { displayMonth } from '../format.ts'

// The month's rows, named by group and balance, that the fresh read has and `expected` lacks, or the reverse, or that
// carry another value or date there.
export function monthRowsChanged(
  month: Month,
  expected: readonly MonthEndBalance[],
  fresh: ReadonlyMap<string, readonly NumberedRow<MonthEndBalance>[]>
): string[] {
  const expectedRows = expected.filter(monthEndBalance => monthEndBalance.month === month)
  const freshRows = [...fresh.values()].map(rows => rows[0].value).filter(monthEndBalance => monthEndBalance.month === month)
  const expectedByKey = new Map(expectedRows.map(monthEndBalance => [monthEndBalancesTab.key(monthEndBalance), monthEndBalance]))
  const freshByKey = new Map(freshRows.map(monthEndBalance => [monthEndBalancesTab.key(monthEndBalance), monthEndBalance]))

  const differs = (monthEndBalance: MonthEndBalance) => {
    const before = expectedByKey.get(monthEndBalancesTab.key(monthEndBalance))
    const now = freshByKey.get(monthEndBalancesTab.key(monthEndBalance))

    return before === undefined || now === undefined || before.value !== now.value || before.asOf !== now.asOf
  }

  const onlyFresh = freshRows.filter(monthEndBalance => !expectedByKey.has(monthEndBalancesTab.key(monthEndBalance)))

  return [...expectedRows, ...onlyFresh]
    .filter(differs)
    .map(monthEndBalance => (monthEndBalance.balance === null ? monthEndBalance.group : `${monthEndBalance.group}/${monthEndBalance.balance}`))
    .sort()
}

export function monthRowsChangedMessage(month: Month, changedRows: readonly string[]): string {
  const changed = `Since this screen read the sheet, the month-end balance rows for ${displayMonth(month)} changed (${changedRows.join(', ')}).`
  const why = 'Most likely someone else closed or edited it at the same time; two people should not close or edit a month at once.'

  return `${changed} ${why}`
}
