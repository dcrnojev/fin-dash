import { isEmptyCell, type LegacyWorkbook } from '../legacySheet.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'

// Why each legacy cell was imported or ignored, keyed by sheet and address.
export class Coverage {
  private readonly reasons = new Map<string, string>()

  mark(sheetName: string, address: string, reason: string): void {
    this.reasons.set(`${sheetName}!${address}`, reason)
  }

  reasonFor(sheetName: string, address: string): string | undefined {
    return this.reasons.get(`${sheetName}!${address}`)
  }
}

// R3: every non-empty legacy cell is either imported or ignored for a listed reason.
export function checkCoverage(workbook: LegacyWorkbook, coverage: Coverage, problems: ReadonlyMap<string, string>): CheckResult {
  const differences: CheckDifference[] = []
  const counts: string[] = []

  for (const sheet of workbook.values()) {
    const cellsByReason = new Map<string, number>()
    let nonEmpty = 0

    for (const cell of sheet.cells.values()) {
      if (isEmptyCell(cell))
        continue

      nonEmpty++
      const reason = coverage.reasonFor(sheet.name, cell.address)

      if (reason === undefined) {
        const problem = problems.get(`${sheet.name}!${cell.address}`)
        differences.push({ cell: `${sheet.name}!${cell.address}`, message: problem ?? 'neither imported nor ignored for a listed reason' })
        continue
      }

      cellsByReason.set(reason, (cellsByReason.get(reason) ?? 0) + 1)
    }

    counts.push(`${sheet.name}: ${nonEmpty} non-empty cells`)

    for (const [reason, count] of [...cellsByReason].sort(([a], [b]) => a.localeCompare(b)))
      counts.push(`  ${count} ${reason}`)
  }

  return { id: 'R3', title: 'Coverage', status: differences.length === 0 ? 'pass' : 'fail', counts, differences }
}
