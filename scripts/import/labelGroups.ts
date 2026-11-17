import type { Month, PotId } from '../../src/domain/types.ts'
import type { LegacySnapshotRow } from './cashBalanceSheet.ts'
import type { MonthEndChoice } from './monthEndChoice.ts'

const exampleCellCount = 3

// Parts of the imported inline sums, grouped by column, position in the formula and number of parts: instrument values
// change every month, but their place in the formula stays the same, so the owner labels a group once.
export interface LabelGroup {
  groupId: string
  pot: PotId
  column: string
  partPosition: number
  partCount: number
  occurrences: number
  months: Month[]
  exampleCells: string[]
  negativeParts: number
}

export function labelGroups(choices: readonly MonthEndChoice<LegacySnapshotRow>[]): LabelGroup[] {
  const groups = new Map<string, LabelGroup>()

  for (const choice of choices) {
    for (const amount of choice.chosen?.item.amounts ?? []) {
      if (amount.form !== 'inline-sum')
        continue

      for (const part of amount.parts) {
        const groupId = `${amount.pot}-${amount.parts.length}p-${part.position}`
        const group = groups.get(groupId) ?? {
          groupId,
          pot: amount.pot,
          column: amount.header,
          partPosition: part.position,
          partCount: amount.parts.length,
          occurrences: 0,
          months: [],
          exampleCells: [],
          negativeParts: 0,
        }

        group.occurrences++
        group.months.push(choice.month)

        if (group.exampleCells.length < exampleCellCount)
          group.exampleCells.push(amount.address)

        if (part.cents < 0)
          group.negativeParts++

        groups.set(groupId, group)
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.groupId.localeCompare(b.groupId, 'en', { numeric: true }))
}
