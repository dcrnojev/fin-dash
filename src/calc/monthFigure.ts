import type { Cents } from '../domain/types.ts'
import type { MonthSums, QualifiedCents } from './monthEndHistory.ts'

// One figure as the screen shows it. at-least: the known part of a total some of whose groups are unknown.
export type FigureState = 'measured' | 'estimated' | 'at-least'

export interface MonthFigure {
  cents: Cents
  state: FigureState
  // Whether the figure includes an estimated group value; always true for an estimated figure.
  includesEstimates: boolean
}

// Null when the month has no known value at all.
export function monthFigure(month: MonthSums): MonthFigure | null {
  if (month.total !== null)
    return { cents: month.total, state: 'measured', includesEstimates: false }

  if (month.estimatedTotal !== null)
    return { cents: month.estimatedTotal, state: 'estimated', includesEstimates: true }

  if (month.knownPart !== null)
    return { cents: month.knownPart, state: 'at-least', includesEstimates: month.knownPartIncludesEstimates }

  return null
}

export function groupFigure(value: QualifiedCents): MonthFigure {
  const isEstimated = value.quality === 'estimated'
  return { cents: value.cents, state: isEstimated ? 'estimated' : 'measured', includesEstimates: isEstimated }
}
