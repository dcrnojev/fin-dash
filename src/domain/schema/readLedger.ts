import type { Issue, Ledger, TabName } from '../types.ts'
import { balancesTab } from './balancesTab.ts'
import { checkReferences } from './checkReferences.ts'
import { contributionsTab } from './contributionsTab.ts'
import { decodeTab } from './decodeTab.ts'
import { groupsTab } from './groupsTab.ts'
import { metaFromEntries } from './meta.ts'
import { metaTab } from './metaTab.ts'
import { monthEndBalancesTab } from './monthEndBalancesTab.ts'
import { monthsTab } from './monthsTab.ts'
import { peopleTab } from './peopleTab.ts'
import type { Cell, TabSpec } from './tabSpec.ts'

export type TabValues = Partial<Record<TabName, readonly (readonly Cell[])[]>>

// Decodes every tab, then applies the rules that span rows and tabs. Valid rows feed the calculations; the rest are issues.
export function readLedger(tabs: TabValues): Ledger {
  const issues: Issue[] = []

  const decode = <T>(spec: TabSpec<T>): T[] => {
    const values = tabs[spec.name]

    if (values !== undefined)
      return decodeTab(spec, values, issues)

    issues.push({ severity: 'error', code: 'missing-tab', tab: spec.name, row: null, column: null, message: 'The tab is missing.' })
    return []
  }

  const meta = metaFromEntries(decode(metaTab), issues)

  const checked = checkReferences(
    {
      people: decode(peopleTab),
      groups: decode(groupsTab),
      balances: decode(balancesTab),
      monthEndBalances: decode(monthEndBalancesTab),
      contributions: decode(contributionsTab),
    },
    issues
  )

  const months = new Map(decode(monthsTab).map(record => [record.month, record]))

  return { meta, ...checked, months, issues }
}
