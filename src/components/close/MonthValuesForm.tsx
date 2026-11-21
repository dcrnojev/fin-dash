import { useState, type FormEvent, type ReactNode } from 'react'
import { readEntries, type EnteredField, type FieldEntry, type FieldErrors } from '../../close/closeEntries'
import type { CloseForm } from '../../close/closeForm'
import { addMonths } from '../../domain/month'
import { countOf, displayMonth } from '../../format'
import { CloseGroupFields } from './CloseGroupFields'

interface MonthValuesFormProps {
  form: CloseForm
  // Owned by the screen, so the values survive going to the review and back.
  entries: Readonly<Record<string, FieldEntry>>
  header: ReactNode
  intro: ReactNode
  // Shown above the Review button, such as why the review did not open.
  problem: string | null
  onEntryChange: (key: string, entry: FieldEntry) => void
  onReview: (fields: EnteredField[]) => void
}

export function MonthValuesForm({ form, entries, header, intro, problem, onEntryChange, onReview }: MonthValuesFormProps) {
  const [reviewTried, setReviewTried] = useState(false)

  const read = readEntries(form, entries)
  const errors = read.status === 'invalid' ? read.errors : new Map<string, FieldErrors>()
  const lastMonthName = displayMonth(addMonths(form.month, -1))

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (read.status === 'valid')
      onReview(read.fields)
    else
      setReviewTried(true)
  }

  const sections = [
    { title: 'Cash', groups: form.cash },
    { title: 'Investments', groups: form.investments },
    { title: 'Pension', groups: form.pensions },
  ].filter(section => section.groups.length > 0)

  return (
    <form className="screen" onSubmit={review} noValidate>
      {header}
      {intro}

      {sections.map(section => (
        <section key={section.title} className="panel">
          <h2>{section.title}</h2>
          <div className="close-grid">
            {section.groups.map(closeGroup => (
              <CloseGroupFields
                key={closeGroup.group.id}
                form={form}
                closeGroup={closeGroup}
                entries={entries}
                errors={errors}
                lastMonthName={lastMonthName}
                showBlankErrors={reviewTried}
                onChange={onEntryChange}
              />
            ))}
          </div>
        </section>
      ))}

      {reviewTried && read.status === 'invalid' && (
        <p className="field-error" role="alert">
          {countOf(read.errors.size, 'value')} still {read.errors.size === 1 ? 'needs' : 'need'} fixing; see the marked fields.
        </p>
      )}

      {problem && (
        <p className="notice" role="status">
          {problem}
        </p>
      )}

      <div className="button-row">
        <button type="submit" className="primary-button">
          Review
        </button>
      </div>
    </form>
  )
}
