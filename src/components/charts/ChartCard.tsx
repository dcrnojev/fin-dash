import type { ReactNode } from 'react'
import type { MonthTotal } from '../../calc/snapshotHistory'
import { displayMonth } from '../../format'
import type { ChartSeries, LegendEntry } from './chartSeries'
import { SeriesKey } from './SeriesKey'

interface ChartCardProps<T extends MonthTotal> {
  title: string
  note: ReactNode
  months: readonly T[]
  series: readonly ChartSeries<T>[]
  // Legend entries for states of the values, such as estimated, shown after the series.
  stateEntries: readonly LegendEntry[]
  children: ReactNode
}

// A chart with its legend and, folded away, the same numbers as a table, so no value is reachable only by hovering.
export function ChartCard<T extends MonthTotal>({ title, note, months, series, stateEntries, children }: ChartCardProps<T>) {
  const markedSeries = series.filter(entry => entry.mark !== 'none')
  // A single series needs no legend entry of its own: the title already names it.
  const legendEntries = [...(markedSeries.length > 1 ? markedSeries : []), ...stateEntries]

  return (
    <section className="panel chart-card">
      <h3>{title}</h3>
      <p className="muted chart-note">{note}</p>

      {legendEntries.length > 0 && (
        <ul className="chart-legend">
          {legendEntries.map(entry => (
            <li key={entry.key}>
              <SeriesKey color={entry.color} mark={entry.mark} />
              {entry.label}
            </li>
          ))}
        </ul>
      )}

      <div className="chart-frame">{children}</div>

      <details className="chart-table">
        <summary>Show as table</summary>
        <div className="table-scroller">
          <table>
            <thead>
              <tr>
                <th scope="col">Month</th>
                {series.map(entry => (
                  <th scope="col" key={entry.key}>
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(month => (
                <tr key={month.month}>
                  <th scope="row">
                    {displayMonth(month.month)}
                    {month.isGap && <span className="muted"> (gap)</span>}
                  </th>
                  {series.map(entry => (
                    <td key={entry.key}>{entry.text(month)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
