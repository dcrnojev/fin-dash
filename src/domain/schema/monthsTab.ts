import { monthStatuses, type MonthRecord } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { dateCell, moneyCell, optionalCell } from './writeCells.ts'

const planColumns = ['plan_income', 'plan_bills', 'plan_transfers', 'plan_other'] as const

const columns: readonly ColumnSpec[] = [
  { name: 'month', type: 'month', required: true },
  { name: 'status', type: 'enum', required: true, values: monthStatuses },
  { name: 'closed_on', type: 'date', required: false },
  { name: 'closed_by', type: 'text', required: false },
  ...planColumns.map(name => ({ name, type: 'money' as const, required: false })),
  { name: 'note', type: 'text', required: false },
]

export const monthsTab: TabSpec<MonthRecord> = {
  name: 'months',
  columns,
  key: record => record.month,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const month = read.month('month')
    const status = read.choice('status', monthStatuses)
    const closedOn = read.date('closed_on')
    const closedBy = read.text('closed_by')
    const [income, bills, transfers, other] = planColumns.map(name => read.money(name))
    const note = read.text('note')

    if (month === null || status === null || !read.ok)
      return null

    if (income !== null && bills !== null && transfers !== null && other !== null)
      return { month, status, closedOn, closedBy, frozenPlan: { income, bills, transfers, other }, note }

    if (income !== null || bills !== null || transfers !== null || other !== null) {
      read.addError('plan_income', 'partial-frozen-plan', 'The frozen plan needs all four plan columns or none.')
      return null
    }

    return { month, status, closedOn, closedBy, frozenPlan: null, note }
  },
  toRow: record => ({
    month: record.month,
    status: record.status,
    closed_on: dateCell(record.closedOn),
    closed_by: optionalCell(record.closedBy),
    plan_income: moneyCell(record.frozenPlan?.income ?? null),
    plan_bills: moneyCell(record.frozenPlan?.bills ?? null),
    plan_transfers: moneyCell(record.frozenPlan?.transfers ?? null),
    plan_other: moneyCell(record.frozenPlan?.other ?? null),
    note: optionalCell(record.note),
  }),
}
