import { Line } from 'recharts'
import type { MonthTotal, QualifiedCents } from '../../calc/snapshotHistory'
import { EstimatedPointDot } from './EstimatedPointDot'
import { IsolatedPointDot } from './IsolatedPointDot'
import { splitByQuality } from './qualityLines'

interface MeasuredAndEstimatedLineProps {
  name: string
  months: readonly MonthTotal[]
  // One entry per month, in the order of `months`.
  values: readonly (QualifiedCents | null | undefined)[]
  color: string
  strokeWidth: number
}

// A series as two lines: solid through measured months, dotted with hollow diamonds through estimated ones.
export function MeasuredAndEstimatedLine({ name, months, values, color, strokeWidth }: MeasuredAndEstimatedLineProps) {
  const { measured, estimated, isEstimatedMonth } = splitByQuality(values)
  const positionOfMonth = new Map(months.map((entry, position) => [entry.month, position]))
  const valueIn = (line: (number | null)[]) => (entry: MonthTotal) => line[positionOfMonth.get(entry.month) ?? -1] ?? null

  return (
    <>
      <Line
        dataKey={valueIn(measured)}
        name={name}
        stroke={color}
        strokeWidth={strokeWidth}
        dot={dotProps => <IsolatedPointDot key={dotProps.index} point={dotProps} values={measured} color={color} />}
        activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }}
        isAnimationActive={false}
      />
      <Line
        dataKey={valueIn(estimated)}
        name={`${name}, estimated`}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="1 4"
        strokeLinecap="round"
        dot={dotProps => (
          <EstimatedPointDot key={dotProps.index} point={dotProps} isEstimated={isEstimatedMonth[dotProps.index]} color={color} />
        )}
        activeDot={false}
        isAnimationActive={false}
      />
    </>
  )
}
