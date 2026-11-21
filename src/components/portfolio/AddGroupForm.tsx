import { useId, useState, type FormEvent } from 'react'
import { householdOwner } from '../../domain/ids'
import { groupsTab } from '../../domain/schema/groupsTab'
import { liquidities, type Group, type GroupId, type GroupKind, type OwnerId, type Person } from '../../domain/types'
import { appendWithUnusedId } from '../../portfolio/appendWithUnusedId'
import { newGroup } from '../../portfolio/newGroup'
import { OwnerSelect } from './OwnerSelect'

// Loan groups are left out until the app has something to do with them.
const kindChoices: { kind: GroupKind; label: string }[] = [
  { kind: 'cash', label: 'Cash' },
  { kind: 'investment', label: 'Investment' },
  { kind: 'pension', label: 'Pension' },
]

interface AddGroupFormProps {
  spreadsheetId: string
  groups: readonly Group[]
  people: readonly Person[]
  onAdded: (message: string) => void
}

export function AddGroupForm({ spreadsheetId, groups, people, onAdded }: AddGroupFormProps) {
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<GroupKind>('cash')
  const [owner, setOwner] = useState<OwnerId>(householdOwner)
  const [provider, setProvider] = useState('')
  const [liquidity, setLiquidity] = useState<Group['liquidity']>('liquid')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function changeKind(nextKind: GroupKind) {
    setKind(nextKind)
    setLiquidity(nextKind === 'pension' ? 'locked' : 'liquid')
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedLabel = label.trim()

    if (trimmedLabel === '') {
      setProblem('Give the group a label.')
      return
    }

    if (groups.some(group => group.label === trimmedLabel)) {
      setProblem(`Another group is already labelled ${trimmedLabel}.`)
      return
    }

    setSaving(true)
    setProblem(null)

    try {
      const draft = { label, kind, owner, provider, liquidity }
      const added = await appendWithUnusedId(spreadsheetId, groupsTab, label, 'group', id => newGroup(draft, id as GroupId, groups))
      onAdded(`Added the group ${added.label} with the id ${added.id}.`)
    } catch (error) {
      setProblem(`The group was not added: ${error instanceof Error ? error.message : String(error)}`)
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={add}>
      <h3>Add a group</h3>

      <div className="field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input id={`${idPrefix}-label`} value={label} onChange={event => setLabel(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-kind`}>Kind</label>
        <select id={`${idPrefix}-kind`} value={kind} onChange={event => changeKind(event.target.value as GroupKind)}>
          {kindChoices.map(choice => (
            <option key={choice.kind} value={choice.kind}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-owner`}>Owner</label>
        <OwnerSelect id={`${idPrefix}-owner`} value={owner} people={people} onChange={setOwner} />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-provider`}>
          Provider <span className="muted">(optional)</span>
        </label>
        <input id={`${idPrefix}-provider`} value={provider} onChange={event => setProvider(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-liquidity`}>Liquidity</label>
        <select id={`${idPrefix}-liquidity`} value={liquidity} onChange={event => setLiquidity(event.target.value as Group['liquidity'])}>
          {liquidities.map(choice => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </div>

      {problem && <p className="field-error">{problem}</p>}

      <div className="button-row">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Adding...' : 'Add group'}
        </button>
      </div>
    </form>
  )
}
