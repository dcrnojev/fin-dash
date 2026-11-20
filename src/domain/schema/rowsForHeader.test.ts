import { describe, expect, it } from 'vitest'
import type { Holding, HoldingId, Month, PotId } from '../types.ts'
import { holdingsTab } from './holdingsTab.ts'
import { rowsForHeader } from './rowsForHeader.ts'

const fundHolding: Holding = {
  id: 'fund-x' as HoldingId,
  pot: 'fund' as PotId,
  label: 'Fund X',
  owner: 'household',
  code: 'FX1',
  opened: '2030-11' as Month,
  closed: null,
  note: null,
}

describe('rowsForHeader', () => {
  it('puts each value under its header in the tab as it is, leaving unknown and blank columns empty', () => {
    const header = ['label', ' id ', 'my notes', 'pot_id', 'opened_month', 'owner', 'id']

    expect(rowsForHeader(holdingsTab, header, [{ ...fundHolding, code: null }])).toEqual([['Fund X', 'fund-x', '', 'fund', '2030-11', '', '']])
  })

  it('refuses a value for a column the tab does not have, and accepts a blank one', () => {
    const header = ['id', 'pot_id', 'label', 'code', 'opened_month']

    expect(() => rowsForHeader(holdingsTab, header, [{ ...fundHolding, owner: 'pa' as Holding['owner'] }])).toThrow(/owner/)
    expect(rowsForHeader(holdingsTab, header, [fundHolding])).toEqual([['fund-x', 'fund', 'Fund X', 'FX1', '2030-11']])
  })
})
