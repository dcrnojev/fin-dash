import { decodeTab } from '../domain/schema/decodeTab.ts'
import { metaFromEntries } from '../domain/schema/meta.ts'
import { metaTab } from '../domain/schema/metaTab.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'

export type TabValues = Readonly<Record<string, readonly (readonly Cell[])[]>>

interface ColumnRename {
  from: string
  to: string
}

const groupColumn: ColumnRename = { from: 'pot_id', to: 'group_id' }
const balanceColumn: ColumnRename = { from: 'holding_id', to: 'balance_id' }

// What version 2 renamed; rows, values and every other tab and column stay as they were.
const changedTabs: readonly { tab: string; renamedFrom: string | null; columns: readonly ColumnRename[] }[] = [
  { tab: 'groups', renamedFrom: 'pots', columns: [] },
  { tab: 'balances', renamedFrom: 'holdings', columns: [groupColumn] },
  { tab: 'month_end_balances', renamedFrom: 'snapshots', columns: [groupColumn, balanceColumn] },
  { tab: 'contributions', renamedFrom: null, columns: [groupColumn, balanceColumn] },
]

const versionKey = 'schema_version'
const versionBefore = 1
export const versionAfter = 2

// Every tab the update reads: a renamed tab under both names, so an update that stopped halfway can carry on.
export const schemaUpdateTabs: readonly string[] = [
  '_meta',
  ...changedTabs.flatMap(({ tab, renamedFrom }) => (renamedFrom === null ? [tab] : [renamedFrom, tab])),
]

export interface HeaderRename {
  // The header cell's position in the row, counted from 0.
  column: number
  from: string
  to: string
}

export interface TabUpdate {
  // The tab's name from version 2 on.
  tab: string
  // The name the tab has now, when it still has to be renamed.
  renameFrom: string | null
  // Rows below the header that hold anything; none of them moves.
  rowCount: number
  headerRenames: HeaderRename[]
}

export interface CellPosition {
  // The sheet row number; the header row is 1.
  row: number
  column: number
}

export interface SchemaUpdatePlan {
  // Only the tabs with something left to change.
  tabs: TabUpdate[]
  // The `_meta` cell that holds schema_version, written last.
  versionCell: CellPosition | null
  // What stops the update before anything is written.
  problems: string[]
}

// The schema_version the spreadsheet holds, or null when `_meta` has no readable one.
export function storedSchemaVersion(values: TabValues): number | null {
  return metaFromEntries(decodeTab(metaTab, values._meta ?? [], []), [])?.schemaVersion ?? null
}

// The changes from version 1 to 2 that the tabs as they are now still need. A tab that already has its new name, or a
// header cell that already has its new text, is left alone, so planning again after an update that stopped halfway gives
// only what is left.
export function planSchemaUpdate(values: TabValues): SchemaUpdatePlan {
  const problems: string[] = []

  const tabs = changedTabs.flatMap(({ tab, renamedFrom, columns }): TabUpdate[] => {
    if (renamedFrom !== null && renamedFrom in values && tab in values) {
      problems.push(`The spreadsheet has both a ${renamedFrom} and a ${tab} tab; keep only the one with the data, then update.`)
      return []
    }

    const renameFrom = renamedFrom !== null && renamedFrom in values ? renamedFrom : null
    const rows = values[renameFrom ?? tab]

    if (rows === undefined)
      return []

    const headerRenames = headerRenamesOf(rows[0] ?? [], columns, renameFrom ?? tab, problems)

    if (renameFrom === null && headerRenames.length === 0)
      return []

    return [{ tab, renameFrom, rowCount: filledRowCount(rows), headerRenames }]
  })

  return { tabs, versionCell: versionCell(values._meta ?? [], problems), problems }
}

function headerRenamesOf(header: readonly Cell[], columns: readonly ColumnRename[], tabName: string, problems: string[]): HeaderRename[] {
  const names = header.map(cellText)

  return columns.flatMap(({ from, to }) => {
    const positions = names.flatMap((name, column) => (name === from ? [column] : []))

    if (positions.length > 0 && names.includes(to)) {
      problems.push(`The ${tabName} tab has both a ${from} and a ${to} column; keep only the one with the data, then update.`)
      return []
    }

    return positions.map(column => ({ column, from, to }))
  })
}

function versionCell(meta: readonly (readonly Cell[])[], problems: string[]): CellPosition | null {
  const header = (meta[0] ?? []).map(cellText)
  const keyColumn = header.indexOf('key')
  const valueColumn = header.indexOf('value')
  const rows = meta.flatMap((cells, index) => (index > 0 && cellText(cells[keyColumn] ?? null) === versionKey ? [index + 1] : []))

  if (keyColumn === -1 || valueColumn === -1 || rows.length !== 1) {
    problems.push(`The _meta tab needs exactly one ${versionKey} row, under key and value columns.`)
    return null
  }

  const stored = meta[rows[0] - 1][valueColumn] ?? null

  if (stored !== versionBefore) {
    problems.push(`The _meta tab has ${versionKey} ${cellText(stored)}, not ${versionBefore}; reload the page to see the spreadsheet as it is now.`)
    return null
  }

  return { row: rows[0], column: valueColumn }
}

function cellText(cell: Cell | undefined): string {
  return cell === null || cell === undefined ? '' : String(cell).trim()
}

function filledRowCount(rows: readonly (readonly Cell[])[]): number {
  return rows.slice(1).filter(cells => cells.some(cell => cellText(cell) !== '')).length
}
