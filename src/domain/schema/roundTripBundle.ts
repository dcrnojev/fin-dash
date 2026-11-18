import type { Bundle, Ledger, TabName } from '../types.ts'
import { bundleToTabs } from './bundleTabs.ts'
import { readLedger } from './readLedger.ts'
import type { CellValue } from './tabSpec.ts'

export interface BundleRoundTrip {
  // The tab contents the bundle is written as.
  tabs: Record<TabName, CellValue[][]>
  // What the validator keeps when it reads those tabs back.
  ledger: Ledger
}

// Writes the bundle through the tab specs and reads it back with the validator that reads the spreadsheet, so a bundle is
// held to the same rules as a hand-edited sheet.
export function roundTripBundle(bundle: Bundle): BundleRoundTrip {
  const tabs = bundleToTabs(bundle)
  return { tabs, ledger: readLedger(tabs) }
}
