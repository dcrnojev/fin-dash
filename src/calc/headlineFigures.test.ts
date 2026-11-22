import { describe, expect, it } from 'vitest'
import { addMonths } from '../domain/month.ts'
import type { Cents, Group, GroupId, Month, MonthEndBalance, MonthRecord } from '../domain/types.ts'
import { headlineFigures } from './headlineFigures.ts'
import { monthEndHistory } from './monthEndHistory.ts'

const cash: Group = {
  id: 'cash-a' as GroupId,
  label: 'Cash A',
  kind: 'cash',
  owner: 'household',
  provider: null,
  liquidity: 'liquid',
  cadence: 'monthly',
  opened: null,
  closed: null,
  returns: null,
  sort: 10,
  note: null,
}

const fund: Group = { ...cash, id: 'fund' as GroupId, label: 'Fund', kind: 'investment', sort: 40 }

function monthEndBalance(month: Month, groupId: GroupId, cents: number): MonthEndBalance {
  return { month, group: groupId, balance: null, value: cents as Cents, asOf: null, source: 'import', sourceRef: null, note: null, ref: null }
}

const first = '2030-01' as Month

// Thirteen months of cash, growing by 10 euros a month from 100 euros.
const cashYear = Array.from({ length: 13 }, (_, index) => monthEndBalance(addMonths(first, index), cash.id, 100_00 + index * 10_00))
const latest = addMonths(first, 12)

describe('headlineFigures', () => {
  it('compares the latest month with the previous month and with twelve months earlier', () => {
    const figures = headlineFigures(monthEndHistory({ groups: [cash], balances: [], monthEndBalances: cashYear, months: new Map() }))

    expect(figures?.month).toBe(latest)
    expect(figures?.cash.total).toBe(220_00)
    expect(figures?.cash.versusPreviousMonth).toEqual({ since: addMonths(latest, -1), amount: 10_00, ratio: 10 / 210 })
    expect(figures?.cash.versusYearEarlier).toEqual({ since: first, amount: 120_00, ratio: 1.2 })
  })

  it('keeps a change against an estimated gap month apart from measured changes, and leaves out a change from before the history', () => {
    const withoutPrevious = cashYear.filter(row => row.month !== addMonths(latest, -1))
    const gap: MonthRecord = { month: addMonths(latest, -1), status: 'gap', closedOn: null, closedBy: null, frozenPlan: null, note: null }

    const figures = headlineFigures(
      monthEndHistory({ groups: [cash], balances: [], monthEndBalances: withoutPrevious.slice(1), months: new Map([[gap.month, gap]]) })
    )

    expect(figures?.cash.total).toBe(220_00)
    expect(figures?.cash.estimatedTotal).toBeNull()
    expect(figures?.cash.versusPreviousMonth).toBeNull()
    expect(figures?.cash.estimatedVersusPreviousMonth).toEqual({ since: gap.month, amount: 10_00, ratio: 10 / 210 })
    expect(figures?.cash.versusYearEarlier).toBeNull()
  })

  it('shows the known part of a partial total and no change against it', () => {
    const newFund = { ...fund, opened: latest }
    const figures = headlineFigures(monthEndHistory({ groups: [cash, newFund], balances: [], monthEndBalances: cashYear, months: new Map() }))

    expect(figures?.investments).toEqual({
      total: null,
      estimatedTotal: null,
      knownPart: null,
      knownPartIncludesEstimates: false,
      versusPreviousMonth: null,
      estimatedVersusPreviousMonth: null,
      versusYearEarlier: null,
      estimatedVersusYearEarlier: null,
    })
    expect(figures?.combined.total).toBeNull()
    expect(figures?.combined.knownPart).toBe(220_00)
    expect(figures?.combined.versusPreviousMonth).toBeNull()
  })
})
