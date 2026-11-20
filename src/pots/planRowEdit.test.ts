import { describe, expect, it } from 'vitest'
import { holding, pot } from '../close/closeTestData.ts'
import { holdingsTab } from '../domain/schema/holdingsTab.ts'
import { potsTab } from '../domain/schema/potsTab.ts'
import type { Cell } from '../domain/schema/tabSpec.ts'
import type { Month, PersonId } from '../domain/types.ts'
import { holdingEditColumns } from './editHolding.ts'
import { potEditColumns } from './editPot.ts'
import { planRowEdit } from './planRowEdit.ts'

// Columns in an order of their own, with one the app does not know, as a hand-edited tab may have them.
const potsHeader = ['sort', 'id', 'label', 'my notes', 'kind', 'owner', 'provider', 'liquidity', 'cadence', 'closed_month', 'note']
const cashRow = [10, 'cash-a', 'Pot cash-a', 'checked', 'cash', 'household', '', 'liquid', 'monthly', '', '']
const brokerRow = [20, 'broker', 'Pot broker', '', 'investment', 'household', '', 'liquid', 'monthly', '', '']
const cashPot = pot('cash-a', 'cash', 10)

const holdingsHeader = ['id', 'pot_id', 'label', 'owner', 'code', 'opened_month', 'closed_month', 'note']
const holdingRow = ['broker-x', 'broker', 'Holding broker-x', '', '', '', '', '']
const brokerHolding = holding('broker-x', 'broker')

describe('planRowEdit', () => {
  it("overwrites only the pot's changed cells, found by id under their own headers", () => {
    const edited = { ...cashPot, label: 'Everyday', owner: 'person-a' as PersonId, closed: '2031-03' as Month }

    expect(planRowEdit(potsTab, [potsHeader, brokerRow, cashRow], cashPot, edited, potEditColumns)).toEqual([
      { tab: 'pots', row: 3, column: 2, value: 'Everyday' },
      { tab: 'pots', row: 3, column: 5, value: 'person-a' },
      { tab: 'pots', row: 3, column: 9, value: '2031-03' },
    ])
  })

  it("overwrites only the holding's changed cells, and clears a cell set to blank", () => {
    const openedWith = { ...brokerHolding, code: 'CODE1' }
    const values = [holdingsHeader, [...holdingRow.slice(0, 4), 'CODE1', ...holdingRow.slice(5)]]
    const edited = { ...openedWith, code: null, note: 'moved here' }

    expect(planRowEdit(holdingsTab, values, openedWith, edited, holdingEditColumns)).toEqual([
      { tab: 'holdings', row: 2, column: 4, value: '' },
      { tab: 'holdings', row: 2, column: 7, value: 'moved here' },
    ])
  })

  it('refuses when the id has no row', () => {
    const edited = { ...cashPot, label: 'Everyday' }

    expect(() => planRowEdit(potsTab, [potsHeader, brokerRow], cashPot, edited, potEditColumns)).toThrow(
      /The pots tab has no row with the id cash-a/
    )
  })

  it('refuses, naming the rows, when the id has two rows', () => {
    const values: Cell[][] = [potsHeader, cashRow, brokerRow, [...cashRow]]
    const edited = { ...cashPot, label: 'Everyday' }

    expect(() => planRowEdit(potsTab, values, cashPot, edited, potEditColumns)).toThrow(/2 rows \(rows 2, 4\) with the id cash-a/)
  })

  it('refuses when a field being edited changed in the sheet since the form opened', () => {
    const changedInSheet = [10, 'cash-a', 'Renamed by hand', '', 'cash', 'household', '', 'liquid', 'monthly', '', '']
    const edited = { ...cashPot, note: 'a note' }

    expect(() => planRowEdit(potsTab, [potsHeader, changedInSheet], cashPot, edited, potEditColumns)).toThrow(/label of cash-a changed/)
  })

  it('asks for the owner column when a holding gets a person as owner in a tab without it', () => {
    const header = holdingsHeader.filter(name => name !== 'owner')
    const row = holdingRow.filter((_, position) => holdingsHeader[position] !== 'owner')
    const edited = { ...brokerHolding, owner: 'person-a' as PersonId }

    expect(() => planRowEdit(holdingsTab, [header, row], brokerHolding, edited, holdingEditColumns)).toThrow(
      'Add a column named exactly owner to the header row of the holdings tab; existing rows can stay blank.'
    )
  })
})
