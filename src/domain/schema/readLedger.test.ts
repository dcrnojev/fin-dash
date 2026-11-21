import { describe, expect, it } from 'vitest'
import { readLedger, type TabValues } from './readLedger.ts'

const referenceTabs: TabValues = {
  _meta: [['key', 'value'], ['schema_version', 2], ['currency', 'EUR']],
  people: [['id', 'name', 'role'], ['pa', 'Partner A', 'adult']],
  groups: [
    ['id', 'label', 'kind', 'owner', 'liquidity', 'cadence', 'sort'],
    ['cash-a', 'Cash A', 'cash', 'pa', 'liquid', 'monthly', 10],
  ],
  balances: [['id', 'group_id', 'label']],
  contributions: [['month', 'group_id', 'amount', 'kind', 'funding']],
  months: [['month', 'status']],
}

describe('readLedger', () => {
  it('skips invalid month-end balance rows and reports each problem with its row and column', () => {
    const ledger = readLedger({
      ...referenceTabs,
      month_end_balances: [
        ['month', 'group_id', 'value', 'note'],
        ['2030-13', 'cash-a', 100, 'bad month'],
        ['2030-01', 'cash-a', '1.234,50', 'amount typed as text'],
        ['2030-01', 'savings-x', 100, 'unknown group'],
        ['2030-02', 'cash-a', 12.346, 'three decimals'],
        ['2030-03', 'cash-a', 250.5, 'valid'],
      ],
    })

    const monthEndBalanceIssues = ledger.issues
      .filter(issue => issue.tab === 'month_end_balances')
      .map(issue => ({ severity: issue.severity, code: issue.code, row: issue.row, column: issue.column }))

    expect(monthEndBalanceIssues).toEqual([
      { severity: 'error', code: 'invalid-month', row: 2, column: 'month' },
      { severity: 'error', code: 'invalid-number', row: 3, column: 'value' },
      { severity: 'warning', code: 'extra-decimals', row: 5, column: 'value' },
      { severity: 'error', code: 'unknown-group', row: 4, column: 'group_id' },
    ])
    expect(ledger.monthEndBalances.map(monthEndBalance => [monthEndBalance.month, monthEndBalance.value])).toEqual([
      ['2030-02', 1235],
      ['2030-03', 25050],
    ])
  })

  it('skips a month-end balance row after the month its group closed', () => {
    const ledger = readLedger({
      ...referenceTabs,
      groups: [
        ['id', 'label', 'kind', 'owner', 'liquidity', 'cadence', 'closed_month', 'sort'],
        ['cash-a', 'Cash A', 'cash', 'pa', 'liquid', 'monthly', '2030-02', 10],
      ],
      month_end_balances: [
        ['month', 'group_id', 'value'],
        ['2030-02', 'cash-a', 100],
        ['2030-03', 'cash-a', 100],
      ],
    })

    expect(ledger.issues.map(issue => [issue.code, issue.tab, issue.row])).toEqual([['after-group-closed', 'month_end_balances', 3]])
    expect(ledger.monthEndBalances.map(monthEndBalance => monthEndBalance.month)).toEqual(['2030-02'])
  })
})
