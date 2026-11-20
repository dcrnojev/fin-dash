import type { Contribution, OwnerId, Pot, Snapshot } from '../domain/types.ts'
import { readClosedMonth } from './readClosedMonth.ts'

// What the edit form may change; id, kind, opened month and the rest stay as the sheet has them, because snapshot rows
// refer to the id and are read by the kind and the opened month.
export const potEditColumns = ['label', 'owner', 'provider', 'liquidity', 'closed_month', 'note'] as const
export type PotEditColumn = (typeof potEditColumns)[number]

export interface PotEditDraft {
  label: string
  owner: OwnerId
  provider: string
  liquidity: Pot['liquidity']
  closed: string
  note: string
}

export interface PotEditRows {
  pots: readonly Pot[]
  snapshots: readonly Snapshot[]
  contributions: readonly Contribution[]
}

export type EditedPot = { status: 'valid'; pot: Pot } | { status: 'invalid'; problem: string }

export function potEditDraft(pot: Pot): PotEditDraft {
  return {
    label: pot.label,
    owner: pot.owner,
    provider: pot.provider ?? '',
    liquidity: pot.liquidity,
    closed: pot.closed ?? '',
    note: pot.note ?? '',
  }
}

// The pot as the draft would leave it, or why the draft cannot be saved.
export function editedPot(pot: Pot, draft: PotEditDraft, rows: PotEditRows): EditedPot {
  const label = draft.label.trim()

  if (label === '')
    return { status: 'invalid', problem: 'Give the pot a label.' }

  if (rows.pots.some(other => other.id !== pot.id && other.label === label))
    return { status: 'invalid', problem: `Another pot is already labelled ${label}.` }

  const rowMonths = [...rows.snapshots, ...rows.contributions].filter(row => row.pot === pot.id).map(row => row.month)
  const closed = readClosedMonth(draft.closed, pot.opened, rowMonths)

  if (closed.status === 'invalid')
    return closed

  return {
    status: 'valid',
    pot: {
      ...pot,
      label,
      owner: draft.owner,
      provider: draft.provider.trim() || null,
      liquidity: draft.liquidity,
      closed: closed.closed,
      note: draft.note.trim() || null,
    },
  }
}
