import { parseIsoDate } from '../domain/date.ts'
import { monthOfDate } from '../domain/month.ts'
import type { IsoDate } from '../domain/types.ts'
import { displayMonth } from '../format.ts'
import { closeFields, isReadOnly, type CloseField, type CloseForm, type EnteredValue } from './closeForm.ts'
import { formatMoneyInput, parseMoneyInput } from './moneyInput.ts'

// What the form holds for one field, as typed.
export interface FieldEntry {
  amount: string
  // 'YYYY-MM-DD' from a date input, or ''. Only pension fields have one.
  asOf: string
}

export interface FieldErrors {
  amount: string | null
  asOf: string | null
}

export interface EnteredField {
  field: CloseField
  entered: EnteredValue
}

export type ReadEntries =
  | { status: 'valid'; fields: EnteredField[] }
  // Only fields with a problem have an entry. A blank field's error is "required"; the form may hold it back until
  // the user asks to review.
  | { status: 'invalid'; errors: Map<string, FieldErrors> }

// A field starts with the row the sheet already has for the month, else empty, with last month only as a hint.
export function initialEntries(form: CloseForm): Record<string, FieldEntry> {
  const entries: Record<string, FieldEntry> = {}

  for (const field of closeFields(form))
    entries[field.key] = field.alreadyWritten === null ? { amount: '', asOf: '' } : entryOf(field.alreadyWritten)

  return entries
}

// "Same as last month" fills the amount only: last month's statement date is never this month's.
export function withLastMonthAmount(entry: FieldEntry, field: CloseField): FieldEntry {
  return field.lastMonth === null ? entry : { ...entry, amount: formatMoneyInput(field.lastMonth.value) }
}

// Closing needs every field. Editing takes a field it leaves as it was without checking it again, and lets a field with
// no row in the sheet stay blank, since a legacy month may not know every group.
export function readEntries(form: CloseForm, entries: Readonly<Record<string, FieldEntry>>): ReadEntries {
  const fields: EnteredField[] = []
  const errors = new Map<string, FieldErrors>()

  for (const field of closeFields(form)) {
    const entry = entries[field.key] ?? { amount: '', asOf: '' }
    const written = field.alreadyWritten

    if (written !== null && (isReadOnly(form, field) || showsUnchanged(entry, written))) {
      fields.push({ field, entered: written })
      continue
    }

    if (form.mode === 'edit' && written === null && entry.amount.trim() === '' && entry.asOf.trim() === '')
      continue

    const value = parseMoneyInput(entry.amount)
    const isPension = field.group.kind === 'pension'
    const asOf = isPension ? parseIsoDate(entry.asOf) : null
    const fieldErrors: FieldErrors = { amount: amountError(field, entry.amount, value), asOf: null }

    if (isPension)
      fieldErrors.asOf = statementDateError(form, entry.asOf, asOf)

    if (fieldErrors.amount !== null || fieldErrors.asOf !== null)
      errors.set(field.key, fieldErrors)
    else if (value !== null)
      fields.push({ field, entered: { value, asOf } })
  }

  return errors.size > 0 ? { status: 'invalid', errors } : { status: 'valid', fields }
}

function entryOf(value: EnteredValue): FieldEntry {
  return { amount: formatMoneyInput(value.value), asOf: value.asOf ?? '' }
}

function showsUnchanged(entry: FieldEntry, written: EnteredValue): boolean {
  return parseMoneyInput(entry.amount) === written.value && entry.asOf === (written.asOf ?? '')
}

function amountError(field: CloseField, text: string, value: number | null): string | null {
  if (text.trim() === '')
    return field.alreadyWritten === null ? 'Enter a value; type 0 for an empty group.' : 'Enter a value; the app never deletes a row.'

  if (value === null)
    return 'Type an amount like 1.234,56 or 1234.56.'

  if (value < 0 && field.group.kind !== 'cash')
    return 'Only a cash balance can be negative.'

  return null
}

// The statement read at a month's close is the one that arrived during that month.
function statementDateError(form: CloseForm, text: string, date: IsoDate | null): string | null {
  if (date === null)
    return text.trim() === '' ? 'Enter the date of the statement.' : 'This is not a date.'

  if (monthOfDate(date) !== form.month)
    return `The statement date must be in ${displayMonth(form.month)}.`

  return null
}
