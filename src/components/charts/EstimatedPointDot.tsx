interface EstimatedPointDotProps {
  // What Recharts passes to a line's `dot` function: the point's position and its index in the data.
  point: { cx?: number; cy?: number; index: number }
  isEstimated: boolean
  color: string
}

const halfSize = 3.5

// A hollow diamond on each estimated month, so an estimate never looks like a measured point or a lower bound.
export function EstimatedPointDot({ point, isEstimated, color }: EstimatedPointDotProps) {
  if (!isEstimated || point.cx === undefined || point.cy === undefined)
    return null

  const { cx, cy } = point
  const corners = `${cx},${cy - halfSize} ${cx + halfSize},${cy} ${cx},${cy + halfSize} ${cx - halfSize},${cy}`

  return <polygon points={corners} fill="var(--color-surface)" stroke={color} strokeWidth={1.5} />
}
