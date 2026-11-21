import { useMemo, useState, type ReactNode } from 'react'
import { editableMonths } from '../close/editableMonths'
import type { SignedInUser, SpreadsheetRef } from '../data'
import { localIsoDate } from '../domain/date'
import { appSchemaVersion } from '../domain/schema/meta'
import type { Ledger } from '../domain/types'
import { displayLongMonth } from '../format'
import type { LoadedLedger } from '../ledger/loadLedger'
import { useLedger } from '../ledger/useLedger'
import { routeHash, type Route } from '../routing/route'
import { navigate, useRoute } from '../routing/useRoute'
import { CloseMonthScreen } from './close/CloseMonthScreen'
import { EditMonthScreen } from './close/EditMonthScreen'
import { DataHealthScreen } from './DataHealthScreen'
import { HomeScreen } from './home/HomeScreen'
import { MonthsScreen } from './months/MonthsScreen'
import { PageHeader } from './PageHeader'
import { PortfolioScreen } from './portfolio/PortfolioScreen'
import { AppShell } from './shell/AppShell'
import { ledgerSummary, type LedgerSummary } from './shell/ledgerSummary'
import { UpdateSpreadsheetScreen } from './UpdateSpreadsheetScreen'

interface SpreadsheetScreenProps {
  spreadsheet: SpreadsheetRef
  user: SignedInUser
  // The menu's account line, and the page behind Setup and spreadsheet, both owned by the app.
  account: ReactNode
  setupScreen: ReactNode
  // A message from the app above the page, such as a failed sign-in.
  appMessage: ReactNode
  hideAmounts: boolean
  onHideAmountsChange: (hide: boolean) => void
}

interface WrittenMessage {
  message: string
  // The page the message belongs to; leaving it drops the message.
  hash: string
}

// The message about the last write lives here rather than below, because reloading the ledger after a write unmounts
// everything that shows it.
export function SpreadsheetScreen({
  spreadsheet,
  user,
  account,
  setupScreen,
  appMessage,
  hideAmounts,
  onHideAmountsChange,
}: SpreadsheetScreenProps) {
  const { state, reload } = useLedger(spreadsheet.id)
  const route = useRoute()
  const hash = routeHash(route)
  const [written, setWritten] = useState<WrittenMessage | null>(null)
  const [messageHash, setMessageHash] = useState(hash)

  // Moving to another page drops the message, unless the write itself moved there.
  if (hash !== messageHash) {
    setMessageHash(hash)

    if (written !== null && written.hash !== hash)
      setWritten(null)
  }

  // The day the page opened, which decides whether the month to close is due.
  const [today] = useState(() => localIsoDate(new Date()))
  const loaded = state.status === 'loaded' ? state.loaded : null

  const summary = useMemo(
    () => (loaded === null || loaded.ledger === null ? null : ledgerSummary(loaded.ledger, loaded.schema.status === 'ok', today)),
    [loaded, today]
  )

  function showWritten(message: string, nextRoute: Route) {
    setWritten({ message, hash: routeHash(nextRoute) })
    navigate(nextRoute)
    reload()
  }

  return (
    <AppShell
      route={route}
      hasSpreadsheet
      summary={summary}
      account={account}
      hideAmounts={hideAmounts}
      onHideAmountsChange={onHideAmountsChange}
    >
      {appMessage}

      {written !== null && written.hash === hash && (
        <div className="success-message" role="status">
          <p>{written.message}</p>
          <button type="button" className="link-button" onClick={() => setWritten(null)}>
            Dismiss
          </button>
        </div>
      )}

      {route.page === 'setup' ? (
        setupScreen
      ) : (
        <>
          {state.status === 'loading' && <p className="card card-padded muted">Reading the spreadsheet...</p>}

          {state.status === 'failed' && (
            <section className="card card-padded">
              <h2>Could not read the spreadsheet</h2>
              <p>{state.message}</p>
              <div className="button-row">
                <button type="button" onClick={reload}>
                  Try again
                </button>
              </div>
            </section>
          )}

          {loaded !== null && loaded.schema.status === 'older' && (
            <UpdateSpreadsheetScreen
              spreadsheet={loaded.spreadsheet}
              version={loaded.schema.version}
              plan={loaded.schema.plan}
              onUpdated={message => showWritten(message, route)}
            />
          )}

          {loaded !== null && loaded.ledger !== null && summary !== null && (
            <LoadedSpreadsheet
              loaded={loaded}
              ledger={loaded.ledger}
              summary={summary}
              route={route}
              user={user}
              hideAmounts={hideAmounts}
              onWritten={showWritten}
              onReload={reload}
            />
          )}
        </>
      )}
    </AppShell>
  )
}

