import { isoDateToSerial } from '../date.ts'
import { centsToEuros } from '../money.ts'
import type { Cents, IsoDate } from '../types.ts'
import type { CellValue } from './tabSpec.ts'

// Cells are written RAW, so months and ids stay text and blanks are empty strings.

export function dateCell(date: IsoDate | null): CellValue {
  return date === null ? '' : isoDateToSerial(date)
}

export function moneyCell(cents: Cents | null): CellValue {
  return cents === null ? '' : centsToEuros(cents)
}

export function optionalCell(value: string | number | null): CellValue {
  return value ?? ''
}
