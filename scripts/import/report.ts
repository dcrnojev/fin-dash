import type { AmountForm } from './cashBalanceSheet.ts'
import type { CheckResult } from './checks/checkResult.ts'
import type { CashFlowImport } from './importCashFlow.ts'
import { ignoredSheets } from './legacyCoverage.ts'
import type { LegacyWorkbook } from './legacySheet.ts'
import type { BundleValidation } from './validateBundle.ts'

export interface ReportInput {
  cashFlowPath: string
  billsPath: string
  billsFound: boolean
  workbook: LegacyWorkbook
  result: CashFlowImport
  validation: BundleValidation
}

const formDescriptions: Record<AmountForm, string> = {
  'number': 'typed numbers',
  'constant-formula': 'formulas of one number, such as =700',
  'inline-sum': 'inline sums of numbers',
  'other-formula': 'other formulas, kept whole at their cached value',
}

export function renderReport(input: ReportInput): string {
  return [
    '# Import report: month-end workbook',
    '',
    ...section('Inputs', inputLines(input)),
    ...section('Results', resultLines(input.result)),
    ...section('Reconciliation', reconciliationTable(input.result.checks)),
    ...input.result.checks.flatMap(checkSection),
    ...section('Validation of the bundle by the tab specs', validationLines(input.validation)),
    ...section('Legacy quirks', quirkLines(input)),
  ].join('\n')
}

function section(title: string, lines: readonly string[]): string[] {
  return [`## ${title}`, '', ...lines, '']
}

function inputLines({ cashFlowPath, billsPath, billsFound, result }: ReportInput): string[] {
  const ignored = [...ignoredSheets.keys()].map(name => `\`${name}\``).join(', ')

  return [
    `- CashFlow workbook: \`${cashFlowPath}\`. Read: \`${result.cashBalance.sheet.name}\`, \`${result.omf.sheet.name}\`. Ignored: ${ignored}.`,
    `- Bills workbook: \`${billsPath}\` (${billsFound ? 'found' : 'NOT FOUND'}); not parsed in this slice.`,
  ]
}

function resultLines({ bundle, cashBalance, omf, selection, labelGroups, pensionPot }: CashFlowImport): string[] {
  const amounts = cashBalance.rows.flatMap(row => row.amounts)
  const parts = amounts.flatMap(amount => amount.parts)
  const monthEndAmounts = selection.months.flatMap(choice => choice.chosen?.item.amounts ?? [])
  const importedInlineSums = monthEndAmounts.filter(amount => amount.form === 'inline-sum')
  const gapMonths = bundle.months.filter(month => month.status === 'gap').map(month => month.month)
  const monthRange = `${bundle.months[0]?.month ?? '-'} to ${bundle.months.at(-1)?.month ?? '-'}`
  const summedContributions = bundle.contributions.filter(contribution => contribution.note !== null)
  const balances = omf.rows.filter(row => row.balance !== null)
  const legacyMonthCount = bundle.months.length - gapMonths.length
  const extraDecimalParts = parts.filter(part => part.extraDecimals).length
  const negativeParts = parts.filter(part => part.cents < 0).length

  const formCounts = (Object.keys(formDescriptions) as AmountForm[])
    .map(form => `${amounts.filter(amount => amount.form === form).length} ${formDescriptions[form]}`)
    .join(', ')

  const tabCounts = Object.entries({
    people: bundle.people,
    pots: bundle.pots,
    holdings: bundle.holdings,
    snapshots: bundle.snapshots,
    contributions: bundle.contributions,
    months: bundle.months,
  })

  return [
    `- Legacy snapshot rows read: ${cashBalance.rows.length}; ${selection.outsideWindows.length} fall outside every month-end window.`,
    `- Months: ${bundle.months.length} (${monthRange}): ${legacyMonthCount} legacy, ${gapMonths.length} gap (${gapMonths.join(', ')}).`,
    `- Rows per clean tab: ${tabCounts.map(([tab, rows]) => `${tab} ${rows.length}`).join(', ')}.`,
    `- Amount cells in \`${cashBalance.sheet.name}\`: ${amounts.length}; ${formCounts}.`,
    `- Zero amounts: ${amounts.filter(amount => amount.cachedCents === 0).length}.`,
    `- Parts with more than two decimals: ${extraDecimalParts}; negative parts: ${negativeParts}.`,
    `- Inline sums on month-end rows, imported as one pot-level row each: ${importedInlineSums.length}, in ${labelGroups.length} label groups.`,
    `- \`${omf.sheet.name}\`: ${omf.rows.length} payment rows as ${bundle.contributions.length} contribution rows of \`${pensionPot}\`.`,
    `  Months with several payments, summed into one row with a note: ${summedContributions.length}.`,
    `  Balances imported as snapshots: ${balances.length}.`,
  ]
}

function reconciliationTable(checks: readonly CheckResult[]): string[] {
  const rows = checks.map(check => {
    const result = check.differences.length > 0 ? `${check.status} (${check.differences.length})` : check.status
    const counts = check.counts.filter(count => !count.startsWith(' ')).join('; ')

    return `| ${check.id} ${check.title} | ${result} | ${counts} |`
  })

  return ['| Check | Result | Counts |', '|---|---|---|', ...rows]
}

function checkSection(check: CheckResult): string[] {
  const differences = check.differences.map(difference => `- \`${difference.cell}\`: ${difference.message}`)

  return [
    `### ${check.id} ${check.title}: ${check.status}`,
    '',
    ...check.counts.map(count => (count.startsWith(' ') ? `  - ${count.trim()}` : `- ${count}`)),
    ...(differences.length === 0 ? [] : ['', ...differences]),
    '',
  ]
}

function validationLines({ issues, changedRows, rowCount }: BundleValidation): string[] {
  const severityCounts = (['error', 'warning', 'info'] as const)
    .map(severity => `${issues.filter(issue => issue.severity === severity).length} ${severity}s`)
    .join(', ')

  const issueLines = issues.map(issue => {
    const place = [issue.tab, issue.row === null ? null : `row ${issue.row}`, issue.column].filter(part => part !== null).join(' ')

    return `- ${issue.severity} \`${issue.code}\` ${place}: ${issue.message}`
  })

  return [
    `- ${rowCount} rows written through the tab specs and read back: ${severityCounts}; ${changedRows.length} rows changed on the way.`,
    ...issueLines,
    ...changedRows.map(row => `- changed: ${row}`),
  ]
}

function quirkLines({ workbook, result }: ReportInput): string[] {
  const { cashBalance } = result
  const cells = [...workbook.values()].flatMap(sheet => [...sheet.cells.values()])
  const unheadedTotals = [...cashBalance.roles].filter(([, role]) => role.kind === 'derived' && role.header === '').map(([column]) => column)

  return [
    `- Month helper cells that disagree with \`Datum\`: ${cashBalance.monthHelperMismatches.join(', ') || 'none'}. The month comes from \`Datum\`.`,
    `- Cell comments in the workbook: ${cells.filter(cell => cell.comment !== null).length}.`,
    `- Columns of formulas without a header, treated as totals or diffs: ${unheadedTotals.join(', ') || 'none'}.`,
  ]
}
