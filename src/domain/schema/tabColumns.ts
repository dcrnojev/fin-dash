import type { TabName } from '../types.ts'
import { contributionsTab } from './contributionsTab.ts'
import { holdingsTab } from './holdingsTab.ts'
import { metaTab } from './metaTab.ts'
import { monthsTab } from './monthsTab.ts'
import { peopleTab } from './peopleTab.ts'
import { potsTab } from './potsTab.ts'
import { snapshotsTab } from './snapshotsTab.ts'
import type { ColumnSpec } from './tabSpec.ts'

export const tabColumns: Record<TabName, readonly ColumnSpec[]> = {
  _meta: metaTab.columns,
  people: peopleTab.columns,
  pots: potsTab.columns,
  holdings: holdingsTab.columns,
  snapshots: snapshotsTab.columns,
  contributions: contributionsTab.columns,
  months: monthsTab.columns,
}
