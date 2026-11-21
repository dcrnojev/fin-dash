import { householdOwner } from '../../src/domain/ids.ts'
import type { Group, GroupId, OwnerId, Person, PersonId } from '../../src/domain/types.ts'

// A partner as found in the legacy cash columns. Names come from the header cells at run time and live only in the outputs.
export interface LegacyPerson {
  letter: 'a' | 'b'
  name: string
  column: string
}

export function personId(person: LegacyPerson): PersonId {
  return `p${person.letter}` as PersonId
}

export function cashGroupId(person: LegacyPerson): GroupId {
  return `cash-${person.letter}` as GroupId
}

export function secondPillarGroupId(person: LegacyPerson): GroupId {
  return `pen2-${person.letter}` as GroupId
}

// Legacy header text of the shared cash and investment columns, and the group each one becomes.
export const sharedGroupColumns = [
  { header: 'Gotovina', group: 'cash-home' as GroupId, kind: 'cash', provider: null },
  { header: 'Crypto', group: 'crypto' as GroupId, kind: 'investment', provider: null },
  { header: 'Dionice HR', group: 'hr-stocks' as GroupId, kind: 'investment', provider: null },
  { header: 'Trading212', group: 't212' as GroupId, kind: 'investment', provider: 'Trading212' },
  { header: 'PBZ Fond', group: 'pbz-funds' as GroupId, kind: 'investment', provider: 'PBZ' },
] as const

export function legacyPeople(people: readonly LegacyPerson[]): Person[] {
  return people.map((person): Person => ({ id: personId(person), name: person.name, role: 'adult', note: null }))
}

export function legacyGroups(people: readonly LegacyPerson[], pensionOwner: LegacyPerson): Group[] {
  const group = (id: GroupId, label: string, kind: Group['kind'], owner: OwnerId, provider: string | null, sort: number): Group => ({
    id,
    label,
    kind,
    owner,
    provider,
    liquidity: kind === 'pension' ? 'locked' : 'liquid',
    cadence: kind === 'pension' ? 'quarterly' : 'monthly',
    opened: null,
    closed: null,
    returns: null,
    sort,
    note: null,
  })

  return [
    ...people.map((person, index) => group(cashGroupId(person), `Cash ${person.name}`, 'cash', personId(person), null, (index + 1) * 10)),
    ...sharedGroupColumns.map((column, index) => (
      group(column.group, column.header, column.kind, householdOwner, column.provider, (people.length + index + 1) * 10)
    )),
    group(secondPillarGroupId(pensionOwner), `2nd pillar ${pensionOwner.name}`, 'pension', personId(pensionOwner), null, 100),
  ]
}
