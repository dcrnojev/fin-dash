import type { Cents } from '../domain/types.ts'

// Croatian form with a decimal comma, dots or spaces between thousands: 1.234,56 or 1234,5. A dot followed by exactly
// three digits is a thousands dot, so 1.234 is 1234 euros: nobody types money with three decimals.
const croatianPattern = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/
// Plain form with a decimal point: 1234.56 or 1234.5.
const plainPattern = /^(-?)(\d+)\.(\d{1,2})$/

// Euros as typed into a form, or null when the text is not an amount. Spaces and a euro sign are ignored.
export function parseMoneyInput(text: string): Cents | null {
  const compact = text.replace(/[\s€]/g, '')
  const match = croatianPattern.exec(compact) ?? plainPattern.exec(compact)

  if (match === null)
    return null

  const [, sign, wholeEuros, cents = ''] = match
  const total = Number(wholeEuros.replaceAll('.', '')) * 100 + Number(cents.padEnd(2, '0'))

  return (sign === '-' && total !== 0 ? -total : total) as Cents
}

// The amount as the form shows it, in the Croatian form `parseMoneyInput` reads back: 1.234,56.
export function formatMoneyInput(cents: Cents): string {
  const absolute = Math.abs(cents)
  const wholeEuros = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+$)/g, '.')
  const rest = String(absolute % 100).padStart(2, '0')

  return `${cents < 0 ? '-' : ''}${wholeEuros},${rest}`
}
