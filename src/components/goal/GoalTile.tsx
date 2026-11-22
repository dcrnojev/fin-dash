import { useState } from 'react'
import type { GoalProgress } from '../../calc/goalProgress'
import { addMonths } from '../../domain/month'
import type { Cents, Month } from '../../domain/types'
import { displayEuros, displayMonthName, displayPercent, displaySignedEuros } from '../../format'
import { GoalEditor } from './GoalEditor'

interface GoalTileProps {
  goal: Cents | null
  // Null without a goal, or when the month or the one before has no complete cash-and-investments total.
  progress: GoalProgress | null
  month: Month
  // Whether the month's own total is estimated rather than measured.
  monthIsEstimated: boolean
  // Null for a spreadsheet the app shows read-only, which offers no way to set the goal.
  spreadsheetId: string | null
  hideAmounts: boolean
  onSaved: (message: string) => void
}

// The month's change in cash and investments against the monthly goal, or a way to set one. "Grew", never "saved": the
// change includes market gains and losses, and contributions are not tracked.
export function GoalTile({ goal, progress, month, monthIsEstimated, spreadsheetId, hideAmounts, onSaved }: GoalTileProps) {
  const [editing, setEditing] = useState(false)

  if (editing && spreadsheetId !== null) {
    return (
      <li className="card tile goal-tile">
        <GoalEditor spreadsheetId={spreadsheetId} goal={goal} onSaved={onSaved} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  const editButton = spreadsheetId !== null && (
    <button type="button" className="link-button goal-tile-action" onClick={() => setEditing(true)}>
      {goal === null ? 'Set a monthly goal' : 'Change goal'}
    </button>
  )

  if (goal === null) {
    return (
      <li className="card tile goal-tile">
        <div className="goal-headline">
          <span className="tile-label">Monthly goal</span>
        </div>
        <p className="goal-text muted">One amount cash and investments together should grow by each month. Pension is left out.</p>
        {editButton}
      </li>
    )
  }

  const monthName = displayMonthName(month)
  const previousMonthName = displayMonthName(addMonths(month, -1))
  const estimatedNote = `The total for ${monthIsEstimated ? monthName : previousMonthName} is estimated.`

  return (
    <li className="card tile goal-tile">
      <div className="goal-headline">
        <span className="tile-label">
          {monthName} vs goal
          {progress?.estimated && (
            <span className="chip chip-dashed" title={estimatedNote}>
              Estimated
            </span>
          )}
        </span>
        {progress === null ? (
          <span className="tile-value muted">unknown</span>
        ) : (
          <span className="tile-value">{progress.estimated ? `≈ ${displayPercent(progress.ratio)}` : displayPercent(progress.ratio)}</span>
        )}
      </div>

      {progress === null ? (
        <p className="goal-text muted">
          No complete total for both {previousMonthName} and {monthName}; goal {displayEuros(goal, hideAmounts)}.
        </p>
      ) : (
        <div className="goal-detail">
          <GoalBar ratio={progress.ratio} />
          <p className="goal-text">
            {progress.change >= 0
              ? `Grew by ${displayEuros(progress.change, hideAmounts)} of ${displayEuros(goal, hideAmounts)} goal`
              : `Change of ${displaySignedEuros(progress.change, hideAmounts)} against a ${displayEuros(goal, hideAmounts)} goal`}
          </p>
          <p className="goal-text muted">{progress.estimated ? `${estimatedNote} ` : ''}Includes market gains and losses.</p>
        </div>
      )}

      {editButton}
    </li>
  )
}

function GoalBar({ ratio }: { ratio: number }) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100)

  return (
    <div className="goal-bar" role="progressbar" aria-label="Share of the goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
