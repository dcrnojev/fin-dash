import type { SeriesMark } from './chartSeries'

interface SeriesKeyProps {
  color: string
  mark: SeriesMark
}

// The small coloured mark beside a name in a legend or tooltip, drawn like the chart draws it.
export function SeriesKey({ color, mark }: SeriesKeyProps) {
  return (
    <svg className="series-key" width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
      <SeriesKeyShape color={color} mark={mark} />
    </svg>
  )
}

function SeriesKeyShape({ color, mark }: SeriesKeyProps) {
  switch (mark) {
    case 'none':
      return null
    case 'block':
      return <rect x="3" y="0" width="10" height="10" rx="2" fill={color} />
    case 'faded-block':
      return <rect x="3" y="0" width="10" height="10" rx="2" fill={color} fillOpacity={0.35} />
    case 'estimated-block':
      return (
        <>
          <rect x="3.5" y="0.5" width="9" height="9" rx="1.5" fill={color} fillOpacity={0.25} stroke={color} />
          <line x1="3.5" y1="7" x2="10" y2="0.5" stroke={color} strokeWidth="1.5" />
          <line x1="6" y1="9.5" x2="12.5" y2="3" stroke={color} strokeWidth="1.5" />
        </>
      )
    case 'estimated-line':
      return (
        <>
          <line x1="1" y1="5" x2="15" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
          <polygon points="8,1.5 11.5,5 8,8.5 4.5,5" fill="var(--color-surface)" stroke={color} strokeWidth="1.5" />
        </>
      )
    case 'dashed-line':
      return <line x1="1" y1="5" x2="15" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
    case 'line':
      return <line x1="1" y1="5" x2="15" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  }
}
