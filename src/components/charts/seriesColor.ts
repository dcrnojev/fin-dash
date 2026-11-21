const paletteSlotCount = 8

// Groups take the palette slots in their sort order. The eight slots in index.css were checked together for colour-blind
// separation; past them, series share a neutral grey rather than a generated hue.
export function seriesColor(position: number): string {
  return position < paletteSlotCount ? `var(--series-${position + 1})` : 'var(--series-other)'
}
