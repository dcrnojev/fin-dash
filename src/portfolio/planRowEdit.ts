import type { CellUpdate } from '../data/types.ts'
import { headerPositions } from '../domain/schema/headerPositions.ts'
import { missingColumnsMessage } from '../domain/schema/missingColumnsMessage.ts'
import { rowsByKey } from '../domain/schema/rowsByKey.ts'
import type { Cell, TabSpec } from '../domain/schema/tabSpec.ts'
import { changedColumns } from './changedColumns.ts'

// Finds the row of `openedWith` by its id in a fresh read of the tab, header row first, and plans the cells of
// `editableColumns` that `edited` changes; no other cell is touched. Throws, before anything is written, when the id has
// no row or more than one, when an editable column of that row changed since the form opened, or when the header lacks
// a column that changes.
export function planRowEdit<T>(
  spec: TabSpec<T>,
  values: readonly (readonly Cell[])[],
  openedWith: T,
  edited: T,
  editableColumns: readonly string[]
): CellUpdate[] {
  const id = spec.key(openedWith)
  const rows = rowsByKey(spec, values).get(id) ?? []

  if (rows.length !== 1) {
    const found = rows.length === 0 ? 'no row' : `${rows.length} rows (rows ${rows.map(({ row }) => row).join(', ')})`
    const fix = 'Fix the tab by hand so the id has exactly one row, then read the sheet again.'
    throw new Error(`The ${spec.name} tab has ${found} with the id ${id}. ${fix}`)
  }

  const [{ row, value: inSheet }] = rows
  const changedSinceOpened = changedColumns(spec, openedWith, inSheet, editableColumns)

  if (changedSinceOpened.length > 0) {
    const changed = `Since this screen read the sheet, ${changedSinceOpened.join(' and ')} of ${id} changed in the ${spec.name} tab.`
    throw new Error(`${changed} Read the sheet again and edit from what it has now.`)
  }

  const changed = changedColumns(spec, openedWith, edited, editableColumns)
  const positions = headerPositions(values[0] ?? [])
  const missingColumns = changed.filter(column => !positions.has(column))

  if (missingColumns.length > 0)
    throw new Error(missingColumnsMessage(spec.name, missingColumns))

  const cells = spec.toRow(edited)

  return changed.flatMap((column): CellUpdate[] => {
    const position = positions.get(column)
    return position === undefined ? [] : [{ tab: spec.name, row, column: position, value: cells[column] ?? '' }]
  })
}
