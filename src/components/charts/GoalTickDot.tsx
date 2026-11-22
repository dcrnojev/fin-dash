interface GoalTickDotProps {
  // What Recharts passes to a line's `dot` function: the point's position and its index in the data.
  point: { cx?: number; cy?: number; index: number }
  hasTarget: boolean
  color: string
}

const halfWidth = 6

// A short level stroke at the month's goal target, so the target reads as a mark to reach rather than a line of values.
export function GoalTickDot({ point, hasTarget, color }: GoalTickDotProps) {
  if (!hasTarget || point.cx === undefined || point.cy === undefined)
    return null

  return <line x1={point.cx - halfWidth} y1={point.cy} x2={point.cx + halfWidth} y2={point.cy} stroke={color} strokeWidth={3} />
}
