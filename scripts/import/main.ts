import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { bundleToTabs } from '../../src/domain/schema/bundleTabs.ts'
import type { TabName } from '../../src/domain/types.ts'
import { toCsv } from './csv.ts'
import { importCashFlow } from './importCashFlow.ts'
import { labelRows, monthEndChoiceRows, reviewRows } from './outputFiles.ts'
import { renderReport } from './report.ts'
import { validateBundle } from './validateBundle.ts'
import { readWorkbook } from './workbookReader.ts'

const defaultCashFlowPath = 'data/legacy-cashflow.xlsx'
const defaultBillsPath = 'data/legacy-bills.xlsx'
const defaultOutputDirectory = 'data/import'

const { values: options } = parseArgs({
  options: {
    cashflow: { type: 'string', default: defaultCashFlowPath },
    bills: { type: 'string', default: defaultBillsPath },
    out: { type: 'string', default: defaultOutputDirectory },
  },
})

const workbook = readWorkbook(options.cashflow)
const result = importCashFlow(workbook)
const validation = validateBundle(result.bundle)
const reviewDirectory = join(options.out, 'review')

mkdirSync(reviewDirectory, { recursive: true })
writeFileSync(join(options.out, 'bundle.json'), JSON.stringify(result.bundle, null, 2) + '\n')

for (const [tab, values] of Object.entries(bundleToTabs(result.bundle)))
  writeFileSync(join(reviewDirectory, `${tab}.csv`), toCsv(reviewRows(tab as TabName, values)))

writeFileSync(join(options.out, 'labels.csv'), toCsv(labelRows(result.labelSlots)))
writeFileSync(join(options.out, 'month-end-choice.csv'), toCsv(monthEndChoiceRows(result.selection)))

const report = renderReport({
  cashFlowPath: options.cashflow,
  billsPath: options.bills,
  billsFound: existsSync(options.bills),
  workbook,
  result,
  validation,
})

writeFileSync(join(options.out, 'report.md'), report)

const failedChecks = result.checks.filter(check => check.status === 'fail')
const bundleErrors = validation.issues.filter(issue => issue.severity === 'error')

for (const check of result.checks)
  console.log(`${check.id} ${check.title}: ${check.status}${check.differences.length > 0 ? ` (${check.differences.length})` : ''}`)

console.log(`Bundle validation: ${bundleErrors.length} errors, ${validation.changedRows.length} rows changed on the round trip.`)
console.log(`Outputs written to ${options.out}; details in report.md.`)

if (failedChecks.length > 0 || bundleErrors.length > 0 || validation.changedRows.length > 0)
  process.exitCode = 1
