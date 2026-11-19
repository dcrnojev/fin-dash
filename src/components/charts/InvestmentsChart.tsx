import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PotGroupHistory, PotGroupMonth } from '../../calc/snapshotHistory'
import type { PotId } from '../../domain/types'
import { ChartCard } from './ChartCard'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { seriesColor } from './seriesColor'
import { columnStateEntries } from './stateEntries'
import { potValueText, totalText } from './valueText'

const lowerBoundOpacity = 0.35

interface InvestmentsChartProps {
  history: PotGroupHistory
  hideAmounts: boolean
}

// One stacked column per month. An estimated segment is hatched and outlined in its pot's colour. An unknown pot has
// no segment at all, so a column with one is only the known part, and is faded.
export function InvestmentsChart({ history, hideAmounts }: InvestmentsChartProps) {
  const { pots, months } = history

  const series: ChartSeries<PotGroupMonth>[] = [
    ...pots.map((pot, position): ChartSeries<PotGroupMonth> => ({
      key: pot.id,
      label: pot.label,
      color: seriesColor(position),
      mark: 'block',
      text: month => potValueText(month.potValues.get(pot.id), hideAmounts),
    })),
    { key: 'total', label: 'Total', color: 'none', mark: 'none', text: month => totalText(month, hideAmounts) },
  ]

  const segmentStyle = (month: PotGroupMonth, potId: PotId, color: string, hatchId: string) => {
    const isEstimated = month.potValues.get(potId)?.quality === 'estimated'
    const fillOpacity = month.knownPart === null ? 1 : lowerBoundOpacity

    return isEstimated
      ? { fill: `url(#${hatchId})`, stroke: color, strokeWidth: 1, fillOpacity }
      : { fill: color, stroke: 'var(--color-surface)', strokeWidth: 1, fillOpacity }
  }

  return (
    <ChartCard
      title="Investments"
      note="Month-end values by pot, pension pots left out. Months without a snapshot are estimated from the months around them."
      months={months}
      series={series}
      stateEntries={columnStateEntries(months)}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={months} margin={chartMargin} barCategoryGap="20%" maxBarSize={24}>
          <defs>
            {pots.map((pot, position) => (
              <pattern key={pot.id} id={hatchId(position)} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="4" fill={seriesColor(position)} fillOpacity={0.25} />
                <line x1="0" y1="0" x2="0" y2="4" stroke={seriesColor(position)} strokeWidth="2" />
              </pattern>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps(months)} />
          <YAxis {...euroAxisProps(hideAmounts)} />
          <Tooltip
            content={({ label }) => <MonthTooltip month={monthAt(label, months)} series={series} />}
            cursor={{ fill: 'var(--chart-hover)' }}
            isAnimationActive={false}
          />

          {pots.map((pot, position) => (
            <Bar
              key={pot.id}
              stackId="pots"
              dataKey={(month: PotGroupMonth) => month.potValues.get(pot.id)?.cents ?? null}
              name={pot.label}
              fill={seriesColor(position)}
              isAnimationActive={false}
            >
              {months.map(month => (
                <Cell key={month.month} {...segmentStyle(month, pot.id, seriesColor(position), hatchId(position))} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function hatchId(position: number): string {
  return `estimated-hatch-${position}`
}
