import type { FieldEntry, FieldErrors } from '../../close/closeEntries'
import { isReadOnly, type CloseForm, type ClosePot } from '../../close/closeForm'
import { displayEuros } from '../../format'
import { CloseValueField } from './CloseValueField'

interface ClosePotFieldsProps {
  form: CloseForm
  closePot: ClosePot
  entries: Readonly<Record<string, FieldEntry>>
  errors: ReadonlyMap<string, FieldErrors>
  lastMonthName: string
  showBlankErrors: boolean
  onChange: (key: string, entry: FieldEntry) => void
}

// A pot entered per holding is a group with the pot's name; any other pot is a single field.
export function ClosePotFields({ form, closePot, entries, errors, lastMonthName, showBlankErrors, onChange }: ClosePotFieldsProps) {
  const fields = closePot.fields.map(field => (
    <CloseValueField
      key={field.key}
      field={field}
      entry={entries[field.key] ?? { amount: '', asOf: '' }}
      errors={errors.get(field.key)}
      readOnly={isReadOnly(form, field)}
      lastMonthName={lastMonthName}
      showBlankErrors={showBlankErrors}
      onChange={entry => onChange(field.key, entry)}
    />
  ))

  const otherLevelTotal = closePot.lastMonthTotalAtOtherLevel

  const enteredAs = closePot.fields[0].holding === null ? 'per holding' : 'for the whole pot'

  const otherLevelHint = otherLevelTotal !== null && (
    <p className="muted close-hint">
      {lastMonthName} was entered {enteredAs}, with a total of {displayEuros(otherLevelTotal, false)}.
    </p>
  )

  if (closePot.fields.every(field => field.holding === null)) {
    return (
      <>
        {fields}
        {otherLevelHint}
      </>
    )
  }

  return (
    <fieldset className="close-pot">
      <legend>{closePot.pot.label}</legend>
      {otherLevelHint}
      {fields}
    </fieldset>
  )
}
