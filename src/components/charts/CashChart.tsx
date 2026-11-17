import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PotGroupHistory, PotGroupMonth } from '../../calc/snapshotHistory'
import { ChartCard } from './ChartCard'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { GapBands } from './GapBands'
import { IsolatedPointDot } from './IsolatedPointDot'
import { MeasuredAndEstimatedLine } from './MeasuredAndEstimatedLine'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { totalValue } from './qualityLines'
import { seriesColor } from './seriesColor'
import { lineStateEntries } from './stateEntries'
import { potValueText, totalText } from './valueText'

interface CashChartProps {
  history: PotGroupHistory
  hideAmounts: boolean
}

// Total cash as the heavy line, each cash pot as its own thin line. Lines rather than a stack, because a cash pot can
// go negative (an overdraft) and an unknown pot would otherwise leave a hole in the middle of a stack.
export function CashChart({ history, hideAmounts }: CashChartProps) {
  const { pots, months } = history
  const knownParts = months.map(month => month.knownPart)

  const series: ChartSeries<PotGroupMonth>[] = [
    { key: 'total', label: 'Total cash', color: 'var(--chart-total)', mark: 'line', text: month => totalText(month, hideAmounts) },
    ...pots.map((pot, position): ChartSeries<PotGroupMonth> => ({
      key: pot.id,
      label: pot.label,
      color: seriesColor(position),
      mark: 'line',
      text: month => potValueText(month.potValues.get(pot.id), hideAmounts),
    })),
  ]

  return (
    <ChartCard
      title="Cash"
      note="Month-end balances. A month without a snapshot is estimated on a straight line between the measured months around it."
      months={months}
      series={series}
      stateEntries={lineStateEntries(months)}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={months} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps(months)} />
          <YAxis {...euroAxisProps(hideAmounts)} />
          <GapBands months={months} />
          <Tooltip
            content={({ label }) => <MonthTooltip month={monthAt(label, months)} series={series} />}
            cursor={{ stroke: 'var(--chart-axis)' }}
            isAnimationActive={false}
          />

          {pots.map((pot, position) => (
            <MeasuredAndEstimatedLine
              key={pot.id}
              name={pot.label}
              months={months}
              values={months.map(month => month.potValues.get(pot.id))}
              color={seriesColor(position)}
              strokeWidth={2}
            />
          ))}

          <MeasuredAndEstimatedLine
            name="Total cash"
            months={months}
            values={months.map(totalValue)}
            color="var(--chart-total)"
            strokeWidth={3}
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
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
