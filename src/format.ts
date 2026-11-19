import { centsToEuros } from './domain/money'
import type { Cents, Month } from './domain/types'

const euros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' })
const signedEuros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' })
const wholeEuros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const signedPercent = new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

// Shown in place of every euro figure while amounts are hidden.
export const hiddenEuros = '••• €'

export function displayEuros(cents: Cents, hidden: boolean): string {
  return hidden ? hiddenEuros : euros.format(centsToEuros(cents))
}

export function displaySignedEuros(cents: Cents, hidden: boolean): string {
  return hidden ? hiddenEuros : signedEuros.format(centsToEuros(cents))
}

// For chart axes, where cents are noise.
export function displayWholeEuros(cents: number, hidden: boolean): string {
  return hidden ? '•••' : wholeEuros.format(cents / 100)
}

// Shown even while amounts are hidden: a rate of change reveals no balance.
export function displaySignedPercent(ratio: number): string {
  return signedPercent.format(ratio)
}

export function displayMonth(month: Month): string {
  return shortMonth.format(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)))
}
