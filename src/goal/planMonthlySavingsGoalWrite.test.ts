import { describe, expect, it } from 'vitest'
import type { Cents } from '../domain/types.ts'
import { planMonthlySavingsGoalWrite } from './planMonthlySavingsGoalWrite.ts'

// Columns in an order of their own, with one the app does not know, as a hand-edited tab may have them.
const header = ['value', 'my notes', 'key']
const versionRow = [2, '', 'schema_version']
const currencyRow = ['EUR', '', 'currency']

describe('planMonthlySavingsGoalWrite', () => {
  it("overwrites the value cell of the goal's row, found by key", () => {
    const values = [header, versionRow, [300, 'set by hand', 'monthly_savings_goal'], currencyRow]

    expect(planMonthlySavingsGoalWrite(values, 512_50 as Cents)).toEqual({
      kind: 'update',
      updates: [{ tab: '_meta', row: 3, column: 0, value: 512.5 }],
    })
  })

  it('clears the cell to remove the goal, and sets it again in a row whose cell was cleared', () => {
    const values = [header, versionRow, ['', '', 'monthly_savings_goal']]

    expect(planMonthlySavingsGoalWrite([header, versionRow, [300, '', 'monthly_savings_goal']], null)).toEqual({
      kind: 'update',
      updates: [{ tab: '_meta', row: 3, column: 0, value: '' }],
    })
    expect(planMonthlySavingsGoalWrite(values, 400_00 as Cents)).toEqual({
      kind: 'update',
      updates: [{ tab: '_meta', row: 3, column: 0, value: 400 }],
    })
  })

  it("appends the goal's row under the tab's own headers when it has none, and writes nothing to remove a goal it lacks", () => {
    const values = [header, versionRow, currencyRow]

    expect(planMonthlySavingsGoalWrite(values, 400_00 as Cents)).toEqual({ kind: 'append', rows: [[400, '', 'monthly_savings_goal']] })
    expect(planMonthlySavingsGoalWrite(values, null)).toEqual({ kind: 'nothing' })
  })

  it('refuses, naming the rows, when the key has two rows', () => {
    const values = [header, [300, '', 'monthly_savings_goal'], versionRow, [400, '', 'monthly_savings_goal']]

    expect(() => planMonthlySavingsGoalWrite(values, 500_00 as Cents)).toThrow(/2 rows \(rows 2, 4\) with the key monthly_savings_goal/)
  })
})
