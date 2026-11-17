import type { MonthTotal } from '../../calc/snapshotHistory'
import { displayMonth } from '../../format'
import type { ChartSeries } from './chartSeries'
import { SeriesKey } from './SeriesKey'

interface MonthTooltipProps<T extends MonthTotal> {
  month: T | null
  series: readonly ChartSeries<T>[]
}

// Every series of the hovered month, including the ones that are unknown, which the chart itself cannot show.
export function MonthTooltip<T extends MonthTotal>({ month, series }: MonthTooltipProps<T>) {
  if (month === null)
    return null

  const rows = series.map(entry => ({ entry, text: entry.text(month) })).filter(row => row.text !== '')

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">
        {displayMonth(month.month)}
        {month.isGap && <span className="muted"> · gap month, no snapshots</span>}
      </p>
      <ul>
        {rows.map(({ entry, text }) => (
          <li key={entry.key}>
            <SeriesKey color={entry.color} mark={entry.mark} />
            <strong>{text}</strong>
            <span className="muted">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
