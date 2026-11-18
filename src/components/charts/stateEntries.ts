import type { MonthTotal } from '../../calc/snapshotHistory'
import type { LegendEntry, SeriesMark } from './chartSeries'

const stateColor = 'var(--color-muted)'
const lowerBoundLabel = 'At least: a pot that cannot be estimated is left out'

// Legend entries for the value states a line chart actually shows.
export function lineStateEntries(months: readonly MonthTotal[]): LegendEntry[] {
  return stateEntries(months, 'estimated-line', 'dashed-line')
}

// Legend entries for the value states a column chart actually shows.
export function columnStateEntries(months: readonly MonthTotal[]): LegendEntry[] {
  return stateEntries(months, 'estimated-block', 'faded-block')
}

function stateEntries(months: readonly MonthTotal[], estimatedMark: SeriesMark, lowerBoundMark: SeriesMark): LegendEntry[] {
  const entries: LegendEntry[] = []

  if (months.some(month => month.estimatedTotal !== null || month.knownPartIncludesEstimates))
    entries.push({ key: 'estimated', label: 'Estimated', color: stateColor, mark: estimatedMark })

  if (months.some(month => month.knownPart !== null))
    entries.push({ key: 'lower-bound', label: lowerBoundLabel, color: stateColor, mark: lowerBoundMark })

  return entries
}
