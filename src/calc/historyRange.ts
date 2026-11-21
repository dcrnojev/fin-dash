export const historyRanges = [12, 24, 'all'] as const
export type HistoryRange = (typeof historyRanges)[number]

// The last `range` months of a history, or all of it. Every group of a snapshot history spans the same months, so the
// same range cuts each group at the same month.
export function monthsInRange<T>(months: readonly T[], range: HistoryRange): T[] {
  return range === 'all' ? [...months] : months.slice(Math.max(0, months.length - range))
}
