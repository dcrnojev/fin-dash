import { householdOwner } from '../../src/domain/ids.ts'
import type { OwnerId, Person, PersonId, Pot, PotId } from '../../src/domain/types.ts'

// A partner as found in the legacy cash columns. Names come from the header cells at run time and live only in the outputs.
export interface LegacyPerson {
  letter: 'a' | 'b'
  name: string
  column: string
}

export function personId(person: LegacyPerson): PersonId {
  return `p${person.letter}` as PersonId
}

export function cashPotId(person: LegacyPerson): PotId {
  return `cash-${person.letter}` as PotId
}

export function secondPillarPotId(person: LegacyPerson): PotId {
  return `pen2-${person.letter}` as PotId
}

// Legacy header text of the shared cash and investment columns, and the pot each one becomes.
export const sharedPotColumns = [
  { header: 'Gotovina', pot: 'cash-home' as PotId, kind: 'cash', provider: null },
  { header: 'Crypto', pot: 'crypto' as PotId, kind: 'investment', provider: null },
  { header: 'Dionice HR', pot: 'hr-stocks' as PotId, kind: 'investment', provider: null },
  { header: 'Trading212', pot: 't212' as PotId, kind: 'investment', provider: 'Trading212' },
  { header: 'PBZ Fond', pot: 'pbz-funds' as PotId, kind: 'investment', provider: 'PBZ' },
] as const

export function legacyPeople(people: readonly LegacyPerson[]): Person[] {
  return people.map((person): Person => ({ id: personId(person), name: person.name, role: 'adult', note: null }))
}

export function legacyPots(people: readonly LegacyPerson[], pensionOwner: LegacyPerson): Pot[] {
  const pot = (id: PotId, label: string, kind: Pot['kind'], owner: OwnerId, provider: string | null, sort: number): Pot => ({
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
    ...people.map((person, index) => pot(cashPotId(person), `Cash ${person.name}`, 'cash', personId(person), null, (index + 1) * 10)),
    ...sharedPotColumns.map((column, index) => (
      pot(column.pot, column.header, column.kind, householdOwner, column.provider, (people.length + index + 1) * 10)
    )),
    pot(secondPillarPotId(pensionOwner), `2nd pillar ${pensionOwner.name}`, 'pension', personId(pensionOwner), null, 100),
  ]
}
