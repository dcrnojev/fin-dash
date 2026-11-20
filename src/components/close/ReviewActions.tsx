interface ReviewActionsProps {
  writeLabel: string
  writing: boolean
  // The last write's error, which says what was and was not written.
  failure: string | null
  canWrite: boolean
  onWrite: () => void
  onBackToValues: () => void
  // Reads the spreadsheet again and reopens this screen on what it holds now.
  onReread: () => void
}

export function ReviewActions({ writeLabel, writing, failure, canWrite, onWrite, onBackToValues, onReread }: ReviewActionsProps) {
  return (
    <>
      {failure !== null && (
        <div className="error-message" role="alert">
          <p>{failure}</p>
        </div>
      )}

      <div className="button-row">
        <button type="button" className="primary-button" onClick={onWrite} disabled={writing || !canWrite}>
          {writing ? 'Writing...' : failure !== null ? 'Try again' : writeLabel}
        </button>
        <button type="button" onClick={onBackToValues} disabled={writing}>
          Back to the values
        </button>
        {failure !== null && (
          <button type="button" onClick={onReread}>
            Read the sheet again
          </button>
        )}
      </div>
    </>
  )
}
