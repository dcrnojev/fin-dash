import { describe, expect, it } from 'vitest'
import { inlineSumParts, parseLegacyFormula } from './legacyFormula.ts'

describe('inlineSumParts', () => {
  it('splits a sum into its parts in formula order', () => {
    expect(inlineSumParts('120+45.5')).toEqual([
      { position: 1, text: '120', euros: 120 },
      { position: 2, text: '45.5', euros: 45.5 },
    ])
  })

  it('keeps a product as one part and signs subtracted parts', () => {
    expect(inlineSumParts(' 100 - 20.25 + 3*1.5 ')).toEqual([
      { position: 1, text: '100', euros: 100 },
      { position: 2, text: '20.25', euros: -20.25 },
      { position: 3, text: '3*1.5', euros: 4.5 },
    ])
  })

  it('reads a formula of one number as a single part', () => {
    expect(inlineSumParts('=700')).toEqual([{ position: 1, text: '700', euros: 700 }])
  })

  it('rejects formulas that are not made of numbers only', () => {
    expect(inlineSumParts('C3+5')).toBeNull()
    expect(inlineSumParts('SUM(C2:E2)')).toBeNull()
  })

  it('rejects text outside the grammar', () => {
    expect(inlineSumParts('10+')).toBeNull()
    expect(inlineSumParts('2*(3+4)')).toBeNull()
    expect(inlineSumParts('ROUND(1.5)')).toBeNull()
    expect(inlineSumParts('10 20')).toBeNull()
  })
})

describe('parseLegacyFormula', () => {
  it('reads cell references and ranges in totals', () => {
    expect(parseLegacyFormula('SUM(C2:E2)+$F$2-G2')).toEqual([
      { sign: 1, factors: [{ kind: 'sum', from: 'C2', to: 'E2' }], text: 'SUM(C2:E2)' },
      { sign: 1, factors: [{ kind: 'cell', address: 'F2' }], text: '$F$2' },
      { sign: -1, factors: [{ kind: 'cell', address: 'G2' }], text: 'G2' },
    ])
  })
})
