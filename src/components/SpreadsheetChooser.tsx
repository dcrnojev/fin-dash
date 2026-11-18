import { useState, type FormEvent } from 'react'
import { dataStore, type SpreadsheetRef } from '../data'

interface SpreadsheetChooserProps {
  disabled: boolean
  onChosen: (spreadsheet: SpreadsheetRef) => void
  onError: (error: unknown) => void
}

export function SpreadsheetChooser({ disabled, onChosen, onError }: SpreadsheetChooserProps) {
  const [busy, setBusy] = useState(false)
  const [linkOrId, setLinkOrId] = useState('')

  async function choose() {
    setBusy(true)

    try {
      const chosen = await dataStore.chooseSpreadsheet()

      if (chosen)
        onChosen(chosen)
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }

  async function openByLinkOrId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const spreadsheetId = extractSpreadsheetId(linkOrId)

    if (!spreadsheetId)
      return

    setBusy(true)

    try {
      onChosen(await dataStore.getSpreadsheet(spreadsheetId))
      setLinkOrId('')
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Choose existing spreadsheet</h2>
      <p>Open the family spreadsheet if it already exists. Google only lets this app open spreadsheets chosen here.</p>

      <div className="button-row">
        <button type="button" className="primary-button" onClick={choose} disabled={busy || disabled}>
          Choose spreadsheet
        </button>
      </div>

      <details className="open-by-id">
        <summary>Open by link or ID</summary>
        <p className="muted">Works for a spreadsheet you already chose with the picker or created here, on any device.</p>
        <form onSubmit={openByLinkOrId} className="inline-form">
          <input
            type="text"
            value={linkOrId}
            onChange={event => setLinkOrId(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            aria-label="Spreadsheet link or ID"
          />
          <button type="submit" disabled={busy || disabled || !extractSpreadsheetId(linkOrId)}>
            Open
          </button>
        </form>
      </details>
    </section>
  )
}

function extractSpreadsheetId(linkOrId: string): string | null {
  const trimmed = linkOrId.trim()
  const idFromLink = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(trimmed)?.[1]

  if (idFromLink)
    return idFromLink

  return /^[a-zA-Z0-9_-]{20,}$/.test(trimmed) ? trimmed : null
}
