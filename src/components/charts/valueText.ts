import type { MonthTotal, QualifiedCents } from '../../calc/snapshotHistory'
import { displayEuros } from '../../format'

// A pot's value in a month: undefined when the pot is not tracked yet, null when it is unknown.
export function potValueText(value: QualifiedCents | null | undefined, hidden: boolean): string {
  if (value === undefined)
    return ''

  if (value === null)
    return 'unknown'

  return withQuality(displayEuros(value.cents, hidden), value.quality === 'estimated')
}

export function totalText(month: MonthTotal, hidden: boolean): string {
  if (month.total !== null)
    return displayEuros(month.total, hidden)

  if (month.estimatedTotal !== null)
    return withQuality(displayEuros(month.estimatedTotal, hidden), true)

  if (month.knownPart !== null)
    return withQuality(`at least ${displayEuros(month.knownPart, hidden)}`, month.knownPartIncludesEstimates)

  return month.isGap ? 'gap' : 'unknown'
}

function withQuality(text: string, isEstimated: boolean): string {
  return isEstimated ? `${text} (estimated)` : text
}
