import { useId, useState, type FormEvent } from 'react'
import { householdOwner } from '../../domain/ids'
import { potsTab } from '../../domain/schema/potsTab'
import { liquidities, type OwnerId, type Person, type Pot, type PotId, type PotKind } from '../../domain/types'
import { appendWithUnusedId } from '../../pots/appendWithUnusedId'
import { newPot } from '../../pots/newPot'
import { OwnerSelect } from './OwnerSelect'

// Loan pots are left out until the app has something to do with them.
const kindChoices: { kind: PotKind; label: string }[] = [
  { kind: 'cash', label: 'Cash' },
  { kind: 'investment', label: 'Investment' },
  { kind: 'pension', label: 'Pension' },
]

interface AddPotFormProps {
  spreadsheetId: string
  pots: readonly Pot[]
  people: readonly Person[]
  onAdded: (message: string) => void
}

export function AddPotForm({ spreadsheetId, pots, people, onAdded }: AddPotFormProps) {
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<PotKind>('cash')
  const [owner, setOwner] = useState<OwnerId>(householdOwner)
  const [provider, setProvider] = useState('')
  const [liquidity, setLiquidity] = useState<Pot['liquidity']>('liquid')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function changeKind(nextKind: PotKind) {
    setKind(nextKind)
    setLiquidity(nextKind === 'pension' ? 'locked' : 'liquid')
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedLabel = label.trim()

    if (trimmedLabel === '') {
      setProblem('Give the pot a label.')
      return
    }

    if (pots.some(pot => pot.label === trimmedLabel)) {
      setProblem(`Another pot is already labelled ${trimmedLabel}.`)
      return
    }

    setSaving(true)
    setProblem(null)

    try {
      const draft = { label, kind, owner, provider, liquidity }
      const added = await appendWithUnusedId(spreadsheetId, potsTab, label, 'pot', id => newPot(draft, id as PotId, pots))
      onAdded(`Added the pot ${added.label} with the id ${added.id}.`)
    } catch (error) {
      setProblem(`The pot was not added: ${error instanceof Error ? error.message : String(error)}`)
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={add}>
      <h3>Add a pot</h3>

      <div className="field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input id={`${idPrefix}-label`} value={label} onChange={event => setLabel(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-kind`}>Kind</label>
        <select id={`${idPrefix}-kind`} value={kind} onChange={event => changeKind(event.target.value as PotKind)}>
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
        <select id={`${idPrefix}-liquidity`} value={liquidity} onChange={event => setLiquidity(event.target.value as Pot['liquidity'])}>
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
          {saving ? 'Adding...' : 'Add pot'}
        </button>
      </div>
    </form>
  )
}
