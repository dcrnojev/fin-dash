import { potFigure } from '../../calc/monthFigure'
import { monthByPot, type ByPotKind } from '../../calc/monthByPot'
import type { SnapshotHistory } from '../../calc/snapshotHistory'
import type { Month, Person } from '../../domain/types'
import { displayFigure, displayMonthName } from '../../format'
import { ownerName } from '../../pots/ownerName'
import { routeHash } from '../../routing/route'
import { ChangeText } from '../ChangeText'
import { seriesColor } from '../charts/seriesColor'

const kindNames: Record<ByPotKind, string> = { cash: 'Cash', investment: 'Investments', pension: 'Pension' }

interface ByPotPanelProps {
  history: SnapshotHistory
  month: Month
  people: readonly Person[]
  hideAmounts: boolean
}

// The month's value of every pot, grouped like the charts and coloured like them.
export function ByPotPanel({ history, month, people, hideAmounts }: ByPotPanelProps) {
  const groups = monthByPot(history, month)

  return (
    <section className="card by-pot">
      <h2>{displayMonthName(month)} by pot</h2>

      {groups.map(group => (
        <div key={group.kind} className="by-pot-group">
          <h3 className="by-pot-heading">
            <span>
              {kindNames[group.kind]}
              {group.kind === 'pension' && <span className="tag">Locked, not in totals</span>}
            </span>
            <span className="number">{group.total === null ? 'unknown' : displayFigure(group.total, hideAmounts)}</span>
          </h3>

          <ul>
            {group.pots.map(line => (
              <li key={line.pot.id} className="by-pot-line">
                <span className="swatch" style={{ background: seriesColor(line.position) }} />
                <span className="by-pot-name">{line.pot.label}</span>
                <span className="by-pot-value number">{line.value === null ? 'unknown' : displayFigure(potFigure(line.value), hideAmounts)}</span>
                <span className="by-pot-owner">
                  {ownerName(line.pot.owner, people)}
                  {line.value?.quality === 'estimated' && ' · estimated'}
                </span>
                <ChangeText amount={null} ratio={line.changeRatio} hideAmounts={hideAmounts} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <a className="by-pot-more" href={routeHash({ page: 'pots' })}>
        Manage pots and holdings
      </a>
    </section>
  )
}
