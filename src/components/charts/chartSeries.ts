import type { MonthTotal } from '../../calc/monthEndHistory'

// How a legend entry is drawn. 'none': a figure with no mark of its own, such as the total of a stack; it is left out
// of the legend. The estimated and faded marks describe a state of the values rather than a series.
export type SeriesMark = 'line' | 'dashed-line' | 'estimated-line' | 'block' | 'estimated-block' | 'faded-block' | 'none'

export interface LegendEntry {
  key: string
  label: string
  color: string
  mark: SeriesMark
}

// One series of a chart as the legend, tooltip and table view show it. `text` is the month's value as text, or ''
// when the series has nothing to say for that month (a group not tracked yet).
export interface ChartSeries<T extends MonthTotal> extends LegendEntry {
  text: (month: T) => string
}
