import type { Bundle, TabName } from '../types.ts'
import { contributionsTab } from './contributionsTab.ts'
import { encodeTab } from './encodeTab.ts'
import { holdingsTab } from './holdingsTab.ts'
import { metaToEntries } from './meta.ts'
import { metaTab } from './metaTab.ts'
import { monthsTab } from './monthsTab.ts'
import { peopleTab } from './peopleTab.ts'
import { potsTab } from './potsTab.ts'
import { snapshotsTab } from './snapshotsTab.ts'
import type { CellValue } from './tabSpec.ts'

// The bundle as tab contents, header row first, ready to be written RAW into a new spreadsheet.
export function bundleToTabs(bundle: Bundle): Record<TabName, CellValue[][]> {
  return {
    _meta: encodeTab(metaTab, metaToEntries(bundle.meta)),
    people: encodeTab(peopleTab, bundle.people),
    pots: encodeTab(potsTab, bundle.pots),
    holdings: encodeTab(holdingsTab, bundle.holdings),
    snapshots: encodeTab(snapshotsTab, bundle.snapshots),
    contributions: encodeTab(contributionsTab, bundle.contributions),
    months: encodeTab(monthsTab, bundle.months),
  }
}
