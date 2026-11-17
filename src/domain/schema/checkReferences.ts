import { householdOwner } from '../ids.ts'
import { monthIndex } from '../month.ts'
import type { Contribution, Holding, HoldingId, Issue, Person, Pot, PotId, RowRef, Snapshot, TabName } from '../types.ts'

export interface ReferenceTabs {
  people: Person[]
  pots: Pot[]
  holdings: Holding[]
  snapshots: Snapshot[]
  contributions: Contribution[]
}

type Report = (severity: Issue['severity'], tab: TabName, ref: RowRef | null, column: string | null, code: string, message: string) => void

// Rules that span rows or tabs. Rows that break one are reported and left out, so calculations only see consistent rows.
export function checkReferences(tabs: ReferenceTabs, issues: Issue[]): ReferenceTabs {
  const report: Report = (severity, tab, ref, column, code, message) => {
    issues.push({ severity, code, tab, row: ref?.row ?? null, column, message })
  }

  const personIds = new Set<string>(tabs.people.map(person => person.id))

  const pots = tabs.pots.filter(pot => {
    if (pot.owner === householdOwner || personIds.has(pot.owner))
      return true

    report('error', 'pots', null, 'owner', 'unknown-owner', `Pot ${pot.id}: owner ${pot.owner} is neither a person id nor ${householdOwner}.`)
    return false
  })

  const potsById = new Map<PotId, Pot>(pots.map(pot => [pot.id, pot]))
  const potLabels = new Set<string>()

  const holdings = tabs.holdings.filter(holding => {
    if (!potsById.has(holding.pot)) {
      report('error', 'holdings', null, 'pot_id', 'unknown-pot', `Holding ${holding.id}: pot ${holding.pot} does not exist.`)
      return false
    }

    const labelKey = `${holding.pot}|${holding.label}`

    if (potLabels.has(labelKey)) {
      report('error', 'holdings', null, 'label', 'duplicate-label', `Pot ${holding.pot} already has a holding labelled ${holding.label}.`)
      return false
    }

    potLabels.add(labelKey)
    return true
  })

  const holdingsById = new Map<HoldingId, Holding>(holdings.map(holding => [holding.id, holding]))

  const fitsPotAndHolding = (tab: TabName, row: Snapshot | Contribution): boolean => {
    const pot = potsById.get(row.pot)

    if (pot === undefined) {
      report('error', tab, row.ref, 'pot_id', 'unknown-pot', `Pot ${row.pot} does not exist in the pots tab.`)
      return false
    }

    if (row.holding !== null && holdingsById.get(row.holding)?.pot !== row.pot) {
      report('error', tab, row.ref, 'holding_id', 'unknown-holding', `Holding ${row.holding} is not a holding of pot ${row.pot}.`)
      return false
    }

    if (pot.opened !== null && monthIndex(row.month) < monthIndex(pot.opened)) {
      report('error', tab, row.ref, 'month', 'before-pot-opened', `Pot ${row.pot} opened in ${pot.opened}, after ${row.month}.`)
      return false
    }

    return true
  }

  const snapshotsWithPots = tabs.snapshots.filter(snapshot => {
    if (!fitsPotAndHolding('snapshots', snapshot))
      return false

    if (snapshot.value >= 0)
      return true

    if (potsById.get(snapshot.pot)?.kind === 'cash') {
      report('warning', 'snapshots', snapshot.ref, 'value', 'overdraft', 'A negative cash balance; check that this is an overdraft.')
      return true
    }

    report('error', 'snapshots', snapshot.ref, 'value', 'negative-value', 'Values are entered as positive numbers.')
    return false
  })

  return {
    people: tabs.people,
    pots,
    holdings,
    snapshots: withEitherPotOrHoldingRows(snapshotsWithPots, report),
    contributions: withValidOpenings(tabs.contributions.filter(row => fitsPotAndHolding('contributions', row)), report),
  }
}

// For a month and pot there is either one row with a blank holding or one row per holding, never both.
function withEitherPotOrHoldingRows(snapshots: Snapshot[], report: Report): Snapshot[] {
  const levelsByMonthAndPot = new Map<string, Set<'pot' | 'holding'>>()
  const monthAndPot = (snapshot: Snapshot) => `${snapshot.month}|${snapshot.pot}`

  for (const snapshot of snapshots) {
    const levels = levelsByMonthAndPot.get(monthAndPot(snapshot)) ?? new Set()
    levels.add(snapshot.holding === null ? 'pot' : 'holding')
    levelsByMonthAndPot.set(monthAndPot(snapshot), levels)
  }

  return snapshots.filter(snapshot => {
    if (levelsByMonthAndPot.get(monthAndPot(snapshot))?.size !== 2)
      return true

    const message = `Pot ${snapshot.pot} in ${snapshot.month} has both a pot-level row and holding rows; keep one or the other.`
    report('error', 'snapshots', snapshot.ref, 'holding_id', 'mixed-snapshot-levels', message)
    return false
  })
}

// At most one opening row per pot, and no other row of the pot may come before it.
function withValidOpenings(contributions: Contribution[], report: Report): Contribution[] {
  const firstMonthByPot = new Map<PotId, number>()

  for (const contribution of contributions) {
    const first = firstMonthByPot.get(contribution.pot)
    const index = monthIndex(contribution.month)

    if (first === undefined || index < first)
      firstMonthByPot.set(contribution.pot, index)
  }

  const potsWithOpening = new Set<PotId>()

  return contributions.filter(contribution => {
    if (contribution.kind !== 'opening')
      return true

    if (potsWithOpening.has(contribution.pot)) {
      report('error', 'contributions', contribution.ref, 'kind', 'second-opening', `Pot ${contribution.pot} already has an opening row.`)
      return false
    }

    if (monthIndex(contribution.month) > (firstMonthByPot.get(contribution.pot) ?? Infinity)) {
      const message = `The opening row of pot ${contribution.pot} must be its earliest row.`
      report('error', 'contributions', contribution.ref, 'month', 'late-opening', message)
      return false
    }

    potsWithOpening.add(contribution.pot)
    return true
  })
}
