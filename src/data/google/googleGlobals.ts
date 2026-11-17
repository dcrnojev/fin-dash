// Hand-written typings for the parts of Google's browser libraries this module uses. They stay inside src/data/google.

export interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  error?: string
  error_description?: string
}

export interface TokenClientError {
  type: 'popup_failed_to_open' | 'popup_closed' | 'unknown'
  message?: string
}

export interface TokenRequestOverrides {
  prompt?: '' | 'none' | 'consent' | 'select_account'
  login_hint?: string
}

export interface TokenClient {
  requestAccessToken(overrides?: TokenRequestOverrides): void
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback: (error: TokenClientError) => void
}

interface GoogleOAuth2 {
  initTokenClient(config: TokenClientConfig): TokenClient
  hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean
}

export interface PickerDocument {
  id: string
  name: string
}

export interface PickerResponse {
  action: string
  docs?: PickerDocument[]
}

interface DocsView {
  setMode(mode: string): DocsView
  setOwnedByMe(ownedByMe: boolean): DocsView
}

interface Picker {
  setVisible(visible: boolean): void
}

interface PickerBuilder {
  addView(view: DocsView): PickerBuilder
  setAppId(appId: string): PickerBuilder
  setCallback(callback: (response: PickerResponse) => void): PickerBuilder
  setDeveloperKey(key: string): PickerBuilder
  setOAuthToken(token: string): PickerBuilder
  setTitle(title: string): PickerBuilder
  build(): Picker
}

interface GooglePicker {
  Action: { PICKED: string; CANCEL: string }
  DocsView: new (viewId: string) => DocsView
  DocsViewMode: { LIST: string }
  PickerBuilder: new () => PickerBuilder
  ViewId: { SPREADSHEETS: string }
}

interface GoogleNamespace {
  accounts: { oauth2: GoogleOAuth2 }
  picker: GooglePicker
}

interface Gapi {
  load(library: string, callback: () => void): void
}

interface GoogleWindow {
  google?: Partial<GoogleNamespace>
  gapi?: Gapi
}

const googleWindow = window as unknown as GoogleWindow
const scriptLoads = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const existing = scriptLoads.get(src)

  if (existing)
    return existing

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Could not load ${src}. Check the network connection or a content blocker.`))
    document.head.appendChild(script)
  })
  scriptLoads.set(src, load)
  return load
}

export async function loadOAuth2(): Promise<GoogleOAuth2> {
  await loadScript('https://accounts.google.com/gsi/client')

  const oauth2 = googleWindow.google?.accounts?.oauth2

  if (!oauth2)
    throw new Error('Google Identity Services loaded but google.accounts.oauth2 is missing.')

  return oauth2
}

export async function loadPicker(): Promise<GooglePicker> {
  await loadScript('https://apis.google.com/js/api.js')

  const gapi = googleWindow.gapi

  if (!gapi)
    throw new Error('The Google API loader loaded but gapi is missing.')

  await new Promise<void>(resolve => gapi.load('picker', resolve))

  const picker = googleWindow.google?.picker

  if (!picker)
    throw new Error('The Google Picker library did not load.')

  return picker
}
