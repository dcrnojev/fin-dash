import { monthFigure, potFigure } from '../../calc/monthFigure'
import type { MonthTotal, QualifiedCents } from '../../calc/snapshotHistory'
import { displayFigure } from '../../format'

// A pot's value in a month: undefined when the pot is not tracked yet, null when it is unknown.
export function potValueText(value: QualifiedCents | null | undefined, hidden: boolean): string {
  if (value === undefined)
    return ''

  return value === null ? 'unknown' : displayFigure(potFigure(value), hidden)
}

export function totalText(month: MonthTotal, hidden: boolean): string {
  const figure = monthFigure(month)

  if (figure !== null)
    return displayFigure(figure, hidden)

  return month.isGap ? 'gap' : 'unknown'
}
