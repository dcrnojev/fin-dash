import { cadences, groupKinds, liquidities, type Group, type GroupId, type OwnerId, type ReturnBand } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'id', type: 'id', required: true },
  { name: 'label', type: 'text', required: true },
  { name: 'kind', type: 'enum', required: true, values: groupKinds },
  { name: 'owner', type: 'ref', required: true, ref: 'people' },
  { name: 'provider', type: 'text', required: false },
  { name: 'liquidity', type: 'enum', required: true, values: liquidities },
  { name: 'cadence', type: 'enum', required: true, values: cadences },
  { name: 'opened_month', type: 'month', required: false },
  { name: 'closed_month', type: 'month', required: false },
  { name: 'ret_low', type: 'rate', required: false },
  { name: 'ret_expected', type: 'rate', required: false },
  { name: 'ret_high', type: 'rate', required: false },
  { name: 'sort', type: 'int', required: true },
  { name: 'note', type: 'text', required: false },
]

export const groupsTab: TabSpec<Group> = {
  name: 'groups',
  columns,
  key: group => group.id,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const id = read.id<GroupId>('id')
    const label = read.text('label')
    const kind = read.choice('kind', groupKinds)
    const owner = read.id<OwnerId>('owner')
    const provider = read.text('provider')
    const liquidity = read.choice('liquidity', liquidities)
    const cadence = read.choice('cadence', cadences)
    const opened = read.month('opened_month')
    const closed = read.month('closed_month')
    const rates = [read.rate('ret_low'), read.rate('ret_expected'), read.rate('ret_high')]
    const sort = read.int('sort')
    const note = read.text('note')

    if (id === null || label === null || kind === null || owner === null || liquidity === null || cadence === null || sort === null)
      return null

    let returns: ReturnBand | null = null
    const [low, expected, high] = rates

    if (low !== null && expected !== null && high !== null) {
      returns = { low, expected, high }

      if (!(low <= expected && expected <= high))
        read.addError('ret_expected', 'invalid-return-band', 'The rates must satisfy ret_low <= ret_expected <= ret_high.')
    } else if (rates.some(rate => rate !== null)) {
      read.addError('ret_low', 'partial-return-band', 'Give all three rates or none.')
    } else if (kind === 'investment' || kind === 'pension') {
      read.addWarning('ret_expected', 'missing-return-band', 'Investment and pension groups need return rates for projections.')
    }

    if (!read.ok)
      return null

    return { id, label, kind, owner, provider, liquidity, cadence, opened, closed, returns, sort, note }
  },
  toRow: group => ({
    id: group.id,
    label: group.label,
    kind: group.kind,
    owner: group.owner,
    provider: optionalCell(group.provider),
    liquidity: group.liquidity,
    cadence: group.cadence,
    opened_month: optionalCell(group.opened),
    closed_month: optionalCell(group.closed),
    ret_low: optionalCell(group.returns?.low ?? null),
    ret_expected: optionalCell(group.returns?.expected ?? null),
    ret_high: optionalCell(group.returns?.high ?? null),
    sort: group.sort,
    note: optionalCell(group.note),
  }),
}
