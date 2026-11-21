import { useEffect, useState, type ReactNode } from 'react'
import type { Month } from '../../domain/types'
import { displayLongMonth } from '../../format'
import { routeHash, type Route } from '../../routing/route'
import { Icon } from './Icon'
import type { LedgerSummary } from './ledgerSummary'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  route: Route
  hasSpreadsheet: boolean
  // Null while the spreadsheet is read, or before one is chosen.
  summary: LedgerSummary | null
  account: ReactNode
  hideAmounts: boolean
  onHideAmountsChange: (hide: boolean) => void
  children: ReactNode
}

const recordPages: ReadonlySet<Route['page']> = new Set(['close', 'months', 'edit', 'portfolio'])

// The frame of every page once signed in: the menu, and a top bar with the page's name and the Hide amounts switch.
export function AppShell({ route, hasSpreadsheet, summary, account, hideAmounts, onHideAmountsChange, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuHash, setMenuHash] = useState(routeHash(route))
  const title = pageTitle(route, summary?.monthToClose ?? null)
  const hash = routeHash(route)

  // Any move to another page closes the menu, the back button included.
  if (hash !== menuHash) {
    setMenuHash(hash)
    setMenuOpen(false)
  }

  useEffect(() => {
    document.title = `${title} · fin-dash`
  }, [title])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])

  useEffect(() => {
    if (!menuOpen)
      return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        setMenuOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div className="shell">
      <Sidebar
        route={route}
        hasSpreadsheet={hasSpreadsheet}
        summary={summary}
        open={menuOpen}
        account={account}
        onNavigate={() => setMenuOpen(false)}
      />
      {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}

      <div className="shell-main">
        <header className="top-bar">
          <button
            type="button"
            className="icon-button menu-button"
            aria-label="Open menu"
            aria-controls="app-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <p className="top-bar-title">
            {recordPages.has(route.page) && <span className="top-bar-section">Record / </span>}
            <strong>{title}</strong>
          </p>
          <label className="switch">
            <input type="checkbox" checked={hideAmounts} onChange={event => onHideAmountsChange(event.target.checked)} />
            Hide amounts
          </label>
          <button
            type="button"
            className="icon-button eye-button"
            aria-label="Hide amounts"
            aria-pressed={hideAmounts}
            onClick={() => onHideAmountsChange(!hideAmounts)}
          >
            <Icon name={hideAmounts ? 'eyeOff' : 'eye'} />
          </button>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}

function pageTitle(route: Route, monthToClose: Month | null): string {
  switch (route.page) {
    case 'home':
      return 'Home'
    case 'close':
      return monthToClose === null ? 'Close a month' : `Close ${displayLongMonth(monthToClose)}`
    case 'months':
      return 'Months'
    case 'edit':
      return `Edit ${displayLongMonth(route.month)}`
    case 'portfolio':
      return 'Portfolio'
    case 'health':
      return 'Data health'
    case 'setup':
      return 'Setup and spreadsheet'
  }
}
