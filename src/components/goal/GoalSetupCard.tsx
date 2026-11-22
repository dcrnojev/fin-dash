import type { Cents } from '../../domain/types'
import { GoalEditor } from './GoalEditor'

interface GoalSetupCardProps {
  spreadsheetId: string
  goal: Cents | null
  onSaved: (message: string) => void
}

export function GoalSetupCard({ spreadsheetId, goal, onSaved }: GoalSetupCardProps) {
  return (
    <section className="card card-padded goal-setup">
      <h2>Monthly goal</h2>
      <p className="muted">
        How much cash and investments together should grow each month. Home compares each month's change with it, and the
        Cash and investments chart marks the target. The change includes market gains and losses.
      </p>
      <GoalEditor spreadsheetId={spreadsheetId} goal={goal} onSaved={onSaved} />
    </section>
  )
}
