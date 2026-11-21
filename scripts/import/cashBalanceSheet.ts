import { serialToIsoDate } from '../../src/domain/date.ts'
import { hasMoreThanTwoDecimals, toCents } from '../../src/domain/money.ts'
import { monthOfDate } from '../../src/domain/month.ts'
import type { Cents, GroupId, IsoDate } from '../../src/domain/types.ts'
import { inlineSumParts } from './legacyFormula.ts'
import { cashGroupId, sharedGroupColumns, type LegacyPerson } from './legacyGroups.ts'
import { cellAt, columnIndex, findHeaderRow, headerText, isEmptyCell, type LegacyCell, type LegacySheet } from './legacySheet.ts'

export const cashBalanceSheetName = 'CashBalance 2023-2024'

const dateHeader = 'Datum'
const monthHelperHeader = 'Month'
const derivedHeaders = new Set(['Ukupno', 'DiffWithPrevious', 'TOTAL', 'TOTAL Cash + Financial'])
const helperHeaders = new Map([
  [monthHelperHeader, 'Month helper column; the month comes from Datum'],
  ['PartOfMonth', 'PartOfMonth helper column'],
])

export type ColumnRole =
  | { kind: 'date'; header: string }
  | { kind: 'group'; header: string; group: GroupId }
  // Totals and diffs, used only to reconcile. An empty header is a column of formulas with no header cell.
  | { kind: 'derived'; header: string }
  | { kind: 'helper'; header: string; reason: string }

export interface AmountPart {
  position: number
  text: string
  cents: Cents
  extraDecimals: boolean
}

// How the legacy cell holds its amount: a typed number, a formula of one number such as `=700`, an inline sum of numbers,
// or another formula, which is kept whole at its cached value.
export type AmountForm = 'number' | 'constant-formula' | 'inline-sum' | 'other-formula'

export interface LegacyAmount {
  address: string
  header: string
  group: GroupId
  cachedCents: Cents
  form: AmountForm
  parts: AmountPart[]
}

export interface LegacyReadingRow {
  row: number
  date: IsoDate
  dateAddress: string
  amounts: LegacyAmount[]
}

export interface CellProblem {
  address: string
  message: string
}

export interface CashBalanceSheet {
  sheet: LegacySheet
  headerRow: number
  people: LegacyPerson[]
  roles: ReadonlyMap<string, ColumnRole>
  rows: LegacyReadingRow[]
  problems: CellProblem[]
  monthHelperMismatches: string[]
}

export function readCashBalance(sheet: LegacySheet): CashBalanceSheet {
  const headerRow = findHeaderRow(sheet, dateHeader)

  if (headerRow === null)
    throw new Error(`${sheet.name}: no header cell ${dateHeader} in the top rows.`)

  const { roles, people } = columnRoles(sheet, headerRow)
  const dateColumn = [...roles].find(([, role]) => role.kind === 'date')?.[0]
  const monthHelperColumn = [...roles].find(([, role]) => role.kind === 'helper' && role.header === monthHelperHeader)?.[0]

  if (dateColumn === undefined)
    throw new Error(`${sheet.name}: no ${dateHeader} column.`)

  const dataRows = [...new Set([...sheet.cells.values()].map(cell => cell.row))].filter(row => row > headerRow).sort((a, b) => a - b)
  const rows: LegacyReadingRow[] = []
  const problems: CellProblem[] = []
  const monthHelperMismatches: string[] = []

  for (const row of dataRows) {
    const dateCell = cellAt(sheet, dateColumn, row)
    const date = typeof dateCell?.value === 'number' ? serialToIsoDate(dateCell.value) : null

    if (dateCell === undefined || date === null) {
      problems.push({ address: `${dateColumn}${row}`, message: `Row ${row} has cells but no ${dateHeader} date, so it was not read.` })
      continue
    }

    const helperCell = monthHelperColumn === undefined ? undefined : cellAt(sheet, monthHelperColumn, row)
    const helperDate = typeof helperCell?.value === 'number' ? serialToIsoDate(helperCell.value) : null

    if (helperCell !== undefined && helperDate !== null && monthOfDate(helperDate) !== monthOfDate(date))
      monthHelperMismatches.push(helperCell.address)

    const amounts: LegacyAmount[] = []

    for (const [column, role] of roles) {
      const cell = cellAt(sheet, column, row)

      if (role.kind !== 'group' || cell === undefined || isEmptyCell(cell))
        continue

      if (typeof cell.value !== 'number') {
        problems.push({ address: cell.address, message: `${JSON.stringify(cell.value)} is not a number.` })
        continue
      }

      amounts.push(readAmount(cell, cell.value, role.header, role.group))
    }

    rows.push({ row, date, dateAddress: dateCell.address, amounts })
  }

  return { sheet, headerRow, people, roles, rows, problems, monthHelperMismatches }
}

