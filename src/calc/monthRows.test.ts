import { describe, expect, it } from 'vitest'
import { monthRecords, pot, snapshot } from '../close/closeTestData.ts'
import type { Month } from '../domain/types.ts'
import { monthRows } from './monthRows.ts'
import { snapshotHistory } from './snapshotHistory.ts'

const pots = [pot('current', 'cash', 10), pot('broker', 'investment', 20), pot('pension-a', 'pension', 30)]

const snapshots = [
  snapshot('2030-01', 'current', 100_00),
  snapshot('2030-01', 'broker', 900_00),
  snapshot('2030-01', 'pension-a', 5_000_00),
  snapshot('2030-03', 'current', 300_00),
  snapshot('2030-03', 'broker', 1_100_00),
]

const records = monthRecords(['2030-01', 'legacy'], ['2030-02', 'gap'], ['2030-03', 'closed'])
const history = snapshotHistory({ pots, holdings: [], snapshots, months: records })

describe('monthRows', () => {
  it('lists every month latest first with its status and totals, pension apart from cash and investments', () => {
    const rows = monthRows(history, records, '2030-04' as Month)

    expect(rows.map(row => [row.month, row.status])).toEqual([
      ['2030-04', 'open'],
      ['2030-03', 'closed'],
      ['2030-02', 'gap'],
      ['2030-01', 'legacy'],
    ])

    expect(rows[3].combined).toEqual({ cents: 1_000_00, state: 'measured', includesEstimates: false })
    expect(rows[3].pensions?.cents).toBe(5_000_00)
    expect(rows[2].combined).toEqual({ cents: 1_200_00, state: 'estimated', includesEstimates: true })
    expect(rows[0].combined).toBeNull()
  })

  it('compares cash and investments with the month before, marking a change against an estimate', () => {
    const [, march, february, january] = monthRows(history, records, '2030-04' as Month)

    expect(january.change).toBeNull()
    expect(february.change?.amount).toBe(200_00)
    expect(february.changeIsEstimated).toBe(true)
    expect(march.change?.amount).toBe(200_00)
    expect(march.changeIsEstimated).toBe(true)
  })

  it('adds no row for the month to close when the history already has it', () => {
    expect(monthRows(history, records, '2030-03' as Month).map(row => row.month)).toEqual(['2030-03', '2030-02', '2030-01'])
  })
})
