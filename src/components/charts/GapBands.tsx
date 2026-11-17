import { ReferenceArea } from 'recharts'
import type { MonthTotal } from '../../calc/snapshotHistory'
import { gapRuns } from './monthAxis'

interface GapBandsProps {
  months: readonly MonthTotal[]
}

// Shades each run of gap months on a chart that uses monthAxisProps, labelled once per run.
export function GapBands({ months }: GapBandsProps) {
  return gapRuns(months).map(run => (
    <ReferenceArea
      key={run.first}
      x1={run.first - 0.5}
      x2={run.last + 0.5}
      fill="var(--chart-gap)"
      fillOpacity={1}
      label={{ value: 'gap', position: 'insideTop', fill: 'var(--color-muted)', fontSize: 11 }}
    />
  ))
}
