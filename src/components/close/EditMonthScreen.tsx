import { useMemo, useState } from 'react'
import { initialEntries } from '../../close/closeEntries'
import { closeFields, closeForm } from '../../close/closeForm'
import { valueChanges, type ValueChange } from '../../close/editPlan'
import { writeEdit, type WrittenEdit } from '../../close/writeEdit'
import { localIsoDate } from '../../domain/date'
import type { Ledger, Month } from '../../domain/types'
import { countOf, displayMonth } from '../../format'
import { EditReviewTable } from './EditReviewTable'
import { MonthValuesForm } from './MonthValuesForm'
import { ReviewActions } from './ReviewActions'

type EditStep =
  | { status: 'editing' }
  | { status: 'reviewing'; changes: ValueChange[] }
  | { status: 'writing'; changes: ValueChange[] }
  | { status: 'failed'; changes: ValueChange[]; message: string }

interface EditMonthScreenProps {
  ledger: Ledger
  month: Month
  spreadsheetId: string
  onEdited: (message: string) => void
  onBack: () => void
  onReread: () => void
}

// The close form for a month already closed or from the legacy history, starting from what the sheet has. Each pot keeps
// the level it is stored at.
export function EditMonthScreen({ ledger, month, spreadsheetId, onEdited, onBack, onReread }: EditMonthScreenProps) {
  const form = useMemo(() => closeForm(ledger, month, 'edit'), [ledger, month])
  const [entries, setEntries] = useState(() => initialEntries(form))
  const [step, setStep] = useState<EditStep>({ status: 'editing' })
  const [nothingChanged, setNothingChanged] = useState(false)

  const monthName = displayMonth(month)

  async function write(changes: ValueChange[]) {
    setStep({ status: 'writing', changes })

    try {
      const openedWith = ledger.snapshots.filter(snapshot => snapshot.month === month)
      const written = await writeEdit(spreadsheetId, month, changes, openedWith, localIsoDate(new Date()))
      onEdited(editedMessage(monthName, written))
    } catch (error) {
      setStep({ status: 'failed', changes, message: error instanceof Error ? error.message : String(error) })
    }
  }

  const header = (
    <div className="screen-header">
      <h2>Edit {monthName}</h2>
      <button type="button" className="link-button" onClick={onBack} disabled={step.status === 'writing'}>
        Back to the dashboard
      </button>
    </div>
  )

  if (closeFields(form).length === 0) {
    return (
      <section className="screen">
        {header}
        <p className="panel muted">No cash, investment or pension pot is open in {monthName}, so there is nothing to edit.</p>
      </section>
    )
  }

  if (step.status !== 'editing') {
    return (
      <section className="screen">
        {header}
        <section className="panel">
          <h3>Review before writing</h3>
          <p className="muted">
            Only these values are written. Each changed row gets the new value, <code>source</code> <code>app</code> and, for
            cash and investments, today as <code>as_of</code>; a value with no row gets a new one. No row is deleted, and the
            months row stays as it is.
          </p>

          <EditReviewTable changes={step.changes} />

          <ReviewActions
            writeLabel={`Save ${countOf(step.changes.length, 'value')}`}
            writing={step.status === 'writing'}
            failure={step.status === 'failed' ? step.message : null}
            canWrite
            onWrite={() => write(step.changes)}
            onBackToValues={() => setStep({ status: 'editing' })}
            onReread={onReread}
          />
        </section>
      </section>
    )
  }

  function review(changes: ValueChange[]) {
    setNothingChanged(changes.length === 0)

    if (changes.length > 0)
      setStep({ status: 'reviewing', changes })
  }

  const intro = (
    <p className="muted">
      The fields show what the sheet has for {monthName}. Change a value, or fill one the month has no row for; a blank field
      without a row stays without one. For a pension, the statement date must be in {monthName}.
    </p>
  )

  return (
    <MonthValuesForm
      form={form}
      entries={entries}
      header={header}
      intro={intro}
      problem={nothingChanged ? `Nothing differs from what the sheet has for ${monthName}.` : null}
      onEntryChange={(key, entry) => {
        setNothingChanged(false)
        setEntries(current => ({ ...current, [key]: entry }))
      }}
      onReview={fields => review(valueChanges(fields))}
    />
  )
}

function editedMessage(monthName: string, written: WrittenEdit): string {
  const parts = [
    written.changedCount > 0 ? `changed ${countOf(written.changedCount, 'value')}` : null,
    written.addedCount > 0 ? `added ${countOf(written.addedCount, 'value')}` : null,
  ].filter(part => part !== null)

  return `Saved ${monthName}: ${parts.join(' and ')}.`
}
