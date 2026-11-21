import { useId, useState, type FormEvent } from 'react'
import { groupsTab } from '../../domain/schema/groupsTab'
import { liquidities, type Group, type Person } from '../../domain/types'
import { displayMonth } from '../../format'
import { changedColumns } from '../../portfolio/changedColumns'
import {
  editedGroup,
  groupEditColumns,
  groupEditDraft,
  type GroupEditColumn,
  type GroupEditDraft,
  type GroupEditRows,
} from '../../portfolio/editGroup'
import { ownerName } from '../../portfolio/ownerName'
import { writeRowEdit } from '../../portfolio/writeRowEdit'
import { EditReview, type ReviewedChange } from './EditReview'
import { OwnerSelect } from './OwnerSelect'

type EditGroupStep = { status: 'editing' } | { status: 'reviewing'; edited: Group; changes: ReviewedChange[] }

interface EditGroupFormProps {
  group: Group
  rows: GroupEditRows
  people: readonly Person[]
  spreadsheetId: string
  onSaved: (message: string) => void
  onCancel: () => void
  onReread: () => void
}

const fieldNames: Record<GroupEditColumn, string> = {
  label: 'Label',
  owner: 'Owner',
  provider: 'Provider',
  liquidity: 'Liquidity',
  closed_month: 'Closed month',
  note: 'Note',
}

export function EditGroupForm({ group, rows, people, spreadsheetId, onSaved, onCancel, onReread }: EditGroupFormProps) {
  const [draft, setDraft] = useState(() => groupEditDraft(group))
  const [step, setStep] = useState<EditGroupStep>({ status: 'editing' })
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function update(fields: Partial<GroupEditDraft>) {
    setProblem(null)
    setDraft(current => ({ ...current, ...fields }))
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const edited = editedGroup(group, draft, rows)

    if (edited.status === 'invalid') {
      setProblem(edited.problem)
      return
    }

    const columns = changedColumns(groupsTab, group, edited.group, groupEditColumns)

    if (columns.length === 0) {
      setProblem('Nothing differs from what the sheet has.')
      return
    }

    const changes = columns.map(column => ({
      field: fieldNames[column],
      before: fieldText(column, group, people),
      after: fieldText(column, edited.group, people),
    }))

    setStep({ status: 'reviewing', edited: edited.group, changes })
  }

  if (step.status === 'reviewing') {
    const { edited, changes } = step

    return (
      <div className="edit-form">
        <h4>Review the changes to {group.label}</h4>
        <EditReview
          changes={changes}
          write={async () => {
            await writeRowEdit(spreadsheetId, groupsTab, group, edited, groupEditColumns)
            onSaved(`Saved the group ${edited.label}.`)
          }}
          onBack={() => setStep({ status: 'editing' })}
          onReread={onReread}
        />
      </div>
    )
  }

  return (
    <form className="edit-form" onSubmit={review}>
      <h4>Edit {group.label}</h4>
      <p className="muted">
        The id <code>{group.id}</code>, the kind ({group.kind}) and the opened month stay as they are; for another kind, add a new
        group.
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
          onChange={event => update({ liquidity: event.target.value as Group['liquidity'] })}
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

function fieldText(column: GroupEditColumn, group: Group, people: readonly Person[]): string {
  switch (column) {
    case 'label':
      return group.label
    case 'owner':
      return ownerName(group.owner, people)
    case 'provider':
      return group.provider ?? 'blank'
    case 'liquidity':
      return group.liquidity
    case 'closed_month':
      return group.closed === null ? 'open' : displayMonth(group.closed)
    case 'note':
      return group.note ?? 'blank'
  }
}
