import { daysBetween } from '../../src/domain/date.ts'
import { addMonths, lastDayOfMonth, monthOfDate, monthsFromTo } from '../../src/domain/month.ts'
import type { IsoDate, Month } from '../../src/domain/types.ts'

// A reading can be the month end of M when it is dated from the 20th of M to the 5th of M+1.
const windowFirstDay = 20
const windowLastDayOfNextMonth = 5

export interface Candidate<T> {
  date: IsoDate
  // Days from the last day of the month; negative when read before it.
  offsetDays: number
  item: T
}

export interface MonthEndChoice<T> {
  month: Month
  // Null for a gap: no reading falls in the month's window.
  chosen: Candidate<T> | null
  candidates: Candidate<T>[]
}

export interface MonthEndSelection<T> {
  months: MonthEndChoice<T>[]
  // Readings outside every month's window, such as the early-month ones of the two-a-month era.
  outsideWindows: T[]
}

// Picks one reading per month: the candidate closest to the last day of the month, the earlier one on a tie.
// Months run from the first to the last month that has a candidate; months in between without one are gaps.
export function chooseMonthEnds<T>(readings: readonly { date: IsoDate; item: T }[]): MonthEndSelection<T> {
  const candidatesByMonth = new Map<Month, Candidate<T>[]>()
  const outsideWindows: T[] = []

  for (const { date, item } of readings) {
    const month = windowMonth(date)

    if (month === null) {
      outsideWindows.push(item)
      continue
    }

    const candidates = candidatesByMonth.get(month) ?? []
    candidates.push({ date, offsetDays: daysBetween(lastDayOfMonth(month), date), item })
    candidatesByMonth.set(month, candidates)
  }

  const candidateMonths = [...candidatesByMonth.keys()].sort()

  if (candidateMonths.length === 0)
    return { months: [], outsideWindows }

  const months = monthsFromTo(candidateMonths[0], candidateMonths[candidateMonths.length - 1]).map(month => {
    const candidates = (candidatesByMonth.get(month) ?? []).sort((a, b) => a.date.localeCompare(b.date))
    const chosen = candidates.reduce<Candidate<T> | null>(
      (best, candidate) => (best === null || Math.abs(candidate.offsetDays) < Math.abs(best.offsetDays) ? candidate : best),
      null
    )

    return { month, chosen, candidates }
  })

  return { months, outsideWindows }
}

function windowMonth(date: IsoDate): Month | null {
  const day = Number(date.slice(8, 10))

  if (day >= windowFirstDay)
    return monthOfDate(date)

  return day <= windowLastDayOfNextMonth ? addMonths(monthOfDate(date), -1) : null
}
