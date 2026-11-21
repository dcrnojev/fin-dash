import type { MonthTotal, QualifiedCents } from '../../calc/monthEndHistory'
import { groupFigure, monthFigure } from '../../calc/monthFigure'
import { displayFigure } from '../../format'

// A group's value in a month: undefined when the group is not tracked yet, null when it is unknown.
export function groupValueText(value: QualifiedCents | null | undefined, hidden: boolean): string {
  if (value === undefined)
    return ''

  return value === null ? 'unknown' : displayFigure(groupFigure(value), hidden)
}

export function totalText(month: MonthTotal, hidden: boolean): string {
  const figure = monthFigure(month)

  if (figure !== null)
    return displayFigure(figure, hidden)

  return month.isGap ? 'gap' : 'unknown'
}
