import { isOpenInMonth, monthIndex, monthsFromTo } from '../domain/month.ts'
import type { Cents, Holding, HoldingId, Ledger, Month, Pot, PotId, PotKind } from '../domain/types.ts'

// measured: from a snapshot row. estimated: interpolated for display only; never written back and never a measurement.
export type Quality = 'measured' | 'estimated'

export interface QualifiedCents {
  cents: Cents
  quality: Quality
}

// At most one of `total`, `estimatedTotal` and `knownPart` is set; all three are null when no pot is tracked or all
// tracked pots are unknown.
export interface MonthTotal {
  month: Month
  isGap: boolean
  // The sum over every tracked pot when every one of them is measured. Never includes an estimate.
  total: Cents | null
  // The sum over every tracked pot when it is complete only because at least one pot is estimated.
  estimatedTotal: Cents | null
  // When some tracked pots are unknown: the sum of the others, a lower bound rather than the total.
  knownPart: Cents | null
  // Whether `knownPart` includes an estimated pot value. False when `knownPart` is null.
  knownPartIncludesEstimates: boolean
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
  // Each pension value is as of its statement date, not the month end, so pensions stay out of `combined`.
  pensions: PotGroupHistory
  // Cash plus investments.
  combined: MonthTotal[]
}

type HistoryInput = Pick<Ledger, 'pots' | 'holdings' | 'snapshots' | 'months'>

// Month-end values per pot over the whole history, from the first month in the snapshots or months tab to the last.
export function snapshotHistory(ledger: HistoryInput): SnapshotHistory {
  const months = historyMonths(ledger)
  const gapMonths = new Set([...ledger.months.values()].filter(record => record.status === 'gap').map(record => record.month))
  const cash = potGroupHistory(ledger, 'cash', months, gapMonths)
  const investments = potGroupHistory(ledger, 'investment', months, gapMonths)
  const pensions = potGroupHistory(ledger, 'pension', months, gapMonths)

  const combined = months.map((month, position): MonthTotal => {
    const potValues = [...cash.months[position].potValues.values(), ...investments.months[position].potValues.values()]
    return { month, isGap: gapMonths.has(month), ...sumOfParts(potValues) }
  })

  return { cash, investments, pensions, combined }
}

function potGroupHistory(ledger: HistoryInput, kind: PotKind, months: Month[], gapMonths: ReadonlySet<Month>): PotGroupHistory {
  const valuesByPotAndMonth = new Map<string, Cents>()
  const holdingsWithRowsByPotAndMonth = new Map<string, Set<HoldingId>>()
  const firstSnapshotMonthByPot = new Map<PotId, Month>()

  for (const snapshot of ledger.snapshots) {
    const key = `${snapshot.pot}|${snapshot.month}`
    // A pot's value is its pot-level row or the sum of its holding rows; the validator rules out having both.
    valuesByPotAndMonth.set(key, ((valuesByPotAndMonth.get(key) ?? 0) + snapshot.value) as Cents)

    if (snapshot.holding !== null)
      holdingsWithRowsByPotAndMonth.set(key, (holdingsWithRowsByPotAndMonth.get(key) ?? new Set()).add(snapshot.holding))

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

  const holdingsByPot = new Map<PotId, Holding[]>()

  for (const holding of ledger.holdings)
    holdingsByPot.set(holding.pot, [...(holdingsByPot.get(holding.pot) ?? []), holding])

  // Holding rows sum to the pot's value only when every holding open that month has one; otherwise the value is unknown.
  const measuredValue = (pot: Pot, month: Month): Cents | null => {
    const key = `${pot.id}|${month}`
    const holdingsWithRows = holdingsWithRowsByPotAndMonth.get(key)
    const openHoldings = (holdingsByPot.get(pot.id) ?? []).filter(holding => isOpenInMonth(holding, month))

    if (holdingsWithRows !== undefined && openHoldings.some(holding => !holdingsWithRows.has(holding.id)))
      return null

    return valuesByPotAndMonth.get(key) ?? null
  }

  const groupPots = ledger.pots
    .filter(pot => pot.kind === kind && months.some(month => isTracked(pot, month)))
    .sort((a, b) => a.sort - b.sort)

  // Per pot, one entry per month of the history: undefined while not tracked, else the value or null.
  const valuesByPot = new Map(
    groupPots.map(pot => {
      const values = months.map(month => (isTracked(pot, month) ? measuredValue(pot, month) : undefined))
      return [pot.id, withEstimates(values)]
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

export type MonthSums = Pick<MonthTotal, 'total' | 'estimatedTotal' | 'knownPart' | 'knownPartIncludesEstimates'>

// A total needs every part, and is measured only when every part is; with some unknown, the others only make a lower bound.
function sumOfParts(parts: readonly (QualifiedCents | null)[]): MonthSums {
  const known = parts.filter(part => part !== null)
  const sum = known.reduce((total, part) => total + part.cents, 0) as Cents
  const includesEstimates = known.some(part => part.quality === 'estimated')
  const sums: MonthSums = { total: null, estimatedTotal: null, knownPart: null, knownPartIncludesEstimates: false }

  if (known.length === 0)
    return sums

  if (known.length < parts.length)
    return { ...sums, knownPart: sum, knownPartIncludesEstimates: includesEstimates }

  return includesEstimates ? { ...sums, estimatedTotal: sum } : { ...sums, total: sum }
}

function historyMonths(ledger: HistoryInput): Month[] {
  // 'YYYY-MM' text sorts in time order.
  const sortedMonths = [...ledger.snapshots.map(snapshot => snapshot.month), ...ledger.months.keys()].sort()
  const first = sortedMonths.at(0)
  const last = sortedMonths.at(-1)

  return first === undefined || last === undefined ? [] : monthsFromTo(first, last)
}
