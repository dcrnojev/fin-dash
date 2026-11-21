import type { GroupId, Month } from '../../src/domain/types.ts'
import type { LegacyReadingRow } from './cashBalanceSheet.ts'
import type { MonthEndChoice } from './monthEndChoice.ts'

const exampleCellCount = 3

// Parts of the imported inline sums, grouped by column, position in the formula and number of parts: instrument values
// change every month, but their place in the formula stays the same, so the owner labels a slot once.
export interface LabelSlot {
  slotId: string
  group: GroupId
  column: string
  partPosition: number
  partCount: number
  occurrences: number
  months: Month[]
  exampleCells: string[]
  negativeParts: number
}

export function labelSlots(choices: readonly MonthEndChoice<LegacyReadingRow>[]): LabelSlot[] {
  const slots = new Map<string, LabelSlot>()

  for (const choice of choices) {
    for (const amount of choice.chosen?.item.amounts ?? []) {
      if (amount.form !== 'inline-sum')
        continue

      for (const part of amount.parts) {
        const slotId = `${amount.group}-${amount.parts.length}p-${part.position}`
        const slot = slots.get(slotId) ?? {
          slotId,
          group: amount.group,
          column: amount.header,
          partPosition: part.position,
          partCount: amount.parts.length,
          occurrences: 0,
          months: [],
          exampleCells: [],
          negativeParts: 0,
        }

        slot.occurrences++
        slot.months.push(choice.month)

        if (slot.exampleCells.length < exampleCellCount)
          slot.exampleCells.push(amount.address)

        if (part.cents < 0)
          slot.negativeParts++

        slots.set(slotId, slot)
      }
    }
  }

  return [...slots.values()].sort((a, b) => a.slotId.localeCompare(b.slotId, 'en', { numeric: true }))
}
