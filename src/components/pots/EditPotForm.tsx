import { useId, useState, type FormEvent } from 'react'
import { potsTab } from '../../domain/schema/potsTab'
import { liquidities, type Person, type Pot } from '../../domain/types'
import { displayMonth } from '../../format'
import { changedColumns } from '../../pots/changedColumns'
import { editedPot, potEditColumns, potEditDraft, type PotEditColumn, type PotEditDraft, type PotEditRows } from '../../pots/editPot'
import { ownerName } from '../../pots/ownerName'
import { writeRowEdit } from '../../pots/writeRowEdit'
import { EditReview, type ReviewedChange } from './EditReview'
import { OwnerSelect } from './OwnerSelect'

type EditPotStep = { status: 'editing' } | { status: 'reviewing'; edited: Pot; changes: ReviewedChange[] }

interface EditPotFormProps {
  pot: Pot
  rows: PotEditRows
  people: readonly Person[]
  spreadsheetId: string
  onSaved: (message: string) => void
  onCancel: () => void
  onReread: () => void
}

const fieldNames: Record<PotEditColumn, string> = {
  label: 'Label',
  owner: 'Owner',
  provider: 'Provider',
  liquidity: 'Liquidity',
  closed_month: 'Closed month',
  note: 'Note',
}

export function EditPotForm({ pot, rows, people, spreadsheetId, onSaved, onCancel, onReread }: EditPotFormProps) {
  const [draft, setDraft] = useState(() => potEditDraft(pot))
  const [step, setStep] = useState<EditPotStep>({ status: 'editing' })
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function update(fields: Partial<PotEditDraft>) {
    setProblem(null)
    setDraft(current => ({ ...current, ...fields }))
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const edited = editedPot(pot, draft, rows)

    if (edited.status === 'invalid') {
      setProblem(edited.problem)
      return
    }

    const columns = changedColumns(potsTab, pot, edited.pot, potEditColumns)

    if (columns.length === 0) {
      setProblem('Nothing differs from what the sheet has.')
      return
    }

    const changes = columns.map(column => ({
      field: fieldNames[column],
      before: fieldText(column, pot, people),
      after: fieldText(column, edited.pot, people),
    }))

    setStep({ status: 'reviewing', edited: edited.pot, changes })
  }

  if (step.status === 'reviewing') {
    const { edited, changes } = step

    return (
      <div className="edit-form">
        <h4>Review the changes to {pot.label}</h4>
        <EditReview
          changes={changes}
          write={async () => {
            await writeRowEdit(spreadsheetId, potsTab, pot, edited, potEditColumns)
            onSaved(`Saved the pot ${edited.label}.`)
          }}
          onBack={() => setStep({ status: 'editing' })}
          onReread={onReread}
        />
      </div>
    )
  }

  return (
    <form className="edit-form" onSubmit={review}>
      <h4>Edit {pot.label}</h4>
      <p className="muted">
        The id <code>{pot.id}</code>, the kind ({pot.kind}) and the opened month stay as they are; for another kind, add a new
        pot.
      </p>

      <div className="field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input id={`${idPrefix}-label`} value={draft.label} onChange={event => update({ label: event.target.value })} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-owner`}>Owner</label>
        <OwnerSelect id={`${idPrefix}-owner`} value={draft.owner} people={people} onChange={owner => update({ owner })} />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-provider`}>
          Provider <span className="muted">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-provider`}
          value={draft.provider}
          onChange={event => update({ provider: event.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-liquidity`}>Liquidity</label>
        <select
          id={`${idPrefix}-liquidity`}
          value={draft.liquidity}
          onChange={event => update({ liquidity: event.target.value as Pot['liquidity'] })}
        >
          {liquidities.map(choice => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-closed`}>
          Closed month <span className="muted">(blank while it is open)</span>
        </label>
        <input
          id={`${idPrefix}-closed`}
          type="month"
          placeholder="YYYY-MM"
          value={draft.closed}
          onChange={event => update({ closed: event.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-note`}>
          Note <span className="muted">(optional)</span>
        </label>
        <input id={`${idPrefix}-note`} value={draft.note} onChange={event => update({ note: event.target.value })} autoComplete="off" />
      </div>

      {problem && <p className="field-error">{problem}</p>}

      <div className="button-row">
        <button type="submit" className="primary-button">
          Review changes
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function fieldText(column: PotEditColumn, pot: Pot, people: readonly Person[]): string {
  switch (column) {
    case 'label':
      return pot.label
    case 'owner':
      return ownerName(pot.owner, people)
    case 'provider':
      return pot.provider ?? 'blank'
    case 'liquidity':
      return pot.liquidity
    case 'closed_month':
      return pot.closed === null ? 'open' : displayMonth(pot.closed)
    case 'note':
      return pot.note ?? 'blank'
  }
}
