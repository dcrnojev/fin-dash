import { useMemo } from 'react'
import { goalProgress } from '../../calc/goalProgress'
import { goalTargets } from '../../calc/goalTargets'
import { headlineFigures } from '../../calc/headlineFigures'
import { monthEndHistory } from '../../calc/monthEndHistory'
import { editableMonths } from '../../close/editableMonths'
import type { Cents, Ledger, Month } from '../../domain/types'
import { displayLongMonth, displayMonthName } from '../../format'
import { issueCounts } from '../../ledger/issueCounts'
import { routeHash } from '../../routing/route'
import { HeadlineTiles } from '../HeadlineTiles'
import { GoalTile } from '../goal/GoalTile'
import { PageHeader } from '../PageHeader'
import { ByGroupPanel } from './ByGroupPanel'
import { HealthStrip } from './HealthStrip'
import { HistoryChartCard } from './HistoryChartCard'

interface HomeScreenProps {
  ledger: Ledger
  monthToClose: Month | null
  // False for a spreadsheet the app shows read-only, which offers no way to change it.
  canWrite: boolean
  spreadsheetId: string
  hideAmounts: boolean
  onGoalSaved: (message: string) => void
}

const noGoalTargets: ReadonlyMap<Month, Cents> = new Map()

export function HomeScreen({ ledger, monthToClose, canWrite, spreadsheetId, hideAmounts, onGoalSaved }: HomeScreenProps) {
  const history = useMemo(() => monthEndHistory(ledger), [ledger])
  const figures = useMemo(() => headlineFigures(history), [history])
  const goal = ledger.meta?.monthlySavingsGoal ?? null
  const targets = useMemo(() => (goal === null ? noGoalTargets : goalTargets(history.combined, goal)), [history, goal])
  // Edit pages exist only where the app can write.
  const editable = useMemo(() => new Set(canWrite ? editableMonths(ledger.months) : []), [ledger, canWrite])

  const openMonth = monthToClose === null ? '' : ` ${displayMonthName(monthToClose)} is open.`
  const description = figures === null ? 'The spreadsheet has no month-end balances yet.' : `Figures to the end of ${displayLongMonth(figures.month)}.${openMonth}`

  return (
    <>
      <PageHeader
        title="Home"
        description={description}
        actions={
          canWrite &&
          monthToClose !== null && (
            <a className="button primary-button" href={routeHash({ page: 'close' })}>
              Close {displayMonthName(monthToClose)}
            </a>
          )
        }
      />

      <HealthStrip counts={issueCounts(ledger.issues)} />

      {figures !== null && (
        <>
          <HeadlineTiles
            figures={figures}
            history={history}
            hideAmounts={hideAmounts}
            extraTile={
              (goal !== null || canWrite) && (
                <GoalTile
                  goal={goal}
                  progress={goal === null ? null : goalProgress(history.combined, figures.month, goal)}
                  month={figures.month}
                  monthIsEstimated={figures.combined.estimatedTotal !== null}
                  spreadsheetId={canWrite ? spreadsheetId : null}
                  hideAmounts={hideAmounts}
                  onSaved={onGoalSaved}
                />
              )
            }
          />
          <div className="home-columns">
            <HistoryChartCard history={history} editableMonths={editable} hideAmounts={hideAmounts} goalTargets={targets} />
            <ByGroupPanel history={history} month={figures.month} people={ledger.people} hideAmounts={hideAmounts} />
          </div>
        </>
      )}
    </>
  )
}
