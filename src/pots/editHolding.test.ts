import { describe, expect, it } from 'vitest'
import { holding, snapshot } from '../close/closeTestData.ts'
import { editedHolding, holdingEditDraft, type HoldingEditRows } from './editHolding.ts'

const brokerX = holding('broker-x', 'broker')

const rows: HoldingEditRows = {
  holdings: [brokerX, holding('broker-y', 'broker'), holding('other-z', 'other')],
  snapshots: [snapshot('2030-11', 'broker', 50_00, 'broker-x'), snapshot('2030-12', 'broker', 60_00, 'broker-y')],
  contributions: [],
}

const draft = holdingEditDraft(brokerX)

describe('editedHolding', () => {
  it('refuses the label of another holding in the same pot, and takes one used in another pot', () => {
    expect(editedHolding(brokerX, { ...draft, label: 'Holding broker-y' }, rows)).toEqual({
      status: 'invalid',
      problem: 'This pot already has a holding labelled Holding broker-y.',
    })
    expect(editedHolding(brokerX, { ...draft, label: 'Holding other-z' }, rows)).toMatchObject({ status: 'valid' })
  })

  it("judges the closed month by the holding's own rows, not its pot's", () => {
    expect(editedHolding(brokerX, { ...draft, closed: '2030-10' }, rows)).toMatchObject({ status: 'invalid' })
    expect(editedHolding(brokerX, { ...draft, closed: '2030-11' }, rows)).toMatchObject({ status: 'valid', holding: { closed: '2030-11' } })
  })
})
