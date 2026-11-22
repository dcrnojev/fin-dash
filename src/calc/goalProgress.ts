import { addMonths } from '../domain/month.ts'
import type { Cents, Month } from '../domain/types.ts'
import { changeBetween } from './headlineFigures.ts'
import type { MonthTotal } from './monthEndHistory.ts'

export interface GoalProgress {
  // How much the total changed since the month before; it includes market gains and losses, not only money put aside.
  change: Cents
  goal: Cents
  // The change as a fraction of the goal: 1 is the goal reached, below 0 a total that fell.
  ratio: number
  // Whether either month's total includes an estimate.
  estimated: boolean
}

// The month's change in the cash-and-investments total against the goal. Null unless both the month and the one before
// have a complete total, measured or estimated.
export function goalProgress(combined: readonly MonthTotal[], month: Month, goal: Cents): GoalProgress | null {
  const previousMonth = addMonths(month, -1)
  const change = changeBetween(
    combined.find(entry => entry.month === previousMonth),
    combined.find(entry => entry.month === month),
    previousMonth
  )
  const shown = change.measured ?? change.estimated

  if (shown === null)
    return null

  return { change: shown.amount, goal, ratio: shown.amount / goal, estimated: change.estimated !== null }
}
