import { describe, expect, it } from 'vitest'
import type { Cents, Holding, HoldingId, Month, MonthRecord, Pot, PotId, PotKind, Snapshot } from '../domain/types.ts'
import { snapshotHistory } from './snapshotHistory.ts'

function pot(id: string, kind: PotKind, sort: number, opened: string | null = null): Pot {
  return {
    id: id as PotId,
    label: id,
    kind,
    owner: 'household',
    provider: null,
    liquidity: 'liquid',
    cadence: 'monthly',
    opened: opened as Month | null,
    closed: null,
    returns: null,
    sort,
    note: null,
  }
}

function snapshot(month: string, potId: string, cents: number, holding: string | null = null): Snapshot {
  return {
    month: month as Month,
    pot: potId as PotId,
    holding: holding as HoldingId | null,
    value: cents as Cents,
    asOf: null,
    source: 'import',
    sourceRef: null,
    note: null,
    ref: null,
  }
}

function holding(id: string, potId: string, closed: string | null = null): Holding {
  return { id: id as HoldingId, pot: potId as PotId, label: id, code: null, opened: null, closed: closed as Month | null, note: null }
}

function monthRecords(...records: [string, MonthRecord['status']][]): Map<Month, MonthRecord> {
  return new Map(
    records.map(([month, status]) => [
      month as Month,
      { month: month as Month, status, closedOn: null, closedBy: null, frozenPlan: null, note: null },
    ])
  )
}

const cashA = pot('cash-a', 'cash', 10)
const cashB = pot('cash-b', 'cash', 20)
const fund = pot('fund', 'investment', 40)
const broker = pot('broker', 'investment', 30)

