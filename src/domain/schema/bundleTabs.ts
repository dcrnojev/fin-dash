import type { Bundle, TabName } from '../types.ts'
import { balancesTab } from './balancesTab.ts'
import { contributionsTab } from './contributionsTab.ts'
import { encodeTab } from './encodeTab.ts'
import { groupsTab } from './groupsTab.ts'
import { metaToEntries } from './meta.ts'
import { metaTab } from './metaTab.ts'
import { monthEndBalancesTab } from './monthEndBalancesTab.ts'
import { monthsTab } from './monthsTab.ts'
import { peopleTab } from './peopleTab.ts'
import type { CellValue } from './tabSpec.ts'

// The bundle as tab contents, header row first, ready to be written RAW into a new spreadsheet.
export function bundleToTabs(bundle: Bundle): Record<TabName, CellValue[][]> {
  return {
    _meta: encodeTab(metaTab, metaToEntries(bundle.meta)),
    people: encodeTab(peopleTab, bundle.people),
    groups: encodeTab(groupsTab, bundle.groups),
    balances: encodeTab(balancesTab, bundle.balances),
    month_end_balances: encodeTab(monthEndBalancesTab, bundle.monthEndBalances),
    contributions: encodeTab(contributionsTab, bundle.contributions),
    months: encodeTab(monthsTab, bundle.months),
  }
}
