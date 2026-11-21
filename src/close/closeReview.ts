import type { KindHistory, MonthEndHistory } from '../calc/monthEndHistory.ts'
import { sumCents } from '../domain/money.ts'
import { addMonths } from '../domain/month.ts'
import type { Cents, Month } from '../domain/types.ts'
import type { EnteredField } from './closeEntries.ts'
import { fieldLabel } from './closeForm.ts'

export type ReviewKind = 'cash' | 'investment' | 'pension'

export interface ReviewLine {
  key: string
  label: string
  value: Cents
  // Against last month's row at the same level; null when there is none.
  change: Cents | null
}

export interface PreviousTotal {
  cents: Cents
  isEstimated: boolean
}

export interface ReviewSection {
  kind: ReviewKind
  total: Cents
  // Last month's total of the kind; null when it is not complete, even with estimates.
  previous: PreviousTotal | null
  lines: ReviewLine[]
}

const reviewKinds: readonly ReviewKind[] = ['cash', 'investment', 'pension']

// The totals of the values about to be written, per kind, next to last month's. Kinds with no field are left out.
export function closeReview(fields: readonly EnteredField[], history: MonthEndHistory, month: Month): ReviewSection[] {
  const kindHistories: Record<ReviewKind, KindHistory> = {
    cash: history.cash,
    investment: history.investments,
    pension: history.pensions,
  }

  return reviewKinds.flatMap(kind => {
    const lines = fields
      .filter(({ field }) => field.group.kind === kind)
      .map(({ field, entered }): ReviewLine => ({
        key: field.key,
        label: fieldLabel(field),
        value: entered.value,
        change: field.lastMonth === null ? null : ((entered.value - field.lastMonth.value) as Cents),
      }))

    if (lines.length === 0)
      return []

    const total = sumCents(lines.map(line => line.value))
    return [{ kind, total, previous: previousTotal(kindHistories[kind], addMonths(month, -1)), lines }]
  })
}

function previousTotal(kindHistory: KindHistory, previousMonth: Month): PreviousTotal | null {
  const previous = kindHistory.months.find(entry => entry.month === previousMonth)

  if (previous === undefined)
    return null

  if (previous.total !== null)
    return { cents: previous.total, isEstimated: false }

  return previous.estimatedTotal === null ? null : { cents: previous.estimatedTotal, isEstimated: true }
}
