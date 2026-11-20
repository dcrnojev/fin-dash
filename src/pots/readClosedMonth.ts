import { monthIndex, parseMonth } from '../domain/month.ts'
import type { Month } from '../domain/types.ts'
import { displayMonth } from '../format.ts'

export type ReadClosedMonth = { status: 'valid'; closed: Month | null } | { status: 'invalid'; problem: string }

// A blank closed month keeps it open. A set one may not come before the opened month, nor before the latest month that
// has a snapshot or contribution row for it: the validator leaves out a pot's rows after its closed month.
export function readClosedMonth(text: string, opened: Month | null, rowMonths: readonly Month[]): ReadClosedMonth {
  const trimmed = text.trim()

  if (trimmed === '')
    return { status: 'valid', closed: null }

  const closed = parseMonth(trimmed)

  if (closed === null)
    return { status: 'invalid', problem: 'Type the closed month as YYYY-MM, or leave it blank while it is open.' }

  if (opened !== null && monthIndex(closed) < monthIndex(opened))
    return { status: 'invalid', problem: `It opened in ${displayMonth(opened)}, so it cannot close before that.` }

  const latestRowMonth = rowMonths.reduce<Month | null>(
    (latest, month) => (latest === null || monthIndex(month) > monthIndex(latest) ? month : latest),
    null
  )

  if (latestRowMonth !== null && monthIndex(closed) < monthIndex(latestRowMonth)) {
    const latest = displayMonth(latestRowMonth)
    return { status: 'invalid', problem: `It has values up to ${latest}, so it cannot close before ${latest}; that would hide them.` }
  }

  return { status: 'valid', closed }
}
