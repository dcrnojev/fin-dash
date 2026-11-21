import { addMonths } from '../domain/month.ts'
import type { Month, Pot } from '../domain/types.ts'
import { monthFigure, type MonthFigure } from './monthFigure.ts'
import type { PotGroupHistory, QualifiedCents, SnapshotHistory } from './snapshotHistory.ts'

export type ByPotKind = 'cash' | 'investment' | 'pension'

export interface PotLine {
  pot: Pot
  // The pot's place among its group's pots, which picks its colour in the charts too.
  position: number
  // Null when the month's value is unknown.
  value: QualifiedCents | null
  // The change since the month before as a fraction of that month's value; null when either value is unknown or the
  // earlier one is zero.
  changeRatio: number | null
}

export interface PotKindGroup {
  kind: ByPotKind
  total: MonthFigure | null
  pots: PotLine[]
}

// Each pot tracked in `month`, grouped by kind in the order cash, investments, pension. A group with no pot tracked
// that month is left out.
export function monthByPot(history: SnapshotHistory, month: Month): PotKindGroup[] {
  const groups: { kind: ByPotKind; group: PotGroupHistory }[] = [
    { kind: 'cash', group: history.cash },
    { kind: 'investment', group: history.investments },
    { kind: 'pension', group: history.pensions },
  ]

  return groups.flatMap(({ kind, group }) => {
    const current = group.months.find(entry => entry.month === month)
    const previousMonth = addMonths(month, -1)
    const previous = group.months.find(entry => entry.month === previousMonth)

    if (current === undefined)
      return []

    const pots = group.pots.flatMap((pot, position): PotLine[] => {
      const value = current.potValues.get(pot.id)

      if (value === undefined)
        return []

      return [{ pot, position, value, changeRatio: changeRatio(previous?.potValues.get(pot.id), value) }]
    })

    return pots.length === 0 ? [] : [{ kind, total: monthFigure(current), pots }]
  })
}

function changeRatio(before: QualifiedCents | null | undefined, after: QualifiedCents | null): number | null {
  if (before === null || before === undefined || after === null || before.cents === 0)
    return null

  return (after.cents - before.cents) / Math.abs(before.cents)
}
