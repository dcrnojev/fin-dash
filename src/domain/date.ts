import type { IsoDate } from './types.ts'

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const millisecondsPerDay = 86_400_000
// Spreadsheet date serials count days from 1899-12-30 in both Google Sheets and Excel.
const serialEpoch = Date.UTC(1899, 11, 30)

export function parseIsoDate(text: string): IsoDate | null {
  const match = isoDatePattern.exec(text)

  if (match === null)
    return null

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null

  return text as IsoDate
}

// The fraction of a serial is the time of day, which dates here do not carry.
export function serialToIsoDate(serial: number): IsoDate | null {
  if (!Number.isFinite(serial) || serial < 1)
    return null

  return new Date(serialEpoch + Math.floor(serial) * millisecondsPerDay).toISOString().slice(0, 10) as IsoDate
}

export function isoDateToSerial(date: IsoDate): number {
  return (Date.parse(date) - serialEpoch) / millisecondsPerDay
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return (Date.parse(to) - Date.parse(from)) / millisecondsPerDay
}

// The calendar date of `date` where the code runs, not in UTC.
export function localIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}` as IsoDate
}
