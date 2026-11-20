import { addMonths } from '../domain/month.ts'
import type { Ledger, Month, MonthRecord } from '../domain/types.ts'

const settledStatuses: ReadonlySet<MonthRecord['status']> = new Set(['legacy', 'gap', 'closed'])

// The month after the latest legacy, gap or closed month: snapshot rows of a month whose close failed midway must not
// move the next month on past it. With no such month, the earliest month that has snapshot rows but no months row, else
// the month after the latest snapshot month.
export function nextMonthToClose(ledger: Pick<Ledger, 'months' | 'snapshots'>): Month | null {
  // 'YYYY-MM' text sorts in time order.
  const latestSettled = [...ledger.months.values()]
    .filter(record => settledStatuses.has(record.status))
    .map(record => record.month)
    .sort()
    .at(-1)

  if (latestSettled !== undefined)
    return addMonths(latestSettled, 1)

  const snapshotMonths = [...new Set(ledger.snapshots.map(snapshot => snapshot.month))].sort()
  const earliestWithoutRecord = snapshotMonths.find(month => !ledger.months.has(month))

  if (earliestWithoutRecord !== undefined)
    return earliestWithoutRecord

  const latestSnapshotMonth = snapshotMonths.at(-1)

  return latestSnapshotMonth === undefined ? null : addMonths(latestSnapshotMonth, 1)
}
