import { parseMonth } from '../month.ts'
import type { Issue, Meta, Month } from '../types.ts'
import type { MetaEntry } from './metaTab.ts'

const metaKeys = {
  currency: 'currency',
  goLiveMonth: 'go_live_month',
  lastWriteAppVersion: 'last_write_app_version',
  legacyLastMonth: 'legacy_last_month',
  monthEndRule: 'month_end_rule',
  schemaVersion: 'schema_version',
} as const satisfies Record<keyof Meta, string>

// The schema version this code reads and writes. A spreadsheet with a higher one was written by a newer app.
export const appSchemaVersion = 1

// The app writes `_meta` last when it creates the spreadsheet, so a missing schema version means the setup did not finish.
export function metaFromEntries(entries: readonly MetaEntry[], issues: Issue[]): Meta | null {
  const values = new Map(entries.map(entry => [entry.key, entry.value]))
  const metaIssue = (code: string, message: string): void => {
    issues.push({ severity: 'error', code, tab: '_meta', row: null, column: 'value', message })
  }

  const knownKeys = new Set<string>(Object.values(metaKeys))

  for (const key of values.keys()) {
    if (!knownKeys.has(key))
      issues.push({ severity: 'info', code: 'unknown-meta-key', tab: '_meta', row: null, column: 'key', message: `${key} is not used.` })
  }

  const schemaVersion = values.get(metaKeys.schemaVersion)

  if (schemaVersion === undefined) {
    metaIssue('missing-schema-version', 'schema_version is missing, so creating the spreadsheet did not finish.')
    return null
  }

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    metaIssue('invalid-schema-version', `schema_version ${schemaVersion} is not a whole number.`)
    return null
  }

  const text = (key: string): string | null => {
    const value = values.get(key)

    return value === undefined ? null : String(value)
  }

  const currency = text(metaKeys.currency)

  if (currency === null) {
    metaIssue('missing-currency', 'currency is missing.')
    return null
  }

  const month = (key: string): Month | null => {
    const value = text(key)
    const parsed = value === null ? null : parseMonth(value)

    if (value !== null && parsed === null)
      metaIssue('invalid-month', `${key} "${value}" is not a month in the form YYYY-MM.`)

    return parsed
  }

  return {
    schemaVersion,
    currency,
    goLiveMonth: month(metaKeys.goLiveMonth),
    legacyLastMonth: month(metaKeys.legacyLastMonth),
    monthEndRule: text(metaKeys.monthEndRule),
    lastWriteAppVersion: text(metaKeys.lastWriteAppVersion),
  }
}

export function metaToEntries(meta: Meta): MetaEntry[] {
  const entries: MetaEntry[] = [
    { key: metaKeys.schemaVersion, value: meta.schemaVersion },
    { key: metaKeys.currency, value: meta.currency },
  ]

  const optional: [string, string | null][] = [
    [metaKeys.goLiveMonth, meta.goLiveMonth],
    [metaKeys.legacyLastMonth, meta.legacyLastMonth],
    [metaKeys.monthEndRule, meta.monthEndRule],
    [metaKeys.lastWriteAppVersion, meta.lastWriteAppVersion],
  ]

  for (const [key, value] of optional) {
    if (value !== null)
      entries.push({ key, value })
  }

  return entries
}
