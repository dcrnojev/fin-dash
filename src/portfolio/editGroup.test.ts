import { describe, expect, it } from 'vitest'
import { group, monthEndBalance } from '../close/closeTestData.ts'
import { editedGroup, groupEditDraft, type GroupEditRows } from './editGroup.ts'

const cashGroup = group('cash-a', 'cash', 10, { opened: '2030-02' })

const rows: GroupEditRows = {
  groups: [cashGroup, group('cash-b', 'cash', 20)],
  monthEndBalances: [
    monthEndBalance('2030-10', 'cash-a', 100_00),
    monthEndBalance('2030-11', 'cash-a', 120_00),
    monthEndBalance('2031-01', 'cash-b', 50_00),
  ],
  contributions: [],
}

const draft = groupEditDraft(cashGroup)

describe('editedGroup', () => {
  it('refuses a closed month before the latest month with a value, or before the opened month', () => {
    expect(editedGroup(cashGroup, { ...draft, closed: '2030-10' }, rows)).toEqual({ status: 'invalid', problem: expect.stringMatching(/Nov 2030/) })
    expect(editedGroup(cashGroup, { ...draft, closed: '2030-01' }, rows)).toEqual({ status: 'invalid', problem: expect.stringMatching(/Feb 2030/) })
  })

  it('takes the latest month with a value as the closed month, and a blank one to reopen the group', () => {
    expect(editedGroup(cashGroup, { ...draft, closed: '2030-11' }, rows)).toMatchObject({ status: 'valid', group: { closed: '2030-11' } })

    const closedGroup = { ...cashGroup, closed: '2030-11' as typeof cashGroup.closed }

    expect(editedGroup(closedGroup, { ...groupEditDraft(closedGroup), closed: '' }, rows)).toMatchObject({ status: 'valid', group: { closed: null } })
  })

  it("refuses another group's label", () => {
    expect(editedGroup(cashGroup, { ...draft, label: ' Group cash-b ' }, rows)).toEqual({
      status: 'invalid',
      problem: 'Another group is already labelled Group cash-b.',
    })
  })
})