interface LoadedSpreadsheetProps {
  loaded: LoadedLedger
  ledger: Ledger
  summary: LedgerSummary
  // Setup and spreadsheet shows without the ledger.
  route: Exclude<Route, { page: 'setup' }>
  user: SignedInUser
  hideAmounts: boolean
  onWritten: (message: string, nextRoute: Route) => void
  onReload: () => void
}

function LoadedSpreadsheet({ loaded, ledger, summary, route, user, hideAmounts, onWritten, onReload }: LoadedSpreadsheetProps) {
  const { spreadsheet, schema, tabLinks } = loaded
  const { monthToClose, canWrite } = summary

  if (schema.status === 'not-set-up') {
    return (
      <section className="card card-padded">
        <h2>Not a fin-dash spreadsheet</h2>
        <p>
          This spreadsheet has no <code>_meta</code> tab, so the app did not create it. Forget it under Setup and spreadsheet
          and choose another one, or create one from the import.
        </p>
      </section>
    )
  }

  if (schema.status === 'setup-unfinished') {
    return (
      <section className="card card-padded">
        <h2>Setup did not finish</h2>
        <p>
          The <code>_meta</code> tab has no <code>schema_version</code>, which the app writes last when it creates a
          spreadsheet, so creating this one was interrupted. Delete it in Google Drive, forget it here and create it again
          from the import.
        </p>
      </section>
    )
  }

  const readOnlyNotice = (
    <>
      {schema.status === 'newer' && (
        <p className="notice" role="status">
          This spreadsheet uses schema version {schema.version} and this app knows version {appSchemaVersion}. The app shows
          it read-only; update the app (reload the page, or clear the site's cache) before changing anything.
        </p>
      )}

      {schema.status === 'invalid-meta' && (
        <p className="notice" role="status">
          The <code>_meta</code> tab could not be read; see Data health. The figures are shown read-only.
        </p>
      )}
    </>
  )

  const backHome = () => navigate({ page: 'home' })

  switch (route.page) {
    case 'home':
      return (
        <>
          {readOnlyNotice}
          <HomeScreen ledger={ledger} monthToClose={monthToClose} canWrite={canWrite} hideAmounts={hideAmounts} />
        </>
      )

    case 'months':
      return (
        <>
          {readOnlyNotice}
          <MonthsScreen ledger={ledger} monthToClose={monthToClose} canWrite={canWrite} hideAmounts={hideAmounts} />
        </>
      )

    case 'health':
      return <DataHealthScreen issues={ledger.issues} tabLinks={tabLinks} hideAmounts={hideAmounts} onReload={onReload} />

    case 'close':
      if (!canWrite || monthToClose === null) {
        const reason = canWrite ? 'The spreadsheet has no month-end balances yet, so there is no month to close.' : ''
        return <Unavailable title="Close a month" notice={readOnlyNotice} reason={reason} />
      }

      return (
        <CloseMonthScreen
          ledger={ledger}
          month={monthToClose}
          spreadsheetId={spreadsheet.id}
          closedBy={user.email}
          onClosed={message => onWritten(message, { page: 'home' })}
          onBack={backHome}
          onReread={onReload}
        />
      )

    case 'edit':
      if (!canWrite || !editableMonths(ledger.months).includes(route.month)) {
        const monthName = displayLongMonth(route.month)
        const reason = canWrite ? `Only a closed month or one from the legacy history can be edited, and ${monthName} is neither.` : ''
        return <Unavailable title={`Edit ${monthName}`} notice={readOnlyNotice} reason={reason} />
      }

      return (
        <EditMonthScreen
          key={route.month}
          ledger={ledger}
          month={route.month}
          spreadsheetId={spreadsheet.id}
          onEdited={message => onWritten(message, { page: 'months' })}
          onBack={() => navigate({ page: 'months' })}
          onReread={onReload}
        />
      )

    case 'portfolio':
      if (!canWrite)
        return <Unavailable title="Portfolio" notice={readOnlyNotice} reason="" />

      return (
        <PortfolioScreen
          ledger={ledger}
          spreadsheetId={spreadsheet.id}
          monthToClose={monthToClose}
          onWritten={message => onWritten(message, route)}
          onBack={backHome}
          onReread={onReload}
        />
      )
  }
}

interface UnavailableProps {
  title: string
  // Why the spreadsheet is read-only, when it is.
  notice: ReactNode
  // Why the page has nothing to offer otherwise.
  reason: string
}

function Unavailable({ title, notice, reason }: UnavailableProps) {
  return (
    <>
      <PageHeader title={title} />
      {notice}
      {reason && <p className="card card-padded muted">{reason}</p>}
    </>
  )
}
