import { useState, type ChangeEvent } from 'react'
import type { SpreadsheetRef } from '../data'
import { displayMonth } from '../format'
import { checkImportFile, type ImportCheck } from '../setup/checkImportFile'
import {
  createSpreadsheetFromImport,
  newSpreadsheetTitle,
  SetupError,
  type CreatedSpreadsheet,
  type SetupStep,
} from '../setup/createSpreadsheetFromImport'
import { IssueList } from './IssueList'

const stepTexts: Record<SetupStep, string> = {
  creating: 'Creating the spreadsheet...',
  'writing-tabs': 'Writing the tabs...',
  'writing-meta': 'Writing _meta...',
  formatting: 'Formatting the tabs...',
}

type CreateState =
  | { status: 'no-file' }
  | { status: 'unusable'; problem: string }
  | { status: 'checked'; check: ImportCheck }
  | { status: 'creating'; check: ImportCheck; step: SetupStep }
  | { status: 'failed'; check: ImportCheck; message: string; halfBuilt: SpreadsheetRef | null }

interface CreateFromImportProps {
  onCreated: (created: CreatedSpreadsheet) => void
}

export function CreateFromImport({ onCreated }: CreateFromImportProps) {
  const [state, setState] = useState<CreateState>({ status: 'no-file' })

  async function readChosenFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setState({ status: 'no-file' })
      return
    }

    const { check, problem } = checkImportFile(await file.text())
    setState(check ? { status: 'checked', check } : { status: 'unusable', problem })
  }

  async function create(check: ImportCheck) {
    try {
      const created = await createSpreadsheetFromImport(check.tabs, step => setState({ status: 'creating', check, step }))
      onCreated(created)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setState({ status: 'failed', check, message, halfBuilt: error instanceof SetupError ? error.spreadsheet : null })
    }
  }

  return (
    <section className="panel">
      <h2>Create spreadsheet from import</h2>
      <p>
        Choose the <code>bundle.json</code> that <code>npm run import</code> wrote to <code>data/import</code>. The app checks it
        first; nothing is written until you confirm.
      </p>

      <input type="file" accept=".json,application/json" onChange={readChosenFile} disabled={state.status === 'creating'} />

      {state.status === 'unusable' && <p className="setup-problem">{state.problem}</p>}

      {state.status !== 'no-file' && state.status !== 'unusable' && (
        <ImportSummary
          check={state.check}
          busy={state.status === 'creating'}
          onConfirm={() => create(state.check)}
        />
      )}

      {state.status === 'creating' && <p className="muted">{stepTexts[state.step]}</p>}

      {state.status === 'failed' && (
        <div className="error-message" role="alert">
          <p>
            Creating the spreadsheet failed: {state.message}
            {state.halfBuilt &&
              ` A half-built spreadsheet named ${state.halfBuilt.name} is in your Google Drive; you can delete it there.`}
          </p>
        </div>
      )}
    </section>
  )
}

interface ImportSummaryProps {
  check: ImportCheck
  busy: boolean
  onConfirm: () => void
}

function ImportSummary({ check, busy, onConfirm }: ImportSummaryProps) {
  const { ledger } = check
  const errorCount = ledger.issues.filter(issue => issue.severity === 'error').length

  const counts = [
    `${ledger.people.length} people`,
    `${ledger.pots.length} pots`,
    `${ledger.holdings.length} holdings`,
    `${ledger.snapshots.length} snapshots`,
    `${ledger.contributions.length} contributions`,
    `${ledger.months.size} months`,
  ]

  return (
    <div className="import-summary">
      <p>
        {counts.join(', ')}
        {check.firstMonth && check.lastMonth && `, from ${displayMonth(check.firstMonth)} to ${displayMonth(check.lastMonth)}`}.
      </p>

      {ledger.issues.length === 0 ? (
        <p className="muted">The validator found no problems.</p>
      ) : (
        <IssueList issues={ledger.issues} />
      )}

      {errorCount > 0 ? (
        <p className="setup-problem">
          The bundle has {errorCount === 1 ? 'an error' : `${errorCount} errors`}, so rows would be lost. Fix the import and run{' '}
          <code>npm run import</code> again.
        </p>
      ) : (
        <div className="button-row">
          <button type="button" className="primary-button" onClick={onConfirm} disabled={busy}>
            Create “{newSpreadsheetTitle}” in my Google Drive
          </button>
        </div>
      )}
    </div>
  )
}
