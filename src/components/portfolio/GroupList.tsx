import { useState, type ReactNode } from 'react'
import type { Balance, BalanceId, Group, GroupId, GroupKind, Ledger, Person } from '../../domain/types'
import { displayMonth } from '../../format'
import { ownerName } from '../../portfolio/ownerName'
import { EditBalanceForm } from './EditBalanceForm'
import { EditGroupForm } from './EditGroupForm'

const kindHeadings: Record<GroupKind, string> = { cash: 'Cash', investment: 'Investments', pension: 'Pension', loan: 'Loans' }
const kindOrder: readonly GroupKind[] = ['cash', 'investment', 'pension', 'loan']

type Editing = { kind: 'group'; id: GroupId } | { kind: 'balance'; id: BalanceId } | null

interface GroupListProps {
  ledger: Ledger
  spreadsheetId: string
  onSaved: (message: string) => void
  onReread: () => void
}

// Only one group or balance is edited at a time; choosing another edit drops the open form.
export function GroupList({ ledger, spreadsheetId, onSaved, onReread }: GroupListProps) {
  const [editing, setEditing] = useState<Editing>(null)
  const { groups, balances, people } = ledger

  const sections = kindOrder
    .map(kind => ({ kind, groups: groups.filter(group => group.kind === kind).sort((a, b) => a.sort - b.sort) }))
    .filter(section => section.groups.length > 0)

  if (sections.length === 0)
    return <p className="panel muted">The spreadsheet has no groups yet.</p>

  const editProps = { people, spreadsheetId, onSaved, onCancel: () => setEditing(null), onReread }

  return (
    <>
      {sections.map(section => (
        <section key={section.kind} className="panel">
          <h3>{kindHeadings[section.kind]}</h3>
          <ul className="group-list">
            {section.groups.map(group => (
              <li key={group.id} className="group-item">
                {editing?.kind === 'group' && editing.id === group.id ? (
                  <EditGroupForm group={group} rows={ledger} {...editProps} />
                ) : (
                  <GroupSummary group={group} people={people} onEdit={() => setEditing({ kind: 'group', id: group.id })} />
                )}

                <BalanceList
                  balances={balances.filter(balance => balance.group === group.id)}
                  people={people}
                  editingId={editing?.kind === 'balance' ? editing.id : null}
                  renderEditForm={balance => <EditBalanceForm balance={balance} rows={ledger} {...editProps} />}
                  onEdit={id => setEditing({ kind: 'balance', id })}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function GroupSummary({ group, people, onEdit }: { group: Group; people: readonly Person[]; onEdit: () => void }) {
  const details = [ownerName(group.owner, people), group.provider, group.liquidity].filter(detail => detail !== null)

  return (
    <>
      <div className="group-heading">
        <strong>{group.label}</strong>
        <span className="muted">{details.join(' · ')}</span>
        <EditButton label={group.label} onClick={onEdit} />
      </div>
      <p className="muted">{spanText(group)}</p>
    </>
  )
}

interface BalanceListProps {
  balances: readonly Balance[]
  people: readonly Person[]
  editingId: BalanceId | null
  renderEditForm: (balance: Balance) => ReactNode
  onEdit: (id: BalanceId) => void
}

function BalanceList({ balances, people, editingId, renderEditForm, onEdit }: BalanceListProps) {
  if (balances.length === 0)
    return null

  return (
    <ul className="balance-list">
      {balances.map(balance => (
        <li key={balance.id}>
          {balance.id === editingId ? (
            renderEditForm(balance)
          ) : (
            <>
              <span>
                {balance.label}
                {balance.code && <span className="muted"> ({balance.code})</span>}
              </span>
              <span className="muted">
                {ownerName(balance.owner, people)} · {spanText(balance)}
              </span>
              <EditButton label={balance.label} onClick={() => onEdit(balance.id)} />
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

function spanText({ opened, closed }: Pick<Group, 'opened' | 'closed'>): string {
  const openedText = opened === null ? 'no opened month' : `opened ${displayMonth(opened)}`

  return closed === null ? `${openedText}, open` : `${openedText}, closed ${displayMonth(closed)}`
}
