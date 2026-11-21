import { daysBetween } from '../../../src/domain/date.ts'
import { lastDayOfMonth } from '../../../src/domain/month.ts'
import type { MonthEndBalance } from '../../../src/domain/types.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'

const maxOffsetDays = 7

export interface MonthEndSource {
  name: string
  // Why a far reading is expected for this source, shown with each flagged month-end balance.
  explanation: string
  monthEndBalances: readonly MonthEndBalance[]
}

// R6: a month-end balance read more than a week from the month end is flagged, since it moves spending between months.
export function checkMonthEndOffsets(sources: readonly MonthEndSource[]): CheckResult {
  const differences: CheckDifference[] = []
  const counts: string[] = []

  for (const source of sources) {
    const readings = new Map<string, { month: string; asOf: string; offset: number }>()

    for (const monthEndBalance of source.monthEndBalances) {
      if (monthEndBalance.asOf !== null)
        readings.set(`${monthEndBalance.month}|${monthEndBalance.asOf}`, {
          month: monthEndBalance.month,
          asOf: monthEndBalance.asOf,
          offset: daysBetween(lastDayOfMonth(monthEndBalance.month), monthEndBalance.asOf),
        })
    }

    const far = [...readings.values()].filter(reading => Math.abs(reading.offset) > maxOffsetDays)

    for (const reading of far) {
      const days = `${reading.offset > 0 ? '+' : ''}${reading.offset} days`
      const message = `read on ${reading.asOf}, ${days} from month end; ${source.explanation}`
      differences.push({ cell: `${source.name} ${reading.month}`, message })
    }

    counts.push(`${source.name}: ${readings.size} month-end readings, ${far.length} more than ${maxOffsetDays} days from month end`)
  }

  return { id: 'R6', title: 'Month-end balance dates', status: differences.length === 0 ? 'pass' : 'flagged', counts, differences }
}
