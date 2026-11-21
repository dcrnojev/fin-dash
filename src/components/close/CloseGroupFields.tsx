import type { FieldEntry, FieldErrors } from '../../close/closeEntries'
import { isReadOnly, type CloseForm, type CloseGroup } from '../../close/closeForm'
import { displayEuros } from '../../format'
import { CloseValueField } from './CloseValueField'

interface CloseGroupFieldsProps {
  form: CloseForm
  closeGroup: CloseGroup
  entries: Readonly<Record<string, FieldEntry>>
  errors: ReadonlyMap<string, FieldErrors>
  lastMonthName: string
  showBlankErrors: boolean
  onChange: (key: string, entry: FieldEntry) => void
}

// A group entered per balance is a fieldset with the group's name; any other group is a single field.
export function CloseGroupFields({ form, closeGroup, entries, errors, lastMonthName, showBlankErrors, onChange }: CloseGroupFieldsProps) {
  const fields = closeGroup.fields.map(field => (
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

  const otherLevelTotal = closeGroup.lastMonthTotalAtOtherLevel

  const enteredAs = closeGroup.fields[0].balance === null ? 'per balance' : 'for the whole group'

  const otherLevelHint = otherLevelTotal !== null && (
    <p className="muted close-hint">
      {lastMonthName} was entered {enteredAs}, with a total of {displayEuros(otherLevelTotal, false)}.
    </p>
  )

  if (closeGroup.fields.every(field => field.balance === null)) {
    return (
      <>
        {fields}
        {otherLevelHint}
      </>
    )
  }

  return (
    <fieldset className="close-group">
      <legend>{closeGroup.group.label}</legend>
      {otherLevelHint}
      {fields}
    </fieldset>
  )
}
