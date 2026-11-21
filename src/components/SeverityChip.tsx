import type { Issue } from '../domain/types'

const severityLabels: Record<Issue['severity'], { one: string; many: string }> = {
  error: { one: 'Error', many: 'Errors' },
  warning: { one: 'Warning', many: 'Warnings' },
  info: { one: 'Note', many: 'Notes' },
}

interface SeverityChipProps {
  severity: Issue['severity']
  // Shown as '2 warnings'; without it the chip names the severity alone.
  count?: number
}

export function SeverityChip({ severity, count }: SeverityChipProps) {
  const label = count === undefined ? severityLabels[severity].one : `${count} ${countLabel(severity, count)}`

  return (
    <span className={`severity severity-${severity}`}>
      <SeverityIcon severity={severity} />
      {label}
    </span>
  )
}

function countLabel(severity: Issue['severity'], count: number): string {
  const { one, many } = severityLabels[severity]
  return (count === 1 ? one : many).toLowerCase()
}

function SeverityIcon({ severity }: { severity: Issue['severity'] }) {
  if (severity === 'error') {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="6" />
        <path d="M3.8 3.8l4.4 4.4M8.2 3.8 3.8 8.2" className="severity-icon-mark" strokeWidth="1.6" />
      </svg>
    )
  }

  if (severity === 'warning') {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 .5 11.7 11H.3z" />
        <path d="M6 4.3v3.4M6 8.8v.9" className="severity-icon-mark" strokeWidth="1.4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="6" />
      <path d="M6 5.2v3.6M6 3v.9" className="severity-icon-mark" strokeWidth="1.4" />
    </svg>
  )
}
