import { bundleToTabs } from '../../src/domain/schema/bundleTabs.ts'
import { readLedger } from '../../src/domain/schema/readLedger.ts'
import type { Bundle, Issue } from '../../src/domain/types.ts'

export interface BundleValidation {
  issues: Issue[]
  // Rows that did not come back identical after writing them as tab rows and reading them again.
  changedRows: string[]
  rowCount: number
}

// Writes the bundle through the tab specs and reads it back with the app's validator, so the import is held to the same
// rules as a hand-edited sheet.
export function validateBundle(bundle: Bundle): BundleValidation {
  const ledger = readLedger(bundleToTabs(bundle))
  const changedRows: string[] = []

  const compare = <T>(tab: string, written: readonly T[], read: readonly T[]) => {
    const readRows = new Set(read.map(withoutRef))

    for (const row of written) {
      if (!readRows.has(withoutRef(row)))
        changedRows.push(`${tab}: ${withoutRef(row)}`)
    }
  }

  compare('_meta', [bundle.meta], ledger.meta === null ? [] : [ledger.meta])
  compare('people', bundle.people, ledger.people)
  compare('pots', bundle.pots, ledger.pots)
  compare('holdings', bundle.holdings, ledger.holdings)
  compare('snapshots', bundle.snapshots, ledger.snapshots)
  compare('contributions', bundle.contributions, ledger.contributions)
  compare('months', bundle.months, [...ledger.months.values()])

  const tabs = [[bundle.meta], bundle.people, bundle.pots, bundle.holdings, bundle.snapshots, bundle.contributions, bundle.months]

  return { issues: ledger.issues, changedRows, rowCount: tabs.reduce((total, rows) => total + rows.length, 0) }
}

function withoutRef(row: unknown): string {
  return JSON.stringify(row, (key, value: unknown) => (key === 'ref' ? undefined : value))
}
