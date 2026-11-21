import { sources, type BalanceId, type GroupId, type MonthEndBalance } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { dateCell, moneyCell, optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'month', type: 'month', required: true },
  { name: 'group_id', type: 'ref', required: true, ref: 'groups' },
  { name: 'balance_id', type: 'ref', required: false, ref: 'balances' },
  { name: 'value', type: 'money', required: true },
  { name: 'as_of', type: 'date', required: false },
  { name: 'source', type: 'enum', required: false, values: sources },
  { name: 'source_ref', type: 'text', required: false },
  { name: 'note', type: 'text', required: false },
]

export const monthEndBalancesTab: TabSpec<MonthEndBalance> = {
  name: 'month_end_balances',
  columns,
  key: monthEndBalance => `${monthEndBalance.month}|${monthEndBalance.group}|${monthEndBalance.balance ?? ''}`,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const month = read.month('month')
    const group = read.id<GroupId>('group_id')
    const balance = read.id<BalanceId>('balance_id')
    const value = read.money('value')
    const asOf = read.date('as_of')
    const source = read.choice('source', sources) ?? 'hand'
    const sourceRef = read.text('source_ref')
    const note = read.text('note')

    if (month === null || group === null || value === null || !read.ok)
      return null

    return { month, group, balance, value, asOf, source, sourceRef, note, ref }
  },
  toRow: monthEndBalance => ({
    month: monthEndBalance.month,
    group_id: monthEndBalance.group,
    balance_id: optionalCell(monthEndBalance.balance),
    value: moneyCell(monthEndBalance.value),
    as_of: dateCell(monthEndBalance.asOf),
    source: monthEndBalance.source,
    source_ref: optionalCell(monthEndBalance.sourceRef),
    note: optionalCell(monthEndBalance.note),
  }),
}
