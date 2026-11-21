import type { ReactNode } from 'react'
import { countOf, displayMonthName } from '../../format'
import { routeHash, type Route } from '../../routing/route'
import { Icon, type IconName } from './Icon'
import type { LedgerSummary } from './ledgerSummary'

interface SidebarProps {
  route: Route
  // False until a spreadsheet is chosen, which leaves only Setup to open.
  hasSpreadsheet: boolean
  // Null while the spreadsheet is read.
  summary: LedgerSummary | null
  open: boolean
  account: ReactNode
  onNavigate: () => void
}

const soonItems: { group: string; items: { label: string; icon: IconName }[] }[] = [
  {
    group: 'Plan',
    items: [
      { label: 'Bills', icon: 'bills' },
      { label: 'Plan and forecast', icon: 'plan' },
      { label: 'Plan versus actual', icon: 'planVersusActual' },
      { label: 'Projections', icon: 'projections' },
    ],
  },
  {
    group: 'Insight',
    items: [
      { label: 'Spending insight', icon: 'spending' },
      { label: 'Copy for AI', icon: 'copy' },
    ],
  },
]

// The app's menu: a column on wide screens, a drawer from the top bar on phones.
export function Sidebar({ route, hasSpreadsheet, summary, open, account, onNavigate }: SidebarProps) {
  // Editing a month belongs to Months.
  const currentPage = route.page === 'edit' ? 'months' : route.page
  const monthToClose = summary?.monthToClose ?? null

  const item = (target: Route, label: string, icon: IconName, enabled: boolean, badge?: ReactNode) => (
    <NavItem
      href={enabled ? routeHash(target) : null}
      label={label}
      icon={icon}
      current={currentPage === target.page}
      badge={badge}
      onNavigate={onNavigate}
    />
  )

  return (
    <aside id="app-menu" className={open ? 'sidebar sidebar-open' : 'sidebar'} aria-label="Main menu">
      <div className="brand">
        <span className="brand-logo">
          <Icon name="trend" />
        </span>
        fin-dash
      </div>

      <nav className="nav">
        {item({ page: 'home' }, 'Home', 'home', hasSpreadsheet)}

        <p className="nav-group">Record</p>
        {item(
          { page: 'close' },
          monthToClose === null ? 'Close a month' : `Close ${displayMonthName(monthToClose)}`,
          'close',
          hasSpreadsheet && summary !== null && summary.canWrite && monthToClose !== null,
          summary?.closeDue && <span className="due-badge">Due</span>
        )}
        {item({ page: 'months' }, 'Months', 'months', hasSpreadsheet)}
        {item({ page: 'portfolio' }, 'Portfolio', 'portfolio', hasSpreadsheet && summary?.canWrite !== false)}

        {soonItems.map(({ group, items }) => (
          <div key={group}>
            <p className="nav-group">{group}</p>
            {items.map(soon => (
              <NavItem key={soon.label} href={null} label={soon.label} icon={soon.icon} current={false} badge={<span className="soon">Soon</span>} />
            ))}
          </div>
        ))}
      </nav>

      <nav className="nav nav-foot" aria-label="Spreadsheet">
        {item({ page: 'health' }, 'Data health', 'health', hasSpreadsheet, summary && <IssueBadges summary={summary} />)}
        {item({ page: 'setup' }, 'Setup and spreadsheet', 'setup', true)}
        {account}
      </nav>
    </aside>
  )
}

interface NavItemProps {
  // Null for an entry that cannot be opened now, or not yet at all.
  href: string | null
  label: string
  icon: IconName
  current: boolean
  badge?: ReactNode
  onNavigate?: () => void
}

function NavItem({ href, label, icon, current, badge, onNavigate }: NavItemProps) {
  const content = (
    <>
      <Icon name={icon} />
      <span className="nav-label">{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </>
  )

  if (href === null)
    return <span className="nav-item" aria-disabled="true">{content}</span>

  return (
    <a className="nav-item" href={href} aria-current={current ? 'page' : undefined} onClick={onNavigate}>
      {content}
    </a>
  )
}

function IssueBadges({ summary }: { summary: LedgerSummary }) {
  const { error, warning } = summary.issueCounts

  if (error === 0 && warning === 0)
    return null

  return (
    <span className="issue-badges">
      {error > 0 && (
        <b className="issue-badge-error" title={countOf(error, 'error')}>
          {error}
        </b>
      )}
      {warning > 0 && (
        <b className="issue-badge-warning" title={countOf(warning, 'warning')}>
          {warning}
        </b>
      )}
    </span>
  )
}
