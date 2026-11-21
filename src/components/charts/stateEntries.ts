import type { MonthTotal } from '../../calc/monthEndHistory'
import type { LegendEntry, SeriesMark } from './chartSeries'

const stateColor = 'var(--color-ink-2)'

// Legend entries for the value states a line chart actually shows.
export function lineStateEntries(months: readonly MonthTotal[]): LegendEntry[] {
  return stateEntries(months, 'line', 'estimated-line', 'dashed-line')
}

// Legend entries for the value states a column chart actually shows.
export function columnStateEntries(months: readonly MonthTotal[]): LegendEntry[] {
  return stateEntries(months, 'block', 'estimated-block', 'faded-block')
}

// Measured is listed only beside another state, as the contrast it needs.
function stateEntries(months: readonly MonthTotal[], measuredMark: SeriesMark, estimatedMark: SeriesMark, lowerBoundMark: SeriesMark): LegendEntry[] {
  const entries: LegendEntry[] = []

  if (months.some(month => month.estimatedTotal !== null || month.knownPartIncludesEstimates))
    entries.push({ key: 'estimated', label: 'Estimated', color: stateColor, mark: estimatedMark })

  if (months.some(month => month.knownPart !== null))
    entries.push({ key: 'lower-bound', label: 'At least', color: stateColor, mark: lowerBoundMark })

  return entries.length === 0 ? entries : [{ key: 'measured', label: 'Measured', color: stateColor, mark: measuredMark }, ...entries]
}
