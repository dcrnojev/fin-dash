import { useState } from 'react'
import type { SpreadsheetRef } from '../data'
import { localIsoDate } from '../domain/date'
import { countOf } from '../format'
import { versionAfter, type SchemaUpdatePlan, type TabUpdate } from '../schemaUpdate/schemaUpdatePlan'
import { backupTitle, updateSchema, type SchemaUpdateStep } from '../schemaUpdate/updateSchema'
import { PageHeader } from './PageHeader'

const stepTexts: Record<SchemaUpdateStep, string> = {
  reading: 'Reading the spreadsheet again...',
  backup: 'Making the backup copy...',
  renaming: 'Renaming the tabs and headers...',
  version: 'Writing schema_version...',
}

type UpdateState = { status: 'ready' } | { status: 'updating'; step: SchemaUpdateStep } | { status: 'failed'; message: string }

interface UpdateSpreadsheetScreenProps {
  spreadsheet: SpreadsheetRef
  version: number
  plan: SchemaUpdatePlan
  // Called once the spreadsheet is updated; the caller reloads it.
  onUpdated: (message: string) => void
}

// Shown in place of every page while the spreadsheet has an older schema, so its data is neither read nor written until
// it has the names this app reads.
export function UpdateSpreadsheetScreen({ spreadsheet, version, plan, onUpdated }: UpdateSpreadsheetScreenProps) {
  const [state, setState] = useState<UpdateState>({ status: 'ready' })
  const [today] = useState(() => localIsoDate(new Date()))
  const blocked = plan.problems.length > 0 || plan.versionCell === null
  const versions = `${spreadsheet.name} uses schema version ${version}, and this app reads version ${versionAfter}.`

  async function update() {
    try {
      const backup = await updateSchema(spreadsheet, today, step => setState({ status: 'updating', step }))
      onUpdated(`The spreadsheet is updated to version ${versionAfter}. The backup ${backup.name} is in Google Drive.`)
    } catch (error) {
      setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <>
      <PageHeader title="Update the spreadsheet" description={`${versions} Nothing is shown or written until it is updated.`} />

      <section className="panel">
        <h2>What will change</h2>

        <ol className="update-steps">
          <li>
            A copy of the whole spreadsheet goes to Google Drive as <strong>{backupTitle(spreadsheet.name, today)}</strong>.
          </li>
          <li>
            {plan.tabs.length === 0
              ? 'The tabs and columns already have their new names.'
              : 'These tabs and header cells get their new names. No row is moved, added or deleted, and every value stays as it is.'}
          </li>
          <li>
            <code>schema_version</code> in <code>_meta</code> becomes {versionAfter}.
          </li>
        </ol>

        {plan.tabs.length > 0 && <TabChanges tabs={plan.tabs} />}

        {plan.problems.map(problem => (
          <p key={problem} className="setup-problem">
            {problem}
          </p>
        ))}

        <div className="button-row">
          <button type="button" className="primary-button" onClick={update} disabled={blocked || state.status === 'updating'}>
            Update the spreadsheet
          </button>
          {state.status === 'updating' && <span className="muted">{stepTexts[state.step]}</span>}
        </div>

        {state.status === 'failed' && (
          <div className="error-message" role="alert">
            <p>{state.message}</p>
          </div>
        )}
      </section>
    </>
  )
}

function TabChanges({ tabs }: { tabs: readonly TabUpdate[] }) {
  return (
    <div className="table-scroller">
      <table className="change-table">
        <thead>
          <tr>
            <th scope="col">Tab</th>
            <th scope="col">Change</th>
            <th scope="col">Rows</th>
          </tr>
        </thead>
        <tbody>
          {tabs.map(tab => (
            <tr key={tab.tab}>
              <th scope="row">
                <code>{tab.tab}</code>
              </th>
              <td>
                {tab.renameFrom !== null && (
                  <p>
                    Renamed from <code>{tab.renameFrom}</code>
                  </p>
                )}
                {tab.headerRenames.map(rename => (
                  <p key={rename.column}>
                    Column <code>{rename.from}</code> becomes <code>{rename.to}</code>
                  </p>
                ))}
              </td>
              <td>{countOf(tab.rowCount, 'row')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
