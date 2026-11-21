import { useMemo, useState } from 'react'
import { initialEntries, type EnteredField } from '../../close/closeEntries'
import { closeFields, closeForm } from '../../close/closeForm'
import { closeReview } from '../../close/closeReview'
import { closeRows } from '../../close/closeRows'
import { closesBeforeMonthEnd } from '../../close/closesEarly'
import { writeClose, type WrittenClose } from '../../close/writeClose'
import { monthEndHistory } from '../../calc/monthEndHistory'
import { localIsoDate } from '../../domain/date'
import { addMonths } from '../../domain/month'
import type { IsoDate, Ledger, Month } from '../../domain/types'
import { countOf, displayLongMonth, displayMonth } from '../../format'
import { PageHeader } from '../PageHeader'
import { CloseReviewTable } from './CloseReviewTable'
import { MonthValuesForm } from './MonthValuesForm'
import { ReviewActions } from './ReviewActions'

type CloseStep =
  | { status: 'editing' }
  | { status: 'reviewing'; fields: EnteredField[] }
  | { status: 'writing'; fields: EnteredField[] }
  | { status: 'failed'; fields: EnteredField[]; message: string }

interface CloseMonthScreenProps {
  ledger: Ledger
  month: Month
  spreadsheetId: string
  closedBy: string
  onClosed: (message: string) => void
  onBack: () => void
  onReread: () => void
}

export function CloseMonthScreen({ ledger, month, spreadsheetId, closedBy, onClosed, onBack, onReread }: CloseMonthScreenProps) {
  const form = useMemo(() => closeForm(ledger, month, 'close'), [ledger, month])
  const history = useMemo(() => monthEndHistory(ledger), [ledger])
  const [entries, setEntries] = useState(() => initialEntries(form))
  const [step, setStep] = useState<CloseStep>({ status: 'editing' })
  const [earlyConfirmed, setEarlyConfirmed] = useState(false)
  // The day the review opened, for its wording and the early-close question; the write takes its own date.
  const [reviewedOn, setReviewedOn] = useState<IsoDate>(() => localIsoDate(new Date()))

  const monthName = displayMonth(month)
  const lastMonthName = displayMonth(addMonths(month, -1))
  const keptCount = closeFields(form).filter(field => field.alreadyWritten !== null).length

  // The close is dated when it is written, so a review left open past midnight still dates it right.
  async function write(fields: EnteredField[]) {
    setStep({ status: 'writing', fields })

    try {
      const rows = closeRows(month, fields, localIsoDate(new Date()), closedBy)
      const written = await writeClose(spreadsheetId, rows, ledger.monthEndBalances.filter(monthEndBalance => monthEndBalance.month === month))
      onClosed(closedMessage(monthName, written))
    } catch (error) {
      setStep({ status: 'failed', fields, message: error instanceof Error ? error.message : String(error) })
    }
  }

  const header = (
    <PageHeader
      title={`Close ${displayLongMonth(month)}`}
      actions={
        <button type="button" className="link-button" onClick={onBack} disabled={step.status === 'writing'}>
          Back to home
        </button>
      }
    />
  )

  if (closeFields(form).length === 0) {
    return (
      <section className="screen">
        {header}
        <p className="panel muted">No cash, investment or pension group is open in {monthName}, so there is nothing to enter.</p>
      </section>
    )
  }

  if (step.status !== 'editing') {
    const closesEarly = closesBeforeMonthEnd(month, reviewedOn)

    return (
      <section className="screen">
        {header}
        <section className="panel">
          <h2>Review before writing</h2>
          <p className="muted">
            Nothing is written until you confirm. Cash and investment values are recorded as of the day you confirm (today,{' '}
            {reviewedOn}); each pension value as of its statement date. Pension stays out of the investment total.
          </p>

          <CloseReviewTable sections={closeReview(step.fields, history, month)} monthName={monthName} lastMonthName={lastMonthName} />

          {closesEarly && (
            <div className="notice">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={earlyConfirmed}
                  disabled={step.status === 'writing'}
                  onChange={event => setEarlyConfirmed(event.target.checked)}
                />
                The month has not ended yet; close it anyway?
              </label>
            </div>
          )}

          <ReviewActions
            writeLabel={`Close ${monthName}`}
            writing={step.status === 'writing'}
            failure={step.status === 'failed' ? step.message : null}
            canWrite={!closesEarly || earlyConfirmed}
            onWrite={() => write(step.fields)}
            onBackToValues={() => setStep({ status: 'editing' })}
            onReread={onReread}
          />
        </section>
      </section>
    )
  }

  const intro = (
    <>
      <p className="muted">
        Enter each value at the end of {monthName}; {lastMonthName} shows under each field. For a pension, enter the statement
        that arrived during {monthName}, with the date it is as of. Amounts can be typed as 1.234,56 or 1234.56.
      </p>

      {keptCount > 0 && (
        <p className="notice">
          The sheet already has {countOf(keptCount, 'value')} for {monthName}, from a close that did not finish or typed by
          hand. Closing keeps what the sheet has, so those fields cannot be changed here; edit the month once it is closed.
        </p>
      )}
    </>
  )

  return (
    <MonthValuesForm
      form={form}
      entries={entries}
      header={header}
      intro={intro}
      problem={null}
      onEntryChange={(key, entry) => setEntries(current => ({ ...current, [key]: entry }))}
      onReview={fields => {
        setReviewedOn(localIsoDate(new Date()))
        setStep({ status: 'reviewing', fields })
      }}
    />
  )
}

function closedMessage(monthName: string, written: WrittenClose): string {
  const wrote = `${monthName} is closed: wrote ${countOf(written.monthEndBalanceRowsWritten, 'month-end balance row')} and the months row.`

  if (written.monthEndBalanceRowsKept === 0)
    return wrote

  return `${wrote} The ${countOf(written.monthEndBalanceRowsKept, 'value')} the sheet already had, shown read-only, stayed as stored.`
}
