import { describe, expect, it } from 'vitest'
import { planSchemaUpdate, type TabValues } from './schemaUpdatePlan.ts'

const meta = [['key', 'value'], ['currency', 'EUR'], ['schema_version', 1]]

const versionOne: TabValues = {
  _meta: meta,
  pots: [['id', 'label', 'kind'], ['cash-a', 'Cash A', 'cash'], ['broker', 'Broker', 'investment']],
  holdings: [['id', 'pot_id', 'label'], ['broker-x', 'broker', 'Fund X']],
  snapshots: [
    ['month', 'my notes', 'pot_id', 'holding_id', 'value'],
    ['2030-01', '', 'cash-a', '', 10],
    [],
    ['2030-01', '', 'broker', 'broker-x', 20],
  ],
  contributions: [['month', 'pot_id', 'amount'], ['2030-01', 'broker', 5]],
}

describe('planSchemaUpdate', () => {
  it('renames the three tabs and the header cells found by name, counting the rows that hold anything', () => {
    expect(planSchemaUpdate(versionOne)).toEqual({
      tabs: [
        { tab: 'groups', renameFrom: 'pots', rowCount: 2, headerRenames: [] },
        { tab: 'balances', renameFrom: 'holdings', rowCount: 1, headerRenames: [{ column: 1, from: 'pot_id', to: 'group_id' }] },
        {
          tab: 'month_end_balances',
          renameFrom: 'snapshots',
          rowCount: 2,
          headerRenames: [
            { column: 2, from: 'pot_id', to: 'group_id' },
            { column: 3, from: 'holding_id', to: 'balance_id' },
          ],
        },
        { tab: 'contributions', renameFrom: null, rowCount: 1, headerRenames: [{ column: 1, from: 'pot_id', to: 'group_id' }] },
      ],
      versionCell: { row: 3, column: 1 },
      problems: [],
    })
  })

  it('plans only what is left after an update that renamed some of it, and nothing but the version once all is renamed', () => {
    const halfDone: TabValues = {
      _meta: meta,
      groups: versionOne.pots,
      holdings: versionOne.holdings,
      contributions: versionOne.contributions,
      month_end_balances: [['month', 'group_id', 'holding_id', 'value'], ['2030-01', 'cash-a', '', 10]],
    }

    expect(planSchemaUpdate(halfDone).tabs).toEqual([
      { tab: 'balances', renameFrom: 'holdings', rowCount: 1, headerRenames: [{ column: 1, from: 'pot_id', to: 'group_id' }] },
      { tab: 'month_end_balances', renameFrom: null, rowCount: 1, headerRenames: [{ column: 2, from: 'holding_id', to: 'balance_id' }] },
      { tab: 'contributions', renameFrom: null, rowCount: 1, headerRenames: [{ column: 1, from: 'pot_id', to: 'group_id' }] },
    ])

    const allRenamed: TabValues = {
      _meta: meta,
      groups: [['id', 'label']],
      balances: [['id', 'group_id', 'label']],
      month_end_balances: [['month', 'group_id', 'balance_id', 'value']],
      contributions: [['month', 'group_id', 'amount']],
    }

    expect(planSchemaUpdate(allRenamed)).toEqual({ tabs: [], versionCell: { row: 3, column: 1 }, problems: [] })
  })

  it('stops when a tab or a column is there under both its old and its new name, or the version is not 1', () => {
    const plan = planSchemaUpdate({
      ...versionOne,
      _meta: [['key', 'value'], ['schema_version', 2]],
      groups: [['id', 'label']],
      contributions: [['month', 'pot_id', 'group_id', 'amount']],
    })

    expect(plan.problems).toEqual([
      expect.stringContaining('both a pots and a groups tab'),
      expect.stringContaining('both a pot_id and a group_id column'),
      expect.stringContaining('schema_version 2, not 1'),
    ])
    expect(plan.versionCell).toBeNull()
  })
})
