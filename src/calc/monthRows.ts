import { addMonths } from '../domain/month.ts'
import type { Ledger, Month, MonthRecord } from '../domain/types.ts'
import { changeBetween, type Change } from './headlineFigures.ts'
import type { MonthEndHistory, MonthTotal } from './monthEndHistory.ts'
import { monthFigure, type MonthFigure } from './monthFigure.ts'

export type MonthStatus = MonthRecord['status']

export interface MonthRow {
  month: Month
  // A month without a months row is open.
  status: MonthStatus
  cash: MonthFigure | null
  investments: MonthFigure | null
  pensions: MonthFigure | null
  combined: MonthFigure | null
  // Cash and investments against the month before, only between two complete totals.
  change: Change | null
  changeIsEstimated: boolean
}

// Every month of the history, latest first, plus the month to close when the history does not reach it yet.
export function monthRows(history: MonthEndHistory, records: Ledger['months'], monthToClose: Month | null): MonthRow[] {
  const rows = history.combined.map((combined, position): MonthRow => {
    const change = changeBetween(history.combined[position - 1], combined, addMonths(combined.month, -1))

    return {
      month: combined.month,
      status: records.get(combined.month)?.status ?? 'open',
      cash: figureAt(history.cash.months, position),
      investments: figureAt(history.investments.months, position),
      pensions: figureAt(history.pensions.months, position),
      combined: monthFigure(combined),
      change: change.measured ?? change.estimated,
      changeIsEstimated: change.estimated !== null,
    }
  })

  // 'YYYY-MM' text sorts in time order.
  const lastMonth = rows.at(-1)?.month

  if (monthToClose !== null && (lastMonth === undefined || monthToClose > lastMonth))
    rows.push(emptyRow(monthToClose, records.get(monthToClose)?.status ?? 'open'))

  return rows.reverse()
}

function figureAt(months: readonly MonthTotal[], position: number): MonthFigure | null {
  const entry = months[position]
  return entry === undefined ? null : monthFigure(entry)
}

function emptyRow(month: Month, status: MonthStatus): MonthRow {
  return { month, status, cash: null, investments: null, pensions: null, combined: null, change: null, changeIsEstimated: false }
}
