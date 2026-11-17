import type { Issue } from '../types.ts'
import type { Cell, TabSpec } from './tabSpec.ts'

// Rows of one tab as read, header row first. Columns are found by header name, so people may reorder them or add their own.
// A missing required header makes the whole tab unreadable; invalid rows and repeated keys are skipped and reported.
export function decodeTab<T>(spec: TabSpec<T>, values: readonly (readonly Cell[])[], issues: Issue[]): T[] {
  const tabIssue = (severity: Issue['severity'], code: string, column: string | null, message: string): void => {
    issues.push({ severity, code, tab: spec.name, row: 1, column, message })
  }

  const headers = (values[0] ?? []).map(cell => (cell === null ? '' : String(cell).trim()))
  const columnPositions = new Map<string, number>()

  headers.forEach((header, position) => {
    if (header === '')
      return

    if (columnPositions.has(header))
      tabIssue('error', 'duplicate-column', header, `The column ${header} appears more than once; the first one is used.`)
    else
      columnPositions.set(header, position)
  })

  const missingRequired = spec.columns.filter(column => column.required && !columnPositions.has(column.name))

  for (const column of missingRequired)
    tabIssue('error', 'missing-column', column.name, `The required column ${column.name} is missing, so the tab cannot be read.`)

  if (missingRequired.length > 0)
    return []

  const knownNames = new Set(spec.columns.map(column => column.name))

  for (const header of columnPositions.keys()) {
    if (!knownNames.has(header))
      tabIssue('info', 'extra-column', header, `The column ${header} is not used by the app.`)
  }

  const decoded: T[] = []
  const rowsByKey = new Map<string, number>()

  values.slice(1).forEach((rowValues, index) => {
    const row = index + 2
    const cells: Record<string, Cell> = {}

    for (const column of spec.columns) {
      const position = columnPositions.get(column.name)
      cells[column.name] = position === undefined ? null : (rowValues[position] ?? null)
    }

    if (Object.values(cells).every(isBlank))
      return

    const value = spec.fromRow(cells, { tab: spec.name, row }, issues)

    if (value === null)
      return

    const key = spec.key(value)
    const firstRow = rowsByKey.get(key)

    if (firstRow !== undefined) {
      issues.push({
        severity: 'error',
        code: 'duplicate-key',
        tab: spec.name,
        row,
        column: null,
        message: `This row repeats the key of row ${firstRow} (${key}); only row ${firstRow} is used.`,
      })
      return
    }

    rowsByKey.set(key, row)
    decoded.push(value)
  })

  return decoded
}

function isBlank(cell: Cell): boolean {
  return cell === null || (typeof cell === 'string' && cell.trim() === '')
}
