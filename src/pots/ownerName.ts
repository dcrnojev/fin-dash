import { householdOwner } from '../domain/ids'
import type { OwnerId, Person } from '../domain/types'

export function ownerName(owner: OwnerId, people: readonly Person[]): string {
  if (owner === householdOwner)
    return 'Household'

  return people.find(person => person.id === owner)?.name ?? owner
}
