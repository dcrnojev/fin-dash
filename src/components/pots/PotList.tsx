import type { Holding, Person, Pot, PotKind } from '../../domain/types'
import { displayMonth } from '../../format'
import { ownerName } from '../../pots/ownerName'

const kindHeadings: Record<PotKind, string> = { cash: 'Cash', investment: 'Investments', pension: 'Pension', loan: 'Loans' }
const kindOrder: readonly PotKind[] = ['cash', 'investment', 'pension', 'loan']

interface PotListProps {
  pots: readonly Pot[]
  holdings: readonly Holding[]
  people: readonly Person[]
}

export function PotList({ pots, holdings, people }: PotListProps) {
  const groups = kindOrder
    .map(kind => ({ kind, pots: pots.filter(pot => pot.kind === kind).sort((a, b) => a.sort - b.sort) }))
    .filter(group => group.pots.length > 0)

  if (groups.length === 0)
    return <p className="panel muted">The spreadsheet has no pots yet.</p>

  return (
    <>
      {groups.map(group => (
        <section key={group.kind} className="panel">
          <h3>{kindHeadings[group.kind]}</h3>
          <ul className="pot-list">
            {group.pots.map(pot => (
              <PotItem key={pot.id} pot={pot} holdings={holdings.filter(holding => holding.pot === pot.id)} people={people} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function PotItem({ pot, holdings, people }: { pot: Pot; holdings: readonly Holding[]; people: readonly Person[] }) {
  const details = [ownerName(pot.owner, people), pot.provider, pot.liquidity].filter(detail => detail !== null)

  return (
    <li className="pot-item">
      <div className="pot-heading">
        <strong>{pot.label}</strong>
        <span className="muted">{details.join(' · ')}</span>
      </div>
      <p className="muted">{spanText(pot)}</p>

      <HoldingList holdings={holdings} people={people} />
    </li>
  )
}

function HoldingList({ holdings, people }: { holdings: readonly Holding[]; people: readonly Person[] }) {
  if (holdings.length === 0)
    return null

  return (
    <ul className="holding-list">
      {holdings.map(holding => (
        <li key={holding.id}>
          <span>
            {holding.label}
            {holding.code && <span className="muted"> ({holding.code})</span>}
          </span>
          <span className="muted">
            {ownerName(holding.owner, people)} · {spanText(holding)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function spanText({ opened, closed }: Pick<Pot, 'opened' | 'closed'>): string {
  const openedText = opened === null ? 'no opened month' : `opened ${displayMonth(opened)}`

  return closed === null ? `${openedText}, open` : `${openedText}, closed ${displayMonth(closed)}`
}
