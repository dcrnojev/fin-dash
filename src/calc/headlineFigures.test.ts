import { describe, expect, it } from 'vitest'
import { addMonths } from '../domain/month.ts'
import type { Cents, Month, MonthRecord, Pot, PotId, Snapshot } from '../domain/types.ts'
import { headlineFigures } from './headlineFigures.ts'
import { snapshotHistory } from './snapshotHistory.ts'

const cash: Pot = {
  id: 'cash-a' as PotId,
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

const fund: Pot = { ...cash, id: 'fund' as PotId, label: 'Fund', kind: 'investment', sort: 40 }

function snapshot(month: Month, potId: PotId, cents: number): Snapshot {
  return { month, pot: potId, holding: null, value: cents as Cents, asOf: null, source: 'import', sourceRef: null, note: null, ref: null }
}

const first = '2030-01' as Month

// Thirteen months of cash, growing by 10 euros a month from 100 euros.
const cashYear = Array.from({ length: 13 }, (_, index) => snapshot(addMonths(first, index), cash.id, 100_00 + index * 10_00))
const latest = addMonths(first, 12)

describe('headlineFigures', () => {
  it('compares the latest month with the previous month and with twelve months earlier', () => {
    const figures = headlineFigures(snapshotHistory({ pots: [cash], snapshots: cashYear, months: new Map() }))

    expect(figures?.month).toBe(latest)
    expect(figures?.cash.total).toBe(220_00)
    expect(figures?.cash.versusPreviousMonth).toEqual({ since: addMonths(latest, -1), amount: 10_00, ratio: 10 / 210, isEstimated: false })
    expect(figures?.cash.versusYearEarlier).toEqual({ since: first, amount: 120_00, ratio: 1.2, isEstimated: false })
  })

  it('flags a change against an estimated gap month, and leaves out a change from before the history', () => {
    const withoutPrevious = cashYear.filter(row => row.month !== addMonths(latest, -1))
    const gap: MonthRecord = { month: addMonths(latest, -1), status: 'gap', closedOn: null, closedBy: null, frozenPlan: null, note: null }

    const figures = headlineFigures(
      snapshotHistory({ pots: [cash], snapshots: withoutPrevious.slice(1), months: new Map([[gap.month, gap]]) })
    )

    expect(figures?.cash.total).toBe(220_00)
    expect(figures?.cash.isEstimated).toBe(false)
    expect(figures?.cash.versusPreviousMonth).toEqual({ since: gap.month, amount: 10_00, ratio: 10 / 210, isEstimated: true })
    expect(figures?.cash.versusYearEarlier).toBeNull()
  })

  it('shows the known part of a partial total and no change against it', () => {
    const snapshots = [...cashYear, snapshot(addMonths(latest, -1), fund.id, 50_00)]
    const figures = headlineFigures(snapshotHistory({ pots: [cash, fund], snapshots, months: new Map() }))

    expect(figures?.investments).toEqual({
      total: null,
      knownPart: null,
      isEstimated: false,
      versusPreviousMonth: null,
      versusYearEarlier: null,
    })
    expect(figures?.combined.total).toBeNull()
    expect(figures?.combined.knownPart).toBe(220_00)
    expect(figures?.combined.versusPreviousMonth).toBeNull()
  })
})
