import { addMonths } from '../domain/month.ts'
import type { Group, Month } from '../domain/types.ts'
import type { KindHistory, MonthEndHistory, QualifiedCents } from './monthEndHistory.ts'
import { monthFigure, type MonthFigure } from './monthFigure.ts'

export type ByGroupKind = 'cash' | 'investment' | 'pension'

export interface GroupLine {
  group: Group
  // The group's place among the groups of its kind, which picks its colour in the charts too.
  position: number
  // Null when the month's value is unknown.
  value: QualifiedCents | null
  // The change since the month before as a fraction of that month's value; null when either value is unknown or the
  // earlier one is zero.
  changeRatio: number | null
}

export interface KindSection {
  kind: ByGroupKind
  total: MonthFigure | null
  groups: GroupLine[]
}

// Each group tracked in `month`, by kind in the order cash, investments, pension. A kind with no group tracked that month
// is left out.
export function monthByGroup(history: MonthEndHistory, month: Month): KindSection[] {
  const kinds: { kind: ByGroupKind; kindHistory: KindHistory }[] = [
    { kind: 'cash', kindHistory: history.cash },
    { kind: 'investment', kindHistory: history.investments },
    { kind: 'pension', kindHistory: history.pensions },
  ]

  return kinds.flatMap(({ kind, kindHistory }) => {
    const current = kindHistory.months.find(entry => entry.month === month)
    const previousMonth = addMonths(month, -1)
    const previous = kindHistory.months.find(entry => entry.month === previousMonth)

    if (current === undefined)
      return []

    const groups = kindHistory.groups.flatMap((group, position): GroupLine[] => {
      const value = current.groupValues.get(group.id)

      if (value === undefined)
        return []

      return [{ group, position, value, changeRatio: changeRatio(previous?.groupValues.get(group.id), value) }]
    })

    return groups.length === 0 ? [] : [{ kind, total: monthFigure(current), groups }]
  })
}

function changeRatio(before: QualifiedCents | null | undefined, after: QualifiedCents | null): number | null {
  if (before === null || before === undefined || after === null || before.cents === 0)
    return null

  return (after.cents - before.cents) / Math.abs(before.cents)
}
