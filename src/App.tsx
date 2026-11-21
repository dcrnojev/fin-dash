import { useCallback, useEffect, useState } from 'react'
import { AccountBar } from './components/AccountBar'
import { ErrorMessage } from './components/ErrorMessage'
import { SetupScreen } from './components/SetupScreen'
import { SignInPanel } from './components/SignInPanel'
import { AppShell } from './components/shell/AppShell'
import { SpreadsheetScreen } from './components/SpreadsheetScreen'
import { DataError, dataStore, type SignedInUser, type SpreadsheetRef } from './data'
import { forgetSpreadsheet, readRememberedSpreadsheet, rememberSpreadsheet } from './rememberedSpreadsheet'
import type { CreatedSpreadsheet } from './setup/createSpreadsheetFromImport'
import { useHideAmounts } from './useHideAmounts'

type Session =
  | { status: 'resuming' }
  | { status: 'signed-out' }
  | { status: 'needs-click'; email: string }
  | { status: 'signed-in'; user: SignedInUser }

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'resuming' })
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetRef | null>(readRememberedSpreadsheet)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [creatingSpreadsheet, setCreatingSpreadsheet] = useState(false)
  const [hideAmounts, setHideAmounts] = useHideAmounts()

  const showError = useCallback((error: unknown) => {
    if (error instanceof DataError && error.kind === 'cancelled')
      return

    setErrorMessage(error instanceof Error ? error.message : String(error))
  }, [])

  useEffect(() => {
    let ignore = false

    dataStore
      .resumeSession()
      .then(user => {
        if (!ignore)
          setSession(user ? { status: 'signed-in', user } : { status: 'signed-out' })
      })
      .catch((error: unknown) => {
        if (ignore)
          return

        const rememberedEmail = dataStore.rememberedEmail()

        if (error instanceof DataError && error.kind === 'needs-click' && rememberedEmail) {
          setSession({ status: 'needs-click', email: rememberedEmail })
        } else {
          setSession({ status: 'signed-out' })
          showError(error)
        }
      })

    return () => {
      ignore = true
    }
  }, [showError])

  async function signIn() {
    setErrorMessage(null)

    try {
      const user = await dataStore.signIn()
      setSession({ status: 'signed-in', user })
    } catch (error) {
      showError(error)
    }
  }

  function signOut() {
    dataStore.signOut()
    setSession({ status: 'signed-out' })
    setErrorMessage(null)
  }

  function chooseSpreadsheet(chosen: SpreadsheetRef) {
    rememberSpreadsheet(chosen)
    setSpreadsheet(chosen)
    setErrorMessage(null)
  }

  function openCreatedSpreadsheet({ spreadsheet: created, formattingProblem }: CreatedSpreadsheet) {
    chooseSpreadsheet(created)

    if (formattingProblem)
      setErrorMessage(`The spreadsheet is complete, but formatting its tabs failed: ${formattingProblem}`)
  }

  function clearSpreadsheet() {
    forgetSpreadsheet()
    setSpreadsheet(null)
  }

  if (session.status !== 'signed-in') {
    return (
      <main className="solo">
        <p className="brand">fin-dash</p>
        {errorMessage && <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />}
        <SignInPanel
          setupProblem={dataStore.setupProblem}
          resuming={session.status === 'resuming'}
          continueAsEmail={session.status === 'needs-click' ? session.email : null}
          onSignIn={signIn}
          onUseAnotherAccount={signOut}
        />
      </main>
    )
  }

  const account = <AccountBar user={session.user} signOutDisabled={creatingSpreadsheet} onSignOut={signOut} />
  const appMessage = errorMessage && <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />

  const setupScreen = (
    <SetupScreen
      user={session.user}
      spreadsheet={spreadsheet}
      creating={creatingSpreadsheet}
      onChosen={chooseSpreadsheet}
      onCreated={openCreatedSpreadsheet}
      onCreatingChange={setCreatingSpreadsheet}
      onForget={clearSpreadsheet}
      onSignOut={signOut}
      onError={showError}
    />
  )

  if (spreadsheet === null) {
    return (
      <AppShell
        route={{ page: 'setup' }}
        hasSpreadsheet={false}
        summary={null}
        account={account}
        hideAmounts={hideAmounts}
        onHideAmountsChange={setHideAmounts}
      >
        {appMessage}
        {setupScreen}
      </AppShell>
    )
  }

  return (
    <SpreadsheetScreen
      key={spreadsheet.id}
      spreadsheet={spreadsheet}
      user={session.user}
      account={account}
      setupScreen={setupScreen}
      appMessage={appMessage}
      hideAmounts={hideAmounts}
      onHideAmountsChange={setHideAmounts}
    />
  )
}
