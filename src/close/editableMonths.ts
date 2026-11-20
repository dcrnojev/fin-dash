import type { Ledger, Month } from '../domain/types.ts'

// The months whose values can be edited, latest first: closed ones and those from the legacy history.
export function editableMonths(months: Ledger['months']): Month[] {
  return [...months.values()]
    .filter(record => record.status === 'closed' || record.status === 'legacy')
    .map(record => record.month)
    .sort()
    .reverse()
}
