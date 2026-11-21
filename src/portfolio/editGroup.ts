import type { Contribution, Group, MonthEndBalance, OwnerId } from '../domain/types.ts'
import { readClosedMonth } from './readClosedMonth.ts'

// What the edit form may change; id, kind, opened month and the rest stay as the sheet has them, because month-end balance rows
// refer to the id and are read by the kind and the opened month.
export const groupEditColumns = ['label', 'owner', 'provider', 'liquidity', 'closed_month', 'note'] as const
export type GroupEditColumn = (typeof groupEditColumns)[number]

export interface GroupEditDraft {
  label: string
  owner: OwnerId
  provider: string
  liquidity: Group['liquidity']
  closed: string
  note: string
}

export interface GroupEditRows {
  groups: readonly Group[]
  monthEndBalances: readonly MonthEndBalance[]
  contributions: readonly Contribution[]
}

export type EditedGroup = { status: 'valid'; group: Group } | { status: 'invalid'; problem: string }

export function groupEditDraft(group: Group): GroupEditDraft {
  return {
    label: group.label,
    owner: group.owner,
    provider: group.provider ?? '',
    liquidity: group.liquidity,
    closed: group.closed ?? '',
    note: group.note ?? '',
  }
}

// The group as the draft would leave it, or why the draft cannot be saved.
export function editedGroup(group: Group, draft: GroupEditDraft, rows: GroupEditRows): EditedGroup {
  const label = draft.label.trim()

  if (label === '')
    return { status: 'invalid', problem: 'Give the group a label.' }

  if (rows.groups.some(other => other.id !== group.id && other.label === label))
    return { status: 'invalid', problem: `Another group is already labelled ${label}.` }

  const rowMonths = [...rows.monthEndBalances, ...rows.contributions].filter(row => row.group === group.id).map(row => row.month)
  const closed = readClosedMonth(draft.closed, group.opened, rowMonths)

  if (closed.status === 'invalid')
    return closed

  return {
    status: 'valid',
    group: {
      ...group,
      label,
      owner: draft.owner,
      provider: draft.provider.trim() || null,
      liquidity: draft.liquidity,
      closed: closed.closed,
      note: draft.note.trim() || null,
    },
  }
}
