import { describe, expect, it } from 'vitest'
import { addMonths } from '../domain/month.ts'
import type { Balance, BalanceId, Cents, Group, GroupId, GroupKind, Month, MonthEndBalance, MonthRecord } from '../domain/types.ts'
import { monthEndHistory, type KindMonth } from './monthEndHistory.ts'

function group(id: string, kind: GroupKind, sort: number, opened: string | null = null): Group {
  return {
    id: id as GroupId,
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

function monthEndBalance(month: string, groupId: string, cents: number, balance: string | null = null): MonthEndBalance {
  return {
    month: month as Month,
    group: groupId as GroupId,
    balance: balance as BalanceId | null,
    value: cents as Cents,
    asOf: null,
    source: 'import',
    sourceRef: null,
    note: null,
    ref: null,
  }
}

function balance(id: string, groupId: string, closed: string | null = null): Balance {
  return {
    id: id as BalanceId,
    group: groupId as GroupId,
    label: id,
    owner: 'household',
    code: null,
    opened: null,
    closed: closed as Month | null,
    note: null,
  }
}

function monthRecords(...records: [string, MonthRecord['status']][]): Map<Month, MonthRecord> {
  return new Map(
    records.map(([month, status]) => [
      month as Month,
      { month: month as Month, status, closedOn: null, closedBy: null, frozenPlan: null, note: null },
    ])
  )
}

const cashA = group('cash-a', 'cash', 10)
const cashB = group('cash-b', 'cash', 20)
const fund = group('fund', 'investment', 40)
const broker = group('broker', 'investment', 30)

describe('monthEndHistory', () => {
  it('totals the groups of each kind per month, summing balance rows into their group', () => {
    const history = monthEndHistory({
      groups: [cashB, cashA, fund],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-01', 'cash-a', 100_00),
        monthEndBalance('2030-01', 'cash-b', 50_00),
        monthEndBalance('2030-01', 'fund', 300_00, 'fund-x'),
        monthEndBalance('2030-01', 'fund', 200_00, 'fund-y'),
      ],
      months: new Map(),
    })

    expect(history.cash.groups.map(cashGroup => cashGroup.id)).toEqual(['cash-a', 'cash-b'])
    expect(history.cash.months[0].total).toBe(150_00)
    expect(history.investments.months[0].groupValues.get(fund.id)).toEqual({ cents: 500_00, quality: 'measured' })
    expect(history.combined[0].total).toBe(650_00)
  })

  it('does not count a group as measured in a month where a balance open that month has no row, and ignores closed balances', () => {
    const history = monthEndHistory({
      groups: [broker],
      balances: [balance('broker-x', 'broker'), balance('broker-y', 'broker'), balance('broker-old', 'broker', '2029-12')],
      monthEndBalances: [
        monthEndBalance('2030-01', 'broker', 300_00, 'broker-x'),
        monthEndBalance('2030-01', 'broker', 200_00, 'broker-y'),
        monthEndBalance('2030-02', 'broker', 310_00, 'broker-x'),
      ],
      months: new Map(),
    })

    const [january, february] = history.investments.months

    expect(january.groupValues.get(broker.id)).toEqual({ cents: 500_00, quality: 'measured' })
    expect(january.total).toBe(500_00)
    expect(february.groupValues.get(broker.id)).toEqual({ cents: 500_00, quality: 'estimated' })
    expect(february.total).toBeNull()
    expect(february.estimatedTotal).toBe(500_00)
  })

  it('treats a missing month-end balance row as unknown and a zero row as known', () => {
    const history = monthEndHistory({
      groups: [cashA, { ...cashB, opened: '2030-01' as Month }],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-01', 'cash-a', 100_00),
        monthEndBalance('2030-02', 'cash-a', 120_00),
        monthEndBalance('2030-02', 'cash-b', 0),
      ],
      months: new Map(),
    })

    const [january, february] = history.cash.months

    expect(january.groupValues.get(cashB.id)).toBeNull()
    expect(january.total).toBeNull()
    expect(january.knownPart).toBe(100_00)
    expect(february.total).toBe(120_00)
    expect(february.knownPart).toBeNull()
  })

  it('does not count a group as unknown before its first month-end balance or opened month', () => {
    const history = monthEndHistory({
      groups: [broker, { ...fund, opened: '2030-02' as Month }],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-01', 'broker', 10_00),
        monthEndBalance('2030-02', 'broker', 11_00),
        monthEndBalance('2030-03', 'broker', 12_00),
        monthEndBalance('2030-03', 'fund', 5_00),
      ],
      months: new Map(),
    })

    const [january, february, march] = history.investments.months

    expect(january.groupValues.has(fund.id)).toBe(false)
    expect(january.total).toBe(10_00)
    expect(february.groupValues.get(fund.id)).toBeNull()
    expect(february.total).toBeNull()
    expect(february.knownPart).toBe(11_00)
    expect(march.total).toBe(17_00)
  })

  it('keeps gap months marked as gaps and fills them with estimated totals', () => {
    const history = monthEndHistory({
      groups: [cashA],
      balances: [],
      monthEndBalances: [monthEndBalance('2030-01', 'cash-a', 100_00), monthEndBalance('2030-04', 'cash-a', 130_00)],
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
    const history = monthEndHistory({
      groups: [cashA],
      balances: [],
      monthEndBalances: [monthEndBalance('2030-01', 'cash-a', 100_00), monthEndBalance('2030-04', 'cash-a', 100_01)],
      months: new Map(),
    })

    // A third and two thirds of one cent above 100.00: 100.0033 and 100.0067 euros.
    expect(history.cash.months.map(month => month.groupValues.get(cashA.id))).toEqual([
      { cents: 100_00, quality: 'measured' },
      { cents: 100_00, quality: 'estimated' },
      { cents: 100_01, quality: 'estimated' },
      { cents: 100_01, quality: 'measured' },
    ])
  })

  it('does not estimate before the first measured value, and continues the trend after the last one', () => {
    const history = monthEndHistory({
      groups: [{ ...cashA, opened: '2030-01' as Month }, cashB],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-02', 'cash-a', 100_00),
        monthEndBalance('2030-03', 'cash-a', 110_00),
        monthEndBalance('2030-04', 'cash-a', 120_00),
        monthEndBalance('2030-01', 'cash-b', 50_00),
        monthEndBalance('2030-02', 'cash-b', 60_00),
      ],
      months: new Map(),
    })

    expect(history.cash.months.map(month => [month.groupValues.get(cashA.id), month.groupValues.get(cashB.id)])).toEqual([
      [null, { cents: 50_00, quality: 'measured' }],
      [{ cents: 100_00, quality: 'measured' }, { cents: 60_00, quality: 'measured' }],
      [{ cents: 110_00, quality: 'measured' }, { cents: 70_00, quality: 'estimated' }],
      [{ cents: 120_00, quality: 'measured' }, { cents: 80_00, quality: 'estimated' }],
    ])
    expect(history.cash.months.map(month => [month.total, month.estimatedTotal, month.knownPart])).toEqual([
      [null, null, 50_00],
      [160_00, null, null],
      [null, 180_00, null],
      [null, 200_00, null],
    ])
  })

  it('leaves a group unknown in a gap month before its first measured value, while others are estimated', () => {
    const history = monthEndHistory({
      groups: [cashA, { ...broker, opened: '2030-01' as Month }],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-01', 'cash-a', 100_00),
        monthEndBalance('2030-03', 'cash-a', 120_00),
        monthEndBalance('2030-03', 'broker', 40_00),
      ],
      months: monthRecords(['2030-01', 'legacy'], ['2030-02', 'gap'], ['2030-03', 'legacy']),
    })

    expect(history.cash.months[1].groupValues.get(cashA.id)).toEqual({ cents: 110_00, quality: 'estimated' })
    expect(history.investments.months[1].groupValues.get(broker.id)).toBeNull()
    expect(history.combined[1]).toMatchObject({ isGap: true, total: null, estimatedTotal: null, knownPart: 110_00, knownPartIncludesEstimates: true })
  })

  it('makes the combined total partial when either kind has an unknown group', () => {
    const history = monthEndHistory({
      groups: [cashA, { ...broker, opened: '2030-01' as Month }],
      balances: [],
      monthEndBalances: [
        monthEndBalance('2030-01', 'cash-a', 100_00),
        monthEndBalance('2030-02', 'cash-a', 110_00),
        monthEndBalance('2030-02', 'broker', 40_00),
      ],
      months: new Map(),
    })

    expect(history.combined.map(month => [month.total, month.knownPart])).toEqual([
      [null, 100_00],
      [150_00, null],
    ])
  })

  describe("after a group's last measured value", () => {
    const valuesOf = (months: readonly KindMonth[], groupId: GroupId) => months.map(month => month.groupValues.get(groupId))

    it('continues the average monthly change of its readings to the newest month, filling interior gaps as before', () => {
      const history = monthEndHistory({
        groups: [cashA, cashB],
        balances: [],
        monthEndBalances: [
          monthEndBalance('2030-01', 'cash-a', 100_00),
          monthEndBalance('2030-03', 'cash-a', 130_00),
          monthEndBalance('2030-06', 'cash-a', 160_00),
          monthEndBalance('2030-08', 'cash-b', 1_00),
        ],
        months: monthRecords(['2030-02', 'gap']),
      })

      // (160 - 100) / 5 months: 12 euros a month after June.
      expect(valuesOf(history.cash.months, cashA.id)).toEqual([
        { cents: 100_00, quality: 'measured' },
        { cents: 115_00, quality: 'estimated' },
        { cents: 130_00, quality: 'measured' },
        { cents: 140_00, quality: 'estimated' },
        { cents: 150_00, quality: 'estimated' },
        { cents: 160_00, quality: 'measured' },
        { cents: 172_00, quality: 'estimated' },
        { cents: 184_00, quality: 'estimated' },
      ])
      expect(history.cash.months[1].isGap).toBe(true)
      expect(history.cash.months.at(-1)).toMatchObject({ month: '2030-08', total: null, estimatedTotal: 185_00, knownPart: null })
      expect(history.combined.at(-1)).toMatchObject({ total: null, estimatedTotal: 185_00 })
    })

    it('takes the trend from its latest twelve readings only', () => {
      const firstTwo = [monthEndBalance('2030-01', 'cash-a', 0), monthEndBalance('2030-02', 'cash-a', 1_000_00)]
      const latestTwelve = Array.from({ length: 12 }, (_, index) =>
        monthEndBalance(addMonths('2030-03' as Month, index), 'cash-a', 100_00 + index * 10_00)
      )

      const history = monthEndHistory({
        groups: [cashA, cashB],
        balances: [],
        monthEndBalances: [...firstTwo, ...latestTwelve, monthEndBalance('2031-03', 'cash-b', 1_00)],
        months: new Map(),
      })

      // From 100 in March 2030 to 210 in February 2031: 10 euros a month.
      expect(history.cash.months.at(-1)?.groupValues.get(cashA.id)).toEqual({ cents: 220_00, quality: 'estimated' })
    })

    it('uses fewer than twelve readings when that is all there is, rounded to the cent', () => {
      const history = monthEndHistory({
        groups: [cashA, cashB],
        balances: [],
        monthEndBalances: [
          monthEndBalance('2030-01', 'cash-a', 100_00),
          monthEndBalance('2030-04', 'cash-a', 100_01),
          monthEndBalance('2030-06', 'cash-b', 1_00),
        ],
        months: new Map(),
      })

      // A third of a cent a month: 100.0133 and 100.0167 euros in May and June.
      expect(valuesOf(history.cash.months, cashA.id).slice(3)).toEqual([
        { cents: 100_01, quality: 'measured' },
        { cents: 100_01, quality: 'estimated' },
        { cents: 100_02, quality: 'estimated' },
      ])
    })

    it('carries a single reading forward', () => {
      const history = monthEndHistory({
        groups: [cashA, cashB],
        balances: [],
        monthEndBalances: [
          monthEndBalance('2030-01', 'cash-a', 50_00),
          monthEndBalance('2030-01', 'cash-b', 10_00),
          monthEndBalance('2030-02', 'cash-b', 20_00),
          monthEndBalance('2030-03', 'cash-b', 30_00),
        ],
        months: new Map(),
      })

      expect(valuesOf(history.cash.months, cashA.id)).toEqual([
        { cents: 50_00, quality: 'measured' },
        { cents: 50_00, quality: 'estimated' },
        { cents: 50_00, quality: 'estimated' },
      ])
      expect(history.cash.months.map(month => month.estimatedTotal)).toEqual([null, 70_00, 80_00])
    })

    it('estimates nothing past the newest month of the history or past the month a group closed', () => {
      const history = monthEndHistory({
        groups: [{ ...cashA, closed: '2030-02' as Month }, cashB],
        balances: [],
        monthEndBalances: [
          monthEndBalance('2030-01', 'cash-a', 10_00),
          monthEndBalance('2030-01', 'cash-b', 20_00),
          monthEndBalance('2030-02', 'cash-b', 20_00),
        ],
        months: monthRecords(['2030-04', 'gap']),
      })

      expect(history.cash.months.map(month => month.month)).toEqual(['2030-01', '2030-02', '2030-03', '2030-04'])
      expect(valuesOf(history.cash.months, cashA.id)).toEqual([
        { cents: 10_00, quality: 'measured' },
        { cents: 10_00, quality: 'estimated' },
        undefined,
        undefined,
      ])
    })
  })
})