describe('snapshotHistory', () => {
  it('totals the pots of each kind per month, summing holding rows into their pot', () => {
    const history = snapshotHistory({
      pots: [cashB, cashA, fund],
      holdings: [],
      snapshots: [
        snapshot('2030-01', 'cash-a', 100_00),
        snapshot('2030-01', 'cash-b', 50_00),
        snapshot('2030-01', 'fund', 300_00, 'fund-x'),
        snapshot('2030-01', 'fund', 200_00, 'fund-y'),
      ],
      months: new Map(),
    })

    expect(history.cash.pots.map(cashPot => cashPot.id)).toEqual(['cash-a', 'cash-b'])
    expect(history.cash.months[0].total).toBe(150_00)
    expect(history.investments.months[0].potValues.get(fund.id)).toEqual({ cents: 500_00, quality: 'measured' })
    expect(history.combined[0].total).toBe(650_00)
  })

  it('treats a pot as unknown in a month where a holding open that month has no row, and ignores closed holdings', () => {
    const history = snapshotHistory({
      pots: [broker],
      holdings: [holding('broker-x', 'broker'), holding('broker-y', 'broker'), holding('broker-old', 'broker', '2029-12')],
      snapshots: [
        snapshot('2030-01', 'broker', 300_00, 'broker-x'),
        snapshot('2030-01', 'broker', 200_00, 'broker-y'),
        snapshot('2030-02', 'broker', 310_00, 'broker-x'),
      ],
      months: new Map(),
    })

    const [january, february] = history.investments.months

    expect(january.potValues.get(broker.id)).toEqual({ cents: 500_00, quality: 'measured' })
    expect(january.total).toBe(500_00)
    expect(february.potValues.get(broker.id)).toBeNull()
    expect(february.total).toBeNull()
  })

  it('treats a missing snapshot row as unknown and a zero row as known', () => {
    const history = snapshotHistory({
      pots: [cashA, cashB],
      holdings: [],
      snapshots: [
        snapshot('2030-01', 'cash-a', 100_00),
        snapshot('2030-01', 'cash-b', 0),
        snapshot('2030-02', 'cash-a', 120_00),
      ],
      months: new Map(),
    })

    const [january, february] = history.cash.months

    expect(january.total).toBe(100_00)
    expect(january.knownPart).toBeNull()
    expect(february.potValues.get(cashB.id)).toBeNull()
    expect(february.total).toBeNull()
    expect(february.knownPart).toBe(120_00)
  })

  it('does not count a pot as unknown before its first snapshot or opened month', () => {
    const history = snapshotHistory({
      pots: [broker, { ...fund, opened: '2030-02' as Month }],
      holdings: [],
      snapshots: [
        snapshot('2030-01', 'broker', 10_00),
        snapshot('2030-02', 'broker', 11_00),
        snapshot('2030-03', 'broker', 12_00),
        snapshot('2030-03', 'fund', 5_00),
      ],
      months: new Map(),
    })

    const [january, february, march] = history.investments.months

    expect(january.potValues.has(fund.id)).toBe(false)
    expect(january.total).toBe(10_00)
    expect(february.potValues.get(fund.id)).toBeNull()
    expect(february.total).toBeNull()
    expect(february.knownPart).toBe(11_00)
    expect(march.total).toBe(17_00)
  })

  it('keeps gap months marked as gaps and fills them with estimated totals', () => {
    const history = snapshotHistory({
      pots: [cashA],
      holdings: [],
      snapshots: [snapshot('2030-01', 'cash-a', 100_00), snapshot('2030-04', 'cash-a', 130_00)],
      months: monthRecords(['2030-01', 'legacy'], ['2030-02', 'gap'], ['2030-03', 'gap'], ['2030-04', 'legacy']),
    })

    expect(history.cash.months.map(month => [month.month, month.isGap, month.total, month.estimatedTotal, month.knownPart])).toEqual([
      ['2030-01', false, 100_00, null, null],
      ['2030-02', true, null, 110_00, null],
      ['2030-03', true, null, 120_00, null],
      ['2030-04', false, 130_00, null, null],
    ])
    expect(history.combined[1]).toMatchObject({ isGap: true, total: null, estimatedTotal: 110_00, knownPart: null })
  })

  it('interpolates a missing month between the nearest measured values, rounded to the cent', () => {
    const history = snapshotHistory({
      pots: [cashA],
      holdings: [],
      snapshots: [snapshot('2030-01', 'cash-a', 100_00), snapshot('2030-04', 'cash-a', 100_01)],
      months: new Map(),
    })

    // A third and two thirds of one cent above 100.00: 100.0033 and 100.0067 euros.
    expect(history.cash.months.map(month => month.potValues.get(cashA.id))).toEqual([
      { cents: 100_00, quality: 'measured' },
      { cents: 100_00, quality: 'estimated' },
      { cents: 100_01, quality: 'estimated' },
      { cents: 100_01, quality: 'measured' },
    ])
  })

  it('does not extrapolate before the first or after the last measured value', () => {
    const history = snapshotHistory({
      pots: [{ ...cashA, opened: '2030-01' as Month }, cashB],
      holdings: [],
      snapshots: [
        snapshot('2030-02', 'cash-a', 100_00),
        snapshot('2030-03', 'cash-a', 110_00),
        snapshot('2030-04', 'cash-a', 120_00),
        snapshot('2030-01', 'cash-b', 50_00),
        snapshot('2030-02', 'cash-b', 60_00),
      ],
      months: new Map(),
    })

    expect(history.cash.months.map(month => [month.potValues.get(cashA.id), month.potValues.get(cashB.id)])).toEqual([
      [null, { cents: 50_00, quality: 'measured' }],
      [{ cents: 100_00, quality: 'measured' }, { cents: 60_00, quality: 'measured' }],
      [{ cents: 110_00, quality: 'measured' }, null],
      [{ cents: 120_00, quality: 'measured' }, null],
    ])
    expect(history.cash.months.map(month => [month.total, month.knownPart])).toEqual([
      [null, 50_00],
      [160_00, null],
      [null, 110_00],
      [null, 120_00],
    ])
  })

  it('leaves a pot unknown in a gap month when it has no measured value on one side, while others are estimated', () => {
    const history = snapshotHistory({
      pots: [cashA, broker],
      holdings: [],
      snapshots: [snapshot('2030-01', 'cash-a', 100_00), snapshot('2030-03', 'cash-a', 120_00), snapshot('2030-01', 'broker', 40_00)],
      months: monthRecords(['2030-01', 'legacy'], ['2030-02', 'gap'], ['2030-03', 'legacy']),
    })

    expect(history.cash.months[1].potValues.get(cashA.id)).toEqual({ cents: 110_00, quality: 'estimated' })
    expect(history.investments.months[1].potValues.get(broker.id)).toBeNull()
    expect(history.combined[1]).toMatchObject({ isGap: true, total: null, estimatedTotal: null, knownPart: 110_00, knownPartIncludesEstimates: true })
  })

  it('makes the combined total partial when either kind has an unknown pot', () => {
    const history = snapshotHistory({
      pots: [cashA, broker],
      holdings: [],
      snapshots: [
        snapshot('2030-01', 'cash-a', 100_00),
        snapshot('2030-01', 'broker', 40_00),
        snapshot('2030-02', 'cash-a', 110_00),
      ],
      months: new Map(),
    })

    expect(history.combined.map(month => [month.total, month.knownPart])).toEqual([
      [140_00, null],
      [null, 110_00],
    ])
  })
})
