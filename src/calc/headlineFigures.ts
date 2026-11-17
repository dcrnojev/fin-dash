import { addMonths } from '../domain/month.ts'
import type { Cents, Month } from '../domain/types.ts'
import type { MonthTotal, SnapshotHistory } from './snapshotHistory.ts'

export interface Change {
  since: Month
  amount: Cents
  // The change as a fraction of the earlier total; null when that total is zero.
  ratio: number | null
  // Whether either of the two totals includes an estimated pot value.
  isEstimated: boolean
}

export interface HeadlineFigure {
  total: Cents | null
  knownPart: Cents | null
  isEstimated: boolean
  // Only between two complete totals: a change against a partial total would mostly measure what is unknown.
  versusPreviousMonth: Change | null
  versusYearEarlier: Change | null
}

export interface HeadlineFigures {
  month: Month
  cash: HeadlineFigure
  investments: HeadlineFigure
  combined: HeadlineFigure
}

// The figures for the latest month with any known value, or null when the history has none.
export function headlineFigures(history: SnapshotHistory): HeadlineFigures | null {
  const latest = history.combined.findLast(month => month.total !== null || month.knownPart !== null)

  if (latest === undefined)
    return null

  return {
    month: latest.month,
    cash: headlineFigure(history.cash.months, latest.month),
    investments: headlineFigure(history.investments.months, latest.month),
    combined: headlineFigure(history.combined, latest.month),
  }
}

function headlineFigure(months: readonly MonthTotal[], month: Month): HeadlineFigure {
  const totalsByMonth = new Map(months.map(entry => [entry.month, entry]))
  const current = totalsByMonth.get(month)
  const total = current?.total ?? null

  const changeSince = (since: Month): Change | null => {
    const earlierMonth = totalsByMonth.get(since)
    const earlier = earlierMonth?.total ?? null

    if (total === null || earlier === null)
      return null

    return {
      since,
      amount: (total - earlier) as Cents,
      ratio: earlier === 0 ? null : (total - earlier) / Math.abs(earlier),
      isEstimated: (current?.isEstimated ?? false) || (earlierMonth?.isEstimated ?? false),
    }
  }

  return {
    total,
    knownPart: current?.knownPart ?? null,
    isEstimated: current?.isEstimated ?? false,
    versusPreviousMonth: changeSince(addMonths(month, -1)),
    versusYearEarlier: changeSince(addMonths(month, -12)),
  }
}
