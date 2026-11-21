import { useId } from 'react'
import { withLastMonthAmount, type FieldEntry, type FieldErrors } from '../../close/closeEntries'
import type { CloseField } from '../../close/closeForm'
import { displayEuros } from '../../format'

interface CloseValueFieldProps {
  field: CloseField
  entry: FieldEntry
  errors: FieldErrors | undefined
  readOnly: boolean
  lastMonthName: string
  // Before the first review a blank field is not an error yet; a value typed wrong is one straight away.
  showBlankErrors: boolean
  onChange: (entry: FieldEntry) => void
}

export function CloseValueField({ field, entry, errors, readOnly, lastMonthName, showBlankErrors, onChange }: CloseValueFieldProps) {
  const id = useId()
  // A group asked per balance shows its name above the fields, so each field names only its balance.
  const label = field.balance?.label ?? field.group.label
  const isPension = field.group.kind === 'pension'
  const amountError = errors?.amount && (showBlankErrors || entry.amount.trim() !== '') ? errors.amount : null
  const asOfError = errors?.asOf && (showBlankErrors || entry.asOf !== '') ? errors.asOf : null

  return (
    <div className="close-field">
      <div className="field">
        <label htmlFor={`${id}-amount`}>{label}</label>
        <input
          id={`${id}-amount`}
          inputMode="decimal"
          autoComplete="off"
          value={entry.amount}
          readOnly={readOnly}
          aria-invalid={amountError !== null}
          aria-describedby={`${id}-hint`}
          onChange={event => onChange({ ...entry, amount: event.target.value })}
        />
        {amountError && <p className="field-error">{amountError}</p>}
      </div>

      {isPension && (
        <div className="field">
          <label htmlFor={`${id}-as-of`}>Statement date</label>
          <input
            id={`${id}-as-of`}
            type="date"
            value={entry.asOf}
            readOnly={readOnly}
            aria-invalid={asOfError !== null}
            onChange={event => onChange({ ...entry, asOf: event.target.value })}
          />
          {asOfError && <p className="field-error">{asOfError}</p>}
        </div>
      )}

      <p id={`${id}-hint`} className="muted close-hint">
        {hintText(field, readOnly, lastMonthName)}
        {!readOnly && field.lastMonth !== null && (
          <>
            {' '}
            <button type="button" className="link-button" onClick={() => onChange(withLastMonthAmount(entry, field))}>
              Same as last month
            </button>
          </>
        )}
      </p>
    </div>
  )
}

function hintText(field: CloseField, readOnly: boolean, lastMonthName: string): string {
  if (readOnly)
    return 'Already in the sheet for this month; closing keeps it as it is.'

  if (field.lastMonth === null)
    return `Nothing entered for ${lastMonthName}.`

  const statement = field.lastMonth.asOf === null ? '' : `, statement of ${field.lastMonth.asOf}`
  return `${lastMonthName}: ${displayEuros(field.lastMonth.value, false)}${statement}.`
}
