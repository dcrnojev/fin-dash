import { useId, useState, type FormEvent } from 'react'
import { householdOwner } from '../../domain/ids'
import { parseMonth } from '../../domain/month'
import { balancesTab } from '../../domain/schema/balancesTab'
import type { Balance, BalanceId, Group, GroupId, Month, OwnerId, Person } from '../../domain/types'
import { appendWithUnusedId } from '../../portfolio/appendWithUnusedId'
import { balanceOpenedProblem } from '../../portfolio/balanceOpenedProblem'
import { newBalance } from '../../portfolio/newBalance'
import { OwnerSelect } from './OwnerSelect'

interface AddBalanceFormProps {
  spreadsheetId: string
  groups: readonly Group[]
  balances: readonly Balance[]
  people: readonly Person[]
  // The month the next close asks about: the opened month the form starts with, and the earliest it takes.
  monthToClose: Month | null
  onAdded: (message: string) => void
}

// A month is closed per balance only for investment groups, so only those are offered.
export function AddBalanceForm({ spreadsheetId, groups, balances, people, monthToClose, onAdded }: AddBalanceFormProps) {
  const openInvestmentGroups = groups.filter(group => group.kind === 'investment' && group.closed === null).sort((a, b) => a.sort - b.sort)
  const [groupId, setGroupId] = useState<GroupId | ''>(openInvestmentGroups[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const [owner, setOwner] = useState<OwnerId>(householdOwner)
  const [code, setCode] = useState('')
  const [opened, setOpened] = useState<string>(monthToClose ?? '')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const idPrefix = useId()

  if (openInvestmentGroups.length === 0) {
    return (
      <section className="panel">
        <h3>Add a balance</h3>
        <p className="muted">Balances belong to investment groups. Add an investment group first.</p>
      </section>
    )
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const openedMonth = parseMonth(opened.trim())
    const trimmedLabel = label.trim()

    if (groupId === '' || trimmedLabel === '' || openedMonth === null) {
      setProblem('Choose a group, give the balance a label and type the month it opened as YYYY-MM.')
      return
    }

    const openedProblem = balanceOpenedProblem(openedMonth, monthToClose)

    if (openedProblem !== null) {
      setProblem(openedProblem)
      return
    }

    if (balances.some(balance => balance.group === groupId && balance.label === trimmedLabel)) {
      setProblem(`This group already has a balance labelled ${trimmedLabel}.`)
      return
    }

    setSaving(true)
    setProblem(null)

    try {
      const draft = { group: groupId, label, owner, code, opened: openedMonth }
      const added = await appendWithUnusedId(spreadsheetId, balancesTab, label, 'balance', id => newBalance(draft, id as BalanceId))
      onAdded(`Added the balance ${added.label} with the id ${added.id}.`)
    } catch (error) {
      setProblem(`The balance was not added: ${error instanceof Error ? error.message : String(error)}`)
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={add}>
      <h3>Add a balance</h3>

      <div className="field">
        <label htmlFor={`${idPrefix}-group`}>Group</label>
        <select id={`${idPrefix}-group`} value={groupId} onChange={event => setGroupId(event.target.value as GroupId)}>
          {openInvestmentGroups.map(group => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input id={`${idPrefix}-label`} value={label} onChange={event => setLabel(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-owner`}>Owner</label>
        <OwnerSelect id={`${idPrefix}-owner`} value={owner} people={people} onChange={setOwner} />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-code`}>
          Code <span className="muted">(optional, such as a ticker or ISIN)</span>
        </label>
        <input id={`${idPrefix}-code`} value={code} onChange={event => setCode(event.target.value)} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-opened`}>Opened month</label>
        <input
          id={`${idPrefix}-opened`}
          type="month"
          placeholder="YYYY-MM"
          min={monthToClose ?? undefined}
          value={opened}
          onChange={event => setOpened(event.target.value)}
        />
      </div>

      {problem && <p className="field-error">{problem}</p>}

      <div className="button-row">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Adding...' : 'Add balance'}
        </button>
      </div>
    </form>
  )
}
