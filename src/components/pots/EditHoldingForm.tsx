import { useId, useState, type FormEvent } from 'react'
import { holdingsTab } from '../../domain/schema/holdingsTab'
import type { Holding, Person } from '../../domain/types'
import { displayMonth } from '../../format'
import { changedColumns } from '../../pots/changedColumns'
import {
  editedHolding,
  holdingEditColumns,
  holdingEditDraft,
  type HoldingEditColumn,
  type HoldingEditDraft,
  type HoldingEditRows,
} from '../../pots/editHolding'
import { ownerName } from '../../pots/ownerName'
import { writeRowEdit } from '../../pots/writeRowEdit'
import { EditReview, type ReviewedChange } from './EditReview'
import { OwnerSelect } from './OwnerSelect'

type EditHoldingStep = { status: 'editing' } | { status: 'reviewing'; edited: Holding; changes: ReviewedChange[] }

interface EditHoldingFormProps {
  holding: Holding
  rows: HoldingEditRows
  people: readonly Person[]
  spreadsheetId: string
  onSaved: (message: string) => void
  onCancel: () => void
  onReread: () => void
}

const fieldNames: Record<HoldingEditColumn, string> = {
  label: 'Label',
  owner: 'Owner',
  code: 'Code',
  closed_month: 'Closed month',
  note: 'Note',
}

export function EditHoldingForm({ holding, rows, people, spreadsheetId, onSaved, onCancel, onReread }: EditHoldingFormProps) {
  const [draft, setDraft] = useState(() => holdingEditDraft(holding))
  const [step, setStep] = useState<EditHoldingStep>({ status: 'editing' })
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function update(fields: Partial<HoldingEditDraft>) {
    setProblem(null)
    setDraft(current => ({ ...current, ...fields }))
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const edited = editedHolding(holding, draft, rows)

    if (edited.status === 'invalid') {
      setProblem(edited.problem)
      return
    }

    const columns = changedColumns(holdingsTab, holding, edited.holding, holdingEditColumns)

    if (columns.length === 0) {
      setProblem('Nothing differs from what the sheet has.')
      return
    }

    const changes = columns.map(column => ({
      field: fieldNames[column],
      before: fieldText(column, holding, people),
      after: fieldText(column, edited.holding, people),
    }))

    setStep({ status: 'reviewing', edited: edited.holding, changes })
  }

  if (step.status === 'reviewing') {
    const { edited, changes } = step

    return (
      <div className="edit-form">
        <h4>Review the changes to {holding.label}</h4>
        <EditReview
          changes={changes}
          write={async () => {
            await writeRowEdit(spreadsheetId, holdingsTab, holding, edited, holdingEditColumns)
            onSaved(`Saved the holding ${edited.label}.`)
          }}
          onBack={() => setStep({ status: 'editing' })}
          onReread={onReread}
        />
      </div>
    )
  }

  return (
    <form className="edit-form" onSubmit={review}>
      <h4>Edit {holding.label}</h4>
      <p className="muted">
        The id <code>{holding.id}</code>, the pot and the opened month stay as they are; for another pot, add a new holding.
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
        <label htmlFor={`${idPrefix}-code`}>
          Code <span className="muted">(optional, such as a ticker or ISIN)</span>
        </label>
        <input id={`${idPrefix}-code`} value={draft.code} onChange={event => update({ code: event.target.value })} autoComplete="off" />
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

function fieldText(column: HoldingEditColumn, holding: Holding, people: readonly Person[]): string {
  switch (column) {
    case 'label':
      return holding.label
    case 'owner':
      return ownerName(holding.owner, people)
    case 'code':
      return holding.code ?? 'blank'
    case 'closed_month':
      return holding.closed === null ? 'open' : displayMonth(holding.closed)
    case 'note':
      return holding.note ?? 'blank'
  }
}
