import { useMemo } from 'react'
import { headlineFigures } from '../calc/headlineFigures'
import { snapshotHistory } from '../calc/snapshotHistory'
import type { Ledger } from '../domain/types'
import { useHideAmounts } from '../useHideAmounts'
import { CashChart } from './charts/CashChart'
import { CombinedChart } from './charts/CombinedChart'
import { InvestmentsChart } from './charts/InvestmentsChart'
import { HeadlineTiles } from './HeadlineTiles'

interface SnapshotHistoryViewProps {
  ledger: Ledger
}

export function SnapshotHistoryView({ ledger }: SnapshotHistoryViewProps) {
  const [hideAmounts, setHideAmounts] = useHideAmounts()
  const history = useMemo(() => snapshotHistory(ledger), [ledger])
  const figures = useMemo(() => headlineFigures(history), [history])

  return (
    <section className="history">
      <div className="history-header">
        <h2>Snapshot history</h2>
        <label className="toggle">
          <input type="checkbox" checked={hideAmounts} onChange={event => setHideAmounts(event.target.checked)} />
          Hide amounts
        </label>
      </div>

      {figures === null ? (
        <p className="panel muted">The spreadsheet has no snapshots yet.</p>
      ) : (
        <>
          <HeadlineTiles figures={figures} hideAmounts={hideAmounts} />
          <CashChart history={history.cash} hideAmounts={hideAmounts} />
          <InvestmentsChart history={history.investments} hideAmounts={hideAmounts} />
          <CombinedChart months={history.combined} hideAmounts={hideAmounts} />
        </>
      )}
    </section>
  )
}
