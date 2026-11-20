export interface SignedInUser {
  email: string
  name: string
}

export interface SpreadsheetRef {
  id: string
  name: string
}

export type CellValue = string | number | boolean

export interface TabRows {
  tab: string
  // Header row first. Written as raw values, so text such as '2026-11' stays text.
  rows: CellValue[][]
}

// One cell to overwrite: `row` is the sheet row number (the header row is 1) and `column` the position in that row,
// counted from 0 as in the header row the tab was read with.
export interface CellUpdate {
  tab: string
  row: number
  column: number
  value: CellValue
}

export type ColumnFormat = 'plain-text' | 'money' | 'date' | 'automatic'

// How a tab looks: its header row is frozen and bold, and each column, by position, gets a format.
export interface TabLayout {
  tab: string
  columnFormats: ColumnFormat[]
}

export interface SpreadsheetTabs {
  spreadsheet: SpreadsheetRef
  // The requested tabs that exist, header row first, as stored: numbers stay numbers and dates are serial numbers.
  // Trailing empty rows and cells are left out.
  values: Record<string, CellValue[][]>
  // A link that opens each of those tabs in the browser.
  tabLinks: Record<string, string>
}

// needs-click: the browser blocked a sign-in window opened without a click; ask the user to click and retry.
// cancelled: the user closed the Google window.
export type DataErrorKind = 'needs-click' | 'cancelled' | 'failed'

export class DataError extends Error {
  readonly kind: DataErrorKind

  constructor(kind: DataErrorKind, message: string) {
    super(message)
    this.name = 'DataError'
    this.kind = kind
  }
}

export interface DataStore {
  // Why the store cannot work yet (missing configuration), or null when it is ready.
  readonly setupProblem: string | null
  currentUser(): SignedInUser | null
  // The account used last time on this device, so the UI can offer "Continue as ...".
  rememberedEmail(): string | null
  // Tries to sign the remembered user back in without a click. Resolves null when nobody is remembered.
  resumeSession(): Promise<SignedInUser | null>
  // Call from a click handler, before any other await, so the browser allows Google's window.
  signIn(): Promise<SignedInUser>
  signOut(): void
  // Lets the user choose a spreadsheet and grants the app access to it. Resolves null when the user cancels.
  chooseSpreadsheet(): Promise<SpreadsheetRef | null>
  getSpreadsheet(spreadsheetId: string): Promise<SpreadsheetRef>
  // A new spreadsheet with exactly these tabs, all empty. The app can open it later without choosing it.
  createSpreadsheet(title: string, tabNames: readonly string[]): Promise<SpreadsheetRef>
  // Adds rows after the last row of the tab, written as raw values. Each row must already be in the tab's column order.
  appendRows(spreadsheetId: string, tab: string, rows: readonly CellValue[][]): Promise<void>
  // Overwrites exactly these cells with raw values, all in one request; every other cell stays as it is.
  updateCells(spreadsheetId: string, updates: readonly CellUpdate[]): Promise<void>
  // Replaces the contents from A1 of each tab, all in one request.
  writeTabs(spreadsheetId: string, tabs: readonly TabRows[]): Promise<void>
  // Reads the requested tabs in one request. Tabs the spreadsheet does not have are left out of the result.
  readTabs(spreadsheetId: string, tabNames: readonly string[]): Promise<SpreadsheetTabs>
  formatTabs(spreadsheetId: string, layouts: readonly TabLayout[]): Promise<void>
}
