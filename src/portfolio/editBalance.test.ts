import { describe, expect, it } from 'vitest'
import { balance, monthEndBalance } from '../close/closeTestData.ts'
import { balanceEditDraft, editedBalance, type BalanceEditRows } from './editBalance.ts'

const brokerX = balance('broker-x', 'broker')

const rows: BalanceEditRows = {
  balances: [brokerX, balance('broker-y', 'broker'), balance('other-z', 'other')],
  monthEndBalances: [monthEndBalance('2030-11', 'broker', 50_00, 'broker-x'), monthEndBalance('2030-12', 'broker', 60_00, 'broker-y')],
  contributions: [],
}

const draft = balanceEditDraft(brokerX)

describe('editedBalance', () => {
  it('refuses the label of another balance in the same group, and takes one used in another group', () => {
    expect(editedBalance(brokerX, { ...draft, label: 'Balance broker-y' }, rows)).toEqual({
      status: 'invalid',
      problem: 'This group already has a balance labelled Balance broker-y.',
    })
    expect(editedBalance(brokerX, { ...draft, label: 'Balance other-z' }, rows)).toMatchObject({ status: 'valid' })
  })

  it("judges the closed month by the balance's own rows, not its group's", () => {
    expect(editedBalance(brokerX, { ...draft, closed: '2030-10' }, rows)).toMatchObject({ status: 'invalid' })
    expect(editedBalance(brokerX, { ...draft, closed: '2030-11' }, rows)).toMatchObject({ status: 'valid', balance: { closed: '2030-11' } })
  })
})
