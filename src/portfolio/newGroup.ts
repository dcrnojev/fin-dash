import type { Group, GroupId, GroupKind, OwnerId } from '../domain/types'

export interface GroupDraft {
  label: string
  kind: GroupKind
  owner: OwnerId
  provider: string
  liquidity: Group['liquidity']
}

const sortStep = 10

// A new group sorts after every existing one. Its opened month stays blank, so history typed in by hand for earlier months
// still fits it.
export function newGroup(draft: GroupDraft, id: GroupId, existingGroups: readonly Group[]): Group {
  return {
    id,
    label: draft.label.trim(),
    kind: draft.kind,
    owner: draft.owner,
    provider: draft.provider.trim() || null,
    liquidity: draft.liquidity,
    cadence: 'monthly',
    opened: null,
    closed: null,
    returns: null,
    sort: Math.max(0, ...existingGroups.map(group => group.sort)) + sortStep,
    note: null,
  }
}
