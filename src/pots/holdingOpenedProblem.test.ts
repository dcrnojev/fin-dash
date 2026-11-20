import { describe, expect, it } from 'vitest'
import type { Month } from '../domain/types.ts'
import { holdingOpenedProblem } from './holdingOpenedProblem.ts'

describe('holdingOpenedProblem', () => {
  it('refuses a month before the next month to close, and allows that month, a later one, or any month on an empty sheet', () => {
    const monthToClose = '2030-11' as Month

    expect(holdingOpenedProblem('2030-10' as Month, monthToClose)).toMatch(/Nov 2030/)
    expect(holdingOpenedProblem('2030-11' as Month, monthToClose)).toBeNull()
    expect(holdingOpenedProblem('2031-02' as Month, monthToClose)).toBeNull()
    expect(holdingOpenedProblem('2020-01' as Month, null)).toBeNull()
  })
})
