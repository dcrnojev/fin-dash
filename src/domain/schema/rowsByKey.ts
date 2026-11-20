import { headerPositions } from './headerPositions.ts'
import type { Cell, TabSpec } from './tabSpec.ts'

export interface NumberedRow<T> {
  // The sheet row number; the header row is 1.
  row: number
  value: T
}

// Every readable row of a tab with its sheet row number, grouped by key. Unlike decodeTab, a key that appears more than
// once keeps all its rows, so a write can refuse it instead of picking one. Unreadable rows are left out.
export function rowsByKey<T>(spec: TabSpec<T>, values: readonly (readonly Cell[])[]): Map<string, NumberedRow<T>[]> {
  const positions = headerPositions(values[0] ?? [])
  const grouped = new Map<string, NumberedRow<T>[]>()

  values.slice(1).forEach((rowValues, index) => {
    const row = index + 2
    const cells: Record<string, Cell> = {}

    for (const column of spec.columns) {
      const position = positions.get(column.name)
      cells[column.name] = position === undefined ? null : (rowValues[position] ?? null)
    }

    // Problems with a row already show in Data health; here only readable rows matter.
    const value = spec.fromRow(cells, { tab: spec.name, row }, [])

    if (value === null)
      return

    const key = spec.key(value)
    grouped.set(key, [...(grouped.get(key) ?? []), { row, value }])
  })

  return grouped
}
