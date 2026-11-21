import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { KindHistory, KindMonth } from '../../calc/monthEndHistory'
import type { GroupId, Month } from '../../domain/types'
import { ChartBody, type ChartView } from './ChartBody'
import { chartMargin, euroAxisProps, gridProps } from './chartChrome'
import type { ChartSeries } from './chartSeries'
import { monthAt, monthAxisProps } from './monthAxis'
import { MonthTooltip } from './MonthTooltip'
import { seriesColor } from './seriesColor'
import { columnStateEntries } from './stateEntries'
import { groupValueText, totalText } from './valueText'

const lowerBoundOpacity = 0.35

const investmentsNote =
  'Month-end values by group, pension groups left out. ≈ estimated between two measured months (hatched); ≥ at least, where a group ' +
  'cannot be estimated (faded).'

interface InvestmentsChartProps {
  history: KindHistory
  hideAmounts: boolean
  view: ChartView
  editableMonths: ReadonlySet<Month>
}

// One stacked column per month. An estimated segment is hatched and outlined in its group's colour. An unknown group has
// no segment at all, so a column with one is only the known part, and is faded.
export function InvestmentsChart({ history, hideAmounts, view, editableMonths }: InvestmentsChartProps) {
  const { groups, months } = history

  const series: ChartSeries<KindMonth>[] = [
    ...groups.map((group, position): ChartSeries<KindMonth> => ({
      key: group.id,
      label: group.label,
      color: seriesColor(position),
      mark: 'block',
      text: month => groupValueText(month.groupValues.get(group.id), hideAmounts),
    })),
    { key: 'total', label: 'Total', color: 'none', mark: 'none', text: month => totalText(month, hideAmounts) },
  ]

  const segmentStyle = (month: KindMonth, groupId: GroupId, color: string, hatchId: string) => {
    const isEstimated = month.groupValues.get(groupId)?.quality === 'estimated'
    const fillOpacity = month.knownPart === null ? 1 : lowerBoundOpacity

    return isEstimated
      ? { fill: `url(#${hatchId})`, stroke: color, strokeWidth: 1, fillOpacity }
      : { fill: color, stroke: 'var(--color-surface)', strokeWidth: 1, fillOpacity }
  }

  return (
    <ChartBody
      months={months}
      series={series}
      stateEntries={columnStateEntries(months)}
      view={view}
      note={investmentsNote}
      editableMonths={editableMonths}
      hideAmounts={hideAmounts}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={months} margin={chartMargin} barCategoryGap="20%" maxBarSize={24}>
          <defs>
            {groups.map((group, position) => (
              <pattern key={group.id} id={hatchId(position)} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
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

          {groups.map((group, position) => (
            <Bar
              key={group.id}
              stackId="groups"
              dataKey={(month: KindMonth) => month.groupValues.get(group.id)?.cents ?? null}
              name={group.label}
              fill={seriesColor(position)}
              isAnimationActive={false}
            >
              {months.map(month => (
                <Cell key={month.month} {...segmentStyle(month, group.id, seriesColor(position), hatchId(position))} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartBody>
  )
}

function hatchId(position: number): string {
  return `estimated-hatch-${position}`
}
