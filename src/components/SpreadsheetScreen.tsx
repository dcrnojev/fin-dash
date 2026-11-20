import { useState } from 'react'
import { editableMonths } from '../close/editableMonths'
import { nextMonthToClose } from '../close/nextMonthToClose'
import type { SignedInUser, SpreadsheetRef } from '../data'
import { appSchemaVersion } from '../domain/schema/meta'
import type { Month } from '../domain/types'
import { displayMonth } from '../format'
import type { LoadedLedger } from '../ledger/loadLedger'
import { useLedger } from '../ledger/useLedger'
import { useHideAmounts } from '../useHideAmounts'
import { CloseMonthScreen } from './close/CloseMonthScreen'
import { EditMonthPicker } from './close/EditMonthPicker'
import { EditMonthScreen } from './close/EditMonthScreen'
import { DataHealthPanel } from './DataHealthPanel'
import { PotsScreen } from './pots/PotsScreen'
import { SnapshotHistoryView } from './SnapshotHistoryView'

type SpreadsheetView = { screen: 'dashboard' } | { screen: 'pots' } | { screen: 'close' } | { screen: 'edit'; month: Month }

const dashboard: SpreadsheetView = { screen: 'dashboard' }

interface SpreadsheetScreenProps {
  spreadsheet: SpreadsheetRef
  user: SignedInUser
  onForget: () => void
}

// The view and the message about the last write live here rather than below, because reloading the ledger after a
// write unmounts everything that shows it.
export function SpreadsheetScreen({ spreadsheet, user, onForget }: SpreadsheetScreenProps) {
  const { state, reload } = useLedger(spreadsheet.id)
  const [view, setView] = useState<SpreadsheetView>(dashboard)
  const [writtenMessage, setWrittenMessage] = useState<string | null>(null)
  const name = state.status === 'loaded' ? state.loaded.spreadsheet.name : spreadsheet.name

  function show(nextView: SpreadsheetView) {
    setWrittenMessage(null)
    setView(nextView)
  }

  function showWritten(message: string, nextView: SpreadsheetView) {
    setWrittenMessage(message)
    setView(nextView)
    reload()
  }

  return (
    <>
      <p className="spreadsheet-line muted">
        Using <strong>{name}</strong> ·{' '}
        <button type="button" className="link-button" onClick={onForget}>
          Forget this spreadsheet on this device
        </button>
      </p>

      {writtenMessage && (
        <div className="success-message" role="status">
          <p>{writtenMessage}</p>
          <button type="button" className="link-button" onClick={() => setWrittenMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

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

      {state.status === 'loaded' && (
        <LoadedSpreadsheet
          loaded={state.loaded}
          user={user}
          view={view}
          onShow={show}
          onWritten={showWritten}
          onReload={reload}
        />
      )}
    </>
  )
}

interface LoadedSpreadsheetProps {
  loaded: LoadedLedger
  user: SignedInUser
  view: SpreadsheetView
  onShow: (view: SpreadsheetView) => void
  onWritten: (message: string, nextView: SpreadsheetView) => void
  onReload: () => void
}

function LoadedSpreadsheet({ loaded, user, view, onShow, onWritten, onReload }: LoadedSpreadsheetProps) {
  const { spreadsheet, ledger, schema, tabLinks } = loaded
  const [hideAmounts, setHideAmounts] = useHideAmounts()

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

  // A spreadsheet the app shows read-only offers no way to change it.
  const canWrite = schema.status === 'ok'
  const monthToClose = nextMonthToClose(ledger)

  if (canWrite && view.screen === 'pots') {
    return (
      <PotsScreen
        ledger={ledger}
        spreadsheetId={spreadsheet.id}
        tabLinks={tabLinks}
        monthToClose={monthToClose}
        onAdded={message => onWritten(message, view)}
        onBack={() => onShow(dashboard)}
      />
    )
  }

  if (canWrite && view.screen === 'close' && monthToClose !== null) {
    return (
      <CloseMonthScreen
        ledger={ledger}
        month={monthToClose}
        spreadsheetId={spreadsheet.id}
        closedBy={user.email}
        onClosed={message => onWritten(message, dashboard)}
        onBack={() => onShow(dashboard)}
        onReread={onReload}
      />
    )
  }

  if (canWrite && view.screen === 'edit') {
    return (
      <EditMonthScreen
        ledger={ledger}
        month={view.month}
        spreadsheetId={spreadsheet.id}
        onEdited={message => onWritten(message, dashboard)}
        onBack={() => onShow(dashboard)}
        onReread={onReload}
      />
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

      {canWrite && (
        <nav className="button-row" aria-label="Spreadsheet">
          {monthToClose !== null && (
            <button type="button" className="primary-button" onClick={() => onShow({ screen: 'close' })}>
              Close {displayMonth(monthToClose)}
            </button>
          )}
          <button type="button" onClick={() => onShow({ screen: 'pots' })}>
            Pots and holdings
          </button>
          <EditMonthPicker months={editableMonths(ledger.months)} onEdit={month => onShow({ screen: 'edit', month })} />
        </nav>
      )}

      <DataHealthPanel issues={ledger.issues} tabLinks={tabLinks} hideAmounts={hideAmounts} onReload={onReload} />
      <SnapshotHistoryView ledger={ledger} hideAmounts={hideAmounts} onHideAmountsChange={setHideAmounts} />
    </>
  )
}
