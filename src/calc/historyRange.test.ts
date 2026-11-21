import { describe, expect, it } from 'vitest'
import { monthsInRange } from './historyRange.ts'

const thirtyMonths = Array.from({ length: 30 }, (_, index) => index)

describe('monthsInRange', () => {
  it('keeps the latest months of a longer history', () => {
    expect(monthsInRange(thirtyMonths, 12)).toEqual(thirtyMonths.slice(18))
    expect(monthsInRange(thirtyMonths, 24)).toEqual(thirtyMonths.slice(6))
  })

  it('keeps a history shorter than the range whole, and all of any history for all', () => {
    expect(monthsInRange(thirtyMonths.slice(0, 5), 12)).toEqual(thirtyMonths.slice(0, 5))
    expect(monthsInRange(thirtyMonths, 'all')).toEqual(thirtyMonths)
    expect(monthsInRange([], 24)).toEqual([])
  })
})
