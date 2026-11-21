import { describe, expect, it } from 'vitest'
import { monthRecords, pot, snapshot } from '../close/closeTestData.ts'
import type { Month } from '../domain/types.ts'
import { monthByPot } from './monthByPot.ts'
import { snapshotHistory } from './snapshotHistory.ts'

const pots = [pot('savings', 'cash', 20), pot('current', 'cash', 10), pot('broker', 'investment', 30), pot('pension-a', 'pension', 40)]

describe('monthByPot', () => {
  it('lists the pots of each kind in sort order with their colour place, value and change since the month before', () => {
    const snapshots = [
      snapshot('2030-01', 'current', 100_00),
      snapshot('2030-02', 'current', 150_00),
      snapshot('2030-01', 'savings', 400_00),
      snapshot('2030-02', 'savings', 400_00),
      snapshot('2030-02', 'broker', 1_000_00),
      snapshot('2030-02', 'pension-a', 5_000_00),
    ]

    const groups = monthByPot(snapshotHistory({ pots, holdings: [], snapshots, months: new Map() }), '2030-02' as Month)

    expect(groups.map(group => group.kind)).toEqual(['cash', 'investment', 'pension'])
    expect(groups[0].total).toEqual({ cents: 550_00, state: 'measured', includesEstimates: false })
    expect(groups[0].pots.map(line => [line.pot.id, line.position, line.value?.cents, line.changeRatio])).toEqual([
      ['current', 0, 150_00, 0.5],
      ['savings', 1, 400_00, 0],
    ])
    expect(groups[1].pots[0].changeRatio).toBeNull()
  })

  it('shows an unknown pot without a value and makes its group total a lower bound', () => {
    const snapshots = [snapshot('2030-01', 'current', 100_00), snapshot('2030-02', 'savings', 400_00), snapshot('2030-01', 'savings', 300_00)]

    const [cash] = monthByPot(snapshotHistory({ pots, holdings: [], snapshots, months: new Map() }), '2030-02' as Month)

    expect(cash.pots.find(line => line.pot.id === 'current')?.value).toBeNull()
    expect(cash.total).toEqual({ cents: 400_00, state: 'at-least', includesEstimates: false })
  })

  it('leaves out a kind with no pot tracked that month, and a month outside the history', () => {
    const snapshots = [snapshot('2030-01', 'current', 100_00), snapshot('2030-02', 'current', 120_00)]
    const history = snapshotHistory({ pots, holdings: [], snapshots, months: monthRecords(['2030-03', 'gap']) })

    expect(monthByPot(history, '2030-02' as Month).map(group => group.kind)).toEqual(['cash'])
    expect(monthByPot(history, '2031-01' as Month)).toEqual([])
  })
})
