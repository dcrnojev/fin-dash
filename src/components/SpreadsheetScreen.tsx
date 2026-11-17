import type { SpreadsheetRef } from '../data'
import { appSchemaVersion } from '../domain/schema/meta'
import type { LoadedLedger } from '../ledger/loadLedger'
import { useLedger } from '../ledger/useLedger'
import { DataHealthPanel } from './DataHealthPanel'
import { SnapshotHistoryView } from './SnapshotHistoryView'

interface SpreadsheetScreenProps {
  spreadsheet: SpreadsheetRef
  onForget: () => void
}

export function SpreadsheetScreen({ spreadsheet, onForget }: SpreadsheetScreenProps) {
  const { state, reload } = useLedger(spreadsheet.id)
  const name = state.status === 'loaded' ? state.loaded.spreadsheet.name : spreadsheet.name

  return (
    <>
      <p className="spreadsheet-line muted">
        Using <strong>{name}</strong> ·{' '}
        <button type="button" className="link-button" onClick={onForget}>
          Forget this spreadsheet on this device
        </button>
      </p>

      {state.status === 'loading' && <p className="panel muted">Reading the spreadsheet...</p>}

      {state.status === 'failed' && (
        <section className="panel">
          <h2>Could not read the spreadsheet</h2>
          <p>{state.message}</p>
          <div className="button-row">
            <button type="button" onClick={reload}>
              Try again
            </button>
          </div>
        </section>
      )}

      {state.status === 'loaded' && <LoadedSpreadsheet loaded={state.loaded} onReload={reload} />}
    </>
  )
}

interface LoadedSpreadsheetProps {
  loaded: LoadedLedger
  onReload: () => void
}

function LoadedSpreadsheet({ loaded, onReload }: LoadedSpreadsheetProps) {
  const { ledger, schema, tabLinks } = loaded

  if (schema.status === 'not-set-up') {
    return (
      <section className="panel">
        <h2>Not a fin-dash spreadsheet</h2>
        <p>
          This spreadsheet has no <code>_meta</code> tab, so the app did not create it. Forget it and choose another one, or
          create one from the import.
        </p>
      </section>
    )
  }

  if (schema.status === 'setup-unfinished') {
    return (
      <section className="panel">
        <h2>Setup did not finish</h2>
        <p>
          The <code>_meta</code> tab has no <code>schema_version</code>, which the app writes last when it creates a
          spreadsheet, so creating this one was interrupted. Delete it in Google Drive, forget it here and create it again
          from the import.
        </p>
      </section>
    )
  }

  return (
    <>
      {schema.status === 'newer' && (
        <p className="notice" role="status">
          This spreadsheet uses schema version {schema.version} and this app knows version {appSchemaVersion}. The app shows
          it read-only; update the app (reload the page, or clear the site's cache) before changing anything.
        </p>
      )}

      {schema.status === 'invalid-meta' && (
        <p className="notice" role="status">
          The <code>_meta</code> tab could not be read; see Data health. The figures below are shown read-only.
        </p>
      )}

      <DataHealthPanel issues={ledger.issues} tabLinks={tabLinks} onReload={onReload} />
      <SnapshotHistoryView ledger={ledger} />
    </>
  )
}
