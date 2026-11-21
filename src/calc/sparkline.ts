import { addMonths } from '../domain/month.ts'
import type { Month } from '../domain/types.ts'
import { monthFigure, type FigureState, type MonthFigure } from './monthFigure.ts'
import type { MonthTotal } from './snapshotHistory.ts'

// A run of consecutive positions drawn in one style, from position `from` to position `to`.
export interface SparklineSegment {
  from: number
  to: number
  state: FigureState
}

export interface Sparkline {
  // One entry per month, oldest first: null where the month is unknown or before the history.
  figures: (MonthFigure | null)[]
  segments: SparklineSegment[]
  // Known months with no known neighbour, which no segment reaches.
  isolated: number[]
}

const statePrecedence: readonly FigureState[] = ['measured', 'estimated', 'at-least']

// The `count` months ending with `lastMonth`. A stretch between two months takes the weaker state of the two, so a
// line is solid only between two measured totals; an unknown month breaks the line.
export function sparkline(months: readonly MonthTotal[], lastMonth: Month, count: number): Sparkline {
  const totalsByMonth = new Map(months.map(entry => [entry.month, entry]))

  const figures = Array.from({ length: count }, (_, position) => {
    const entry = totalsByMonth.get(addMonths(lastMonth, position - count + 1))
    return entry === undefined ? null : monthFigure(entry)
  })

  const segments: SparklineSegment[] = []

  for (let position = 1; position < count; position++) {
    const before = figures[position - 1]
    const after = figures[position]

    if (before === null || after === null)
      continue

    const state = statePrecedence[Math.max(statePrecedence.indexOf(before.state), statePrecedence.indexOf(after.state))]
    const previous = segments.at(-1)

    if (previous !== undefined && previous.to === position - 1 && previous.state === state)
      previous.to = position
    else
      segments.push({ from: position - 1, to: position, state })
  }

  const isKnown = (position: number) => (figures[position] ?? null) !== null
  const isolated = figures.flatMap((_, position) => (isKnown(position) && !isKnown(position - 1) && !isKnown(position + 1) ? [position] : []))

  return { figures, segments, isolated }
}
