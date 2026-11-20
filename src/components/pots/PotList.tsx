import { useState, type ReactNode } from 'react'
import type { Holding, HoldingId, Ledger, Person, Pot, PotId, PotKind } from '../../domain/types'
import { displayMonth } from '../../format'
import { ownerName } from '../../pots/ownerName'
import { EditHoldingForm } from './EditHoldingForm'
import { EditPotForm } from './EditPotForm'

const kindHeadings: Record<PotKind, string> = { cash: 'Cash', investment: 'Investments', pension: 'Pension', loan: 'Loans' }
const kindOrder: readonly PotKind[] = ['cash', 'investment', 'pension', 'loan']

type Editing = { kind: 'pot'; id: PotId } | { kind: 'holding'; id: HoldingId } | null

interface PotListProps {
  ledger: Ledger
  spreadsheetId: string
  onSaved: (message: string) => void
  onReread: () => void
}

// Only one pot or holding is edited at a time; choosing another edit drops the open form.
export function PotList({ ledger, spreadsheetId, onSaved, onReread }: PotListProps) {
  const [editing, setEditing] = useState<Editing>(null)
  const { pots, holdings, people } = ledger

  const groups = kindOrder
    .map(kind => ({ kind, pots: pots.filter(pot => pot.kind === kind).sort((a, b) => a.sort - b.sort) }))
    .filter(group => group.pots.length > 0)

  if (groups.length === 0)
    return <p className="panel muted">The spreadsheet has no pots yet.</p>

  const editProps = { people, spreadsheetId, onSaved, onCancel: () => setEditing(null), onReread }

  return (
    <>
      {groups.map(group => (
        <section key={group.kind} className="panel">
          <h3>{kindHeadings[group.kind]}</h3>
          <ul className="pot-list">
            {group.pots.map(pot => (
              <li key={pot.id} className="pot-item">
                {editing?.kind === 'pot' && editing.id === pot.id ? (
                  <EditPotForm pot={pot} rows={ledger} {...editProps} />
                ) : (
                  <PotSummary pot={pot} people={people} onEdit={() => setEditing({ kind: 'pot', id: pot.id })} />
                )}

                <HoldingList
                  holdings={holdings.filter(holding => holding.pot === pot.id)}
                  people={people}
                  editingId={editing?.kind === 'holding' ? editing.id : null}
                  renderEditForm={holding => <EditHoldingForm holding={holding} rows={ledger} {...editProps} />}
                  onEdit={id => setEditing({ kind: 'holding', id })}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function PotSummary({ pot, people, onEdit }: { pot: Pot; people: readonly Person[]; onEdit: () => void }) {
  const details = [ownerName(pot.owner, people), pot.provider, pot.liquidity].filter(detail => detail !== null)

  return (
    <>
      <div className="pot-heading">
        <strong>{pot.label}</strong>
        <span className="muted">{details.join(' · ')}</span>
        <EditButton label={pot.label} onClick={onEdit} />
      </div>
      <p className="muted">{spanText(pot)}</p>
    </>
  )
}

interface HoldingListProps {
  holdings: readonly Holding[]
  people: readonly Person[]
  editingId: HoldingId | null
  renderEditForm: (holding: Holding) => ReactNode
  onEdit: (id: HoldingId) => void
}

function HoldingList({ holdings, people, editingId, renderEditForm, onEdit }: HoldingListProps) {
  if (holdings.length === 0)
    return null

  return (
    <ul className="holding-list">
      {holdings.map(holding => (
        <li key={holding.id}>
          {holding.id === editingId ? (
            renderEditForm(holding)
          ) : (
            <>
              <span>
                {holding.label}
                {holding.code && <span className="muted"> ({holding.code})</span>}
              </span>
              <span className="muted">
                {ownerName(holding.owner, people)} · {spanText(holding)}
              </span>
              <EditButton label={holding.label} onClick={() => onEdit(holding.id)} />
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="link-button" onClick={onClick} aria-label={`Edit ${label}`}>
      Edit
    </button>
  )
}

function spanText({ opened, closed }: Pick<Pot, 'opened' | 'closed'>): string {
  const openedText = opened === null ? 'no opened month' : `opened ${displayMonth(opened)}`

  return closed === null ? `${openedText}, open` : `${openedText}, closed ${displayMonth(closed)}`
}
