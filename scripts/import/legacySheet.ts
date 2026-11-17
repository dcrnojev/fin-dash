// The legacy workbooks as plain data, independent of the library that reads them.

export interface LegacyCell {
  address: string
  column: string
  row: number
  // The cached value; error cells carry their error text, such as '#REF!'.
  value: number | string | boolean | null
  // Formula text without the leading '='.
  formula: string | null
  comment: string | null
}

export interface LegacySheet {
  name: string
  cells: ReadonlyMap<string, LegacyCell>
}

export type LegacyWorkbook = ReadonlyMap<string, LegacySheet>

const addressPattern = /^\$?([A-Z]{1,3})\$?(\d+)$/

export function parseAddress(address: string): { column: string; row: number } | null {
  const match = addressPattern.exec(address)

  return match === null ? null : { column: match[1], row: Number(match[2]) }
}

export function columnIndex(column: string): number {
  return [...column].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0)
}

export function columnLetter(index: number): string {
  let letters = ''

  for (let rest = index; rest > 0; rest = Math.floor((rest - 1) / 26))
    letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters

  return letters
}

export function cellAt(sheet: LegacySheet, column: string, row: number): LegacyCell | undefined {
  return sheet.cells.get(`${column}${row}`)
}

export function isEmptyCell(cell: LegacyCell | undefined): boolean {
  return cell === undefined || ((cell.value === null || cell.value === '') && cell.formula === null)
}

export function headerText(cell: LegacyCell | undefined): string {
  return cell === undefined || cell.value === null ? '' : String(cell.value).trim()
}

// The first of the top rows that has a cell with this text.
export function findHeaderRow(sheet: LegacySheet, header: string, searchRows = 10): number | null {
  for (const cell of sheet.cells.values()) {
    if (cell.row <= searchRows && headerText(cell) === header)
      return cell.row
  }

  return null
}

export function cellsInRow(sheet: LegacySheet, row: number): LegacyCell[] {
  return [...sheet.cells.values()].filter(cell => cell.row === row).sort((a, b) => columnIndex(a.column) - columnIndex(b.column))
}
