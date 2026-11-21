import { describe, expect, it } from 'vitest'
import { monthEndBalance, monthRecords } from './closeTestData.ts'
import { nextMonthToClose } from './nextMonthToClose.ts'

describe('nextMonthToClose', () => {
  it('is the month after the latest legacy, gap or closed month, ignoring open rows', () => {
    const months = monthRecords(['2030-01', 'legacy'], ['2030-02', 'gap'], ['2030-03', 'closed'], ['2030-04', 'open'])

    expect(nextMonthToClose({ months, monthEndBalances: [monthEndBalance('2030-01', 'cash-a', 100)] })).toBe('2030-04')
  })

  it('stays on a month whose close failed after its month-end balance rows were written', () => {
    const months = monthRecords(['2030-01', 'legacy'])
    const monthEndBalances = [monthEndBalance('2030-01', 'cash-a', 100), monthEndBalance('2030-02', 'cash-a', 110)]

    expect(nextMonthToClose({ months, monthEndBalances })).toBe('2030-02')
  })

  it('without a settled month, is the earliest month-end balance month that has no months row', () => {
    const monthEndBalances = [
      monthEndBalance('2030-12', 'cash-a', 100),
      monthEndBalance('2030-10', 'cash-a', 80),
      monthEndBalance('2030-11', 'cash-a', 90),
    ]

    expect(nextMonthToClose({ months: monthRecords(['2030-10', 'open']), monthEndBalances })).toBe('2030-11')
  })

  it('then falls back to the month after the latest month-end balance, across a year end, and is null for an empty sheet', () => {
    const monthEndBalances = [monthEndBalance('2030-12', 'cash-a', 100), monthEndBalance('2030-11', 'cash-a', 90)]

    expect(nextMonthToClose({ months: monthRecords(['2030-11', 'open'], ['2030-12', 'open']), monthEndBalances })).toBe('2031-01')
    expect(nextMonthToClose({ months: new Map(), monthEndBalances: [] })).toBeNull()
  })
})
