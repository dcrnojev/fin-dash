interface IsolatedPointDotProps {
  // What Recharts passes to a line's `dot` function: the point's position and its index in the data.
  point: { cx?: number; cy?: number; index: number }
  values: readonly (number | null)[]
  color: string
  // Hollow for a lower bound (the known part of a total), so it does not read as a measured value.
  hollow?: boolean
}

// A line breaks wherever it has no value (an unknown month, or an estimated one on the measured line), so a value
// between two breaks would have no line at all. This draws a dot for such a month only; elsewhere the line shows it.
export function IsolatedPointDot({ point, values, color, hollow = false }: IsolatedPointDotProps) {
  const valueAt = (position: number) => values[position] ?? null
  const isolated = valueAt(point.index) !== null && valueAt(point.index - 1) === null && valueAt(point.index + 1) === null

  if (!isolated || point.cx === undefined || point.cy === undefined)
    return null

  if (hollow)
    return <circle cx={point.cx} cy={point.cy} r={3.5} fill="var(--color-surface)" stroke={color} strokeWidth={2} />

  return <circle cx={point.cx} cy={point.cy} r={4} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
}
