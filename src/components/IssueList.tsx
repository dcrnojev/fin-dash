import type { Issue } from '../domain/types'
import { SeverityChip } from './SeverityChip'

interface IssueListProps {
  issues: readonly Issue[]
  // Links that open a tab of the spreadsheet; without one the tab name is plain text.
  tabLinks?: Readonly<Record<string, string>>
  // Shows each issue's code instead of its message; scrubbing digits out of messages would leak any amount phrased otherwise.
  hideMessages?: boolean
}

export function IssueList({ issues, tabLinks = {}, hideMessages = false }: IssueListProps) {
  return (
    <ul className="issue-list">
      {issues.map((issue, index) => {
        const tabLink = tabLinks[issue.tab]

        return (
          <li key={index} className="issue">
            <SeverityChip severity={issue.severity} />
            <span className="issue-place">
              {tabLink ? (
                <a href={tabLink} target="_blank" rel="noreferrer">
                  {issue.tab}
                </a>
              ) : (
                issue.tab
              )}
              {issue.row !== null && ` · row ${issue.row}`}
              {issue.column !== null && ` · ${issue.column}`}
            </span>
            {hideMessages ? (
              <span className="issue-message">
                <code>{issue.code}</code>
                <span className="muted"> · message hidden with the amounts</span>
              </span>
            ) : (
              <span className="issue-message">{issue.message}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
