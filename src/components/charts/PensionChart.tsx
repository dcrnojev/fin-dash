import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PotGroupHistory, PotGroupMonth } from '../../calc/snapshotHistory'
import { ChartCard } from './ChartCard'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { IsolatedPointDot } from './IsolatedPointDot'
import { MeasuredAndEstimatedLine } from './MeasuredAndEstimatedLine'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { totalValue } from './qualityLines'
import { seriesColor } from './seriesColor'
import { lineStateEntries } from './stateEntries'
import { potValueText, totalText } from './valueText'

const statementNote =
  'Each value is as of its statement date, not the month end: a month holds the statement that arrived during it. ' +
  'Pension is left out of the investment and combined totals.'

interface PensionChartProps {
  history: PotGroupHistory
  hideAmounts: boolean
}

// Total pension as the heavy line, each pension pot as its own thin line, drawn like the cash chart.
export function PensionChart({ history, hideAmounts }: PensionChartProps) {
  const { pots, months } = history
  const knownParts = months.map(month => month.knownPart)

  const series: ChartSeries<PotGroupMonth>[] = [
    { key: 'total', label: 'Total pension', color: 'var(--chart-total)', mark: 'line', text: month => totalText(month, hideAmounts) },
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
      title="Pension"
      note={statementNote}
      months={months}
      series={series}
      stateEntries={lineStateEntries(months)}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={months} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps(months)} />
          <YAxis {...euroAxisProps(hideAmounts)} />
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
            name="Total pension"
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
