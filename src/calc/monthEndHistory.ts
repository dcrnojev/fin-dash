import { isOpenInMonth, monthIndex, monthsFromTo } from '../domain/month.ts'
import type { Balance, BalanceId, Cents, Group, GroupId, GroupKind, Ledger, Month } from '../domain/types.ts'

// measured: from a month-end balance row. estimated: filled in for display only; never written back and never a measurement.
export type Quality = 'measured' | 'estimated'

export interface QualifiedCents {
  cents: Cents
  quality: Quality
}

// At most one of `total`, `estimatedTotal` and `knownPart` is set; all three are null when no group is tracked or all
// tracked groups are unknown.
export interface MonthTotal {
  month: Month
  isGap: boolean
  // The sum over every tracked group when every one of them is measured. Never includes an estimate.
  total: Cents | null
  // The sum over every tracked group when it is complete only because at least one group is estimated.
  estimatedTotal: Cents | null
  // When some tracked groups are unknown: the sum of the others, a lower bound rather than the total.
  knownPart: Cents | null
  // Whether `knownPart` includes an estimated group value. False when `knownPart` is null.
  knownPartIncludesEstimates: boolean
}

export interface KindMonth extends MonthTotal {
  // Each group tracked in this month: its value, or null when it is unknown (not zero). A missing month-end balance is estimated
  // from the group's nearest measured values before and after it, or from its recent trend after its last one; before its
  // first measured value it stays unknown.
  // A group is tracked from its opened month (or its first month-end balance) to its closed month (or the end of the history).
  groupValues: ReadonlyMap<GroupId, QualifiedCents | null>
}

export interface KindHistory {
  // The groups with at least one tracked month, in sort order.
  groups: Group[]
  months: KindMonth[]
}

export interface MonthEndHistory {
  cash: KindHistory
  investments: KindHistory
  // Each pension value is as of its statement date, not the month end, so pensions stay out of `combined`.
  pensions: KindHistory
  // Cash plus investments.
  combined: MonthTotal[]
}

type HistoryInput = Pick<Ledger, 'groups' | 'balances' | 'monthEndBalances' | 'months'>

// Month-end values per group over the whole history, from the first month in the month-end balances or months tab to the last.
export function monthEndHistory(ledger: HistoryInput): MonthEndHistory {
  const months = historyMonths(ledger)
  const gapMonths = new Set([...ledger.months.values()].filter(record => record.status === 'gap').map(record => record.month))
  const cash = kindHistory(ledger, 'cash', months, gapMonths)
  const investments = kindHistory(ledger, 'investment', months, gapMonths)
  const pensions = kindHistory(ledger, 'pension', months, gapMonths)

  const combined = months.map((month, position): MonthTotal => {
    const groupValues = [...cash.months[position].groupValues.values(), ...investments.months[position].groupValues.values()]
    return { month, isGap: gapMonths.has(month), ...sumOfParts(groupValues) }
  })

  return { cash, investments, pensions, combined }
}

