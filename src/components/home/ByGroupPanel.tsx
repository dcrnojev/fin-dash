import { groupFigure } from '../../calc/monthFigure'
import { monthByGroup, type ByGroupKind } from '../../calc/monthByGroup'
import type { MonthEndHistory } from '../../calc/monthEndHistory'
import type { Month, Person } from '../../domain/types'
import { displayFigure, displayMonthName } from '../../format'
import { ownerName } from '../../portfolio/ownerName'
import { routeHash } from '../../routing/route'
import { ChangeText } from '../ChangeText'
import { seriesColor } from '../charts/seriesColor'

const kindNames: Record<ByGroupKind, string> = { cash: 'Cash', investment: 'Investments', pension: 'Pension' }

interface ByGroupPanelProps {
  history: MonthEndHistory
  month: Month
  people: readonly Person[]
  hideAmounts: boolean
}

// The month's value of every group, by kind like the charts and coloured like them.
export function ByGroupPanel({ history, month, people, hideAmounts }: ByGroupPanelProps) {
  const sections = monthByGroup(history, month)

  return (
    <section className="card by-group">
      <h2>{displayMonthName(month)} by group</h2>

      {sections.map(section => (
        <div key={section.kind} className="by-group-kind">
          <h3 className="by-group-heading">
            <span>
              {kindNames[section.kind]}
              {section.kind === 'pension' && <span className="tag">Locked, not in totals</span>}
            </span>
            <span className="number">{section.total === null ? 'unknown' : displayFigure(section.total, hideAmounts)}</span>
          </h3>

          <ul>
            {section.groups.map(line => (
              <li key={line.group.id} className="by-group-line">
                <span className="swatch" style={{ background: seriesColor(line.position) }} />
                <span className="by-group-name">{line.group.label}</span>
                <span className="by-group-value number">{line.value === null ? 'unknown' : displayFigure(groupFigure(line.value), hideAmounts)}</span>
                <span className="by-group-owner">
                  {ownerName(line.group.owner, people)}
                  {line.value?.quality === 'estimated' && ' · estimated'}
                </span>
                <ChangeText amount={null} ratio={line.changeRatio} hideAmounts={hideAmounts} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <a className="by-group-more" href={routeHash({ page: 'portfolio' })}>
        Manage groups and balances
      </a>
    </section>
  )
}
