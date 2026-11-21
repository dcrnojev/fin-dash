import type { SignedInUser, SpreadsheetRef } from '../data'
import type { CreatedSpreadsheet } from '../setup/createSpreadsheetFromImport'
import { CreateFromImport } from './CreateFromImport'
import { PageHeader } from './PageHeader'
import { SpreadsheetChooser } from './SpreadsheetChooser'

interface SetupScreenProps {
  user: SignedInUser
  // The spreadsheet remembered on this device; while there is none, the screen offers to choose or create one.
  spreadsheet: SpreadsheetRef | null
  creating: boolean
  onChosen: (spreadsheet: SpreadsheetRef) => void
  onCreated: (created: CreatedSpreadsheet) => void
  onCreatingChange: (creating: boolean) => void
  onForget: () => void
  onSignOut: () => void
  onError: (error: unknown) => void
}

export function SetupScreen({
  user,
  spreadsheet,
  creating,
  onChosen,
  onCreated,
  onCreatingChange,
  onForget,
  onSignOut,
  onError,
}: SetupScreenProps) {
  return (
    <>
      <PageHeader title="Setup and spreadsheet" description="Who is signed in, and which spreadsheet the app reads on this device." />

      <section className="card card-padded setup-summary">
        <dl>
          <dt>Signed in as</dt>
          <dd>
            {user.name} <span className="muted">{user.email}</span>
          </dd>
          <dt>Spreadsheet</dt>
          <dd>{spreadsheet === null ? <span className="muted">None chosen on this device yet</span> : spreadsheet.name}</dd>
        </dl>

        <div className="button-row">
          {spreadsheet !== null && (
            <button type="button" onClick={onForget}>
              Forget this spreadsheet on this device
            </button>
          )}
          <button type="button" onClick={onSignOut} disabled={creating}>
            Sign out
          </button>
        </div>
      </section>

      {spreadsheet === null && (
        <div className="setup">
          <SpreadsheetChooser disabled={creating} onChosen={onChosen} onError={onError} />
          <CreateFromImport onCreated={onCreated} onCreatingChange={onCreatingChange} />
        </div>
      )}
    </>
  )
}
