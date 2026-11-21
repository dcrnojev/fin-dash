import { describe, expect, it } from 'vitest'
import type { TabValues } from '../schemaUpdate/schemaUpdatePlan.ts'
import { checkSpreadsheet } from './schemaCheck.ts'

const metaOf = (version: number) => [['key', 'value'], ['schema_version', version], ['currency', 'EUR']]

const versionTwoTabs: TabValues = {
  people: [['id', 'name', 'role'], ['pa', 'Partner A', 'adult']],
  groups: [['id', 'label', 'kind', 'owner', 'liquidity', 'cadence', 'sort'], ['cash-a', 'Cash A', 'cash', 'pa', 'liquid', 'monthly', 10]],
  balances: [['id', 'group_id', 'label']],
  month_end_balances: [['month', 'group_id', 'value'], ['2030-01', 'cash-a', 100]],
  contributions: [['month', 'group_id', 'amount', 'kind', 'funding']],
  months: [['month', 'status']],
}

describe('checkSpreadsheet', () => {
  it('leaves the data of a version 1 spreadsheet unread and plans its update', () => {
    const { ledger, schema } = checkSpreadsheet({
      _meta: metaOf(1),
      pots: versionTwoTabs.groups,
      holdings: [['id', 'pot_id', 'label']],
      snapshots: [['month', 'pot_id', 'value'], ['2030-01', 'cash-a', 100]],
      contributions: [['month', 'pot_id', 'amount', 'kind', 'funding']],
    })

    expect(ledger).toBeNull()
    expect(schema).toMatchObject({ status: 'older', version: 1, plan: { problems: [] } })
    expect(schema.status === 'older' && schema.plan.tabs.map(tab => [tab.renameFrom, tab.tab])).toEqual([
      ['pots', 'groups'],
      ['holdings', 'balances'],
      ['snapshots', 'month_end_balances'],
      [null, 'contributions'],
    ])
  })

  it('reads a version 2 spreadsheet, and one from a newer app read-only', () => {
    const current = checkSpreadsheet({ _meta: metaOf(2), ...versionTwoTabs })

    expect(current.schema).toEqual({ status: 'ok' })
    expect(current.ledger?.monthEndBalances.map(row => row.value)).toEqual([100_00])
    expect(checkSpreadsheet({ _meta: metaOf(3), ...versionTwoTabs }).schema).toEqual({ status: 'newer', version: 3 })
  })
})
