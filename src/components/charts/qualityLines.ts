import type { MonthTotal, QualifiedCents } from '../../calc/monthEndHistory'

export interface QualityLines {
  // One entry per month: the value to draw, or null for no point.
  measured: (number | null)[]
  estimated: (number | null)[]
  isEstimatedMonth: boolean[]
}

// Splits one series into the solid line of measured months and the dotted line of estimated ones. The dotted line also
// takes the measured month on each side of an estimated stretch, so it joins the solid line instead of floating.
// Unknown months are null in both, so neither line is drawn through them.
export function splitByQuality(values: readonly (QualifiedCents | null | undefined)[]): QualityLines {
  const isEstimatedMonth = values.map(value => value?.quality === 'estimated')

  return {
    measured: values.map(value => (value?.quality === 'measured' ? value.cents : null)),
    estimated: values.map((value, position) => {
      if (value === null || value === undefined)
        return null

      const touchesEstimate = isEstimatedMonth[position] || isEstimatedMonth[position - 1] || isEstimatedMonth[position + 1]
      return touchesEstimate ? value.cents : null
    }),
    isEstimatedMonth,
  }
}

// A month's total in the same shape as a group value, so totals split the same way.
export function totalValue(month: MonthTotal): QualifiedCents | null {
  if (month.total !== null)
    return { cents: month.total, quality: 'measured' }

  return month.estimatedTotal === null ? null : { cents: month.estimatedTotal, quality: 'estimated' }
}
