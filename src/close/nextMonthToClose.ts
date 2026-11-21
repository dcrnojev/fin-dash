import { addMonths } from '../domain/month.ts'
import type { Ledger, Month, MonthRecord } from '../domain/types.ts'

const settledStatuses: ReadonlySet<MonthRecord['status']> = new Set(['legacy', 'gap', 'closed'])

// The month after the latest legacy, gap or closed month: month-end balance rows of a month whose close failed midway must not
// move the next month on past it. With no such month, the earliest month that has month-end balance rows but no months row, else
// the month after the latest month-end balance month.
export function nextMonthToClose(ledger: Pick<Ledger, 'months' | 'monthEndBalances'>): Month | null {
  // 'YYYY-MM' text sorts in time order.
  const latestSettled = [...ledger.months.values()]
    .filter(record => settledStatuses.has(record.status))
    .map(record => record.month)
    .sort()
    .at(-1)

  if (latestSettled !== undefined)
    return addMonths(latestSettled, 1)

  const monthEndBalanceMonths = [...new Set(ledger.monthEndBalances.map(monthEndBalance => monthEndBalance.month))].sort()
  const earliestWithoutRecord = monthEndBalanceMonths.find(month => !ledger.months.has(month))

  if (earliestWithoutRecord !== undefined)
    return earliestWithoutRecord

  const latestMonthEndBalanceMonth = monthEndBalanceMonths.at(-1)

  return latestMonthEndBalanceMonth === undefined ? null : addMonths(latestMonthEndBalanceMonth, 1)
}
