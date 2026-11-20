import { describe, expect, it } from 'vitest'
import type { IsoDate, Month } from '../domain/types.ts'
import { closesBeforeMonthEnd } from './closesEarly.ts'

describe('closesBeforeMonthEnd', () => {
  it('is true before the last day of the month and false from that day on', () => {
    const february = '2032-02' as Month
    const early = ['2032-02-01', '2032-02-28'] as IsoDate[]
    const onTime = ['2032-02-29', '2032-03-01', '2033-01-15'] as IsoDate[]

    expect(early.map(today => closesBeforeMonthEnd(february, today))).toEqual([true, true])
    expect(onTime.map(today => closesBeforeMonthEnd(february, today))).toEqual([false, false, false])
  })
})
