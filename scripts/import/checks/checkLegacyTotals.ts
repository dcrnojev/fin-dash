import { sumCents, toCents } from '../../../src/domain/money.ts'
import type { Cents, Snapshot } from '../../../src/domain/types.ts'
import { cashBalanceSheetName, type CashBalanceSheet } from '../cashBalanceSheet.ts'
import { formatEuros } from '../formatEuros.ts'
import { parseLegacyFormula, type Factor } from '../legacyFormula.ts'
import { columnIndex, columnLetter, isEmptyCell, parseAddress } from '../legacySheet.ts'
import { cashFlowRef } from '../sourceRef.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'
import { importedTotalsBySourceRef } from './importedValues.ts'

type Evaluation = { cents: Cents } | { error: string }

// R2: every legacy total and diff is recomputed from its own row's formula, with the amount cells it refers to taken from
// the imported rows (month-end rows) or from the parsed cell (other rows), and totals it refers to recomputed the same way.
// Using each row's own formula keeps the check right where a total's meaning drifted over time.
export function checkLegacyTotals(
  cashBalance: CashBalanceSheet,
  chosenRows: ReadonlySet<number>,
  snapshots: readonly Snapshot[]
): CheckResult {
  const { sheet, roles, headerRow } = cashBalance
  const importedBySourceRef = importedTotalsBySourceRef(snapshots)

  const partsByAddress = new Map(cashBalance.rows.flatMap(row => row.amounts).map(amount => [amount.address, amount.parts]))
  const evaluated = new Map<string, Evaluation>()

  const evaluateCell = (address: string, path: readonly string[]): Evaluation => {
    const cell = sheet.cells.get(address)
    const role = roles.get(parseAddress(address)?.column ?? '')

    if (cell === undefined || isEmptyCell(cell))
      return { cents: 0 as Cents }

    if (role?.kind === 'pot') {
      const imported = importedBySourceRef.get(cashFlowRef(cashBalanceSheetName, [address]))
      const parts = partsByAddress.get(address)

      if (imported !== undefined)
        return { cents: imported }

      return parts === undefined ? { error: `${address} was not read` } : { cents: sumCents(parts.map(part => part.cents)) }
    }

    if (role?.kind !== 'derived')
      return { error: `${address} is not an amount or a total` }

    if (cell.formula === null)
      return { error: `${address} is a typed total with no formula to recompute` }

    if (path.includes(address))
      return { error: `${address} refers to itself` }

    const known = evaluated.get(address)

    if (known !== undefined)
      return known

    const evaluation = evaluateFormula(cell.formula, [...path, address])
    evaluated.set(address, evaluation)
    return evaluation
  }

  const evaluateFactor = (factor: Factor, path: readonly string[]): Evaluation | null => {
    if (factor.kind === 'cell')
      return evaluateCell(factor.address, path)

    if (factor.kind !== 'sum')
      return null

    const from = parseAddress(factor.from)
    const to = parseAddress(factor.to)

    if (from === null || to === null)
      return { error: `SUM(${factor.from}:${factor.to}) is not a range` }

    let total = 0

    for (let row = from.row; row <= to.row; row++) {
      for (let column = columnIndex(from.column); column <= columnIndex(to.column); column++) {
        const evaluation = evaluateCell(`${columnLetter(column)}${row}`, path)

        if ('error' in evaluation)
          return evaluation

        total += evaluation.cents
      }
    }

    return { cents: total as Cents }
  }

  const evaluateFormula = (formula: string, path: readonly string[]): Evaluation => {
    const terms = parseLegacyFormula(formula)

    if (terms === null)
      return { error: `unsupported formula =${formula}` }

    let total = 0

    for (const term of terms) {
      const operands = term.factors.map(factor => evaluateFactor(factor, path)).filter(evaluation => evaluation !== null)
      const multiplier = term.factors.reduce((product, factor) => product * (factor.kind === 'number' ? factor.value : 1), 1)

      if (operands.length > 1)
        return { error: `=${formula} multiplies cells` }

      const operand = operands[0]

      if (operand === undefined) {
        total += term.sign * toCents(multiplier)
        continue
      }

      if ('error' in operand)
        return operand

      total += term.sign * Math.round(operand.cents * multiplier)
    }

    return { cents: total as Cents }
  }

  const differences: CheckDifference[] = []
  let checkedOnChosenRows = 0
  let checkedOnOtherRows = 0

  for (const cell of sheet.cells.values()) {
    if (cell.row <= headerRow || roles.get(cell.column)?.kind !== 'derived' || isEmptyCell(cell))
      continue

    if (chosenRows.has(cell.row))
      checkedOnChosenRows++
    else
      checkedOnOtherRows++

    const evaluation = evaluateCell(cell.address, [])

    if ('error' in evaluation) {
      differences.push({ cell: cell.address, message: evaluation.error })
      continue
    }

    const cached = typeof cell.value === 'number' ? toCents(cell.value) : null

    if (cached !== evaluation.cents) {
      const shown = cached === null ? JSON.stringify(cell.value) : formatEuros(cached)
      const message = `=${cell.formula} recomputes to ${formatEuros(evaluation.cents)}, the cell shows ${shown}`
      differences.push({ cell: cell.address, message })
    }
  }

  return {
    id: 'R2',
    title: 'Legacy totals',
    status: differences.length === 0 ? 'pass' : 'fail',
    counts: [
      `${checkedOnChosenRows + checkedOnOtherRows} total and diff cells recomputed`,
      `${checkedOnChosenRows} on month-end rows (against imported rows), ${checkedOnOtherRows} on other rows (against parsed cells)`,
    ],
    differences,
  }
}
