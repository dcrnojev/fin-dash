import type { Holding, HoldingId, PotId } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'id', type: 'id', required: true },
  { name: 'pot_id', type: 'ref', required: true, ref: 'pots' },
  { name: 'label', type: 'text', required: true },
  { name: 'code', type: 'text', required: false },
  { name: 'opened_month', type: 'month', required: false },
  { name: 'closed_month', type: 'month', required: false },
  { name: 'note', type: 'text', required: false },
]

export const holdingsTab: TabSpec<Holding> = {
  name: 'holdings',
  columns,
  key: holding => holding.id,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const id = read.id<HoldingId>('id')
    const pot = read.id<PotId>('pot_id')
    const label = read.text('label')
    const code = read.text('code')
    const opened = read.month('opened_month')
    const closed = read.month('closed_month')
    const note = read.text('note')

    if (id === null || pot === null || label === null || !read.ok)
      return null

    return { id, pot, label, code, opened, closed, note }
  },
  toRow: holding => ({
    id: holding.id,
    pot_id: holding.pot,
    label: holding.label,
    code: optionalCell(holding.code),
    opened_month: optionalCell(holding.opened),
    closed_month: optionalCell(holding.closed),
    note: optionalCell(holding.note),
  }),
}
