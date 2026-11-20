import { describe, expect, it } from 'vitest'
import type { Cents } from '../domain/types.ts'
import { formatMoneyInput, parseMoneyInput } from './moneyInput.ts'

describe('parseMoneyInput', () => {
  it.each([
    ['1.234,56', 1234_56],
    ['1234,56', 1234_56],
    ['1234,5', 1234_50],
    ['1234.56', 1234_56],
    ['1234.5', 1234_50],
    ['1234', 1234_00],
    ['1.234', 1234_00],
    ['12.345.678,9', 12_345_678_90],
    [' 1 234,56 € ', 1234_56],
    ['-50,25', -50_25],
    ['0', 0],
  ])('reads %j as %d cents', (text, cents) => {
    expect(parseMoneyInput(text)).toBe(cents)
  })

  it.each(['', 'abc', '1,234.56', '12,345', '1.2345', '12.34.56', '1.23,4', ',5', '1..2', '--1'])('rejects %j', text => {
    expect(parseMoneyInput(text)).toBeNull()
  })
})

describe('formatMoneyInput', () => {
  it('writes the Croatian form, which reads back to the same cents', () => {
    const amounts = [0, 5, 1234_56, 1_000_000_00, -12_30] as Cents[]

    expect(amounts.map(formatMoneyInput)).toEqual(['0,00', '0,05', '1.234,56', '1.000.000,00', '-12,30'])
    expect(amounts.map(cents => parseMoneyInput(formatMoneyInput(cents)))).toEqual(amounts)
  })
})
