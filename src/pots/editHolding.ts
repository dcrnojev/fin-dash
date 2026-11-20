import type { Contribution, Holding, OwnerId, Snapshot } from '../domain/types.ts'
import { readClosedMonth } from './readClosedMonth.ts'

// What the edit form may change; id, pot and opened month stay as the sheet has them, because snapshot rows refer to the
// id and pot and the close reads the opened month.
export const holdingEditColumns = ['label', 'owner', 'code', 'closed_month', 'note'] as const
export type HoldingEditColumn = (typeof holdingEditColumns)[number]

export interface HoldingEditDraft {
  label: string
  owner: OwnerId
  code: string
  closed: string
  note: string
}

export interface HoldingEditRows {
  holdings: readonly Holding[]
  snapshots: readonly Snapshot[]
  contributions: readonly Contribution[]
}

export type EditedHolding = { status: 'valid'; holding: Holding } | { status: 'invalid'; problem: string }

export function holdingEditDraft(holding: Holding): HoldingEditDraft {
  return { label: holding.label, owner: holding.owner, code: holding.code ?? '', closed: holding.closed ?? '', note: holding.note ?? '' }
}

// The holding as the draft would leave it, or why the draft cannot be saved.
export function editedHolding(holding: Holding, draft: HoldingEditDraft, rows: HoldingEditRows): EditedHolding {
  const label = draft.label.trim()

  if (label === '')
    return { status: 'invalid', problem: 'Give the holding a label.' }

  if (rows.holdings.some(other => other.id !== holding.id && other.pot === holding.pot && other.label === label))
    return { status: 'invalid', problem: `This pot already has a holding labelled ${label}.` }

  const rowMonths = [...rows.snapshots, ...rows.contributions].filter(row => row.holding === holding.id).map(row => row.month)
  const closed = readClosedMonth(draft.closed, holding.opened, rowMonths)

  if (closed.status === 'invalid')
    return closed

  return {
    status: 'valid',
    holding: {
      ...holding,
      label,
      owner: draft.owner,
      code: draft.code.trim() || null,
      closed: closed.closed,
      note: draft.note.trim() || null,
    },
  }
}
