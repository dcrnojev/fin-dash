import type { FigureState } from '../calc/monthFigure'
import type { Sparkline as SparklineData } from '../calc/sparkline'

const width = 100
const height = 30
const inset = 2

const strokeStyles: Record<FigureState, { strokeDasharray?: string; opacity?: number }> = {
  measured: {},
  estimated: { strokeDasharray: '0.1 4' },
  'at-least': { strokeDasharray: '4 3', opacity: 0.5 },
}

// The shape of a total over recent months, drawn like the big charts: solid where measured, dotted where estimated,
// dashed and faded where only a lower bound is known. It has no scale, so it reveals no amount.
export function Sparkline({ line }: { line: SparklineData }) {
  const known = line.figures.flatMap(figure => (figure === null ? [] : [figure.cents]))

  if (known.length === 0)
    return null

  const lowest = Math.min(...known)
  const span = Math.max(...known) - lowest || 1
  const x = (position: number) => (line.figures.length === 1 ? width / 2 : (position * width) / (line.figures.length - 1))
  const y = (position: number) => height - inset - (((line.figures[position]?.cents ?? lowest) - lowest) / span) * (height - 2 * inset)

  const pointAt = (position: number) => `${x(position).toFixed(1)},${y(position).toFixed(1)}`

  const pathOf = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, offset) => (offset === 0 ? 'M' : 'L') + pointAt(from + offset)).join('')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {line.segments.map(segment => (
        <path
          key={segment.from}
          d={pathOf(segment.from, segment.to)}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          {...strokeStyles[segment.state]}
        />
      ))}
      {line.isolated.map(position => (
        <path
          key={position}
          d={`${pathOf(position, position)}h0`}
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
