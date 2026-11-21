import { useState } from 'react'
import { historyRanges, monthsInRange, type HistoryRange } from '../../calc/historyRange'
import type { KindHistory, MonthEndHistory } from '../../calc/monthEndHistory'
import type { Month } from '../../domain/types'
import { CashChart } from '../charts/CashChart'
import type { ChartView } from '../charts/ChartBody'
import { CombinedChart } from '../charts/CombinedChart'
import { InvestmentsChart } from '../charts/InvestmentsChart'
import { PensionChart } from '../charts/PensionChart'
import { Segmented } from '../Segmented'

type ChartTopic = 'cash' | 'investments' | 'combined' | 'pensions'

const topics: { value: ChartTopic; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'investments', label: 'Investments' },
  { value: 'combined', label: 'Cash and investments' },
  { value: 'pensions', label: 'Pension' },
]

const rangeLabels: Record<HistoryRange, string> = { 12: '12 months', 24: '24 months', all: 'All' }
const ranges = historyRanges.map(range => ({ value: range, label: rangeLabels[range] }))

const views: { value: ChartView; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

interface HistoryChartCardProps {
  history: MonthEndHistory
  editableMonths: ReadonlySet<Month>
  hideAmounts: boolean
}

// One chart at a time, with what it shows, over how many months, and whether as a chart or a table.
export function HistoryChartCard({ history, editableMonths, hideAmounts }: HistoryChartCardProps) {
  const [topic, setTopic] = useState<ChartTopic>('cash')
  const [range, setRange] = useState<HistoryRange>(12)
  const [view, setView] = useState<ChartView>('chart')

  const shared = { view, editableMonths, hideAmounts }
  const inRange = (group: KindHistory): KindHistory => ({ ...group, months: monthsInRange(group.months, range) })

  return (
    <section className="card chart-card" aria-label="History">
      <div className="chart-card-head">
        <Segmented label="Figures" options={topics} value={topic} onChange={setTopic} />
        <div className="chart-card-tools">
          <Segmented label="Months shown" options={ranges} value={range} onChange={setRange} />
          <Segmented label="Show as" options={views} value={view} onChange={setView} />
        </div>
      </div>

      {topic === 'cash' && <CashChart history={inRange(history.cash)} {...shared} />}
      {topic === 'investments' && <InvestmentsChart history={inRange(history.investments)} {...shared} />}
      {topic === 'combined' && <CombinedChart months={monthsInRange(history.combined, range)} {...shared} />}

      {topic === 'pensions' &&
        (history.pensions.groups.length === 0 ? (
          <p className="chart-empty muted">The spreadsheet has no pension groups.</p>
        ) : (
          <PensionChart history={inRange(history.pensions)} {...shared} />
        ))}
    </section>
  )
}
