import { sumCents } from '../../../src/domain/money.ts'
import type { Contribution, MonthEndBalance } from '../../../src/domain/types.ts'
import { cashBalanceSheetName, type CashBalanceSheet } from '../cashBalanceSheet.ts'
import { formatEuros } from '../formatEuros.ts'
import type { OmfSheet } from '../omfSheet.ts'
import { cashFlowRef } from '../sourceRef.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'
import { importedTotalsBySourceRef } from './importedValues.ts'

// R1: every legacy amount cell is fully accounted for. The parts of each cell add up to its cached value to the cent, and
// the rows imported from a cell add up to that value too, which still holds once inline sums are split into balances.
export function checkCellIntegrity(
  cashBalance: CashBalanceSheet,
  chosenRows: ReadonlySet<number>,
  monthEndBalances: readonly MonthEndBalance[],
  omf: OmfSheet,
  contributions: readonly Contribution[]
): CheckResult {
  const differences: CheckDifference[] = []
  const importedBySourceRef = importedTotalsBySourceRef(monthEndBalances)

  const amounts = cashBalance.rows.flatMap(row => row.amounts.map(amount => ({ amount, chosen: chosenRows.has(row.row) })))
  let importedCells = 0

  for (const { amount, chosen } of amounts) {
    const partsTotal = sumCents(amount.parts.map(part => part.cents))
    const imported = importedBySourceRef.get(cashFlowRef(cashBalanceSheetName, [amount.address]))

    const shown = formatEuros(amount.cachedCents)

    if (partsTotal !== amount.cachedCents)
      differences.push({ cell: amount.address, message: `parts add up to ${formatEuros(partsTotal)}, the cell shows ${shown}` })

    if (!chosen)
      continue

    importedCells++

    if (imported === undefined)
      differences.push({ cell: amount.address, message: 'on a month-end row but not imported' })
    else if (imported !== amount.cachedCents)
      differences.push({ cell: amount.address, message: `imported ${formatEuros(imported)}, the cell shows ${shown}` })
  }

  const paymentCellsTotal = sumCents(omf.rows.map(row => row.payment.cents))
  const contributionsTotal = sumCents(contributions.map(contribution => contribution.amount))

  if (paymentCellsTotal !== contributionsTotal) {
    const message = `contributions total ${formatEuros(contributionsTotal)}, payment cells ${formatEuros(paymentCellsTotal)}`
    differences.push({ cell: `${omf.sheet.name}!${omf.columns.payment}`, message })
  }

  const balanceCells = omf.rows.flatMap(row => (row.balance === null ? [] : [row.balance]))

  for (const balance of balanceCells) {
    const imported = importedBySourceRef.get(cashFlowRef(omf.sheet.name, [balance.address]))

    if (imported !== balance.cents)
      differences.push({ cell: `${omf.sheet.name}!${balance.address}`, message: 'the balance was not imported at its cell value' })
  }

  const inlineSumCount = amounts.filter(({ amount }) => amount.form === 'inline-sum').length

  return {
    id: 'R1',
    title: 'Cell integrity',
    status: differences.length === 0 ? 'pass' : 'fail',
    counts: [
      `${amounts.length} amount cells in ${cashBalanceSheetName}, ${inlineSumCount} of them inline sums`,
      `${importedCells} of them on month-end rows, compared with the rows imported from them`,
      `${omf.rows.length} ${omf.sheet.name} payment cells against ${contributions.length} contribution rows`,
      `${balanceCells.length} ${omf.sheet.name} balance cells against their month-end balances`,
    ],
    differences,
  }
}
