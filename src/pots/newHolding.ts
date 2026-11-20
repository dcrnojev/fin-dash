import type { Holding, HoldingId, Month, OwnerId, PotId } from '../domain/types'

export interface HoldingDraft {
  pot: PotId
  label: string
  owner: OwnerId
  code: string
  opened: Month
}

export function newHolding(draft: HoldingDraft, id: HoldingId): Holding {
  return {
    id,
    pot: draft.pot,
    label: draft.label.trim(),
    owner: draft.owner,
    code: draft.code.trim() || null,
    opened: draft.opened,
    closed: null,
    note: null,
  }
}
