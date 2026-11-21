import { useMemo, type ReactNode } from 'react'
import { monthEndHistory } from '../../calc/monthEndHistory'
import type { MonthFigure } from '../../calc/monthFigure'
import { monthRows, type MonthRow } from '../../calc/monthRows'
import { editableMonths } from '../../close/editableMonths'
import type { Ledger, Month } from '../../domain/types'
import { displayFigure, displayLongMonth, displayMonthName } from '../../format'
import { routeHash, type Route } from '../../routing/route'
import { navigate } from '../../routing/useRoute'
import { ChangeText } from '../ChangeText'
import { PageHeader } from '../PageHeader'

interface MonthsScreenProps {
  ledger: Ledger
  monthToClose: Month | null
  canWrite: boolean
  hideAmounts: boolean
}

// Every month with its status and totals; a closed or legacy month opens its edit page.
export function MonthsScreen({ ledger, monthToClose, canWrite, hideAmounts }: MonthsScreenProps) {
  const rows = useMemo(() => monthRows(monthEndHistory(ledger), ledger.months, monthToClose), [ledger, monthToClose])
  const editable = useMemo(() => new Set(canWrite ? editableMonths(ledger.months) : []), [ledger, canWrite])
  const canClose = canWrite && monthToClose !== null
  const rowRoute = (row: MonthRow): Route | null => rowTarget(row, editable, canClose && row.month === monthToClose)

  return (
    <>
      <PageHeader
        title="Months"
        description={canWrite ? 'Every month in the spreadsheet. Open a closed month to change its values.' : 'Every month in the spreadsheet.'}
        actions={
          canClose && (
            <a className="button primary-button" href={routeHash({ page: 'close' })}>
              Close {displayMonthName(monthToClose)}
            </a>
          )
        }
      />

      {rows.length === 0 ? (
        <p className="card card-padded muted">The spreadsheet has no months yet.</p>
      ) : (
        <div className="table-scroller">
          <table className="months-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Status</th>
                <th scope="col" className="number">
                  Cash
                </th>
                <th scope="col" className="number">
                  Investments
                </th>
                <th scope="col" className="number">
                  Cash and investments
                </th>
                <th scope="col" className="number">
                  vs prev.
                </th>
                <th scope="col" className="number">
                  Pension
                </th>
                <th scope="col">
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <RowLink key={row.month} route={rowRoute(row)}>
                  <th scope="row">{displayLongMonth(row.month)}</th>
                  <td>
                    <span className={`status status-${row.status}`}>{row.status}</span>
                  </td>
                  <FigureCell figure={row.cash} hideAmounts={hideAmounts} />
                  <FigureCell figure={row.investments} hideAmounts={hideAmounts} />
                  <FigureCell figure={row.combined} hideAmounts={hideAmounts} total />
                  <td className="number">
                    {row.change && (
                      <ChangeText amount={row.change.amount} ratio={row.change.ratio} estimated={row.changeIsEstimated} percentOnly hideAmounts={hideAmounts} />
                    )}
                  </td>
                  <FigureCell figure={row.pensions} hideAmounts={hideAmounts} />
                  <td>
                    <RowAction route={rowRoute(row)} />
                  </td>
                </RowLink>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="chart-note">≈ estimated between two measured months; ≥ at least, where a group cannot be estimated. Pension stays out of the totals.</p>
    </>
  )
}

function FigureCell({ figure, hideAmounts, total = false }: { figure: MonthFigure | null; hideAmounts: boolean; total?: boolean }) {
  const classes = ['number', total ? 'total-cell' : '', figure === null ? '' : `figure-${figure.state}`].filter(Boolean).join(' ')

  return <td className={classes}>{figure === null ? '' : displayFigure(figure, hideAmounts)}</td>
}

// Where a row leads: a closed or legacy month to its edit page, the month to close to the close page.
function rowTarget(row: MonthRow, editable: ReadonlySet<Month>, isMonthToClose: boolean): Route | null {
  if (editable.has(row.month))
    return { page: 'edit', month: row.month }

  return isMonthToClose ? { page: 'close' } : null
}

// The whole row answers a click; the link in its last cell is what a keyboard reaches.
function RowLink({ route, children }: { route: Route | null; children: ReactNode }) {
  if (route === null)
    return <tr>{children}</tr>

  return (
    <tr className="clickable-row" onClick={() => navigate(route)}>
      {children}
    </tr>
  )
}

function RowAction({ route }: { route: Route | null }) {
  if (route === null)
    return null

  return <a href={routeHash(route)}>{route.page === 'close' ? 'Close' : 'Edit'}</a>
}
