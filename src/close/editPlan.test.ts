import { describe, expect, it } from 'vitest'
import { isoDateToSerial } from '../domain/date.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'
import type { IsoDate, Month } from '../domain/types.ts'
import { initialEntries, readEntries } from './closeEntries.ts'
import { closeForm } from './closeForm.ts'
import { balance, group, monthEndBalance } from './closeTestData.ts'
import { planEdit, valueChanges } from './editPlan.ts'

const november = '2030-11' as Month
const editDate = '2030-12-03' as IsoDate

// Columns in an order of their own, with one the app does not know, as a hand-edited tab may have them.
const header = ['group_id', 'month', 'my notes', 'value', 'balance_id', 'source', 'as_of']
const cashRow = ['cash-a', '2030-11', 'checked', 100, '', 'import', '2030-11-30']
const pensionRow = ['pillar', '2030-11', '', 900, '', 'import', '2030-11-04']
const balanceRow = ['broker', '2030-11', '', 50, 'broker-x', 'import', '2030-11-30']

const form = closeForm(
  {
    groups: [group('cash-a', 'cash', 10), group('broker', 'investment', 20), group('pillar', 'pension', 30)],
    balances: [balance('broker-x', 'broker'), balance('broker-y', 'broker')],
    monthEndBalances: [
      monthEndBalance('2030-11', 'cash-a', 100_00, null, '2030-11-30'),
      monthEndBalance('2030-11', 'pillar', 900_00, null, '2030-11-04'),
      monthEndBalance('2030-11', 'broker', 50_00, 'broker-x', '2030-11-30'),
    ],
  },
  november,
  'edit'
)

const read = readEntries(form, { ...initialEntries(form), 'cash-a': { amount: '120', asOf: '' }, 'broker|broker-y': { amount: '30', asOf: '' } })
const changes = valueChanges(read.status === 'valid' ? read.fields : [])

describe('valueChanges', () => {
  it('keeps only the values that differ from the sheet, and the ones it had no row for', () => {
    expect(changes.map(change => [change.field.key, change.before?.value ?? null, change.after.value])).toEqual([
      ['cash-a', 100_00, 120_00],
      ['broker|broker-y', null, 30_00],
    ])
  })
})

describe('planEdit', () => {
  it("overwrites only the changed row's value, as_of and source cells, found by key, and appends the added value", () => {
    const plan = planEdit(november, changes, [header, balanceRow, cashRow, pensionRow], editDate)

    expect(plan.updates).toEqual([
      { tab: 'month_end_balances', row: 3, column: 3, value: 120 },
      { tab: 'month_end_balances', row: 3, column: 6, value: isoDateToSerial(editDate) },
      { tab: 'month_end_balances', row: 3, column: 5, value: 'app' },
    ])
    expect(plan.added.map(row => [row.group, row.balance, row.value, row.asOf, row.source])).toEqual([
      ['broker', 'broker-y', 30_00, editDate, 'app'],
    ])
  })

  it('refuses, naming the value, when a changed row is no longer in the sheet', () => {
    expect(() => planEdit(november, changes, [header, balanceRow, pensionRow], editDate)).toThrow(/Group cash-a has no row/)
  })

  it('refuses, naming the rows, when a changed row appears more than once', () => {
    const values: Cell[][] = [header, cashRow, pensionRow, balanceRow, [...cashRow]]

    expect(() => planEdit(november, changes, values, editDate)).toThrow(/Group cash-a has 2 rows \(rows 2, 5\)/)
  })
})
