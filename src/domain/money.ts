import type { Cents } from './types.ts'

const centTolerance = 1e-6

export function toCents(euros: number): Cents {
  return Math.round(euros * 100) as Cents
}

export function hasMoreThanTwoDecimals(euros: number): boolean {
  return Math.abs(euros * 100 - Math.round(euros * 100)) > centTolerance
}

export function centsToEuros(cents: Cents): number {
  return cents / 100
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0) as Cents
}
