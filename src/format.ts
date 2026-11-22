import type { MonthFigure } from './calc/monthFigure'
import { centsToEuros } from './domain/money'
import type { Cents, Month } from './domain/types'

const euros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' })
const signedEuros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' })
const wholeEuros = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const signedPercent = new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const wholePercent = new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 0 })
const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const longMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })

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

// A share such as progress towards a goal, in whole percent; shown even while amounts are hidden.
export function displayPercent(ratio: number): string {
  return wholePercent.format(ratio)
}

// 'Oct 2026', for axes and tables.
export function displayMonth(month: Month): string {
  return shortMonth.format(firstDay(month))
}

// 'October 2026', for headings.
export function displayLongMonth(month: Month): string {
  return longMonth.format(firstDay(month))
}

// 'October', where the year is clear from the context.
export function displayMonthName(month: Month): string {
  return monthName.format(firstDay(month))
}

function firstDay(month: Month): Date {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1))
}

// '≈' before an estimated figure, '≥' before a lower bound, both before a lower bound that includes an estimate.
export function figureMark(figure: Pick<MonthFigure, 'state' | 'includesEstimates'>): string {
  if (figure.state === 'at-least')
    return figure.includesEstimates ? '≥ ≈' : '≥'

  return figure.state === 'estimated' ? '≈' : ''
}

export function displayFigure(figure: MonthFigure, hidden: boolean): string {
  const mark = figureMark(figure)
  const euros = displayEuros(figure.cents, hidden)

  return mark === '' ? euros : `${mark} ${euros}`
}

// '1 row', '3 rows': for nouns whose plural adds an s.
export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
