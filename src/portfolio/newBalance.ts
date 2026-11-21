import type { Balance, BalanceId, GroupId, Month, OwnerId } from '../domain/types'

export interface BalanceDraft {
  group: GroupId
  label: string
  owner: OwnerId
  code: string
  opened: Month
}

export function newBalance(draft: BalanceDraft, id: BalanceId): Balance {
  return {
    id,
    group: draft.group,
    label: draft.label.trim(),
    owner: draft.owner,
    code: draft.code.trim() || null,
    opened: draft.opened,
    closed: null,
    note: null,
  }
}
