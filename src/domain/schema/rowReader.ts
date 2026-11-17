import { parseIsoDate, serialToIsoDate } from '../date.ts'
import { isValidId } from '../ids.ts'
import { hasMoreThanTwoDecimals, toCents } from '../money.ts'
import { monthOfDate, parseMonth } from '../month.ts'
import type { Cents, IsoDate, Issue, Month, Rate, RowRef } from '../types.ts'
import type { Cell, ColumnSpec } from './tabSpec.ts'

// Reads one sheet row column by column. A blank required cell or an invalid cell logs an error and makes the row invalid;
// every getter returns null for it, so callers narrow their required values and check `ok` before building the object.
export class RowReader {
  private readonly cells: Readonly<Record<string, Cell>>
  private readonly columns: ReadonlyMap<string, ColumnSpec>
  private invalid = false
  private readonly issues: Issue[]
  private readonly ref: RowRef

  constructor(columns: readonly ColumnSpec[], cells: Readonly<Record<string, Cell>>, ref: RowRef, issues: Issue[]) {
    this.columns = new Map(columns.map(column => [column.name, column]))
    this.cells = cells
    this.ref = ref
    this.issues = issues
  }

  get ok(): boolean {
    return !this.invalid
  }

  addError(column: string | null, code: string, message: string): void {
    this.invalid = true
    this.issues.push({ severity: 'error', code, tab: this.ref.tab, row: this.ref.row, column, message })
  }

  addWarning(column: string | null, code: string, message: string): void {
    this.issues.push({ severity: 'warning', code, tab: this.ref.tab, row: this.ref.row, column, message })
  }

  choice<T extends string>(name: string, values: readonly T[]): T | null {
    const text = this.text(name)

    if (text === null)
      return null

    if (!(values as readonly string[]).includes(text)) {
      this.addError(name, 'invalid-enum', `"${text}" is not one of ${values.join(', ')}.`)
      return null
    }

    return text as T
  }

  date(name: string): IsoDate | null {
    const cell = this.present(name)

    if (cell === null)
      return null

    const date = typeof cell === 'number' ? serialToIsoDate(cell) : typeof cell === 'string' ? parseIsoDate(cell.trim()) : null

    if (date === null)
      this.addError(name, 'invalid-date', `${describe(cell)} is not a date.`)

    return date
  }

  id<T extends string>(name: string): T | null {
    const text = this.text(name)

    if (text === null)
      return null

    if (!isValidId(text)) {
      this.addError(name, 'invalid-id', `"${text}" is not a valid id: lowercase letters, digits and dashes, 2 to 40 characters.`)
      return null
    }

    return text as T
  }

  int(name: string): number | null {
    const value = this.number(name)

    if (value !== null && !Number.isInteger(value)) {
      this.addError(name, 'invalid-int', `${value} is not a whole number.`)
      return null
    }

    return value
  }

  money(name: string): Cents | null {
    const value = this.number(name)

    if (value === null)
      return null

    if (hasMoreThanTwoDecimals(value))
      this.addWarning(name, 'extra-decimals', `${value} has more than two decimals; it was rounded to the cent.`)

    return toCents(value)
  }

  month(name: string): Month | null {
    const cell = this.present(name)

    if (cell === null)
      return null

    if (typeof cell === 'number') {
      const date = serialToIsoDate(cell)

      if (date !== null) {
        this.addWarning(name, 'month-as-date', 'The month is a date cell; format the column as plain text and type YYYY-MM.')
        return monthOfDate(date)
      }
    }

    const month = typeof cell === 'string' ? parseMonth(cell.trim()) : null

    if (month === null)
      this.addError(name, 'invalid-month', `${describe(cell)} is not a month in the form YYYY-MM.`)

    return month
  }

  rate(name: string): Rate | null {
    return this.number(name)
  }

  text(name: string): string | null {
    const cell = this.present(name)

    return cell === null ? null : String(cell).trim()
  }

  private number(name: string): number | null {
    const cell = this.present(name)

    if (cell === null)
      return null

    if (typeof cell !== 'number' || !Number.isFinite(cell)) {
      this.addError(name, 'invalid-number', `${describe(cell)} is not a number.`)
      return null
    }

    return cell
  }

  // The cell, or null when it is blank; a blank required cell is an error.
  private present(name: string): Exclude<Cell, null> | null {
    const column = this.columns.get(name)

    if (column === undefined)
      throw new Error(`Column ${name} is not in the tab spec.`)

    const cell = this.cells[name] ?? null

    if (cell !== null && !(typeof cell === 'string' && cell.trim() === ''))
      return cell

    if (column.required)
      this.addError(name, 'missing-value', 'This column needs a value.')

    return null
  }
}

function describe(cell: Exclude<Cell, null>): string {
  return typeof cell === 'string' ? `"${cell}"` : String(cell)
}