function readAmount(cell: LegacyCell, cachedValue: number, header: string, group: GroupId): LegacyAmount {
  const cachedCents = toCents(cachedValue)
  const base = { address: cell.address, header, group, cachedCents }

  if (cell.formula === null)
    return { ...base, form: 'number', parts: [part(1, String(cachedValue), cachedValue)] }

  const parts = inlineSumParts(cell.formula)

  if (parts === null)
    return { ...base, form: 'other-formula', parts: [{ position: 1, text: cell.formula, cents: cachedCents, extraDecimals: false }] }

  return {
    ...base,
    form: parts.length === 1 ? 'constant-formula' : 'inline-sum',
    parts: parts.map(inlinePart => part(inlinePart.position, inlinePart.text, inlinePart.euros)),
  }
}

function part(position: number, text: string, euros: number): AmountPart {
  return { position, text, cents: toCents(euros), extraDecimals: hasMoreThanTwoDecimals(euros) }
}

// Columns are mapped by header text. The partners' cash columns are the two headers that are not otherwise known; they hold
// the partners' first names, which are read here rather than written into the code.
function columnRoles(sheet: LegacySheet, headerRow: number): { roles: Map<string, ColumnRole>; people: LegacyPerson[] } {
  const columns = [...new Set([...sheet.cells.values()].map(cell => cell.column))].sort((a, b) => columnIndex(a) - columnIndex(b))
  const roles = new Map<string, ColumnRole>()
  const personColumns: { column: string; header: string }[] = []

  for (const column of columns) {
    const header = headerText(cellAt(sheet, column, headerRow))
    const shared = sharedGroupColumns.find(groupColumn => groupColumn.header === header)
    const helperReason = helperHeaders.get(header)

    if (header === dateHeader)
      roles.set(column, { kind: 'date', header })
    else if (shared !== undefined)
      roles.set(column, { kind: 'group', header, group: shared.group })
    else if (derivedHeaders.has(header))
      roles.set(column, { kind: 'derived', header })
    else if (helperReason !== undefined)
      roles.set(column, { kind: 'helper', header, reason: helperReason })
    else if (header === '' && onlyFormulasBelow(sheet, column, headerRow))
      roles.set(column, { kind: 'derived', header })
    else if (header !== '')
      personColumns.push({ column, header })
  }

  if (personColumns.length !== 2)
    throw new Error(`${sheet.name}: expected two partner cash columns besides the known headers, found ${personColumns.length}.`)

  const missingShared = sharedGroupColumns.filter(groupColumn => ![...roles.values()].some(role => role.header === groupColumn.header))

  if (missingShared.length > 0)
    throw new Error(`${sheet.name}: missing columns ${missingShared.map(groupColumn => groupColumn.header).join(', ')}.`)

  const people = personColumns.map(({ column, header }, index): LegacyPerson => ({ letter: index === 0 ? 'a' : 'b', name: header, column }))

  for (const person of people)
    roles.set(person.column, { kind: 'group', header: person.name, group: cashGroupId(person) })

  return { roles, people }
}

function onlyFormulasBelow(sheet: LegacySheet, column: string, headerRow: number): boolean {
  const cells = [...sheet.cells.values()].filter(cell => cell.column === column && cell.row > headerRow && !isEmptyCell(cell))

  return cells.length > 0 && cells.every(cell => cell.formula !== null)
}
