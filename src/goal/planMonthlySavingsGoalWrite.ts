import type { CellUpdate, CellValue } from '../data/types.ts'
import { centsToEuros } from '../domain/money.ts'
import { headerPositions } from '../domain/schema/headerPositions.ts'
import { metaKeys } from '../domain/schema/meta.ts'
import { metaTab } from '../domain/schema/metaTab.ts'
import { missingColumnsMessage } from '../domain/schema/missingColumnsMessage.ts'
import { rowsByKey } from '../domain/schema/rowsByKey.ts'
import { rowsForHeader } from '../domain/schema/rowsForHeader.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'
import type { Cents } from '../domain/types.ts'

export type MonthlySavingsGoalWrite =
  | { kind: 'update'; updates: CellUpdate[] }
  | { kind: 'append'; rows: CellValue[][] }
  // Removing a goal the tab has no row for.
  | { kind: 'nothing' }

// From a fresh read of `_meta`, header row first: overwrites the value cell of the goal's row, or appends the row when
// the tab has none. A null goal clears the cell. Throws, before anything is written, when the key has more than one row
// or the header lacks a column the write needs.
export function planMonthlySavingsGoalWrite(values: readonly (readonly Cell[])[], goal: Cents | null): MonthlySavingsGoalWrite {
  const key = metaKeys.monthlySavingsGoal
  const rows = rowsByKey(metaTab, values).get(key) ?? []
  const header = values[0] ?? []

  if (rows.length > 1) {
    const fix = 'Fix the tab by hand so the key has exactly one row, then try again.'
    throw new Error(`The _meta tab has ${rows.length} rows (rows ${rows.map(({ row }) => row).join(', ')}) with the key ${key}. ${fix}`)
  }

  const value = goal === null ? '' : centsToEuros(goal)

  if (rows.length === 0)
    return goal === null ? { kind: 'nothing' } : { kind: 'append', rows: rowsForHeader(metaTab, header, [{ key, value }]) }

  const valueColumn = headerPositions(header).get('value')

  if (valueColumn === undefined)
    throw new Error(missingColumnsMessage(metaTab.name, ['value']))

  return { kind: 'update', updates: [{ tab: metaTab.name, row: rows[0].row, column: valueColumn, value }] }
}
