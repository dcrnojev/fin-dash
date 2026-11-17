import type { MonthTotal } from '../../calc/snapshotHistory'
import { monthFromIndex, monthIndex } from '../../domain/month'
import { displayMonth } from '../../format'
import { axisTick } from './chartChrome'

export interface MonthRun {
  first: number
  last: number
}

// The x axis is numeric (the month index), so a month owns the band from index - 0.5 to index + 0.5. That lets gap
// months be shaded as whole bands on line and bar charts alike.
export function monthAxisProps(months: readonly MonthTotal[]) {
  const indexes = months.map(entry => monthIndex(entry.month))

  return {
    type: 'number' as const,
    dataKey: (entry: MonthTotal) => monthIndex(entry.month),
    domain: [Math.min(...indexes) - 0.5, Math.max(...indexes) + 0.5],
    ticks: monthTicks(indexes),
    tickFormatter: (index: number) => displayMonth(monthFromIndex(index)),
    tick: axisTick,
    tickLine: false,
    stroke: 'var(--chart-axis)',
  }
}

// The month under the tooltip: Recharts passes the x value, here a month index.
export function monthAt<T extends MonthTotal>(xValue: unknown, months: readonly T[]): T | null {
  return months.find(entry => monthIndex(entry.month) === xValue) ?? null
}

export function gapRuns(months: readonly MonthTotal[]): MonthRun[] {
  const runs: MonthRun[] = []

  for (const entry of months) {
    if (!entry.isGap)
      continue

    const index = monthIndex(entry.month)
    const previousRun = runs.at(-1)

    if (previousRun && previousRun.last === index - 1)
      previousRun.last = index
    else
      runs.push({ first: index, last: index })
  }

  return runs
}

// Each January when the history spans two of them or more, otherwise every third month.
function monthTicks(indexes: readonly number[]): number[] {
  const januaries = indexes.filter(index => index % 12 === 0)

  return januaries.length >= 2 ? januaries : indexes.filter((_, position) => position % 3 === 0)
}
