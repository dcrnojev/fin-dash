import type { ReviewGroup, ReviewKind } from '../../close/closeReview'
import type { Cents } from '../../domain/types'
import { displayEuros, displaySignedEuros } from '../../format'

const groupNames: Record<ReviewKind, string> = { cash: 'Total cash', investment: 'Total investments', pension: 'Total pension' }

interface CloseReviewTableProps {
  groups: readonly ReviewGroup[]
  monthName: string
  lastMonthName: string
}

// The totals first, so a typo that moves a total shows at a glance, then every value with its own change.
export function CloseReviewTable({ groups, monthName, lastMonthName }: CloseReviewTableProps) {
  return (
    <div className="table-scroller review-scroller">
      <table className="review-table">
        <thead>
          <tr>
            <th scope="col">Value</th>
            <th scope="col">{monthName}</th>
            <th scope="col">vs {lastMonthName}</th>
          </tr>
        </thead>
        {groups.map(group => (
          <tbody key={group.kind}>
            <tr className="review-total">
              <th scope="row">{groupNames[group.kind]}</th>
              <td>{displayEuros(group.total, false)}</td>
              <td>{totalChangeText(group)}</td>
            </tr>
            {group.lines.map(line => (
              <tr key={line.key}>
                <th scope="row" className="review-line">
                  {line.label}
                </th>
                <td>{displayEuros(line.value, false)}</td>
                <td>{changeText(line.change)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function totalChangeText(group: ReviewGroup): string {
  if (group.previous === null)
    return 'no complete total'

  const change = changeText((group.total - group.previous.cents) as Cents)
  return group.previous.isEstimated ? `${change} (vs an estimate)` : change
}

function changeText(change: Cents | null): string {
  return change === null ? '—' : displaySignedEuros(change, false)
}
