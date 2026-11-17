import { DataError, type SignedInUser } from '../types'
import { loadOAuth2, type TokenClient, type TokenClientError, type TokenRequestOverrides, type TokenResponse } from './googleGlobals'
import { readStoredString, removeStoredValue, writeStoredString } from '../../localStore'
import { readSessionString, removeSessionValue, writeSessionString } from '../../sessionStore'

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const requestedScopes = ['openid', 'email', 'profile', DRIVE_FILE_SCOPE].join(' ')
const rememberedEmailKey = 'fin-dash.google.email'
const tabSessionKey = 'fin-dash.google.session'
const tokenRenewalMarginMs = 2 * 60 * 1000

interface AccessToken {
  value: string
  expiresAt: number
}

interface TabSession {
  token: AccessToken
  user: SignedInUser
}

interface PendingTokenRequest {
  resolve: (response: TokenResponse) => void
  reject: (error: DataError) => void
}

interface UserInfoResponse {
  email: string
  name?: string
}

// Holds the signed-in user and a short-lived access token from the Google Identity Services token model.
// The token and user are also kept in sessionStorage, so a reload in the same tab carries on without asking Google;
// a new tab, or a reload after the token expired, asks Google for a fresh one.
export class GoogleSession {
  private readonly clientId: string
  private pendingTokenRequest: PendingTokenRequest | null = null
  private preparation: Promise<void> | null = null
  private token: AccessToken | null = null
  private tokenClient: TokenClient | null = null
  private user: SignedInUser | null = null

  constructor(clientId: string) {
    this.clientId = clientId
  }

  async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt)
      return this.token.value

    if (!this.user)
      throw new DataError('needs-click', 'Sign in first.')

    const response = await this.requestToken({ prompt: '', login_hint: this.user.email })
    const accessToken = this.acceptToken(response)
    this.keepForThisTab()
    return accessToken
  }

  currentUser(): SignedInUser | null {
    return this.user
  }

  forgetToken(): void {
    this.token = null
    removeSessionValue(tabSessionKey)
  }

  // Loads the Google library ahead of the first click: a sign-in window opened after a network wait counts as
  // a popup without a click, and browsers block it.
  prepare(): Promise<void> {
    this.preparation ??= loadOAuth2().then(oauth2 => {
      this.tokenClient = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: requestedScopes,
        callback: response => this.settleTokenRequest(response, oauth2.hasGrantedAllScopes(response, DRIVE_FILE_SCOPE)),
        error_callback: error => this.failTokenRequest(error),
      })
    }).catch((error: unknown) => {
      this.preparation = null
      throw error
    })

    return this.preparation
  }

  rememberedEmail(): string | null {
    return readStoredString(rememberedEmailKey)
  }

  async resumeSession(): Promise<SignedInUser | null> {
    await this.prepare()

    const rememberedEmail = this.rememberedEmail()

    if (!rememberedEmail)
      return null

    const tabSession = readTabSession()

    if (tabSession && tabSession.user.email === rememberedEmail && Date.now() < tabSession.token.expiresAt) {
      this.token = tabSession.token
      this.user = tabSession.user
      return this.user
    }

    this.forgetToken()

    // prompt '' skips the account chooser and consent screen once the user has consented, but Google still opens
    // a window that closes itself. Without a click the browser usually blocks it (see failTokenRequest).
    const response = await this.requestToken({ prompt: '', login_hint: rememberedEmail })
    return this.completeSignIn(response)
  }

  async signIn(): Promise<SignedInUser> {
    const rememberedEmail = this.rememberedEmail()

    const response = rememberedEmail
      ? await this.requestToken({ prompt: '', login_hint: rememberedEmail })
      : await this.requestToken({ prompt: 'select_account' })

    return this.completeSignIn(response)
  }

  // Deliberately does not call google.accounts.oauth2.revoke: that withdraws the whole grant, so the next sign-in
  // would show the consent screen again and the spreadsheets chosen in the picker might have to be chosen again.
  signOut(): void {
    this.forgetToken()
    this.user = null
    removeStoredValue(rememberedEmailKey)
  }

  private acceptToken(response: TokenResponse): string {
    this.token = {
      value: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000 - tokenRenewalMarginMs,
    }
    return response.access_token
  }

  private async completeSignIn(response: TokenResponse): Promise<SignedInUser> {
    const accessToken = this.acceptToken(response)
    const userInfo = await fetchUserInfo(accessToken)

    this.user = { email: userInfo.email, name: userInfo.name ?? userInfo.email }
    writeStoredString(rememberedEmailKey, userInfo.email)
    this.keepForThisTab()
    return this.user
  }

  private failTokenRequest(error: TokenClientError): void {
    const pending = this.takePendingTokenRequest()

    if (!pending)
      return

    if (error.type === 'popup_failed_to_open')
      pending.reject(new DataError('needs-click', 'The browser blocked the Google sign-in window. Click to continue.'))
    else if (error.type === 'popup_closed')
      pending.reject(new DataError('cancelled', 'The Google sign-in window was closed before signing in finished.'))
    else
      pending.reject(new DataError('failed', error.message ?? 'Google sign-in failed.'))
  }

  private keepForThisTab(): void {
    if (this.token && this.user)
      writeSessionString(tabSessionKey, JSON.stringify({ token: this.token, user: this.user } satisfies TabSession))
  }

  // The token client calls back through the callbacks given to initTokenClient, not per request,
  // so the open request is parked here until one of them fires.
  private requestToken(overrides: TokenRequestOverrides): Promise<TokenResponse> {
    const tokenClient = this.tokenClient

    if (!tokenClient)
      return this.prepare().then(() => this.requestToken(overrides))

    this.takePendingTokenRequest()?.reject(new DataError('cancelled', 'Replaced by a newer sign-in request.'))

    return new Promise<TokenResponse>((resolve, reject) => {
      this.pendingTokenRequest = { resolve, reject }
      tokenClient.requestAccessToken(overrides)
    })
  }

  private settleTokenRequest(response: TokenResponse, grantedDriveFileScope: boolean): void {
    const pending = this.takePendingTokenRequest()

    if (!pending)
      return

    if (response.error)
      pending.reject(new DataError('failed', `Google sign-in failed: ${response.error_description ?? response.error}`))
    else if (!grantedDriveFileScope)
      pending.reject(new DataError('failed', 'Access to the files you use with this app was not granted. Sign in again and allow it.'))
    else
      pending.resolve(response)
  }

  private takePendingTokenRequest(): PendingTokenRequest | null {
    const pending = this.pendingTokenRequest
    this.pendingTokenRequest = null
    return pending
  }
}

function readTabSession(): TabSession | null {
  const stored = readSessionString(tabSessionKey)

  if (!stored)
    return null

  try {
    const parsed = JSON.parse(stored) as Partial<TabSession>
    const { token, user } = parsed

    if (typeof token?.value !== 'string' || typeof token.expiresAt !== 'number')
      return null

    if (typeof user?.email !== 'string' || typeof user.name !== 'string')
      return null

    return { token: { value: token.value, expiresAt: token.expiresAt }, user: { email: user.email, name: user.name } }
  } catch {
    return null
  }
}

async function fetchUserInfo(accessToken: string): Promise<UserInfoResponse> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok)
    throw new DataError('failed', `Could not read the signed-in account (HTTP ${response.status}).`)

  return response.json() as Promise<UserInfoResponse>
}
