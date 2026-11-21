import { contributionKinds, fundings, sources, type BalanceId, type Contribution, type GroupId } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { dateCell, moneyCell, optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'month', type: 'month', required: true },
  { name: 'group_id', type: 'ref', required: true, ref: 'groups' },
  { name: 'balance_id', type: 'ref', required: false, ref: 'balances' },
  { name: 'amount', type: 'money', required: true },
  { name: 'kind', type: 'enum', required: true, values: contributionKinds },
  { name: 'funding', type: 'enum', required: true, values: fundings },
  { name: 'date', type: 'date', required: false },
  { name: 'source', type: 'enum', required: false, values: sources },
  { name: 'source_ref', type: 'text', required: false },
  { name: 'note', type: 'text', required: false },
]

export const contributionsTab: TabSpec<Contribution> = {
  name: 'contributions',
  columns,
  key: contribution => `${contribution.month}|${contribution.group}|${contribution.balance ?? ''}|${contribution.kind}`,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const month = read.month('month')
    const group = read.id<GroupId>('group_id')
    const balance = read.id<BalanceId>('balance_id')
    const amount = read.money('amount')
    const kind = read.choice('kind', contributionKinds)
    const funding = read.choice('funding', fundings)
    const date = read.date('date')
    const source = read.choice('source', sources) ?? 'hand'
    const sourceRef = read.text('source_ref')
    const note = read.text('note')

    if (amount !== null && amount < 0)
      read.addError('amount', 'negative-amount', 'Amounts are positive; a withdrawal is a row with kind withdrawal.')

    if (month === null || group === null || amount === null || kind === null || funding === null || !read.ok)
      return null

    return { month, group, balance, amount, kind, funding, date, source, sourceRef, note, ref }
  },
  toRow: contribution => ({
    month: contribution.month,
    group_id: contribution.group,
    balance_id: optionalCell(contribution.balance),
    amount: moneyCell(contribution.amount),
    kind: contribution.kind,
    funding: contribution.funding,
    date: dateCell(contribution.date),
    source: contribution.source,
    source_ref: optionalCell(contribution.sourceRef),
    note: optionalCell(contribution.note),
  }),
}
