import type { Cents, Month } from '../domain/types.ts'
import type { MonthTotal } from './monthEndHistory.ts'

// Where each month's total would be if it grew by the goal: the previous month's total, measured or estimated, plus the
// goal. A month whose previous month has no complete total, or is not in the history, has no target.
export function goalTargets(months: readonly MonthTotal[], goal: Cents): Map<Month, Cents> {
  const targets = new Map<Month, Cents>()

  months.forEach((month, position) => {
    const previous: MonthTotal | undefined = months[position - 1]
    const previousTotal = previous === undefined ? null : (previous.total ?? previous.estimatedTotal)

    if (previousTotal !== null)
      targets.set(month.month, (previousTotal + goal) as Cents)
  })

  return targets
}
