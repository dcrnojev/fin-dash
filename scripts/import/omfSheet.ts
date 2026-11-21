import { serialToIsoDate } from '../../src/domain/date.ts'
import { toCents } from '../../src/domain/money.ts'
import type { Cents, IsoDate } from '../../src/domain/types.ts'
import type { CellProblem } from './cashBalanceSheet.ts'
import type { LegacyPerson } from './legacyGroups.ts'
import { cellAt, findHeaderRow, headerText, isEmptyCell, type LegacyCell, type LegacySheet } from './legacySheet.ts'

export const omfSheetName = 'OMF'

export const omfHeaders = {
  date: 'Datum',
  payment: 'Uplata',
  cumulative: 'Total Uplate',
  balance: 'Stanje',
  ratio: 'Uplate vs. Stanje',
} as const

export interface OmfAmountCell {
  address: string
  cents: Cents
  formula: string | null
}

export interface OmfRow {
  row: number
  date: IsoDate
  dateAddress: string
  payment: OmfAmountCell
  cumulative: OmfAmountCell | null
  balance: OmfAmountCell | null
}

export interface OmfSheet {
  sheet: LegacySheet
  headerRow: number
  titleAddress: string
  owner: LegacyPerson
  columns: Record<keyof typeof omfHeaders, string>
  rows: OmfRow[]
  problems: CellProblem[]
}

// The 2nd pillar log: one row per payment, the first being the balance transferred in. The title row above the headers
// names whose pension it is, by the same first name as that partner's cash column.
export function readOmf(sheet: LegacySheet, people: readonly LegacyPerson[]): OmfSheet {
  const headerRow = findHeaderRow(sheet, omfHeaders.date)

  if (headerRow === null)
    throw new Error(`${sheet.name}: no header cell ${omfHeaders.date} in the top rows.`)

  const columns = findColumns(sheet, headerRow)
  const titleCell = [...sheet.cells.values()].find(cell => cell.row < headerRow && headerText(cell) !== '')
  const owners = people.filter(person => titleCell !== undefined && namesPerson(headerText(titleCell), person))

  if (titleCell === undefined || owners.length !== 1)
    throw new Error(`${sheet.name}: the title above the headers must name exactly one of the partners; it names ${owners.length}.`)

  const rows: OmfRow[] = []
  const problems: CellProblem[] = []
  const dataRows = [...new Set([...sheet.cells.values()].map(cell => cell.row))].filter(row => row > headerRow).sort((a, b) => a - b)

  for (const row of dataRows) {
    const dateCell = cellAt(sheet, columns.date, row)
    const date = typeof dateCell?.value === 'number' ? serialToIsoDate(dateCell.value) : null
    const payment = amountCell(cellAt(sheet, columns.payment, row), problems)

    if (dateCell === undefined || date === null || payment === null) {
      problems.push({ address: `${columns.date}${row}`, message: `Row ${row} needs a date and a payment, so it was not read.` })
      continue
    }

    rows.push({
      row,
      date,
      dateAddress: dateCell.address,
      payment,
      cumulative: amountCell(cellAt(sheet, columns.cumulative, row), problems),
      balance: amountCell(cellAt(sheet, columns.balance, row), problems),
    })
  }

  return { sheet, headerRow, titleAddress: titleCell.address, owner: owners[0], columns, rows, problems }
}

function findColumns(sheet: LegacySheet, headerRow: number): Record<keyof typeof omfHeaders, string> {
  const columnOf = (header: string): string => {
    const cell = [...sheet.cells.values()].find(candidate => candidate.row === headerRow && headerText(candidate) === header)

    if (cell === undefined)
      throw new Error(`${sheet.name}: no ${header} column.`)

    return cell.column
  }

  return {
    date: columnOf(omfHeaders.date),
    payment: columnOf(omfHeaders.payment),
    cumulative: columnOf(omfHeaders.cumulative),
    balance: columnOf(omfHeaders.balance),
    ratio: columnOf(omfHeaders.ratio),
  }
}

function amountCell(cell: LegacyCell | undefined, problems: CellProblem[]): OmfAmountCell | null {
  if (cell === undefined || isEmptyCell(cell))
    return null

  if (typeof cell.value !== 'number') {
    problems.push({ address: cell.address, message: `${JSON.stringify(cell.value)} is not a number.` })
    return null
  }

  return { address: cell.address, cents: toCents(cell.value), formula: cell.formula }
}

function namesPerson(title: string, person: LegacyPerson): boolean {
  return title.toLocaleLowerCase().split(/[^\p{L}]+/u).includes(person.name.toLocaleLowerCase())
}
