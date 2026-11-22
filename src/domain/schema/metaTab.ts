import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { RowReader } from './rowReader.ts'

export interface MetaEntry {
  key: string
  // Null for a key whose value cell is blank, which reads as if the key had no row: clearing the cell removes an optional value.
  value: string | number | null
}

const columns: readonly ColumnSpec[] = [
  { name: 'key', type: 'text', required: true },
  { name: 'value', type: 'text', required: true },
]

export const metaTab: TabSpec<MetaEntry> = {
  name: '_meta',
  columns,
  key: entry => entry.key,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const key = read.text('key')
    const isBlank = cells.value === null || (typeof cells.value === 'string' && cells.value.trim() === '')
    const value = typeof cells.value === 'number' ? cells.value : isBlank ? null : read.text('value')

    if (key === null || !read.ok)
      return null

    return { key, value }
  },
  toRow: entry => ({ key: entry.key, value: entry.value ?? '' }),
}
