import { daysBetween } from '../../../src/domain/date.ts'
import { lastDayOfMonth } from '../../../src/domain/month.ts'
import type { Snapshot } from '../../../src/domain/types.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'

const maxOffsetDays = 7

export interface SnapshotGroup {
  name: string
  // Why a far reading is expected for this group, shown with each flagged snapshot.
  explanation: string
  snapshots: readonly Snapshot[]
}

// R6: a month-end snapshot read more than a week from the month end is flagged, since it moves spending between months.
export function checkSnapshotOffsets(groups: readonly SnapshotGroup[]): CheckResult {
  const differences: CheckDifference[] = []
  const counts: string[] = []

  for (const group of groups) {
    const readings = new Map<string, { month: string; asOf: string; offset: number }>()

    for (const snapshot of group.snapshots) {
      if (snapshot.asOf !== null)
        readings.set(`${snapshot.month}|${snapshot.asOf}`, {
          month: snapshot.month,
          asOf: snapshot.asOf,
          offset: daysBetween(lastDayOfMonth(snapshot.month), snapshot.asOf),
        })
    }

    const far = [...readings.values()].filter(reading => Math.abs(reading.offset) > maxOffsetDays)

    for (const reading of far) {
      const days = `${reading.offset > 0 ? '+' : ''}${reading.offset} days`
      const message = `read on ${reading.asOf}, ${days} from month end; ${group.explanation}`
      differences.push({ cell: `${group.name} ${reading.month}`, message })
    }

    counts.push(`${group.name}: ${readings.size} month-end readings, ${far.length} more than ${maxOffsetDays} days from month end`)
  }

  return { id: 'R6', title: 'Snapshot dates', status: differences.length === 0 ? 'pass' : 'flagged', counts, differences }
}
