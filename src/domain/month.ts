import type { IsoDate, Month, MonthIndex } from './types.ts'

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

export function parseMonth(text: string): Month | null {
  return monthPattern.test(text) ? (text as Month) : null
}

export function monthIndex(month: Month): MonthIndex {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1
}

export function monthFromIndex(index: MonthIndex): Month {
  const year = Math.floor(index / 12)
  const month = index - year * 12 + 1

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as Month
}

export function addMonths(month: Month, count: number): Month {
  return monthFromIndex(monthIndex(month) + count)
}

export function monthOfDate(date: IsoDate): Month {
  return date.slice(0, 7) as Month
}

export function dateInMonth(month: Month, day: number): IsoDate {
  return `${month}-${String(day).padStart(2, '0')}` as IsoDate
}

export function lastDayOfMonth(month: Month): IsoDate {
  const year = Number(month.slice(0, 4))
  const monthNumber = Number(month.slice(5, 7))

  return dateInMonth(month, new Date(Date.UTC(year, monthNumber, 0)).getUTCDate())
}

export function monthsFromTo(first: Month, last: Month): Month[] {
  const months: Month[] = []

  for (let index = monthIndex(first); index <= monthIndex(last); index++)
    months.push(monthFromIndex(index))

  return months
}
