import { describe, expect, it } from 'vitest'
import { readLedger, type TabValues } from './readLedger.ts'

const referenceTabs: TabValues = {
  _meta: [['key', 'value'], ['schema_version', 1], ['currency', 'EUR']],
  people: [['id', 'name', 'role'], ['pa', 'Partner A', 'adult']],
  pots: [
    ['id', 'label', 'kind', 'owner', 'liquidity', 'cadence', 'sort'],
    ['cash-a', 'Cash A', 'cash', 'pa', 'liquid', 'monthly', 10],
  ],
  holdings: [['id', 'pot_id', 'label']],
  contributions: [['month', 'pot_id', 'amount', 'kind', 'funding']],
  months: [['month', 'status']],
}

describe('readLedger', () => {
  it('skips invalid snapshot rows and reports each problem with its row and column', () => {
    const ledger = readLedger({
      ...referenceTabs,
      snapshots: [
        ['month', 'pot_id', 'value', 'note'],
        ['2030-13', 'cash-a', 100, 'bad month'],
        ['2030-01', 'cash-a', '1.234,50', 'amount typed as text'],
        ['2030-01', 'savings-x', 100, 'unknown pot'],
        ['2030-02', 'cash-a', 12.346, 'three decimals'],
        ['2030-03', 'cash-a', 250.5, 'valid'],
      ],
    })

    const snapshotIssues = ledger.issues
      .filter(issue => issue.tab === 'snapshots')
      .map(issue => ({ severity: issue.severity, code: issue.code, row: issue.row, column: issue.column }))

    expect(snapshotIssues).toEqual([
      { severity: 'error', code: 'invalid-month', row: 2, column: 'month' },
      { severity: 'error', code: 'invalid-number', row: 3, column: 'value' },
      { severity: 'warning', code: 'extra-decimals', row: 5, column: 'value' },
      { severity: 'error', code: 'unknown-pot', row: 4, column: 'pot_id' },
    ])
    expect(ledger.snapshots.map(snapshot => [snapshot.month, snapshot.value])).toEqual([
      ['2030-02', 1235],
      ['2030-03', 25050],
    ])
  })
})
