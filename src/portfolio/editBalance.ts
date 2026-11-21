import type { Balance, Contribution, MonthEndBalance, OwnerId } from '../domain/types.ts'
import { readClosedMonth } from './readClosedMonth.ts'

// What the edit form may change; id, group and opened month stay as the sheet has them, because month-end balance rows refer to the
// id and group and the close reads the opened month.
export const balanceEditColumns = ['label', 'owner', 'code', 'closed_month', 'note'] as const
export type BalanceEditColumn = (typeof balanceEditColumns)[number]

export interface BalanceEditDraft {
  label: string
  owner: OwnerId
  code: string
  closed: string
  note: string
}

export interface BalanceEditRows {
  balances: readonly Balance[]
  monthEndBalances: readonly MonthEndBalance[]
  contributions: readonly Contribution[]
}

export type EditedBalance = { status: 'valid'; balance: Balance } | { status: 'invalid'; problem: string }

export function balanceEditDraft(balance: Balance): BalanceEditDraft {
  return { label: balance.label, owner: balance.owner, code: balance.code ?? '', closed: balance.closed ?? '', note: balance.note ?? '' }
}

// The balance as the draft would leave it, or why the draft cannot be saved.
export function editedBalance(balance: Balance, draft: BalanceEditDraft, rows: BalanceEditRows): EditedBalance {
  const label = draft.label.trim()

  if (label === '')
    return { status: 'invalid', problem: 'Give the balance a label.' }

  if (rows.balances.some(other => other.id !== balance.id && other.group === balance.group && other.label === label))
    return { status: 'invalid', problem: `This group already has a balance labelled ${label}.` }

  const rowMonths = [...rows.monthEndBalances, ...rows.contributions].filter(row => row.balance === balance.id).map(row => row.month)
  const closed = readClosedMonth(draft.closed, balance.opened, rowMonths)

  if (closed.status === 'invalid')
    return closed

  return {
    status: 'valid',
    balance: {
      ...balance,
      label,
      owner: draft.owner,
      code: draft.code.trim() || null,
      closed: closed.closed,
      note: draft.note.trim() || null,
    },
  }
}
