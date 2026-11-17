import type { Cents } from '../../../src/domain/types.ts'
import { formatEuros } from '../formatEuros.ts'
import type { OmfSheet } from '../omfSheet.ts'
import type { CheckDifference, CheckResult } from './checkResult.ts'

// R5: the running sum of the payments equals the legacy cumulative column on every row.
export function checkOmfRunningSum(omf: OmfSheet): CheckResult {
  const differences: CheckDifference[] = []
  let runningSum = 0

  for (const row of omf.rows) {
    runningSum += row.payment.cents

    if (row.cumulative === null)
      differences.push({ cell: `${omf.columns.cumulative}${row.row}`, message: 'no cumulative value on this row' })
    else if (row.cumulative.cents !== runningSum)
      differences.push({
        cell: row.cumulative.address,
        message: `running sum ${formatEuros(runningSum as Cents)}, the cell shows ${formatEuros(row.cumulative.cents)}`,
      })
  }

  return {
    id: 'R5',
    title: `${omf.sheet.name} running sum`,
    status: differences.length === 0 ? 'pass' : 'fail',
    counts: [`${omf.rows.length} rows compared`],
    differences,
  }
}
