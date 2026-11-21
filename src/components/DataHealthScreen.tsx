import type { Issue } from '../domain/types'
import { IssueList } from './IssueList'
import { PageHeader } from './PageHeader'

const severityOrder: Issue['severity'][] = ['error', 'warning', 'info']
const severityHeadings: Record<Issue['severity'], string> = { error: 'Errors', warning: 'Warnings', info: 'Notes' }

interface DataHealthScreenProps {
  issues: readonly Issue[]
  tabLinks: Readonly<Record<string, string>>
  // Messages can quote amounts, so they are hidden with them; where each issue is stays visible.
  hideAmounts: boolean
  onReload: () => void
}

// What the validator found in the spreadsheet, errors first. Rows with errors are left out of the figures.
export function DataHealthScreen({ issues, tabLinks, hideAmounts, onReload }: DataHealthScreenProps) {
  const groups = severityOrder
    .map(severity => ({ severity, issues: issues.filter(issue => issue.severity === severity) }))
    .filter(group => group.issues.length > 0)

  const hasErrors = groups.some(group => group.severity === 'error')

  return (
    <>
      <PageHeader
        title="Data health"
        description={
          hasErrors
            ? 'Rows in the spreadsheet that need attention; rows with errors are left out of the figures. Fix them in the sheet, then read it again.'
            : 'Rows in the spreadsheet that need attention. Fix them in the sheet, then read it again.'
        }
        actions={
          <button type="button" onClick={onReload}>
            Read the spreadsheet again
          </button>
        }
      />

      {groups.length === 0 ? (
        <p className="card card-padded muted">No problems found in the spreadsheet.</p>
      ) : (
        groups.map(group => (
          <section key={group.severity} className="card card-padded issue-group">
            <h2>
              {severityHeadings[group.severity]} <span className="muted">{group.issues.length}</span>
            </h2>
            <IssueList issues={group.issues} tabLinks={tabLinks} hideMessages={hideAmounts} />
          </section>
        ))
      )}
    </>
  )
}
