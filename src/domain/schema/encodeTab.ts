import type { CellValue, TabSpec } from './tabSpec.ts'

// The header row followed by one row per value, in the spec's column order.
export function encodeTab<T>(spec: TabSpec<T>, values: readonly T[]): CellValue[][] {
  const names = spec.columns.map(column => column.name)

  const rows = values.map(value => {
    const row = spec.toRow(value)

    return names.map(name => row[name] ?? '')
  })

  return [names, ...rows]
}
