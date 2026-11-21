import { householdOwner } from '../ids.ts'
import type { Balance, BalanceId, GroupId, OwnerId } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'id', type: 'id', required: true },
  { name: 'group_id', type: 'ref', required: true, ref: 'groups' },
  { name: 'label', type: 'text', required: true },
  { name: 'owner', type: 'ref', required: false, ref: 'people' },
  { name: 'code', type: 'text', required: false },
  { name: 'opened_month', type: 'month', required: false },
  { name: 'closed_month', type: 'month', required: false },
  { name: 'note', type: 'text', required: false },
]

export const balancesTab: TabSpec<Balance> = {
  name: 'balances',
  columns,
  key: balance => balance.id,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const id = read.id<BalanceId>('id')
    const group = read.id<GroupId>('group_id')
    const label = read.text('label')
    const owner = read.id<OwnerId>('owner') ?? householdOwner
    const code = read.text('code')
    const opened = read.month('opened_month')
    const closed = read.month('closed_month')
    const note = read.text('note')

    if (id === null || group === null || label === null || !read.ok)
      return null

    return { id, group, label, owner, code, opened, closed, note }
  },
  toRow: balance => ({
    id: balance.id,
    group_id: balance.group,
    label: balance.label,
    // Blank means household, so a balances tab made before the owner column takes household balances without it.
    owner: balance.owner === householdOwner ? '' : balance.owner,
    code: optionalCell(balance.code),
    opened_month: optionalCell(balance.opened),
    closed_month: optionalCell(balance.closed),
    note: optionalCell(balance.note),
  }),
}
