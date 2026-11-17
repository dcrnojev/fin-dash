import { describe, expect, it } from 'vitest'
import { hasMoreThanTwoDecimals, toCents } from './money.ts'

describe('toCents', () => {
  it('absorbs floating-point noise in amounts with two decimals', () => {
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(1234.6 + 987.3)).toBe(222190)
    expect(hasMoreThanTwoDecimals(0.1 + 0.2)).toBe(false)
    expect(hasMoreThanTwoDecimals(1234.6 + 987.3)).toBe(false)
  })

  it('rounds amounts with more than two decimals and reports them', () => {
    expect(toCents(12.346)).toBe(1235)
    expect(hasMoreThanTwoDecimals(12.346)).toBe(true)
    expect(hasMoreThanTwoDecimals(0.001)).toBe(true)
  })
})
