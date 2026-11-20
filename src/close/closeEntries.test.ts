import { describe, expect, it } from 'vitest'
import type { Month } from '../domain/types.ts'
import { initialEntries, readEntries, withLastMonthAmount } from './closeEntries.ts'
import { closeFields, closeForm } from './closeForm.ts'
import { pot, snapshot } from './closeTestData.ts'

const november = '2030-11' as Month

const ledger = {
  pots: [pot('cash-a', 'cash', 10), pot('cash-b', 'cash', 20), pot('fund', 'investment', 30), pot('pillar', 'pension', 40)],
  holdings: [],
  snapshots: [
    snapshot('2030-10', 'cash-a', 1234_56, null, '2030-10-31'),
    snapshot('2030-10', 'pillar', 900_00, null, '2030-10-04'),
    snapshot('2030-11', 'cash-b', 70_00, null, '2030-11-30'),
  ],
}

const form = closeForm(ledger, november, 'close')

describe('initialEntries', () => {
  it('starts empty, except for a row the month already has', () => {
    expect(initialEntries(form)).toEqual({
      'cash-a': { amount: '', asOf: '' },
      'cash-b': { amount: '70,00', asOf: '' },
      fund: { amount: '', asOf: '' },
      pillar: { amount: '', asOf: '' },
    })
  })
})

describe('withLastMonthAmount', () => {
  it("fills last month's amount and leaves the statement date as it is", () => {
    const [cashA, , fund, pillar] = closeFields(form)

    expect(withLastMonthAmount({ amount: '', asOf: '' }, cashA)).toEqual({ amount: '1.234,56', asOf: '' })
    expect(withLastMonthAmount({ amount: '1', asOf: '2030-11-02' }, pillar)).toEqual({ amount: '900,00', asOf: '2030-11-02' })
    expect(withLastMonthAmount({ amount: '5', asOf: '' }, fund)).toEqual({ amount: '5', asOf: '' })
  })
})

describe('readEntries', () => {
  it('reads every field, taking a row already written as it is', () => {
    const result = readEntries(form, {
      'cash-a': { amount: '-12,50', asOf: '' },
      'cash-b': { amount: 'ignored', asOf: '' },
      fund: { amount: '2000.5', asOf: '' },
      pillar: { amount: '950', asOf: '2030-11-05' },
    })

    expect(result.status).toBe('valid')
    expect(result.status === 'valid' && result.fields.map(({ field, entered }) => [field.key, entered])).toEqual([
      ['cash-a', { value: -12_50, asOf: null }],
      ['cash-b', { value: 70_00, asOf: null }],
      ['fund', { value: 2000_50, asOf: null }],
      ['pillar', { value: 950_00, asOf: '2030-11-05' }],
    ])
  })

  it('reports a blank, an unreadable and a negative amount, and a missing statement date', () => {
    const result = readEntries(form, {
      'cash-a': { amount: '', asOf: '' },
      fund: { amount: '-5', asOf: '' },
      pillar: { amount: '1,234.56', asOf: '' },
    })

    const problem = expect.any(String)

    expect(result.status === 'invalid' && Object.fromEntries(result.errors)).toEqual({
      'cash-a': { amount: problem, asOf: null },
      fund: { amount: problem, asOf: null },
      pillar: { amount: problem, asOf: problem },
    })
  })

  it('rejects a statement date outside the month being closed', () => {
    const entries = { 'cash-a': { amount: '1', asOf: '' }, fund: { amount: '1', asOf: '' } }
    const read = (asOf: string) => readEntries(form, { ...entries, pillar: { amount: '950', asOf } })
    const before = read('2030-10-31')

    expect(before.status === 'invalid' && before.errors.get('pillar')?.asOf).toMatch(/Nov 2030/)
    expect(read('2030-12-01').status).toBe('invalid')
    expect(read('2030-11-30').status).toBe('valid')
  })

  it('when editing, takes unchanged rows as stored, lets a pot with no row stay blank and refuses to blank a row', () => {
    const withPension = [...ledger.snapshots, snapshot('2030-11', 'pillar', 910_00, null, '2030-11-05')]
    const editForm = closeForm({ ...ledger, snapshots: withPension }, november, 'edit')
    const unchanged = initialEntries(editForm)

    const kept = readEntries(editForm, { ...unchanged, 'cash-b': { amount: '75', asOf: '' } })

    expect(kept.status === 'valid' && kept.fields.map(({ field, entered }) => [field.key, entered])).toEqual([
      ['cash-b', { value: 75_00, asOf: null }],
      ['pillar', { value: 910_00, asOf: '2030-11-05' }],
    ])

    const blanked = readEntries(editForm, { ...unchanged, pillar: { amount: '', asOf: '2030-11-05' } })

    expect(blanked.status === 'invalid' && [...blanked.errors.keys()]).toEqual(['pillar'])
  })
})