function kindHistory(ledger: HistoryInput, kind: GroupKind, months: Month[], gapMonths: ReadonlySet<Month>): KindHistory {
  const valuesByGroupAndMonth = new Map<string, Cents>()
  const balancesWithRowsByGroupAndMonth = new Map<string, Set<BalanceId>>()
  const firstRecordedMonthByGroup = new Map<GroupId, Month>()

  for (const monthEndBalance of ledger.monthEndBalances) {
    const key = `${monthEndBalance.group}|${monthEndBalance.month}`
    // A group's value is its group-level row or the sum of its balance rows; the validator rules out having both.
    valuesByGroupAndMonth.set(key, ((valuesByGroupAndMonth.get(key) ?? 0) + monthEndBalance.value) as Cents)

    if (monthEndBalance.balance !== null)
      balancesWithRowsByGroupAndMonth.set(key, (balancesWithRowsByGroupAndMonth.get(key) ?? new Set()).add(monthEndBalance.balance))

    const first = firstRecordedMonthByGroup.get(monthEndBalance.group)

    if (first === undefined || monthIndex(monthEndBalance.month) < monthIndex(first))
      firstRecordedMonthByGroup.set(monthEndBalance.group, monthEndBalance.month)
  }

  const isTracked = (group: Group, month: Month): boolean => {
    const firstTracked = group.opened ?? firstRecordedMonthByGroup.get(group.id)

    if (firstTracked === undefined || monthIndex(month) < monthIndex(firstTracked))
      return false

    return group.closed === null || monthIndex(month) <= monthIndex(group.closed)
  }

  const balancesByGroup = new Map<GroupId, Balance[]>()

  for (const balance of ledger.balances)
    balancesByGroup.set(balance.group, [...(balancesByGroup.get(balance.group) ?? []), balance])

  // Balance rows sum to the group's value only when every balance open that month has one; otherwise the value is unknown.
  const measuredValue = (group: Group, month: Month): Cents | null => {
    const key = `${group.id}|${month}`
    const balancesWithRows = balancesWithRowsByGroupAndMonth.get(key)
    const openBalances = (balancesByGroup.get(group.id) ?? []).filter(balance => isOpenInMonth(balance, month))

    if (balancesWithRows !== undefined && openBalances.some(balance => !balancesWithRows.has(balance.id)))
      return null

    return valuesByGroupAndMonth.get(key) ?? null
  }

  const kindGroups = ledger.groups
    .filter(group => group.kind === kind && months.some(month => isTracked(group, month)))
    .sort((a, b) => a.sort - b.sort)

  // Per group, one entry per month of the history: undefined while not tracked, else the value or null.
  const valuesByGroup = new Map(
    kindGroups.map(group => {
      const values = months.map(month => (isTracked(group, month) ? measuredValue(group, month) : undefined))
      return [group.id, withEstimates(values)]
    })
  )

  const kindMonths = months.map((month, position): KindMonth => {
    const groupValues = new Map<GroupId, QualifiedCents | null>()

    for (const group of kindGroups) {
      const value = valuesByGroup.get(group.id)?.[position]

      if (value !== undefined)
        groupValues.set(group.id, value)
    }

    return { month, isGap: gapMonths.has(month), ...sumOfParts([...groupValues.values()]), groupValues }
  })

  return { groups: kindGroups, months: kindMonths }
}

// How many of a group's latest measured values set the trend that continues it past its last measured month.
const trendReadings = 12

// Fills each missing value on a straight line between the nearest measured values before and after it. After the last
// measured value, the line continues at the average monthly change over the latest `trendReadings` measured values, or
// flat with only one. Before the first measured value it stays unknown. Rounded to the cent. Positions are consecutive
// months up to the newest month of the history, so the distance between positions is the number of months.
function withEstimates(measured: readonly (Cents | null | undefined)[]): (QualifiedCents | null | undefined)[] {
  const anchors = measured.flatMap((cents, position) => (cents === null || cents === undefined ? [] : [{ position, cents }]))
  const last = anchors.at(-1)
  const trendStart = anchors.at(-trendReadings) ?? anchors.at(0)
  const monthlyTrend =
    last === undefined || trendStart === undefined || last.position === trendStart.position
      ? 0
      : (last.cents - trendStart.cents) / (last.position - trendStart.position)

  return measured.map((cents, position) => {
    if (cents === undefined)
      return undefined

    if (cents !== null)
      return { cents, quality: 'measured' }

    const before = anchors.findLast(anchor => anchor.position < position)
    const after = anchors.find(anchor => anchor.position > position)

    if (before === undefined)
      return null

    if (after === undefined)
      return { cents: Math.round(before.cents + monthlyTrend * (position - before.position)) as Cents, quality: 'estimated' }

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
  const sortedMonths = [...ledger.monthEndBalances.map(monthEndBalance => monthEndBalance.month), ...ledger.months.keys()].sort()
  const first = sortedMonths.at(0)
  const last = sortedMonths.at(-1)

  return first === undefined || last === undefined ? [] : monthsFromTo(first, last)
}
