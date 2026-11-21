import type { ReviewKind, ReviewSection } from '../../close/closeReview'
import type { Cents } from '../../domain/types'
import { displayEuros, displaySignedEuros } from '../../format'

const totalNames: Record<ReviewKind, string> = { cash: 'Total cash', investment: 'Total investments', pension: 'Total pension' }

interface CloseReviewTableProps {
  sections: readonly ReviewSection[]
  monthName: string
  lastMonthName: string
}

// The totals first, so a typo that moves a total shows at a glance, then every value with its own change.
export function CloseReviewTable({ sections, monthName, lastMonthName }: CloseReviewTableProps) {
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
        {sections.map(section => (
          <tbody key={section.kind}>
            <tr className="review-total">
              <th scope="row">{totalNames[section.kind]}</th>
              <td>{displayEuros(section.total, false)}</td>
              <td>{totalChangeText(section)}</td>
            </tr>
            {section.lines.map(line => (
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

function totalChangeText(section: ReviewSection): string {
  if (section.previous === null)
    return 'no complete total'

  const change = changeText((section.total - section.previous.cents) as Cents)
  return section.previous.isEstimated ? `${change} (vs an estimate)` : change
}

function changeText(change: Cents | null): string {
  return change === null ? '—' : displaySignedEuros(change, false)
}
