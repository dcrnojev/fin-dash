import { householdOwner } from '../domain/ids'
import type { Pot, PotId, PotKind } from '../domain/types'

export interface PotDraft {
  label: string
  kind: PotKind
  provider: string
  liquidity: Pot['liquidity']
}

const sortStep = 10

// A new pot is the household's and sorts after every existing one. Its opened month stays blank, so history typed in by
// hand for earlier months still fits it.
export function newPot(draft: PotDraft, id: PotId, existingPots: readonly Pot[]): Pot {
  return {
    id,
    label: draft.label.trim(),
    kind: draft.kind,
    owner: householdOwner,
    provider: draft.provider.trim() || null,
    liquidity: draft.liquidity,
    cadence: 'monthly',
    opened: null,
    closed: null,
    returns: null,
    sort: Math.max(0, ...existingPots.map(pot => pot.sort)) + sortStep,
    note: null,
  }
}
