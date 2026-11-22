import { useId, useState, type FormEvent } from 'react'
import { formatMoneyInput, parseMoneyInput } from '../../close/moneyInput'
import type { Cents } from '../../domain/types'
import { writeMonthlySavingsGoal } from '../../goal/writeMonthlySavingsGoal'

interface GoalEditorProps {
  spreadsheetId: string
  // The goal the sheet has now; null when none is set.
  goal: Cents | null
  onSaved: (message: string) => void
  onCancel?: () => void
}

// Sets, changes or removes the one monthly goal for cash and investments together, kept in the `_meta` tab.
export function GoalEditor({ spreadsheetId, goal, onSaved, onCancel }: GoalEditorProps) {
  const [amountText, setAmountText] = useState(goal === null ? '' : formatMoneyInput(goal))
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const inputId = useId()

  async function write(newGoal: Cents | null, message: string) {
    setSaving(true)
    setProblem(null)

    try {
      await writeMonthlySavingsGoal(spreadsheetId, newGoal)
      onSaved(message)
    } catch (error) {
      setProblem(`The goal was not saved: ${error instanceof Error ? error.message : String(error)}`)
      setSaving(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = parseMoneyInput(amountText)

    if (amount === null || amount <= 0) {
      setProblem('Type an amount above zero, such as 500 or 1.250,00.')
      return
    }

    await write(amount, 'Monthly goal saved.')
  }

  return (
    <form className="goal-editor" onSubmit={save}>
      <div className="field">
        <label htmlFor={inputId}>Monthly goal for cash and investments</label>
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="500,00"
          value={amountText}
          aria-invalid={problem !== null}
          onChange={event => setAmountText(event.target.value)}
        />
        <p className="muted goal-editor-hint">In euros. Pension is left out. Shown as a target, never used as a figure.</p>
      </div>

      {problem && <p className="field-error">{problem}</p>}

      <div className="button-row">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Saving...' : 'Save goal'}
        </button>
        {goal !== null && (
          <button type="button" disabled={saving} onClick={() => write(null, 'Monthly goal removed.')}>
            Remove goal
          </button>
        )}
        {onCancel && (
          <button type="button" className="link-button" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
