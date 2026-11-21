import { describe, expect, it } from 'vitest'
import type { Balance, BalanceId, GroupId, Month } from '../types.ts'
import { balancesTab } from './balancesTab.ts'
import { rowsForHeader } from './rowsForHeader.ts'

const fundBalance: Balance = {
  id: 'fund-x' as BalanceId,
  group: 'fund' as GroupId,
  label: 'Fund X',
  owner: 'household',
  code: 'FX1',
  opened: '2030-11' as Month,
  closed: null,
  note: null,
}

describe('rowsForHeader', () => {
  it('puts each value under its header in the tab as it is, leaving unknown and blank columns empty', () => {
    const header = ['label', ' id ', 'my notes', 'group_id', 'opened_month', 'owner', 'id']

    expect(rowsForHeader(balancesTab, header, [{ ...fundBalance, code: null }])).toEqual([['Fund X', 'fund-x', '', 'fund', '2030-11', '', '']])
  })

  it('refuses a value for a column the tab does not have, and accepts a blank one', () => {
    const header = ['id', 'group_id', 'label', 'code', 'opened_month']

    expect(() => rowsForHeader(balancesTab, header, [{ ...fundBalance, owner: 'pa' as Balance['owner'] }])).toThrow(/owner/)
    expect(rowsForHeader(balancesTab, header, [fundBalance])).toEqual([['fund-x', 'fund', 'Fund X', 'FX1', '2030-11']])
  })
})
