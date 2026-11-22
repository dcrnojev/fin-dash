import { describe, expect, it } from 'vitest'
import type { Cents, Month } from '../domain/types.ts'
import { goalTargets } from './goalTargets.ts'
import type { MonthTotal } from './monthEndHistory.ts'

function monthTotal(month: string, sums: Partial<Pick<MonthTotal, 'total' | 'estimatedTotal' | 'knownPart'>>): MonthTotal {
  return { month: month as Month, isGap: false, total: null, estimatedTotal: null, knownPart: null, knownPartIncludesEstimates: false, ...sums }
}

const goal = 500_00 as Cents

describe('goalTargets', () => {
  it("adds the goal to the previous month's total, measured or estimated", () => {
    const months = [
      monthTotal('2030-01', { total: 10_000_00 as Cents }),
      monthTotal('2030-02', { estimatedTotal: 10_200_00 as Cents }),
      monthTotal('2030-03', { total: 10_900_00 as Cents }),
    ]

    expect([...goalTargets(months, goal)]).toEqual([
      ['2030-02', 10_500_00],
      ['2030-03', 10_700_00],
    ])
  })

  it('has no target after a month with only a known part or no total, nor for the first month of the history', () => {
    const months = [
      monthTotal('2030-01', { total: 10_000_00 as Cents }),
      monthTotal('2030-02', { knownPart: 9_000_00 as Cents }),
      monthTotal('2030-03', {}),
      monthTotal('2030-04', { total: 11_000_00 as Cents }),
    ]

    expect([...goalTargets(months, goal).keys()]).toEqual(['2030-02'])
  })
})
