import type { TabName } from '../types.ts'
import { balancesTab } from './balancesTab.ts'
import { contributionsTab } from './contributionsTab.ts'
import { groupsTab } from './groupsTab.ts'
import { metaTab } from './metaTab.ts'
import { monthEndBalancesTab } from './monthEndBalancesTab.ts'
import { monthsTab } from './monthsTab.ts'
import { peopleTab } from './peopleTab.ts'
import type { ColumnSpec } from './tabSpec.ts'

export const tabColumns: Record<TabName, readonly ColumnSpec[]> = {
  _meta: metaTab.columns,
  people: peopleTab.columns,
  groups: groupsTab.columns,
  balances: balancesTab.columns,
  month_end_balances: monthEndBalancesTab.columns,
  contributions: contributionsTab.columns,
  months: monthsTab.columns,
}
