import { sources, type HoldingId, type PotId, type Snapshot } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { dateCell, moneyCell, optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'month', type: 'month', required: true },
  { name: 'pot_id', type: 'ref', required: true, ref: 'pots' },
  { name: 'holding_id', type: 'ref', required: false, ref: 'holdings' },
  { name: 'value', type: 'money', required: true },
  { name: 'as_of', type: 'date', required: false },
  { name: 'source', type: 'enum', required: false, values: sources },
  { name: 'source_ref', type: 'text', required: false },
  { name: 'note', type: 'text', required: false },
]

export const snapshotsTab: TabSpec<Snapshot> = {
  name: 'snapshots',
  columns,
  key: snapshot => `${snapshot.month}|${snapshot.pot}|${snapshot.holding ?? ''}`,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const month = read.month('month')
    const pot = read.id<PotId>('pot_id')
    const holding = read.id<HoldingId>('holding_id')
    const value = read.money('value')
    const asOf = read.date('as_of')
    const source = read.choice('source', sources) ?? 'hand'
    const sourceRef = read.text('source_ref')
    const note = read.text('note')

    if (month === null || pot === null || value === null || !read.ok)
      return null

    return { month, pot, holding, value, asOf, source, sourceRef, note, ref }
  },
  toRow: snapshot => ({
    month: snapshot.month,
    pot_id: snapshot.pot,
    holding_id: optionalCell(snapshot.holding),
    value: moneyCell(snapshot.value),
    as_of: dateCell(snapshot.asOf),
    source: snapshot.source,
    source_ref: optionalCell(snapshot.sourceRef),
    note: optionalCell(snapshot.note),
  }),
}
