import { monthIndex, monthsFromTo } from '../domain/month.ts'
import type { Cents, Ledger, Month, Pot, PotId, PotKind } from '../domain/types.ts'

// measured: from a snapshot row. estimated: interpolated for display only; never written back and never a measurement.
export type Quality = 'measured' | 'estimated'

export interface QualifiedCents {
  cents: Cents
  quality: Quality
}

export interface MonthTotal {
  month: Month
  isGap: boolean
  // The sum over every tracked pot, or null when one of them is unknown or none is tracked. It may include estimated
  // values: check `isEstimated` before treating it as measured.
  total: Cents | null
  // When some tracked pots are unknown: the sum of the others, a lower bound rather than the total. Null otherwise.
  knownPart: Cents | null
  // Whether the total, or the known part, includes an estimated pot value.
  isEstimated: boolean
}

export interface PotGroupMonth extends MonthTotal {
  // Each pot tracked in this month: its value, or null when it is unknown (not zero). A missing snapshot is estimated
  // from the pot's nearest measured values before and after it; with no measured value on one side it stays unknown.
  // A pot is tracked from its opened month (or its first snapshot) to its closed month (or the end of the history).
  potValues: ReadonlyMap<PotId, QualifiedCents | null>
}

export interface PotGroupHistory {
  // The pots with at least one tracked month, in sort order.
  pots: Pot[]
  months: PotGroupMonth[]
}

export interface SnapshotHistory {
  cash: PotGroupHistory
  investments: PotGroupHistory
  // Cash plus investments.
  combined: MonthTotal[]
}

type HistoryInput = Pick<Ledger, 'pots' | 'snapshots' | 'months'>

// Month-end values per pot over the whole history, from the first month in the snapshots or months tab to the last.
export function snapshotHistory(ledger: HistoryInput): SnapshotHistory {
  const months = historyMonths(ledger)
  const gapMonths = new Set([...ledger.months.values()].filter(record => record.status === 'gap').map(record => record.month))
  const cash = potGroupHistory(ledger, 'cash', months, gapMonths)
  const investments = potGroupHistory(ledger, 'investment', months, gapMonths)

  const combined = months.map((month, position): MonthTotal => {
    const potValues = [...cash.months[position].potValues.values(), ...investments.months[position].potValues.values()]
    return { month, isGap: gapMonths.has(month), ...sumOfParts(potValues) }
  })

  return { cash, investments, combined }
}

function potGroupHistory(ledger: HistoryInput, kind: PotKind, months: Month[], gapMonths: ReadonlySet<Month>): PotGroupHistory {
  const valuesByPotAndMonth = new Map<string, Cents>()
  const firstSnapshotMonthByPot = new Map<PotId, Month>()

  for (const snapshot of ledger.snapshots) {
    const key = `${snapshot.pot}|${snapshot.month}`
    // A pot's value is its pot-level row or the sum of its holding rows; the validator rules out having both.
    valuesByPotAndMonth.set(key, ((valuesByPotAndMonth.get(key) ?? 0) + snapshot.value) as Cents)

    const first = firstSnapshotMonthByPot.get(snapshot.pot)

    if (first === undefined || monthIndex(snapshot.month) < monthIndex(first))
      firstSnapshotMonthByPot.set(snapshot.pot, snapshot.month)
  }

  const isTracked = (pot: Pot, month: Month): boolean => {
    const firstTracked = pot.opened ?? firstSnapshotMonthByPot.get(pot.id)

    if (firstTracked === undefined || monthIndex(month) < monthIndex(firstTracked))
      return false

    return pot.closed === null || monthIndex(month) <= monthIndex(pot.closed)
  }

  const groupPots = ledger.pots
    .filter(pot => pot.kind === kind && months.some(month => isTracked(pot, month)))
    .sort((a, b) => a.sort - b.sort)

  // Per pot, one entry per month of the history: undefined while not tracked, else the value or null.
  const valuesByPot = new Map(
    groupPots.map(pot => {
      const measuredValue = (month: Month) => valuesByPotAndMonth.get(`${pot.id}|${month}`) ?? null
      return [pot.id, withEstimates(months.map(month => (isTracked(pot, month) ? measuredValue(month) : undefined)))]
    })
  )

  const groupMonths = months.map((month, position): PotGroupMonth => {
    const potValues = new Map<PotId, QualifiedCents | null>()

    for (const pot of groupPots) {
      const value = valuesByPot.get(pot.id)?.[position]

      if (value !== undefined)
        potValues.set(pot.id, value)
    }

    return { month, isGap: gapMonths.has(month), ...sumOfParts([...potValues.values()]), potValues }
  })

  return { pots: groupPots, months: groupMonths }
}

// Fills each missing value on a straight line between the nearest measured values before and after it, rounded to the
// cent. Positions are consecutive months, so the distance between positions is the number of months.
function withEstimates(measured: readonly (Cents | null | undefined)[]): (QualifiedCents | null | undefined)[] {
  const anchors = measured.flatMap((cents, position) => (cents === null || cents === undefined ? [] : [{ position, cents }]))

  return measured.map((cents, position) => {
    if (cents === undefined)
      return undefined

    if (cents !== null)
      return { cents, quality: 'measured' }

    const before = anchors.findLast(anchor => anchor.position < position)
    const after = anchors.find(anchor => anchor.position > position)

    if (before === undefined || after === undefined)
      return null

    const share = (position - before.position) / (after.position - before.position)
    return { cents: Math.round(before.cents + (after.cents - before.cents) * share) as Cents, quality: 'estimated' }
  })
}

// A total needs every part; with some unknown, the others only make a lower bound.
function sumOfParts(parts: readonly (QualifiedCents | null)[]): Pick<MonthTotal, 'total' | 'knownPart' | 'isEstimated'> {
  const known = parts.filter(part => part !== null)
  const sum = known.reduce((total, part) => total + part.cents, 0) as Cents
  const isEstimated = known.some(part => part.quality === 'estimated')

  if (known.length === parts.length)
    return { total: parts.length === 0 ? null : sum, knownPart: null, isEstimated }

  return { total: null, knownPart: known.length === 0 ? null : sum, isEstimated }
}

function historyMonths(ledger: HistoryInput): Month[] {
  // 'YYYY-MM' text sorts in time order.
  const sortedMonths = [...ledger.snapshots.map(snapshot => snapshot.month), ...ledger.months.keys()].sort()
  const first = sortedMonths.at(0)
  const last = sortedMonths.at(-1)

  return first === undefined || last === undefined ? [] : monthsFromTo(first, last)
}
