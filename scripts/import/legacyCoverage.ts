import type { CashBalanceSheet } from './cashBalanceSheet.ts'
import type { Coverage } from './checks/checkCoverage.ts'
import type { LegacyWorkbook } from './legacySheet.ts'
import type { OmfSheet } from './omfSheet.ts'
import { cashFlowRef } from './sourceRef.ts'

const notChosenReason = 'row not chosen as a month end (design F3: early-month snapshots are left out)'

export const ignoredSheets = new Map([['Metrics', 'Metrics tab, not imported; the owner enters the loans by hand']])

// Problem cells are never marked, so R3 lists them with their problem.
export function markCashBalanceCoverage(
  cashBalance: CashBalanceSheet,
  chosenRows: ReadonlySet<number>,
  importedSourceRefs: ReadonlySet<string | null>,
  coverage: Coverage
): void {
  const { sheet, roles, headerRow } = cashBalance
  const problemAddresses = new Set(cashBalance.problems.map(problem => problem.address))
  const readRows = new Set(cashBalance.rows.map(row => row.row))

  for (const cell of sheet.cells.values()) {
    const role = roles.get(cell.column)

    if (cell.row === headerRow) {
      coverage.mark(sheet.name, cell.address, 'header')
      continue
    }

    if (cell.row < headerRow || role === undefined || problemAddresses.has(cell.address) || !readRows.has(cell.row))
      continue

    const chosen = chosenRows.has(cell.row)

    if (role.kind === 'helper')
      coverage.mark(sheet.name, cell.address, role.reason)
    else if (role.kind === 'derived')
      coverage.mark(sheet.name, cell.address, 'total or diff, checked by R2')
    else if (!chosen)
      coverage.mark(sheet.name, cell.address, notChosenReason)
    else if (role.kind === 'date')
      coverage.mark(sheet.name, cell.address, 'imported: as_of of the month-end snapshots')
    else if (importedSourceRefs.has(cashFlowRef(sheet.name, [cell.address])))
      coverage.mark(sheet.name, cell.address, 'imported: snapshots')
  }
}

export function markOmfCoverage(omf: OmfSheet, coverage: Coverage): void {
  const { sheet, columns, headerRow } = omf
  const problemAddresses = new Set(omf.problems.map(problem => problem.address))
  const readRows = new Set(omf.rows.map(row => row.row))
  const reasonsByColumn = new Map([
    [columns.date, 'imported: contribution date and snapshot as_of'],
    [columns.payment, 'imported: contributions'],
    [columns.cumulative, 'running total, checked by R5'],
    [columns.balance, 'imported: snapshots'],
    [columns.ratio, 'legacy return ratio, not imported'],
  ])

  coverage.mark(sheet.name, omf.titleAddress, 'title naming the pension owner')

  for (const cell of sheet.cells.values()) {
    const reason = reasonsByColumn.get(cell.column)

    if (cell.row === headerRow)
      coverage.mark(sheet.name, cell.address, 'header')
    else if (cell.row > headerRow && reason !== undefined && readRows.has(cell.row) && !problemAddresses.has(cell.address))
      coverage.mark(sheet.name, cell.address, reason)
  }
}

export function markIgnoredSheets(workbook: LegacyWorkbook, coverage: Coverage): void {
  for (const [name, reason] of ignoredSheets) {
    for (const cell of workbook.get(name)?.cells.values() ?? [])
      coverage.mark(name, cell.address, reason)
  }
}
