import { describe, expect, it } from 'vitest'
import type { Month } from '../domain/types.ts'
import { closeFields, closeForm } from './closeForm.ts'
import { holding, pot, snapshot } from './closeTestData.ts'

const november = '2030-11' as Month

describe('closeForm', () => {
  it('asks for every pot open in the month, in sort order, and leaves out closed and not yet opened ones', () => {
    const form = closeForm(
      {
        pots: [
          pot('cash-b', 'cash', 20),
          pot('cash-a', 'cash', 10),
          pot('cash-old', 'cash', 5, { closed: '2030-10' }),
          pot('cash-new', 'cash', 30, { opened: '2030-12' }),
          pot('fund', 'investment', 40),
          pot('pillar', 'pension', 50),
          pot('car-loan', 'loan', 60),
        ],
        holdings: [],
        snapshots: [],
      },
      november,
      'close'
    )

    expect(form.cash.map(closePot => closePot.pot.id)).toEqual(['cash-a', 'cash-b'])
    expect(form.investments.map(closePot => closePot.pot.id)).toEqual(['fund'])
    expect(form.pensions.map(closePot => closePot.pot.id)).toEqual(['pillar'])
    expect(closeFields(form).map(field => [field.key, field.holding])).toEqual([
      ['cash-a', null],
      ['cash-b', null],
      ['fund', null],
      ['pillar', null],
    ])
  })

  it('asks per open holding for an investment pot, with last month as the prefill', () => {
    const form = closeForm(
      {
        pots: [pot('broker', 'investment', 10)],
        holdings: [
          holding('broker-x', 'broker'),
          holding('broker-y', 'broker', { opened: '2030-11' }),
          holding('broker-old', 'broker', { closed: '2030-10' }),
        ],
        snapshots: [snapshot('2030-10', 'broker', 300_00, 'broker-x'), snapshot('2030-10', 'broker', 50_00, 'broker-old')],
      },
      november,
      'close'
    )

    const [broker] = form.investments

    expect(broker.fields.map(field => [field.key, field.lastMonth?.value ?? null])).toEqual([
      ['broker|broker-x', 300_00],
      ['broker|broker-y', null],
    ])
    expect(broker.lastMonthTotalAtOtherLevel).toBeNull()
  })

  it('gives last month as a hint only to a pot that switches from a pot row to holding rows', () => {
    const form = closeForm(
      {
        pots: [pot('broker', 'investment', 10)],
        holdings: [holding('broker-x', 'broker', { opened: '2030-11' }), holding('broker-y', 'broker', { opened: '2030-11' })],
        snapshots: [snapshot('2030-10', 'broker', 500_00)],
      },
      november,
      'close'
    )

    const [broker] = form.investments

    expect(broker.fields.map(field => field.lastMonth)).toEqual([null, null])
    expect(broker.lastMonthTotalAtOtherLevel).toBe(500_00)
  })

  it('enters a pension pot at pot level with its statement date, and shows rows the month already has', () => {
    const form = closeForm(
      {
        pots: [pot('pillar', 'pension', 10), pot('cash-a', 'cash', 20)],
        holdings: [holding('pillar-fund', 'pillar')],
        snapshots: [
          snapshot('2030-10', 'pillar', 900_00, null, '2030-10-04'),
          snapshot('2030-10', 'cash-a', 80_00, null, '2030-10-31'),
          snapshot('2030-11', 'cash-a', 85_00, null, '2030-11-30'),
        ],
      },
      november,
      'close'
    )

    const [cashA] = form.cash
    const [pillar] = form.pensions

    expect(pillar.fields.map(field => [field.key, field.lastMonth, field.alreadyWritten])).toEqual([
      ['pillar', { value: 900_00, asOf: '2030-10-04' }, null],
    ])
    expect(cashA.fields[0].lastMonth).toEqual({ value: 80_00, asOf: null })
    expect(cashA.fields[0].alreadyWritten).toEqual({ value: 85_00, asOf: null })
  })

  it('asks at the level of the rows the month already has, so no value is asked for and then dropped', () => {
    const form = closeForm(
      {
        pots: [pot('broker', 'investment', 10), pot('fund', 'investment', 20)],
        holdings: [holding('broker-x', 'broker'), holding('fund-x', 'fund', { closed: '2030-10' })],
        snapshots: [snapshot('2030-11', 'broker', 500_00), snapshot('2030-11', 'fund', 70_00, 'fund-x')],
      },
      november,
      'close'
    )

    expect(closeFields(form).map(field => [field.key, field.alreadyWritten?.value ?? null])).toEqual([
      ['broker', 500_00],
      ['fund|fund-x', 70_00],
    ])
  })
})
