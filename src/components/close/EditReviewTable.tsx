import { fieldLabel, type EnteredValue } from '../../close/closeForm'
import type { ValueChange } from '../../close/editPlan'
import { displayEuros } from '../../format'

interface EditReviewTableProps {
  changes: readonly ValueChange[]
}

// Only the values the edit writes: each one as the sheet has it and as it will be.
export function EditReviewTable({ changes }: EditReviewTableProps) {
  return (
    <div className="table-scroller review-scroller">
      <table className="review-table">
        <thead>
          <tr>
            <th scope="col">Value</th>
            <th scope="col">In the sheet</th>
            <th scope="col">New</th>
          </tr>
        </thead>
        <tbody>
          {changes.map(change => (
            <tr key={change.field.key}>
              <th scope="row" className="review-line">
                {fieldLabel(change.field)}
              </th>
              <td>{change.before === null ? 'no row' : valueText(change.before)}</td>
              <td>{valueText(change.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function valueText(value: EnteredValue): string {
  const amount = displayEuros(value.value, false)
  return value.asOf === null ? amount : `${amount}, statement of ${value.asOf}`
}
