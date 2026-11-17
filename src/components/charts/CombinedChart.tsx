import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthTotal } from '../../calc/snapshotHistory'
import { ChartCard } from './ChartCard'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { GapBands } from './GapBands'
import { IsolatedPointDot } from './IsolatedPointDot'
import { MeasuredAndEstimatedLine } from './MeasuredAndEstimatedLine'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { splitByQuality, totalValue } from './qualityLines'
import { lineStateEntries } from './stateEntries'
import { totalText } from './valueText'

interface CombinedChartProps {
  months: MonthTotal[]
  hideAmounts: boolean
}

export function CombinedChart({ months, hideAmounts }: CombinedChartProps) {
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
    <ChartCard
      title="Cash and investments"
      note="Shaded where every pot is measured. A month with any estimated pot is an estimated total."
      months={months}
      series={series}
      stateEntries={lineStateEntries(months)}
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={months} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps(months)} />
          <YAxis {...euroAxisProps(hideAmounts)} />
          <GapBands months={months} />
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
            name="Known pots only"
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
    </ChartCard>
  )
}
