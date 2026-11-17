import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { RowReader } from './rowReader.ts'

export interface MetaEntry {
  key: string
  value: string | number
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
    const value = typeof cells.value === 'number' ? cells.value : read.text('value')

    if (key === null || value === null || !read.ok)
      return null

    return { key, value }
  },
  toRow: entry => ({ key: entry.key, value: entry.value }),
}
