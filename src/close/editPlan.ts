import type { CellUpdate } from '../data/types.ts'
import { headerPositions } from '../domain/schema/headerPositions.ts'
import { monthEndBalancesTab } from '../domain/schema/monthEndBalancesTab.ts'
import { rowsByKey } from '../domain/schema/rowsByKey.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'
import type { IsoDate, Month, MonthEndBalance } from '../domain/types.ts'
import { displayMonth } from '../format.ts'
import type { EnteredField } from './closeEntries.ts'
import { fieldLabel, type CloseField, type EnteredValue } from './closeForm.ts'
import { monthEndBalanceRow } from './closeRows.ts'

export interface ValueChange {
  field: CloseField
  // The row the sheet had when the form opened; null for a value being added.
  before: EnteredValue | null
  after: EnteredValue
}

export interface EditPlan {
  // The value, as_of and source cells of each changed row; no other cell is touched.
  updates: CellUpdate[]
  // The changed rows as they will read once the updates are in.
  updated: MonthEndBalance[]
  // Rows for values the month had none for, appended after the updates.
  added: MonthEndBalance[]
}

const updatedColumns = ['value', 'as_of', 'source'] as const

export function valueChanges(fields: readonly EnteredField[]): ValueChange[] {
  return fields
    .filter(({ field, entered }) => {
      const before = field.alreadyWritten
      return before === null || before.value !== entered.value || before.asOf !== entered.asOf
    })
    .map(({ field, entered }) => ({ field, before: field.alreadyWritten, after: entered }))
}

// Finds each changed row by its key (month, group_id, balance_id) in a fresh read of the month_end_balances tab, header row first,
// and plans the cells to overwrite. Throws, before anything is written, when a key is missing or appears more than once,
// or when the header lacks a column the update needs.
export function planEdit(
  month: Month,
  changes: readonly ValueChange[],
  monthEndBalancesValues: readonly (readonly Cell[])[],
  writtenOn: IsoDate
): EditPlan {
  const rowsInSheet = rowsByKey(monthEndBalancesTab, monthEndBalancesValues)
  const plannedRow = (change: ValueChange) => monthEndBalanceRow(month, { field: change.field, entered: change.after }, writtenOn)
  const problems: string[] = []
  const located: { sheetRow: number; monthEndBalance: MonthEndBalance }[] = []

  for (const change of changes.filter(change => change.before !== null)) {
    const planned = plannedRow(change)
    const rows = rowsInSheet.get(monthEndBalancesTab.key(planned)) ?? []

    if (rows.length === 1) {
      const { value, asOf, source } = planned
      located.push({ sheetRow: rows[0].row, monthEndBalance: { ...rows[0].value, value, asOf, source } })
    } else if (rows.length === 0)
      problems.push(`${fieldLabel(change.field)} has no row`)
    else
      problems.push(`${fieldLabel(change.field)} has ${rows.length} rows (rows ${rows.map(({ row }) => row).join(', ')})`)
  }

  if (problems.length > 0) {
    const fix = 'Fix the tab by hand so each value has exactly one row, then read the sheet again.'
    throw new Error(`In the month_end_balances tab for ${displayMonth(month)}, ${problems.join('; ')}. ${fix}`)
  }

  const positions = headerPositions(monthEndBalancesValues[0] ?? [])
  const missingColumns = updatedColumns.filter(name => !positions.has(name))

  if (missingColumns.length > 0)
    throw new Error(`Add ${missingColumns.join(' and ')} to the header row of the month_end_balances tab, then try again.`)

  const updates = located.flatMap(({ sheetRow, monthEndBalance }) => {
    const cells = monthEndBalancesTab.toRow(monthEndBalance)

    return updatedColumns.flatMap((name): CellUpdate[] => {
      const column = positions.get(name)
      return column === undefined ? [] : [{ tab: monthEndBalancesTab.name, row: sheetRow, column, value: cells[name] }]
    })
  })

  const added = changes.filter(change => change.before === null).map(plannedRow)

  return { updates, updated: located.map(({ monthEndBalance }) => monthEndBalance), added }
}
