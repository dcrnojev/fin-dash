import { useId, useState, type FormEvent } from 'react'
import { householdOwner } from '../../domain/ids'
import { parseMonth } from '../../domain/month'
import { holdingsTab } from '../../domain/schema/holdingsTab'
import type { Holding, HoldingId, Month, OwnerId, Person, Pot, PotId } from '../../domain/types'
import { appendWithUnusedId } from '../../pots/appendWithUnusedId'
import { holdingOpenedProblem } from '../../pots/holdingOpenedProblem'
import { newHolding } from '../../pots/newHolding'
import { OwnerSelect } from './OwnerSelect'

interface AddHoldingFormProps {
  spreadsheetId: string
  pots: readonly Pot[]
  holdings: readonly Holding[]
  people: readonly Person[]
  // The month the next close asks about: the opened month the form starts with, and the earliest it takes.
  monthToClose: Month | null
  onAdded: (message: string) => void
}

// A month is closed per holding only for investment pots, so only those are offered.
export function AddHoldingForm({ spreadsheetId, pots, holdings, people, monthToClose, onAdded }: AddHoldingFormProps) {
  const openInvestmentPots = pots.filter(pot => pot.kind === 'investment' && pot.closed === null).sort((a, b) => a.sort - b.sort)
  const [potId, setPotId] = useState<PotId | ''>(openInvestmentPots[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const [owner, setOwner] = useState<OwnerId>(householdOwner)
  const [code, setCode] = useState('')
  const [opened, setOpened] = useState<string>(monthToClose ?? '')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  if (openInvestmentPots.length === 0) {
    return (
      <section className="panel">
        <h3>Add a holding</h3>
        <p className="muted">Holdings belong to investment pots. Add an investment pot first.</p>
      </section>
    )
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const openedMonth = parseMonth(opened.trim())
    const trimmedLabel = label.trim()

    if (potId === '' || trimmedLabel === '' || openedMonth === null) {
      setProblem('Choose a pot, give the holding a label and type the month it opened as YYYY-MM.')
      return
    }

    const openedProblem = holdingOpenedProblem(openedMonth, monthToClose)

    if (openedProblem !== null) {
      setProblem(openedProblem)
      return
    }

    if (holdings.some(holding => holding.pot === potId && holding.label === trimmedLabel)) {
      setProblem(`This pot already has a holding labelled ${trimmedLabel}.`)
      return
    }

    setSaving(true)
    setProblem(null)

    try {
      const draft = { pot: potId, label, owner, code, opened: openedMonth }
      const added = await appendWithUnusedId(spreadsheetId, holdingsTab, label, 'holding', id => newHolding(draft, id as HoldingId))
      onAdded(`Added the holding ${added.label} with the id ${added.id}.`)
    } catch (error) {
      setProblem(`The holding was not added: ${error instanceof Error ? error.message : String(error)}`)
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={add}>
      <h3>Add a holding</h3>

      <div className="field">
        <label htmlFor={`${idPrefix}-pot`}>Pot</label>
        <select id={`${idPrefix}-pot`} value={potId} onChange={event => setPotId(event.target.value as PotId)}>
          {openInvestmentPots.map(pot => (
            <option key={pot.id} value={pot.id}>
              {pot.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input id={`${idPrefix}-label`} value={label} onChange={event => setLabel(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-owner`}>Owner</label>
        <OwnerSelect id={`${idPrefix}-owner`} value={owner} people={people} onChange={setOwner} />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-code`}>
          Code <span className="muted">(optional, such as a ticker or ISIN)</span>
        </label>
        <input id={`${idPrefix}-code`} value={code} onChange={event => setCode(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-opened`}>Opened month</label>
        <input
          id={`${idPrefix}-opened`}
          type="month"
          placeholder="YYYY-MM"
          min={monthToClose ?? undefined}
          value={opened}
          onChange={event => setOpened(event.target.value)}
        />
      </div>

      {problem && <p className="field-error">{problem}</p>}

      <div className="button-row">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Adding...' : 'Add holding'}
        </button>
      </div>
    </form>
  )
}
