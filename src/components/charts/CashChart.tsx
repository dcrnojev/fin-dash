import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { KindHistory, KindMonth } from '../../calc/monthEndHistory'
import type { Month } from '../../domain/types'
import { ChartBody, type ChartView } from './ChartBody'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { IsolatedPointDot } from './IsolatedPointDot'
import { MeasuredAndEstimatedLine } from './MeasuredAndEstimatedLine'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { totalValue } from './qualityLines'
import { seriesColor } from './seriesColor'
import { lineStateEntries } from './stateEntries'
import { groupValueText, totalText } from './valueText'

const cashNote = 'Month-end balances. ≈ estimated on a straight line between two measured months; ≥ at least, where a group cannot be estimated.'

interface CashChartProps {
  history: KindHistory
  hideAmounts: boolean
  view: ChartView
  editableMonths: ReadonlySet<Month>
}

// Total cash as the heavy line, each cash group as its own thin line. Lines rather than a stack, because a cash group can
// go negative (an overdraft) and an unknown group would otherwise leave a hole in the middle of a stack.
export function CashChart({ history, hideAmounts, view, editableMonths }: CashChartProps) {
  const { groups, months } = history
  const knownParts = months.map(month => month.knownPart)

  const series: ChartSeries<KindMonth>[] = [
    ...groups.map((group, position): ChartSeries<KindMonth> => ({
      key: group.id,
      label: group.label,
      color: seriesColor(position),
      mark: 'line',
      text: month => groupValueText(month.groupValues.get(group.id), hideAmounts),
    })),
    { key: 'total', label: 'Total cash', color: 'var(--chart-total)', mark: 'line', text: month => totalText(month, hideAmounts) },
  ]

  return (
    <ChartBody
      months={months}
      series={series}
      stateEntries={lineStateEntries(months)}
      view={view}
      note={cashNote}
      editableMonths={editableMonths}
      hideAmounts={hideAmounts}
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

          {groups.map((group, position) => (
            <MeasuredAndEstimatedLine
              key={group.id}
              name={group.label}
              months={months}
              values={months.map(month => month.groupValues.get(group.id))}
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
        </LineChart>
      </ResponsiveContainer>
    </ChartBody>
  )
}
