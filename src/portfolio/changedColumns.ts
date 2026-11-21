import type { TabSpec } from '../domain/schema/tabSpec.ts'

// The columns among `columns` whose cells, as the app writes them, differ between the two values.
export function changedColumns<T, C extends string>(spec: TabSpec<T>, before: T, after: T, columns: readonly C[]): C[] {
  const beforeCells = spec.toRow(before)
  const afterCells = spec.toRow(after)

  return columns.filter(column => (beforeCells[column] ?? '') !== (afterCells[column] ?? ''))
}
