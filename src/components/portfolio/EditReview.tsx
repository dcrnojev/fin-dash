import { useState } from 'react'
import { countOf } from '../../format'
import { ReviewActions } from '../close/ReviewActions'

export interface ReviewedChange {
  field: string
  before: string
  after: string
}

interface EditReviewProps {
  changes: readonly ReviewedChange[]
  // Throws an error saying what was and was not written; on success the caller reloads the ledger.
  write: () => Promise<void>
  onBack: () => void
  onReread: () => void
}

// The fields an edit changes, as the sheet has them and as they will be, with the button that writes them.
export function EditReview({ changes, write, onBack, onReread }: EditReviewProps) {
  const [writing, setWriting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function save() {
    setWriting(true)
    setFailure(null)

    try {
      await write()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
      setWriting(false)
    }
  }

  return (
    <>
      <div className="table-scroller review-scroller">
        <table className="change-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">In the sheet</th>
              <th scope="col">New</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(change => (
              <tr key={change.field}>
                <th scope="row">{change.field}</th>
                <td>{change.before}</td>
                <td>{change.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReviewActions
        writeLabel={`Save ${countOf(changes.length, 'change')}`}
        writing={writing}
        failure={failure}
        canWrite
        onWrite={save}
        onBackToValues={onBack}
        onReread={onReread}
      />
    </>
  )
}
