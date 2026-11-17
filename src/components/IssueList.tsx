import type { Issue } from '../domain/types'

const severityLabels: Record<Issue['severity'], string> = { error: 'Error', warning: 'Warning', info: 'Note' }

interface IssueListProps {
  issues: readonly Issue[]
  // Links that open a tab of the spreadsheet; without one the tab name is plain text.
  tabLinks?: Readonly<Record<string, string>>
}

export function IssueList({ issues, tabLinks = {} }: IssueListProps) {
  return (
    <ul className="issue-list">
      {issues.map((issue, index) => {
        const tabLink = tabLinks[issue.tab]

        return (
          <li key={index} className={`issue issue-${issue.severity}`}>
            <span className="issue-severity">{severityLabels[issue.severity]}</span>
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
            <span className="issue-message">{issue.message}</span>
          </li>
        )
      })}
    </ul>
  )
}
