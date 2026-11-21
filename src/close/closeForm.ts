import { sumCents } from '../domain/money.ts'
import { addMonths, isOpenInMonth } from '../domain/month.ts'
import type { Balance, Cents, Group, GroupKind, IsoDate, Ledger, Month, MonthEndBalance } from '../domain/types.ts'

// close: enter a month for the first time. edit: change the values of a month that is already closed or legacy.
export type FormMode = 'close' | 'edit'

export interface EnteredValue {
  value: Cents
  // The pension statement date; null for cash and investments, whose rows take the date of the write.
  asOf: IsoDate | null
}

// One value the form asks for: a group's, or one of its balances'.
export interface CloseField {
  // Unique within the form.
  key: string
  group: Group
  balance: Balance | null
  // Last month's row at the same level, offered as a hint.
  lastMonth: EnteredValue | null
  // The row the sheet already has for the month at this level, from a close that failed midway, typed by hand, or
  // closed earlier. Closing keeps it as it is, so the field shows it read-only; editing starts from it.
  alreadyWritten: EnteredValue | null
}

export interface CloseGroup {
  group: Group
  // One group-level field, or one per balance.
  fields: CloseField[]
  // Last month's group total when it was entered at the other level (one group row against balance rows): a hint only,
  // since no field matches it.
  lastMonthTotalAtOtherLevel: Cents | null
}

// The groups open in the month, in sort order.
export interface CloseForm {
  month: Month
  mode: FormMode
  cash: CloseGroup[]
  investments: CloseGroup[]
  pensions: CloseGroup[]
}

type FormInput = Pick<Ledger, 'groups' | 'balances' | 'monthEndBalances'>

export function closeForm(ledger: FormInput, month: Month, mode: FormMode): CloseForm {
  const groupsOfKind = (kind: GroupKind): CloseGroup[] =>
    ledger.groups
      .filter(group => group.kind === kind && isOpenInMonth(group, month))
      .sort((a, b) => a.sort - b.sort)
      .map(group => closeGroup(ledger, group, month))

  return { month, mode, cash: groupsOfKind('cash'), investments: groupsOfKind('investment'), pensions: groupsOfKind('pension') }
}

export function closeFields(form: CloseForm): CloseField[] {
  return [...form.cash, ...form.investments, ...form.pensions].flatMap(closeGroup => closeGroup.fields)
}

export function isReadOnly(form: CloseForm, field: CloseField): boolean {
  return form.mode === 'close' && field.alreadyWritten !== null
}

export function fieldLabel(field: CloseField): string {
  return field.balance === null ? field.group.label : `${field.group.label}: ${field.balance.label}`
}

// Only investment groups are entered per balance, while they have balances open. Rows the sheet already has for the month
// decide the level instead, so a value is never asked for at a level that writing would then have to drop.
function closeGroup(ledger: FormInput, group: Group, month: Month): CloseGroup {
  const rowsIn = (rowMonth: Month) => ledger.monthEndBalances.filter(row => row.month === rowMonth && row.group === group.id)
  const lastMonthRows = rowsIn(addMonths(month, -1))
  const rowsAlreadyWritten = rowsIn(month)
  const groupBalances = ledger.balances.filter(balance => balance.group === group.id)

  const openBalances = group.kind === 'investment' ? groupBalances.filter(balance => isOpenInMonth(balance, month)) : []
  const writtenBalanceIds = new Set(rowsAlreadyWritten.flatMap(row => (row.balance === null ? [] : [row.balance])))

  const perBalance = rowsAlreadyWritten.length > 0 ? writtenBalanceIds.size > 0 : openBalances.length > 0
  const fieldBalances: (Balance | null)[] = perBalance
    ? groupBalances.filter(balance => openBalances.includes(balance) || writtenBalanceIds.has(balance.id))
    : [null]

  const fields = fieldBalances.map(
    (balance): CloseField => ({
      key: balance === null ? group.id : `${group.id}|${balance.id}`,
      group,
      balance,
      lastMonth: rowAtLevel(group, lastMonthRows, balance),
      alreadyWritten: rowAtLevel(group, rowsAlreadyWritten, balance),
    })
  )

  const lastMonthWasPerBalance = lastMonthRows.some(monthEndBalance => monthEndBalance.balance !== null)
  const levelChanged = lastMonthRows.length > 0 && lastMonthWasPerBalance !== perBalance

  return { group, fields, lastMonthTotalAtOtherLevel: levelChanged ? sumCents(lastMonthRows.map(row => row.value)) : null }
}

function rowAtLevel(group: Group, rows: readonly MonthEndBalance[], balance: Balance | null): EnteredValue | null {
  const row = rows.find(monthEndBalance => monthEndBalance.balance === (balance?.id ?? null))

  return row === undefined ? null : { value: row.value, asOf: group.kind === 'pension' ? row.asOf : null }
}
