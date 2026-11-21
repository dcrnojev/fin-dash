import type { Balance, BalanceId, Cents, Group, GroupId, GroupKind, IsoDate, Month, MonthEndBalance, MonthRecord } from '../domain/types.ts'

// Invented ledger rows for the close tests.

export function group(id: string, kind: GroupKind, sort: number, span: { opened?: string; closed?: string } = {}): Group {
  return {
    id: id as GroupId,
    label: `Group ${id}`,
    kind,
    owner: 'household',
    provider: null,
    liquidity: kind === 'pension' ? 'locked' : 'liquid',
    cadence: 'monthly',
    opened: (span.opened ?? null) as Month | null,
    closed: (span.closed ?? null) as Month | null,
    returns: null,
    sort,
    note: null,
  }
}

export function balance(id: string, groupId: string, span: { opened?: string; closed?: string } = {}): Balance {
  return {
    id: id as BalanceId,
    group: groupId as GroupId,
    label: `Balance ${id}`,
    owner: 'household',
    code: null,
    opened: (span.opened ?? null) as Month | null,
    closed: (span.closed ?? null) as Month | null,
    note: null,
  }
}

export function monthEndBalance(
  month: string,
  groupId: string,
  cents: number,
  balanceId: string | null = null,
  asOf: string | null = null
): MonthEndBalance {
  return {
    month: month as Month,
    group: groupId as GroupId,
    balance: balanceId as BalanceId | null,
    value: cents as Cents,
    asOf: asOf as IsoDate | null,
    source: 'import',
    sourceRef: null,
    note: null,
    ref: null,
  }
}

export function monthRecords(...records: [string, MonthRecord['status']][]): Map<Month, MonthRecord> {
  return new Map(
    records.map(([month, status]) => [
      month as Month,
      { month: month as Month, status, closedOn: null, closedBy: null, frozenPlan: null, note: null },
    ])
  )
}
