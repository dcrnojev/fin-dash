import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthTotal } from '../../calc/monthEndHistory'
import type { Month } from '../../domain/types'
import { ChartBody, type ChartView } from './ChartBody'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { IsolatedPointDot } from './IsolatedPointDot'
import { MeasuredAndEstimatedLine } from './MeasuredAndEstimatedLine'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { splitByQuality, totalValue } from './qualityLines'
import { lineStateEntries } from './stateEntries'
import { totalText } from './valueText'

const combinedNote =
  'Shaded where every group is measured. A month with any estimated group is an estimated total (≈); with a group that cannot be ' +
  'estimated, only the known part shows, as at least (≥). Pension is left out.'

interface CombinedChartProps {
  months: MonthTotal[]
  hideAmounts: boolean
  view: ChartView
  editableMonths: ReadonlySet<Month>
}

export function CombinedChart({ months, hideAmounts, view, editableMonths }: CombinedChartProps) {
  const totals = months.map(totalValue)
  const measuredTotals = splitByQuality(totals).measured
  const measuredTotalByMonth = new Map(months.map((month, position) => [month.month, measuredTotals[position]]))
  const knownParts = months.map(month => month.knownPart)

  const series: ChartSeries<MonthTotal>[] = [
    {
      key: 'total',
      label: 'Cash and investments',
      color: 'var(--chart-total)',
      mark: 'line',
      text: month => totalText(month, hideAmounts),
    },
  ]

  return (
    <ChartBody
      months={months}
      series={series}
      stateEntries={lineStateEntries(months)}
      view={view}
      note={combinedNote}
      editableMonths={editableMonths}
      hideAmounts={hideAmounts}
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={months} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps(months)} />
          <YAxis {...euroAxisProps(hideAmounts)} />
          <Tooltip
            content={({ label }) => <MonthTooltip month={monthAt(label, months)} series={series} />}
            cursor={{ stroke: 'var(--chart-axis)' }}
            isAnimationActive={false}
          />
          <Area
            dataKey={(month: MonthTotal) => measuredTotalByMonth.get(month.month) ?? null}
            name="Cash and investments, wash"
            stroke="none"
            fill="var(--chart-total)"
            fillOpacity={0.1}
            activeDot={false}
            isAnimationActive={false}
          />
          <MeasuredAndEstimatedLine
            name="Cash and investments"
            months={months}
            values={totals}
            color="var(--chart-total)"
            strokeWidth={2}
          />
          <Line
            dataKey="knownPart"
            name="Known groups only"
            stroke="var(--chart-total)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={dotProps => (
              <IsolatedPointDot key={dotProps.index} point={dotProps} values={knownParts} color="var(--chart-total)" hollow />
            )}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartBody>
  )
}
