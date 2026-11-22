import { describe, expect, it } from 'vitest'
import type { Cents, Month } from '../domain/types.ts'
import { goalProgress } from './goalProgress.ts'
import type { MonthTotal } from './monthEndHistory.ts'

function monthTotal(month: string, sums: Partial<Pick<MonthTotal, 'total' | 'estimatedTotal' | 'knownPart'>>): MonthTotal {
  return { month: month as Month, isGap: false, total: null, estimatedTotal: null, knownPart: null, knownPartIncludesEstimates: false, ...sums }
}

const goal = 500_00 as Cents
const october = '2030-10' as Month

describe('goalProgress', () => {
  it('compares the change since the month before with the goal', () => {
    const months = [monthTotal('2030-09', { total: 10_000_00 as Cents }), monthTotal('2030-10', { total: 10_400_00 as Cents })]

    expect(goalProgress(months, october, goal)).toEqual({ change: 400_00, goal, ratio: 0.8, estimated: false })
  })

  it('marks the progress estimated when the month is estimated, and keeps a fall as a negative ratio', () => {
    const months = [monthTotal('2030-09', { total: 10_000_00 as Cents }), monthTotal('2030-10', { estimatedTotal: 9_900_00 as Cents })]

    expect(goalProgress(months, october, goal)).toEqual({ change: -100_00, goal, ratio: -0.2, estimated: true })
  })

  it('has no progress when either month has only a known part or is missing', () => {
    const partial = [monthTotal('2030-09', { total: 10_000_00 as Cents }), monthTotal('2030-10', { knownPart: 10_400_00 as Cents })]

    expect(goalProgress(partial, october, goal)).toBeNull()
    expect(goalProgress([monthTotal('2030-10', { total: 10_400_00 as Cents })], october, goal)).toBeNull()
  })
})
