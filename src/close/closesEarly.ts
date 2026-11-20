import { lastDayOfMonth } from '../domain/month.ts'
import type { IsoDate, Month } from '../domain/types.ts'

// A month can be closed on any day, but before its last day the close asks for a confirmation first.
export function closesBeforeMonthEnd(month: Month, today: IsoDate): boolean {
  // 'YYYY-MM-DD' text sorts in time order.
  return today < lastDayOfMonth(month)
}
