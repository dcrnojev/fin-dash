import type { Cents, Holding, HoldingId, IsoDate, Month, MonthRecord, Pot, PotId, PotKind, Snapshot } from '../domain/types.ts'

// Invented ledger rows for the close tests.

export function pot(id: string, kind: PotKind, sort: number, span: { opened?: string; closed?: string } = {}): Pot {
  return {
    id: id as PotId,
    label: `Pot ${id}`,
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

export function holding(id: string, potId: string, span: { opened?: string; closed?: string } = {}): Holding {
  return {
    id: id as HoldingId,
    pot: potId as PotId,
    label: `Holding ${id}`,
    owner: 'household',
    code: null,
    opened: (span.opened ?? null) as Month | null,
    closed: (span.closed ?? null) as Month | null,
    note: null,
  }
}

export function snapshot(
  month: string,
  potId: string,
  cents: number,
  holdingId: string | null = null,
  asOf: string | null = null
): Snapshot {
  return {
    month: month as Month,
    pot: potId as PotId,
    holding: holdingId as HoldingId | null,
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
