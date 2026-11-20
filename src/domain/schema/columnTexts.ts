import { headerPositions } from './headerPositions.ts'
import type { Cell } from './tabSpec.ts'

// The non-blank cells of one column below the header row, as trimmed text, whether or not their rows are valid.
export function columnTexts(rows: readonly (readonly Cell[])[], columnName: string): string[] {
  const position = headerPositions(rows[0] ?? []).get(columnName)

  if (position === undefined)
    return []

  return rows
    .slice(1)
    .map(row => row[position])
    .flatMap(cell => (cell === null || cell === undefined || String(cell).trim() === '' ? [] : [String(cell).trim()]))
}
