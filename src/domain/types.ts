type Brand<T, B extends string> = T & { readonly __brand: B }

// Integer euro cents.
export type Cents = Brand<number, 'Cents'>
// 'YYYY-MM'
export type Month = Brand<string, 'Month'>
// year * 12 + (month - 1), for arithmetic
export type MonthIndex = number
// 'YYYY-MM-DD'
export type IsoDate = Brand<string, 'IsoDate'>
// Annual, decimal.
export type Rate = number

type Id<K extends string> = Brand<string, `id:${K}`>
export type PersonId = Id<'person'>
export type GroupId = Id<'group'>
export type BalanceId = Id<'balance'>
export type OwnerId = PersonId | 'household'

export const sources = ['import', 'app', 'hand'] as const
export type Source = (typeof sources)[number]

export const tabNames = ['_meta', 'people', 'groups', 'balances', 'month_end_balances', 'contributions', 'months'] as const
export type TabName = (typeof tabNames)[number]

// The sheet row at read time; only for issue links, never for writes.
export interface RowRef {
  tab: TabName
  row: number
}

export interface Issue {
  severity: 'error' | 'warning' | 'info'
  code: string
  tab: TabName
  row: number | null
  column: string | null
  message: string
}

export interface Meta {
  schemaVersion: number
  currency: string
  goLiveMonth: Month | null
  legacyLastMonth: Month | null
  monthEndRule: string | null
  lastWriteAppVersion: string | null
}

export const personRoles = ['adult', 'child'] as const

export interface Person {
  id: PersonId
  name: string
  role: (typeof personRoles)[number]
  note: string | null
}

export const groupKinds = ['cash', 'investment', 'pension', 'loan'] as const
export type GroupKind = (typeof groupKinds)[number]
export const liquidities = ['liquid', 'locked'] as const
export const cadences = ['monthly', 'quarterly', 'none'] as const

export interface ReturnBand {
  low: Rate
  expected: Rate
  high: Rate
}

export interface Group {
  id: GroupId
  label: string
  kind: GroupKind
  owner: OwnerId
  provider: string | null
  liquidity: (typeof liquidities)[number]
  cadence: (typeof cadences)[number]
  opened: Month | null
  closed: Month | null
  returns: ReturnBand | null
  sort: number
  note: string | null
}

export interface Balance {
  id: BalanceId
  group: GroupId
  label: string
  owner: OwnerId
  code: string | null
  opened: Month | null
  closed: Month | null
  note: string | null
}

export interface MonthEndBalance {
  month: Month
  group: GroupId
  balance: BalanceId | null
  value: Cents
  asOf: IsoDate | null
  source: Source
  sourceRef: string | null
  note: string | null
  ref: RowRef | null
}

export const contributionKinds = ['contribution', 'withdrawal', 'opening', 'incentive'] as const
export const fundings = ['cash', 'external'] as const

export interface Contribution {
  month: Month
  group: GroupId
  balance: BalanceId | null
  amount: Cents
  kind: (typeof contributionKinds)[number]
  funding: (typeof fundings)[number]
  date: IsoDate | null
  source: Source
  sourceRef: string | null
  note: string | null
  ref: RowRef | null
}

export interface PlannedFlows {
  income: Cents
  bills: Cents
  transfers: Cents
  other: Cents
}

export const monthStatuses = ['legacy', 'gap', 'open', 'closed'] as const

export interface MonthRecord {
  month: Month
  status: (typeof monthStatuses)[number]
  closedOn: IsoDate | null
  closedBy: string | null
  frozenPlan: PlannedFlows | null
  note: string | null
}

// The reference and month-end balance tabs as domain objects: what the import produces and what the app writes into a new spreadsheet.
export interface Bundle {
  meta: Meta
  people: Person[]
  groups: Group[]
  balances: Balance[]
  monthEndBalances: MonthEndBalance[]
  contributions: Contribution[]
  months: MonthRecord[]
}

export interface Ledger {
  meta: Meta | null
  people: Person[]
  groups: Group[]
  balances: Balance[]
  monthEndBalances: MonthEndBalance[]
  contributions: Contribution[]
  months: Map<Month, MonthRecord>
  issues: Issue[]
}
