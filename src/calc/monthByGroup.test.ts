import { describe, expect, it } from 'vitest'
import { group, monthEndBalance, monthRecords } from '../close/closeTestData.ts'
import type { Month } from '../domain/types.ts'
import { monthByGroup } from './monthByGroup.ts'
import { monthEndHistory } from './monthEndHistory.ts'

const groups = [group('savings', 'cash', 20), group('current', 'cash', 10), group('broker', 'investment', 30), group('pension-a', 'pension', 40)]

describe('monthByGroup', () => {
  it('lists the groups of each kind in sort order with their colour place, value and change since the month before', () => {
    const monthEndBalances = [
      monthEndBalance('2030-01', 'current', 100_00),
      monthEndBalance('2030-02', 'current', 150_00),
      monthEndBalance('2030-01', 'savings', 400_00),
      monthEndBalance('2030-02', 'savings', 400_00),
      monthEndBalance('2030-02', 'broker', 1_000_00),
      monthEndBalance('2030-02', 'pension-a', 5_000_00),
    ]

    const sections = monthByGroup(monthEndHistory({ groups, balances: [], monthEndBalances, months: new Map() }), '2030-02' as Month)

    expect(sections.map(section => section.kind)).toEqual(['cash', 'investment', 'pension'])
    expect(sections[0].total).toEqual({ cents: 550_00, state: 'measured', includesEstimates: false })
    expect(sections[0].groups.map(line => [line.group.id, line.position, line.value?.cents, line.changeRatio])).toEqual([
      ['current', 0, 150_00, 0.5],
      ['savings', 1, 400_00, 0],
    ])
    expect(sections[1].groups[0].changeRatio).toBeNull()
  })

  it('shows an unknown group without a value and makes the total of its kind a lower bound', () => {
    const groupsWithNewCurrent = groups.map(entry => (entry.id === 'current' ? { ...entry, opened: '2030-02' as Month } : entry))
    const monthEndBalances = [monthEndBalance('2030-02', 'savings', 400_00), monthEndBalance('2030-01', 'savings', 300_00)]
    const history = monthEndHistory({ groups: groupsWithNewCurrent, balances: [], monthEndBalances, months: new Map() })

    const [cash] = monthByGroup(history, '2030-02' as Month)

    expect(cash.groups.find(line => line.group.id === 'current')?.value).toBeNull()
    expect(cash.total).toEqual({ cents: 400_00, state: 'at-least', includesEstimates: false })
  })

  it('leaves out a kind with no group tracked that month, and a month outside the history', () => {
    const monthEndBalances = [monthEndBalance('2030-01', 'current', 100_00), monthEndBalance('2030-02', 'current', 120_00)]
    const history = monthEndHistory({ groups, balances: [], monthEndBalances, months: monthRecords(['2030-03', 'gap']) })

    expect(monthByGroup(history, '2030-02' as Month).map(section => section.kind)).toEqual(['cash'])
    expect(monthByGroup(history, '2031-01' as Month)).toEqual([])
  })
})
