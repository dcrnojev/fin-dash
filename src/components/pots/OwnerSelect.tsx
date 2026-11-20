import { householdOwner } from '../../domain/ids'
import type { OwnerId, Person } from '../../domain/types'

interface OwnerSelectProps {
  id: string
  value: OwnerId
  people: readonly Person[]
  onChange: (owner: OwnerId) => void
}

export function OwnerSelect({ id, value, people, onChange }: OwnerSelectProps) {
  return (
    <select id={id} value={value} onChange={event => onChange(event.target.value as OwnerId)}>
      <option value={householdOwner}>Household</option>
      {people.map(person => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  )
}
