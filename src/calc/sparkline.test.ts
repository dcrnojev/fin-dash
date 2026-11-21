import { describe, expect, it } from 'vitest'
import type { Cents, Month } from '../domain/types.ts'
import { sparkline } from './sparkline.ts'
import type { MonthTotal } from './snapshotHistory.ts'

const empty: Omit<MonthTotal, 'month'> = { isGap: false, total: null, estimatedTotal: null, knownPart: null, knownPartIncludesEstimates: false }

const measured = (month: string, cents: number): MonthTotal => ({ ...empty, month: month as Month, total: cents as Cents })
const estimated = (month: string, cents: number): MonthTotal => ({ ...empty, month: month as Month, estimatedTotal: cents as Cents })
const atLeast = (month: string, cents: number): MonthTotal => ({ ...empty, month: month as Month, knownPart: cents as Cents })
const unknown = (month: string): MonthTotal => ({ ...empty, month: month as Month })

describe('sparkline', () => {
  it('takes the months ending with the given one and leaves months before the history empty', () => {
    const line = sparkline([measured('2030-01', 100), measured('2030-02', 200)], '2030-02' as Month, 4)

    expect(line.figures.map(figure => figure?.cents ?? null)).toEqual([null, null, 100, 200])
    expect(line.segments).toEqual([{ from: 2, to: 3, state: 'measured' }])
  })

  it('draws a stretch touching an estimate as estimated and one touching a lower bound as at least', () => {
    const months = [
      measured('2030-01', 100),
      measured('2030-02', 110),
      estimated('2030-03', 120),
      measured('2030-04', 130),
      atLeast('2030-05', 90),
      measured('2030-06', 150),
    ]

    expect(sparkline(months, '2030-06' as Month, 6).segments).toEqual([
      { from: 0, to: 1, state: 'measured' },
      { from: 1, to: 3, state: 'estimated' },
      { from: 3, to: 5, state: 'at-least' },
    ])
  })

  it('breaks the line at an unknown month and marks a known month left with no neighbour', () => {
    const months = [measured('2030-01', 100), unknown('2030-02'), measured('2030-03', 120), unknown('2030-04'), measured('2030-05', 140)]
    const line = sparkline(months, '2030-05' as Month, 5)

    expect(line.segments).toEqual([])
    expect(line.isolated).toEqual([0, 2, 4])
  })
})
