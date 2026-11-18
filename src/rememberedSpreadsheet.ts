import type { SpreadsheetRef } from './data'
import { getLocalStorage, readStoredString, removeStoredValue, writeStoredString } from './webStorage'

const rememberedSpreadsheetKey = 'fin-dash.spreadsheet'

export function readRememberedSpreadsheet(): SpreadsheetRef | null {
  const stored = readStoredString(getLocalStorage, rememberedSpreadsheetKey)

  if (!stored)
    return null

  try {
    const parsed = JSON.parse(stored) as Partial<SpreadsheetRef>
    return typeof parsed.id === 'string' && typeof parsed.name === 'string' ? { id: parsed.id, name: parsed.name } : null
  } catch {
    return null
  }
}

export function rememberSpreadsheet(spreadsheet: SpreadsheetRef): void {
  writeStoredString(getLocalStorage, rememberedSpreadsheetKey, JSON.stringify(spreadsheet))
}

export function forgetSpreadsheet(): void {
  removeStoredValue(getLocalStorage, rememberedSpreadsheetKey)
}
