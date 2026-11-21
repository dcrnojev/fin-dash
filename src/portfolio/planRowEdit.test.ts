import { describe, expect, it } from 'vitest'
import { balance, group } from '../close/closeTestData.ts'
import { balancesTab } from '../domain/schema/balancesTab.ts'
import { groupsTab } from '../domain/schema/groupsTab.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'
import type { Month, PersonId } from '../domain/types.ts'
import { balanceEditColumns } from './editBalance.ts'
import { groupEditColumns } from './editGroup.ts'
import { planRowEdit } from './planRowEdit.ts'

// Columns in an order of their own, with one the app does not know, as a hand-edited tab may have them.
const groupsHeader = ['sort', 'id', 'label', 'my notes', 'kind', 'owner', 'provider', 'liquidity', 'cadence', 'closed_month', 'note']
const cashRow = [10, 'cash-a', 'Group cash-a', 'checked', 'cash', 'household', '', 'liquid', 'monthly', '', '']
const brokerRow = [20, 'broker', 'Group broker', '', 'investment', 'household', '', 'liquid', 'monthly', '', '']
const cashGroup = group('cash-a', 'cash', 10)

const balancesHeader = ['id', 'group_id', 'label', 'owner', 'code', 'opened_month', 'closed_month', 'note']
const balanceRow = ['broker-x', 'broker', 'Balance broker-x', '', '', '', '', '']
const brokerBalance = balance('broker-x', 'broker')

describe('planRowEdit', () => {
  it("overwrites only the group's changed cells, found by id under their own headers", () => {
    const edited = { ...cashGroup, label: 'Everyday', owner: 'person-a' as PersonId, closed: '2031-03' as Month }

    expect(planRowEdit(groupsTab, [groupsHeader, brokerRow, cashRow], cashGroup, edited, groupEditColumns)).toEqual([
      { tab: 'groups', row: 3, column: 2, value: 'Everyday' },
      { tab: 'groups', row: 3, column: 5, value: 'person-a' },
      { tab: 'groups', row: 3, column: 9, value: '2031-03' },
    ])
  })

  it("overwrites only the balance's changed cells, and clears a cell set to blank", () => {
    const openedWith = { ...brokerBalance, code: 'CODE1' }
    const values = [balancesHeader, [...balanceRow.slice(0, 4), 'CODE1', ...balanceRow.slice(5)]]
    const edited = { ...openedWith, code: null, note: 'moved here' }

    expect(planRowEdit(balancesTab, values, openedWith, edited, balanceEditColumns)).toEqual([
      { tab: 'balances', row: 2, column: 4, value: '' },
      { tab: 'balances', row: 2, column: 7, value: 'moved here' },
    ])
  })

  it('refuses when the id has no row', () => {
    const edited = { ...cashGroup, label: 'Everyday' }

    expect(() => planRowEdit(groupsTab, [groupsHeader, brokerRow], cashGroup, edited, groupEditColumns)).toThrow(
      /The groups tab has no row with the id cash-a/
    )
  })

  it('refuses, naming the rows, when the id has two rows', () => {
    const values: Cell[][] = [groupsHeader, cashRow, brokerRow, [...cashRow]]
    const edited = { ...cashGroup, label: 'Everyday' }

    expect(() => planRowEdit(groupsTab, values, cashGroup, edited, groupEditColumns)).toThrow(/2 rows \(rows 2, 4\) with the id cash-a/)
  })

  it('refuses when a field being edited changed in the sheet since the form opened', () => {
    const changedInSheet = [10, 'cash-a', 'Renamed by hand', '', 'cash', 'household', '', 'liquid', 'monthly', '', '']
    const edited = { ...cashGroup, note: 'a note' }

    expect(() => planRowEdit(groupsTab, [groupsHeader, changedInSheet], cashGroup, edited, groupEditColumns)).toThrow(/label of cash-a changed/)
  })

  it('asks for the owner column when a balance gets a person as owner in a tab without it', () => {
    const header = balancesHeader.filter(name => name !== 'owner')
    const row = balanceRow.filter((_, position) => balancesHeader[position] !== 'owner')
    const edited = { ...brokerBalance, owner: 'person-a' as PersonId }

    expect(() => planRowEdit(balancesTab, [header, row], brokerBalance, edited, balanceEditColumns)).toThrow(
      'Add a column named exactly owner to the header row of the balances tab; existing rows can stay blank.'
    )
  })
})
