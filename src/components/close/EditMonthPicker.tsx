import { useState, type FormEvent } from 'react'
import type { Month } from '../../domain/types'
import { displayMonth } from '../../format'

interface EditMonthPickerProps {
  // Latest first.
  months: readonly Month[]
  onEdit: (month: Month) => void
}

export function EditMonthPicker({ months, onEdit }: EditMonthPickerProps) {
  const [chosenMonth, setChosenMonth] = useState<Month | null>(null)

  if (months.length === 0)
    return null

  const month = chosenMonth ?? months[0]

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onEdit(month)
  }

  return (
    <form className="inline-form" onSubmit={edit}>
      <select aria-label="Month to edit" value={month} onChange={event => setChosenMonth(event.target.value as Month)}>
        {months.map(choice => (
          <option key={choice} value={choice}>
            {displayMonth(choice)}
          </option>
        ))}
      </select>
      <button type="submit">Edit a month</button>
    </form>
  )
}
