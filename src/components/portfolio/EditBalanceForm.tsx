import { useId, useState, type FormEvent } from 'react'
import { balancesTab } from '../../domain/schema/balancesTab'
import type { Balance, Person } from '../../domain/types'
import { displayMonth } from '../../format'
import { changedColumns } from '../../portfolio/changedColumns'
import {
  balanceEditColumns,
  balanceEditDraft,
  editedBalance,
  type BalanceEditColumn,
  type BalanceEditDraft,
  type BalanceEditRows,
} from '../../portfolio/editBalance'
import { ownerName } from '../../portfolio/ownerName'
import { writeRowEdit } from '../../portfolio/writeRowEdit'
import { EditReview, type ReviewedChange } from './EditReview'
import { OwnerSelect } from './OwnerSelect'

type EditBalanceStep = { status: 'editing' } | { status: 'reviewing'; edited: Balance; changes: ReviewedChange[] }

interface EditBalanceFormProps {
  balance: Balance
  rows: BalanceEditRows
  people: readonly Person[]
  spreadsheetId: string
  onSaved: (message: string) => void
  onCancel: () => void
  onReread: () => void
}

const fieldNames: Record<BalanceEditColumn, string> = {
  label: 'Label',
  owner: 'Owner',
  code: 'Code',
  closed_month: 'Closed month',
  note: 'Note',
}

export function EditBalanceForm({ balance, rows, people, spreadsheetId, onSaved, onCancel, onReread }: EditBalanceFormProps) {
  const [draft, setDraft] = useState(() => balanceEditDraft(balance))
  const [step, setStep] = useState<EditBalanceStep>({ status: 'editing' })
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  function update(fields: Partial<BalanceEditDraft>) {
    setProblem(null)
    setDraft(current => ({ ...current, ...fields }))
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const edited = editedBalance(balance, draft, rows)

    if (edited.status === 'invalid') {
      setProblem(edited.problem)
      return
    }

    const columns = changedColumns(balancesTab, balance, edited.balance, balanceEditColumns)

    if (columns.length === 0) {
      setProblem('Nothing differs from what the sheet has.')
      return
    }

    const changes = columns.map(column => ({
      field: fieldNames[column],
      before: fieldText(column, balance, people),
      after: fieldText(column, edited.balance, people),
    }))

    setStep({ status: 'reviewing', edited: edited.balance, changes })
  }

  if (step.status === 'reviewing') {
    const { edited, changes } = step

    return (
      <div className="edit-form">
        <h4>Review the changes to {balance.label}</h4>
        <EditReview
          changes={changes}
          write={async () => {
            await writeRowEdit(spreadsheetId, balancesTab, balance, edited, balanceEditColumns)
            onSaved(`Saved the balance ${edited.label}.`)
          }}
          onBack={() => setStep({ status: 'editing' })}
          onReread={onReread}
        />
      </div>
    )
  }

  return (
    <form className="edit-form" onSubmit={review}>
      <h4>Edit {balance.label}</h4>
      <p className="muted">
        The id <code>{balance.id}</code>, the group and the opened month stay as they are; for another group, add a new balance.
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

function fieldText(column: BalanceEditColumn, balance: Balance, people: readonly Person[]): string {
  switch (column) {
    case 'label':
      return balance.label
    case 'owner':
      return ownerName(balance.owner, people)
    case 'code':
      return balance.code ?? 'blank'
    case 'closed_month':
      return balance.closed === null ? 'open' : displayMonth(balance.closed)
    case 'note':
      return balance.note ?? 'blank'
  }
}
