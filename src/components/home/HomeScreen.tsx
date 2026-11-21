import { useMemo } from 'react'
import { headlineFigures } from '../../calc/headlineFigures'
import { snapshotHistory } from '../../calc/snapshotHistory'
import { editableMonths } from '../../close/editableMonths'
import type { Ledger, Month } from '../../domain/types'
import { displayLongMonth, displayMonthName } from '../../format'
import { issueCounts } from '../../ledger/issueCounts'
import { routeHash } from '../../routing/route'
import { HeadlineTiles } from '../HeadlineTiles'
import { PageHeader } from '../PageHeader'
import { ByPotPanel } from './ByPotPanel'
import { HealthStrip } from './HealthStrip'
import { HistoryChartCard } from './HistoryChartCard'

interface HomeScreenProps {
  ledger: Ledger
  monthToClose: Month | null
  // False for a spreadsheet the app shows read-only, which offers no way to change it.
  canWrite: boolean
  hideAmounts: boolean
}

export function HomeScreen({ ledger, monthToClose, canWrite, hideAmounts }: HomeScreenProps) {
  const history = useMemo(() => snapshotHistory(ledger), [ledger])
  const figures = useMemo(() => headlineFigures(history), [history])
  // Edit pages exist only where the app can write.
  const editable = useMemo(() => new Set(canWrite ? editableMonths(ledger.months) : []), [ledger, canWrite])

  const openMonth = monthToClose === null ? '' : ` ${displayMonthName(monthToClose)} is open.`
  const description = figures === null ? 'The spreadsheet has no snapshots yet.' : `Figures to the end of ${displayLongMonth(figures.month)}.${openMonth}`

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
          <HeadlineTiles figures={figures} history={history} hideAmounts={hideAmounts} />
          <div className="home-columns">
            <HistoryChartCard history={history} editableMonths={editable} hideAmounts={hideAmounts} />
            <ByPotPanel history={history} month={figures.month} people={ledger.people} hideAmounts={hideAmounts} />
          </div>
        </>
      )}
    </>
  )
}
