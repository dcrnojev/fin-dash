import { roundTripBundle, type BundleRoundTrip } from '../domain/schema/roundTripBundle'
import type { CellValue } from '../domain/schema/tabSpec'
import type { Bundle, Ledger, Month, TabName } from '../domain/types'

export interface ImportCheck {
  // The tab contents to write, exactly the ones that were validated.
  tabs: Record<TabName, CellValue[][]>
  // What the validator kept after reading the tabs back.
  ledger: Ledger
  firstMonth: Month | null
  lastMonth: Month | null
}

export type ImportCheckResult = { check: ImportCheck; problem: null } | { check: null; problem: string }

const bundleListKeys = ['people', 'pots', 'holdings', 'snapshots', 'contributions', 'months'] as const

// Turns the import's bundle.json into tab rows and reads them back with the same validator that reads the spreadsheet,
// so what the user confirms is what the app will later read.
export function checkImportFile(fileText: string): ImportCheckResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(fileText)
  } catch {
    return { check: null, problem: 'The file is not valid JSON. Choose the bundle.json written by npm run import.' }
  }

  if (!looksLikeBundle(parsed))
    return { check: null, problem: 'The file is JSON but not an import bundle. Choose the bundle.json written by npm run import.' }

  let roundTrip: BundleRoundTrip

  try {
    roundTrip = roundTripBundle(parsed)
  } catch (error) {
    return { check: null, problem: `The bundle could not be turned into tabs: ${error instanceof Error ? error.message : String(error)}` }
  }

  const { tabs, ledger } = roundTrip
  // 'YYYY-MM' text sorts in time order.
  const months = [...ledger.months.keys(), ...ledger.snapshots.map(snapshot => snapshot.month)].sort()

  return { check: { tabs, ledger, firstMonth: months.at(0) ?? null, lastMonth: months.at(-1) ?? null }, problem: null }
}

function looksLikeBundle(value: unknown): value is Bundle {
  if (typeof value !== 'object' || value === null)
    return false

  const record = value as Record<string, unknown>

  return typeof record.meta === 'object' && record.meta !== null && bundleListKeys.every(key => Array.isArray(record[key]))
}
