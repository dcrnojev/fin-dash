import { headerPositions } from './headerPositions.ts'
import type { Cell, CellValue, TabSpec } from './tabSpec.ts'

// Rows for appending to a tab whose header row is `header`: each value lands under its column's header wherever that
// column sits, and columns the app does not know stay blank. Throws when a value needs a column the tab does not have.
export function rowsForHeader<T>(spec: TabSpec<T>, header: readonly Cell[], values: readonly T[]): CellValue[][] {
  const positions = headerPositions(header)
  const encoded = values.map(value => spec.toRow(value))

  const missingColumns = spec.columns
    .map(column => column.name)
    .filter(name => !positions.has(name) && encoded.some(row => (row[name] ?? '') !== ''))

  if (missingColumns.length > 0) {
    const columns = missingColumns.length > 1 ? 'columns' : 'a column'
    const names = missingColumns.join(' and ')
    throw new Error(`Add ${columns} named exactly ${names} to the header row of the ${spec.name} tab; existing rows can stay blank.`)
  }

  return encoded.map(row => {
    const cells: CellValue[] = Array.from({ length: header.length }, () => '')

    for (const [name, position] of positions)
      cells[position] = row[name] ?? ''

    return cells
  })
}
