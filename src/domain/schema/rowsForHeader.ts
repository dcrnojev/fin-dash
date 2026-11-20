import { headerPositions } from './headerPositions.ts'
import { missingColumnsMessage } from './missingColumnsMessage.ts'
import type { Cell, CellValue, TabSpec } from './tabSpec.ts'

// Rows for appending to a tab whose header row is `header`: each value lands under its column's header wherever that
// column sits, and columns the app does not know stay blank. Throws when a value needs a column the tab does not have.
export function rowsForHeader<T>(spec: TabSpec<T>, header: readonly Cell[], values: readonly T[]): CellValue[][] {
  const positions = headerPositions(header)
  const encoded = values.map(value => spec.toRow(value))

  const missingColumns = spec.columns
    .map(column => column.name)
    .filter(name => !positions.has(name) && encoded.some(row => (row[name] ?? '') !== ''))

  if (missingColumns.length > 0)
    throw new Error(missingColumnsMessage(spec.name, missingColumns))

  return encoded.map(row => {
    const cells: CellValue[] = Array.from({ length: header.length }, () => '')

    for (const [name, position] of positions)
      cells[position] = row[name] ?? ''

    return cells
  })
}
