import { householdOwner } from '../ids.ts'
import { monthIndex } from '../month.ts'
import type { Balance, BalanceId, Contribution, Group, GroupId, Issue, MonthEndBalance, Person, RowRef, TabName } from '../types.ts'

export interface ReferenceTabs {
  people: Person[]
  groups: Group[]
  balances: Balance[]
  monthEndBalances: MonthEndBalance[]
  contributions: Contribution[]
}

type Report = (severity: Issue['severity'], tab: TabName, ref: RowRef | null, column: string | null, code: string, message: string) => void

// Rules that span rows or tabs. Rows that break one are reported and left out, so calculations only see consistent rows.
export function checkReferences(tabs: ReferenceTabs, issues: Issue[]): ReferenceTabs {
  const report: Report = (severity, tab, ref, column, code, message) => {
    issues.push({ severity, code, tab, row: ref?.row ?? null, column, message })
  }

  const personIds = new Set<string>(tabs.people.map(person => person.id))

  const groups = tabs.groups.filter(group => {
    if (group.owner === householdOwner || personIds.has(group.owner))
      return true

    const message = `Group ${group.id}: owner ${group.owner} is neither a person id nor ${householdOwner}.`
    report('error', 'groups', null, 'owner', 'unknown-owner', message)
    return false
  })

  const groupsById = new Map<GroupId, Group>(groups.map(group => [group.id, group]))
  const groupLabels = new Set<string>()

  const balances = tabs.balances.filter(balance => {
    if (balance.owner !== householdOwner && !personIds.has(balance.owner)) {
      const message = `Balance ${balance.id}: owner ${balance.owner} is neither a person id nor ${householdOwner}.`
      report('error', 'balances', null, 'owner', 'unknown-owner', message)
      return false
    }

    if (!groupsById.has(balance.group)) {
      report('error', 'balances', null, 'group_id', 'unknown-group', `Balance ${balance.id}: group ${balance.group} does not exist.`)
      return false
    }

    const labelKey = `${balance.group}|${balance.label}`

    if (groupLabels.has(labelKey)) {
      report('error', 'balances', null, 'label', 'duplicate-label', `Group ${balance.group} already has a balance labelled ${balance.label}.`)
      return false
    }

    groupLabels.add(labelKey)
    return true
  })

  const balancesById = new Map<BalanceId, Balance>(balances.map(balance => [balance.id, balance]))

  const fitsGroupAndBalance = (tab: TabName, row: MonthEndBalance | Contribution): boolean => {
    const group = groupsById.get(row.group)

    if (group === undefined) {
      report('error', tab, row.ref, 'group_id', 'unknown-group', `Group ${row.group} does not exist in the groups tab.`)
      return false
    }

    if (row.balance !== null && balancesById.get(row.balance)?.group !== row.group) {
      report('error', tab, row.ref, 'balance_id', 'unknown-balance', `Balance ${row.balance} is not a balance of group ${row.group}.`)
      return false
    }

    if (group.opened !== null && monthIndex(row.month) < monthIndex(group.opened)) {
      report('error', tab, row.ref, 'month', 'before-group-opened', `Group ${row.group} opened in ${group.opened}, after ${row.month}.`)
      return false
    }

    if (group.closed !== null && monthIndex(row.month) > monthIndex(group.closed)) {
      report('error', tab, row.ref, 'month', 'after-group-closed', `Group ${row.group} closed in ${group.closed}, before ${row.month}.`)
      return false
    }

    return true
  }

  const monthEndBalancesWithGroups = tabs.monthEndBalances.filter(monthEndBalance => {
    if (!fitsGroupAndBalance('month_end_balances', monthEndBalance))
      return false

    if (monthEndBalance.value >= 0)
      return true

    if (groupsById.get(monthEndBalance.group)?.kind === 'cash') {
      report('warning', 'month_end_balances', monthEndBalance.ref, 'value', 'overdraft', 'A negative cash value; check that this is an overdraft.')
      return true
    }

    report('error', 'month_end_balances', monthEndBalance.ref, 'value', 'negative-value', 'Values are entered as positive numbers.')
    return false
  })

  return {
    people: tabs.people,
    groups,
    balances,
    monthEndBalances: withEitherGroupOrBalanceRows(monthEndBalancesWithGroups, report),
    contributions: withValidOpenings(tabs.contributions.filter(row => fitsGroupAndBalance('contributions', row)), report),
  }
}

// For a month and group there is either one row with a blank balance or one row per balance, never both.
function withEitherGroupOrBalanceRows(monthEndBalances: MonthEndBalance[], report: Report): MonthEndBalance[] {
  const levelsByMonthAndGroup = new Map<string, Set<'group' | 'balance'>>()
  const monthAndGroup = (monthEndBalance: MonthEndBalance) => `${monthEndBalance.month}|${monthEndBalance.group}`

  for (const monthEndBalance of monthEndBalances) {
    const levels = levelsByMonthAndGroup.get(monthAndGroup(monthEndBalance)) ?? new Set()
    levels.add(monthEndBalance.balance === null ? 'group' : 'balance')
    levelsByMonthAndGroup.set(monthAndGroup(monthEndBalance), levels)
  }

  return monthEndBalances.filter(monthEndBalance => {
    if (levelsByMonthAndGroup.get(monthAndGroup(monthEndBalance))?.size !== 2)
      return true

    const message = `Group ${monthEndBalance.group} in ${monthEndBalance.month} has both a group-level row and balance rows; keep one or the other.`
    report('error', 'month_end_balances', monthEndBalance.ref, 'balance_id', 'mixed-month-end-levels', message)
    return false
  })
}

// At most one opening row per group, and no other row of the group may come before it.
function withValidOpenings(contributions: Contribution[], report: Report): Contribution[] {
  const firstMonthByGroup = new Map<GroupId, number>()

  for (const contribution of contributions) {
    const first = firstMonthByGroup.get(contribution.group)
    const index = monthIndex(contribution.month)

    if (first === undefined || index < first)
      firstMonthByGroup.set(contribution.group, index)
  }

  const groupsWithOpening = new Set<GroupId>()

  return contributions.filter(contribution => {
    if (contribution.kind !== 'opening')
      return true

    if (groupsWithOpening.has(contribution.group)) {
      report('error', 'contributions', contribution.ref, 'kind', 'second-opening', `Group ${contribution.group} already has an opening row.`)
      return false
    }

    if (monthIndex(contribution.month) > (firstMonthByGroup.get(contribution.group) ?? Infinity)) {
      const message = `The opening row of group ${contribution.group} must be its earliest row.`
      report('error', 'contributions', contribution.ref, 'month', 'late-opening', message)
      return false
    }

    groupsWithOpening.add(contribution.group)
    return true
  })
}
