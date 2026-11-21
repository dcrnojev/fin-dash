import { describe, expect, it } from 'vitest'
import type { IsoDate, Month } from '../domain/types.ts'
import { readEntries } from './closeEntries.ts'
import { closeForm } from './closeForm.ts'
import { closeRows } from './closeRows.ts'
import { balance, group, monthEndBalance } from './closeTestData.ts'

const november = '2030-11' as Month
const closeDate = '2030-12-02' as IsoDate

describe('closeRows', () => {
  it('dates cash and investment rows on the close and a pension row on its statement, and closes the month', () => {
    const form = closeForm(
      {
        groups: [group('cash-a', 'cash', 10), group('broker', 'investment', 20), group('pillar', 'pension', 30)],
        balances: [balance('broker-x', 'broker')],
        monthEndBalances: [],
      },
      november,
      'close'
    )

    const entries = readEntries(form, {
      'cash-a': { amount: '10', asOf: '' },
      'broker|broker-x': { amount: '20', asOf: '' },
      pillar: { amount: '30', asOf: '2030-11-04' },
    })

    const rows = closeRows(november, entries.status === 'valid' ? entries.fields : [], closeDate, 'someone@example.com')

    expect(rows.monthEndBalances.map(row => [row.month, row.group, row.balance, row.value, row.asOf, row.source])).toEqual([
      ['2030-11', 'cash-a', null, 10_00, '2030-12-02', 'app'],
      ['2030-11', 'broker', 'broker-x', 20_00, '2030-12-02', 'app'],
      ['2030-11', 'pillar', null, 30_00, '2030-11-04', 'app'],
    ])
    expect(rows.keptCount).toBe(0)
    expect(rows.monthRecord).toEqual({
      month: '2030-11',
      status: 'closed',
      closedOn: '2030-12-02',
      closedBy: 'someone@example.com',
      frozenPlan: null,
      note: null,
    })
  })

  it('writes no row for a field the sheet already has, at whatever level it is stored', () => {
    const form = closeForm(
      {
        groups: [group('cash-a', 'cash', 10), group('broker', 'investment', 20)],
        balances: [balance('broker-x', 'broker')],
        monthEndBalances: [monthEndBalance('2030-11', 'broker', 40_00)],
      },
      november,
      'close'
    )

    const entries = readEntries(form, { 'cash-a': { amount: '10', asOf: '' } })
    const rows = closeRows(november, entries.status === 'valid' ? entries.fields : [], closeDate, 'someone@example.com')

    expect(rows.monthEndBalances.map(row => row.group)).toEqual(['cash-a'])
    expect(rows.keptCount).toBe(1)
  })
})
