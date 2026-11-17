import type { Issue, RowRef, TabName } from '../types.ts'

// A cell as read with unformatted values: dates arrive as serial numbers.
export type Cell = string | number | boolean | null
export type CellValue = string | number | boolean

export type ColumnType = 'id' | 'ref' | 'month' | 'money' | 'date' | 'rate' | 'int' | 'enum' | 'text'

export interface ColumnSpec {
  name: string
  type: ColumnType
  required: boolean
  ref?: TabName
  values?: readonly string[]
}

export interface TabSpec<T> {
  name: TabName
  columns: readonly ColumnSpec[]
  key(value: T): string
  // Null means the row was skipped; the reason is in `issues`.
  fromRow(cells: Readonly<Record<string, Cell>>, ref: RowRef, issues: Issue[]): T | null
  toRow(value: T): Record<string, CellValue>
}
