import type { Issue } from '../domain/types'
import { IssueList } from './IssueList'

const severityOrder: Issue['severity'][] = ['error', 'warning', 'info']
const severityNames: Record<Issue['severity'], { one: string; many: string }> = {
  error: { one: 'error', many: 'errors' },
  warning: { one: 'warning', many: 'warnings' },
  info: { one: 'note', many: 'notes' },
}

interface DataHealthPanelProps {
  issues: readonly Issue[]
  tabLinks: Readonly<Record<string, string>>
  onReload: () => void
}

// What the validator found in the spreadsheet. Rows with errors are left out of the figures, so errors start expanded;
// warnings and notes alone stay folded into one line.
export function DataHealthPanel({ issues, tabLinks, onReload }: DataHealthPanelProps) {
  const groups = severityOrder
    .map(severity => ({ severity, issues: issues.filter(issue => issue.severity === severity) }))
    .filter(group => group.issues.length > 0)

  const countText = (severity: Issue['severity'], count: number) =>
    `${count} ${count === 1 ? severityNames[severity].one : severityNames[severity].many}`

  const summary = groups.map(group => countText(group.severity, group.issues.length)).join(', ')
  const hasErrors = groups.some(group => group.severity === 'error')

  return (
    <section className="panel data-health">
      <div className="data-health-header">
        <h2>Data health</h2>
        <button type="button" className="link-button" onClick={onReload}>
          Read the spreadsheet again
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="muted">No problems found in the spreadsheet.</p>
      ) : (
        <details open={hasErrors}>
          <summary>
            {summary}
            {hasErrors && <span className="muted"> · rows with errors are left out of the figures</span>}
          </summary>
          {groups.map(group => (
            <div key={group.severity} className="issue-group">
              <h3 className="issue-group-heading">{severityNames[group.severity].many}</h3>
              <IssueList issues={group.issues} tabLinks={tabLinks} />
            </div>
          ))}
        </details>
      )}
    </section>
  )
}
