import type { Issue } from '../../domain/types'
import type { IssueCounts } from '../../ledger/issueCounts'
import { routeHash } from '../../routing/route'
import { SeverityChip } from '../SeverityChip'

const severities: readonly Issue['severity'][] = ['error', 'warning', 'info']

// One line on the home page while the spreadsheet has issues; the Data health page lists them.
export function HealthStrip({ counts }: { counts: IssueCounts }) {
  const present = severities.filter(severity => counts[severity] > 0)

  if (present.length === 0)
    return null

  return (
    <a className="health-strip" href={routeHash({ page: 'health' })}>
      {present.map(severity => (
        <SeverityChip key={severity} severity={severity} count={counts[severity]} />
      ))}
      <span className="health-strip-text">
        {counts.error > 0 ? 'Rows with errors are left out of the figures' : 'Rows in the spreadsheet need a look'}
      </span>
      <span className="health-strip-link">Review</span>
    </a>
  )
}
