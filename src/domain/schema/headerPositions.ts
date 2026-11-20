import type { Cell } from './tabSpec.ts'

// Where each column of a tab sits, by its header name. As in decodeTab, the first of two equal headers is the one used.
export function headerPositions(header: readonly Cell[]): Map<string, number> {
  const positions = new Map<string, number>()

  header.forEach((cell, position) => {
    const name = cell === null ? '' : String(cell).trim()

    if (name !== '' && !positions.has(name))
      positions.set(name, position)
  })

  return positions
}
