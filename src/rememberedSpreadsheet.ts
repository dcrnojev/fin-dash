import type { SpreadsheetRef } from './data'
import { readStoredString, removeStoredValue, writeStoredString } from './localStore'

const rememberedSpreadsheetKey = 'fin-dash.spreadsheet'

export function readRememberedSpreadsheet(): SpreadsheetRef | null {
  const stored = readStoredString(rememberedSpreadsheetKey)

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
  writeStoredString(rememberedSpreadsheetKey, JSON.stringify(spreadsheet))
}

export function forgetSpreadsheet(): void {
  removeStoredValue(rememberedSpreadsheetKey)
}
