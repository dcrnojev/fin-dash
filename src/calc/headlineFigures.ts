import { addMonths } from '../domain/month.ts'
import type { Cents, Month } from '../domain/types.ts'
import type { MonthTotal, SnapshotHistory } from './snapshotHistory.ts'

export interface Change {
  since: Month
  amount: Cents
  // The change as a fraction of the earlier total; null when that total is zero.
  ratio: number | null
}

// Like a month total, at most one of `total`, `estimatedTotal` and `knownPart` is set. A change is only computed between
// two complete totals: against a lower bound it would mostly measure what is unknown. It sits in the plain field when both
// totals are measured and in the `estimated` one when either includes an estimate, so at most one of each pair is set.
export interface HeadlineFigure {
  total: Cents | null
  estimatedTotal: Cents | null
  knownPart: Cents | null
  knownPartIncludesEstimates: boolean
  versusPreviousMonth: Change | null
  estimatedVersusPreviousMonth: Change | null
  versusYearEarlier: Change | null
  estimatedVersusYearEarlier: Change | null
}

export interface HeadlineFigures {
  month: Month
  cash: HeadlineFigure
  investments: HeadlineFigure
  combined: HeadlineFigure
}

export interface MeasuredOrEstimatedChange {
  measured: Change | null
  estimated: Change | null
}

// The figures for the latest month with any known value, or null when the history has none.
export function headlineFigures(history: SnapshotHistory): HeadlineFigures | null {
  const latest = history.combined.findLast(month => month.total !== null || month.estimatedTotal !== null || month.knownPart !== null)

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
  const changeSince = (since: Month) => changeBetween(totalsByMonth.get(since), current, since)
  const versusPreviousMonth = changeSince(addMonths(month, -1))
  const versusYearEarlier = changeSince(addMonths(month, -12))

  return {
    total: current?.total ?? null,
    estimatedTotal: current?.estimatedTotal ?? null,
    knownPart: current?.knownPart ?? null,
    knownPartIncludesEstimates: current?.knownPartIncludesEstimates ?? false,
    versusPreviousMonth: versusPreviousMonth.measured,
    estimatedVersusPreviousMonth: versusPreviousMonth.estimated,
    versusYearEarlier: versusYearEarlier.measured,
    estimatedVersusYearEarlier: versusYearEarlier.estimated,
  }
}

export function changeBetween(earlier: MonthTotal | undefined, later: MonthTotal | undefined, since: Month): MeasuredOrEstimatedChange {
  const noChange = { measured: null, estimated: null }

  if (earlier === undefined || later === undefined)
    return noChange

  const from = earlier.total ?? earlier.estimatedTotal
  const to = later.total ?? later.estimatedTotal

  if (from === null || to === null)
    return noChange

  const change: Change = { since, amount: (to - from) as Cents, ratio: from === 0 ? null : (to - from) / Math.abs(from) }
  const bothMeasured = earlier.total !== null && later.total !== null

  return bothMeasured ? { measured: change, estimated: null } : { measured: null, estimated: change }
}
