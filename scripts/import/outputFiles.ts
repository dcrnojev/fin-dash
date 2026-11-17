import { serialToIsoDate } from '../../src/domain/date.ts'
import { tabColumns } from '../../src/domain/schema/tabColumns.ts'
import type { CellValue } from '../../src/domain/schema/tabSpec.ts'
import type { TabName } from '../../src/domain/types.ts'
import type { LegacySnapshotRow } from './cashBalanceSheet.ts'
import type { LabelGroup } from './labelGroups.ts'
import type { MonthEndSelection } from './monthEndChoice.ts'

// Tab rows as they will be written, with date serials shown as ISO dates so the review files are readable.
export function reviewRows(tab: TabName, values: readonly (readonly CellValue[])[]): CellValue[][] {
  const dateColumns = new Set(tabColumns[tab].flatMap((column, index) => (column.type === 'date' ? [index] : [])))

  const readable = (value: CellValue, index: number): CellValue =>
    dateColumns.has(index) && typeof value === 'number' ? (serialToIsoDate(value) ?? value) : value

  return values.map((row, rowIndex) => (rowIndex === 0 ? [...row] : row.map(readable)))
}

export function snapshotChoiceRows(selection: MonthEndSelection<LegacySnapshotRow>): CellValue[][] {
  const header = ['month', 'status', 'chosen_cell', 'as_of', 'offset_days', 'candidates', 'reason']

  const rows = selection.months.map(({ month, chosen, candidates }) => {
    const candidateList = candidates
      .map(candidate => `${candidate.item.dateAddress} ${candidate.date} (${signed(candidate.offsetDays)})`)
      .join('; ')

    if (chosen === null)
      return [month, 'gap', '', '', '', candidateList, 'no snapshot dated from the 20th of the month to the 5th of the next']

    const reason = candidates.length === 1 ? 'only candidate in the window' : `closest to month end of ${candidates.length} candidates`

    return [month, 'legacy', chosen.item.dateAddress, chosen.date, signed(chosen.offsetDays), candidateList, reason]
  })

  return [header, ...rows]
}

export function labelRows(groups: readonly LabelGroup[]): CellValue[][] {
  const header = ['group_id', 'pot_id', 'column', 'part_position', 'part_count', 'occurrences', 'months', 'example_cells', 'label']

  const rows = groups.map(group => [
    group.groupId,
    group.pot,
    group.column,
    group.partPosition,
    group.partCount,
    group.occurrences,
    group.months.join(' '),
    group.exampleCells.join(' '),
    '',
  ])

  return [header, ...rows]
}

function signed(days: number): string {
  return days > 0 ? `+${days}` : String(days)
}
