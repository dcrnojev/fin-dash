interface SignInPanelProps {
  setupProblem: string | null
  resuming: boolean
  continueAsEmail: string | null
  onSignIn: () => void
  onUseAnotherAccount: () => void
}

export function SignInPanel({ setupProblem, resuming, continueAsEmail, onSignIn, onUseAnotherAccount }: SignInPanelProps) {
  return (
    <section className="panel sign-in-panel">
      <h2>{continueAsEmail ? 'Welcome back' : 'Sign in'}</h2>

      {continueAsEmail ? (
        <p>The browser needs a click before Google can renew your session for {continueAsEmail}.</p>
      ) : (
        <p>Sign in with the Google account that can open the family finance spreadsheet.</p>
      )}

      <button type="button" className="primary-button" onClick={onSignIn} disabled={setupProblem !== null}>
        {continueAsEmail ? `Continue as ${continueAsEmail}` : 'Sign in with Google'}
      </button>

      {continueAsEmail && (
        <button type="button" className="link-button" onClick={onUseAnotherAccount}>
          Use another account
        </button>
      )}

      {resuming && !setupProblem && <p className="muted">Checking for a previous session...</p>}
      {setupProblem && <p className="setup-problem">{setupProblem}</p>}

      <p className="muted">
        <a href="privacy.html">Privacy policy</a>
      </p>
    </section>
  )
}
