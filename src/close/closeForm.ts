import { sumCents } from '../domain/money.ts'
import { addMonths, isOpenInMonth } from '../domain/month.ts'
import type { Cents, Holding, IsoDate, Ledger, Month, Pot, PotKind, Snapshot } from '../domain/types.ts'

// close: enter a month for the first time. edit: change the values of a month that is already closed or legacy.
export type FormMode = 'close' | 'edit'

export interface EnteredValue {
  value: Cents
  // The pension statement date; null for cash and investments, whose rows take the date of the write.
  asOf: IsoDate | null
}

// One value the form asks for: a pot's, or one of its holdings'.
export interface CloseField {
  // Unique within the form.
  key: string
  pot: Pot
  holding: Holding | null
  // Last month's row at the same level, offered as a hint.
  lastMonth: EnteredValue | null
  // The row the sheet already has for the month at this level, from a close that failed midway, typed by hand, or
  // closed earlier. Closing keeps it as it is, so the field shows it read-only; editing starts from it.
  alreadyWritten: EnteredValue | null
}

export interface ClosePot {
  pot: Pot
  // One pot-level field, or one per holding.
  fields: CloseField[]
  // Last month's pot total when it was entered at the other level (one pot row against holding rows): a hint only,
  // since no field matches it.
  lastMonthTotalAtOtherLevel: Cents | null
}

// The pots open in the month, in sort order.
export interface CloseForm {
  month: Month
  mode: FormMode
  cash: ClosePot[]
  investments: ClosePot[]
  pensions: ClosePot[]
}

type FormInput = Pick<Ledger, 'pots' | 'holdings' | 'snapshots'>

export function closeForm(ledger: FormInput, month: Month, mode: FormMode): CloseForm {
  const potsOfKind = (kind: PotKind): ClosePot[] =>
    ledger.pots
      .filter(pot => pot.kind === kind && isOpenInMonth(pot, month))
      .sort((a, b) => a.sort - b.sort)
      .map(pot => closePot(ledger, pot, month))

  return { month, mode, cash: potsOfKind('cash'), investments: potsOfKind('investment'), pensions: potsOfKind('pension') }
}

export function closeFields(form: CloseForm): CloseField[] {
  return [...form.cash, ...form.investments, ...form.pensions].flatMap(closePot => closePot.fields)
}

export function isReadOnly(form: CloseForm, field: CloseField): boolean {
  return form.mode === 'close' && field.alreadyWritten !== null
}

export function fieldLabel(field: CloseField): string {
  return field.holding === null ? field.pot.label : `${field.pot.label}: ${field.holding.label}`
}

// Only investment pots are entered per holding, while they have holdings open. Rows the sheet already has for the month
// decide the level instead, so a value is never asked for at a level that writing would then have to drop.
function closePot(ledger: FormInput, pot: Pot, month: Month): ClosePot {
  const rowsIn = (rowMonth: Month) => ledger.snapshots.filter(snapshot => snapshot.month === rowMonth && snapshot.pot === pot.id)
  const lastMonthRows = rowsIn(addMonths(month, -1))
  const rowsAlreadyWritten = rowsIn(month)
  const potHoldings = ledger.holdings.filter(holding => holding.pot === pot.id)

  const openHoldings = pot.kind === 'investment' ? potHoldings.filter(holding => isOpenInMonth(holding, month)) : []
  const writtenHoldingIds = new Set(rowsAlreadyWritten.flatMap(snapshot => (snapshot.holding === null ? [] : [snapshot.holding])))

  const perHolding = rowsAlreadyWritten.length > 0 ? writtenHoldingIds.size > 0 : openHoldings.length > 0
  const fieldHoldings: (Holding | null)[] = perHolding
    ? potHoldings.filter(holding => openHoldings.includes(holding) || writtenHoldingIds.has(holding.id))
    : [null]

  const fields = fieldHoldings.map(
    (holding): CloseField => ({
      key: holding === null ? pot.id : `${pot.id}|${holding.id}`,
      pot,
      holding,
      lastMonth: rowAtLevel(pot, lastMonthRows, holding),
      alreadyWritten: rowAtLevel(pot, rowsAlreadyWritten, holding),
    })
  )

  const lastMonthWasPerHolding = lastMonthRows.some(snapshot => snapshot.holding !== null)
  const levelChanged = lastMonthRows.length > 0 && lastMonthWasPerHolding !== perHolding

  return { pot, fields, lastMonthTotalAtOtherLevel: levelChanged ? sumCents(lastMonthRows.map(snapshot => snapshot.value)) : null }
}

function rowAtLevel(pot: Pot, rows: readonly Snapshot[], holding: Holding | null): EnteredValue | null {
  const row = rows.find(snapshot => snapshot.holding === (holding?.id ?? null))

  return row === undefined ? null : { value: row.value, asOf: pot.kind === 'pension' ? row.asOf : null }
}
