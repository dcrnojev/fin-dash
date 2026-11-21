import type { ReactNode } from 'react'
import { changeBetween } from '../../calc/headlineFigures'
import type { MonthTotal } from '../../calc/monthEndHistory'
import { addMonths } from '../../domain/month'
import type { Month } from '../../domain/types'
import { displayMonth } from '../../format'
import { routeHash } from '../../routing/route'
import { ChangeText } from '../ChangeText'
import type { ChartSeries, LegendEntry } from './chartSeries'
import { SeriesKey } from './SeriesKey'

export type ChartView = 'chart' | 'table'

interface ChartBodyProps<T extends MonthTotal> {
  months: readonly T[]
  // The group total last, as the table's last value column.
  series: readonly ChartSeries<T>[]
  // Legend entries for states of the values, such as estimated, shown after the series.
  stateEntries: readonly LegendEntry[]
  view: ChartView
  note: ReactNode
  // Months whose row in the table links to their edit page.
  editableMonths: ReadonlySet<Month>
  hideAmounts: boolean
  // The plot, shown in the chart view.
  children: ReactNode
}

// A chart's legend with either the plot or the same numbers as a table, latest month first, so no value is reachable
// only by hovering.
export function ChartBody<T extends MonthTotal>({
  months,
  series,
  stateEntries,
  view,
  note,
  editableMonths,
  hideAmounts,
  children,
}: ChartBodyProps<T>) {
  // A series with nothing to say in any month shown, such as a group closed before the range, is left out.
  const shownSeries = series.filter(entry => months.some(month => entry.text(month) !== ''))
  const markedSeries = shownSeries.filter(entry => entry.mark !== 'none')

  return (
    <>
      <div className="chart-legend-row">
        <Legend entries={markedSeries.length > 1 ? markedSeries : []} className="chart-legend" />
        <Legend entries={stateEntries} className="chart-legend chart-states" />
      </div>

      <div className="chart-frame">
        {view === 'chart' ? (
          children
        ) : (
          <div className="table-scroller chart-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  {shownSeries.map(entry => (
                    <th scope="col" key={entry.key} className="number">
                      {entry.label}
                    </th>
                  ))}
                  <th scope="col" className="number">
                    vs prev.
                  </th>
                </tr>
              </thead>
              <tbody>
                {months
                  .map((month, position) => ({ month, before: months[position - 1] }))
                  .reverse()
                  .map(({ month, before }) => (
                    <tr key={month.month}>
                      <th scope="row">
                        <MonthCell month={month} editable={editableMonths.has(month.month)} />
                      </th>
                      {shownSeries.map(entry => (
                        <td key={entry.key} className={entry.key === 'total' ? 'number total-cell' : 'number'}>
                          {entry.text(month)}
                        </td>
                      ))}
                      <td className="number">
                        <PreviousMonthChange before={before} month={month} hideAmounts={hideAmounts} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="chart-note">{note}</p>
    </>
  )
}

interface PreviousMonthChangeProps {
  before: MonthTotal | undefined
  month: MonthTotal
  hideAmounts: boolean
}

// Against the month before; the earliest month shown has none, since the range cuts off what came before it.
function PreviousMonthChange({ before, month, hideAmounts }: PreviousMonthChangeProps) {
  const change = changeBetween(before, month, addMonths(month.month, -1))
  const shown = change.measured ?? change.estimated

  if (shown === null)
    return null

  return <ChangeText amount={shown.amount} ratio={shown.ratio} estimated={change.estimated !== null} percentOnly hideAmounts={hideAmounts} />
}

function Legend({ entries, className }: { entries: readonly LegendEntry[]; className: string }) {
  if (entries.length === 0)
    return null

  return (
    <ul className={className}>
      {entries.map(entry => (
        <li key={entry.key}>
          <SeriesKey color={entry.color} mark={entry.mark} />
          {entry.label}
        </li>
      ))}
    </ul>
  )
}

function MonthCell({ month, editable }: { month: MonthTotal; editable: boolean }) {
  const name = displayMonth(month.month)

  return (
    <>
      {editable ? <a href={routeHash({ page: 'edit', month: month.month })}>{name}</a> : name}
      {month.isGap && <span className="muted"> (gap)</span>}
    </>
  )
}
