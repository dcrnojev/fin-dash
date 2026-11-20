import { describe, expect, it } from 'vitest'
import { pot, snapshot } from '../close/closeTestData.ts'
import { editedPot, potEditDraft, type PotEditRows } from './editPot.ts'

const cashPot = pot('cash-a', 'cash', 10, { opened: '2030-02' })

const rows: PotEditRows = {
  pots: [cashPot, pot('cash-b', 'cash', 20)],
  snapshots: [snapshot('2030-10', 'cash-a', 100_00), snapshot('2030-11', 'cash-a', 120_00), snapshot('2031-01', 'cash-b', 50_00)],
  contributions: [],
}

const draft = potEditDraft(cashPot)

describe('editedPot', () => {
  it('refuses a closed month before the latest month with a value, or before the opened month', () => {
    expect(editedPot(cashPot, { ...draft, closed: '2030-10' }, rows)).toEqual({ status: 'invalid', problem: expect.stringMatching(/Nov 2030/) })
    expect(editedPot(cashPot, { ...draft, closed: '2030-01' }, rows)).toEqual({ status: 'invalid', problem: expect.stringMatching(/Feb 2030/) })
  })

  it('takes the latest month with a value as the closed month, and a blank one to reopen the pot', () => {
    expect(editedPot(cashPot, { ...draft, closed: '2030-11' }, rows)).toMatchObject({ status: 'valid', pot: { closed: '2030-11' } })

    const closedPot = { ...cashPot, closed: '2030-11' as typeof cashPot.closed }

    expect(editedPot(closedPot, { ...potEditDraft(closedPot), closed: '' }, rows)).toMatchObject({ status: 'valid', pot: { closed: null } })
  })

  it("refuses another pot's label", () => {
    expect(editedPot(cashPot, { ...draft, label: ' Pot cash-b ' }, rows)).toEqual({
      status: 'invalid',
      problem: 'Another pot is already labelled Pot cash-b.',
    })
  })
})
