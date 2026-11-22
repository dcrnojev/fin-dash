import { appSchemaVersion } from '../../src/domain/schema/meta.ts'
import type { Bundle, GroupId, MonthEndBalance, MonthRecord } from '../../src/domain/types.ts'
import { buildMonthEndBalances, keepAtGroupLevel } from './buildMonthEndBalances.ts'
import { cashBalanceSheetName, readCashBalance, type CashBalanceSheet, type LegacyReadingRow } from './cashBalanceSheet.ts'
import { checkCellIntegrity } from './checks/checkCellIntegrity.ts'
import { checkCoverage, Coverage } from './checks/checkCoverage.ts'
import { checkLegacyTotals } from './checks/checkLegacyTotals.ts'
import { checkMonthEndOffsets } from './checks/checkMonthEndOffsets.ts'
import { checkOmfRunningSum } from './checks/checkOmfRunningSum.ts'
import type { CheckResult } from './checks/checkResult.ts'
import { labelSlots, type LabelSlot } from './labelSlots.ts'
import { markCashBalanceCoverage, markIgnoredSheets, markOmfCoverage } from './legacyCoverage.ts'
import { legacyGroups, legacyPeople, secondPillarGroupId } from './legacyGroups.ts'
import type { LegacySheet, LegacyWorkbook } from './legacySheet.ts'
import { chooseMonthEnds, type MonthEndSelection } from './monthEndChoice.ts'
import { omfContributions, omfMonthEndBalances } from './omfImport.ts'
import { omfSheetName, readOmf, type OmfSheet } from './omfSheet.ts'

// Open question 1 of the design, at its default.
const monthEndRule = 'last calendar day, entered by the 5th'

export interface CashFlowImport {
  bundle: Bundle
  cashBalance: CashBalanceSheet
  omf: OmfSheet
  pensionGroup: GroupId
  selection: MonthEndSelection<LegacyReadingRow>
  labelSlots: LabelSlot[]
  checks: CheckResult[]
}

// The month-end workbook: CashBalance month-end balances at group level, the OMF pension log, and the reconciliation of both.
export function importCashFlow(workbook: LegacyWorkbook): CashFlowImport {
  const cashBalance = readCashBalance(requireSheet(workbook, cashBalanceSheetName))
  const omf = readOmf(requireSheet(workbook, omfSheetName), cashBalance.people)
  const selection = chooseMonthEnds(cashBalance.rows.map(row => ({ date: row.date, item: row })))
  const cashMonthEndBalances = buildMonthEndBalances(selection.months, keepAtGroupLevel)
  const pensionGroup = secondPillarGroupId(omf.owner)
  const pensionMonthEndBalances = omfMonthEndBalances(omf, pensionGroup)
  const contributions = omfContributions(omf, pensionGroup)
  const groups = legacyGroups(cashBalance.people, omf.owner)

  const months = selection.months.map((choice): MonthRecord => ({
    month: choice.month,
    status: choice.chosen === null ? 'gap' : 'legacy',
    closedOn: null,
    closedBy: null,
    frozenPlan: null,
    note: choice.chosen === null ? 'no reading dated from the 20th to the 5th of the next month' : null,
  }))

  const groupOrder = new Map(groups.map((group, index) => [group.id, index]))
  const groupPosition = (monthEndBalance: MonthEndBalance) => groupOrder.get(monthEndBalance.group) ?? 0
  const monthEndBalanceOrder = (a: MonthEndBalance, b: MonthEndBalance) => a.month.localeCompare(b.month) || groupPosition(a) - groupPosition(b)

  const bundle: Bundle = {
    meta: {
      schemaVersion: appSchemaVersion,
      currency: 'EUR',
      goLiveMonth: null,
      legacyLastMonth: months.at(-1)?.month ?? null,
      monthEndRule,
      lastWriteAppVersion: null,
      monthlySavingsGoal: null,
    },
    people: legacyPeople(cashBalance.people),
    groups,
    balances: [],
    monthEndBalances: [...cashMonthEndBalances, ...pensionMonthEndBalances].sort(monthEndBalanceOrder),
    contributions,
    months,
  }

  const chosenRows = new Set(selection.months.flatMap(choice => (choice.chosen === null ? [] : [choice.chosen.item.row])))
  const importedSourceRefs = new Set(cashMonthEndBalances.map(monthEndBalance => monthEndBalance.sourceRef))
  const coverage = new Coverage()

  markCashBalanceCoverage(cashBalance, chosenRows, importedSourceRefs, coverage)
  markOmfCoverage(omf, coverage)
  markIgnoredSheets(workbook, coverage)

  const problems = new Map([
    ...cashBalance.problems.map(problem => [`${cashBalance.sheet.name}!${problem.address}`, problem.message] as const),
    ...omf.problems.map(problem => [`${omf.sheet.name}!${problem.address}`, problem.message] as const),
  ])

  const checks = [
    checkCellIntegrity(cashBalance, chosenRows, bundle.monthEndBalances, omf, contributions),
    checkLegacyTotals(cashBalance, chosenRows, cashMonthEndBalances),
    checkCoverage(workbook, coverage, problems),
    checkOmfRunningSum(omf),
    checkMonthEndOffsets([
      {
        name: cashBalance.sheet.name,
        explanation: 'it was the closest reading in the window from the 20th to the 5th of the next month',
        monthEndBalances: cashMonthEndBalances,
      },
      {
        name: omf.sheet.name,
        explanation: 'OMF balances keep the calendar month of their date, like the payments on the same row',
        monthEndBalances: pensionMonthEndBalances,
      },
    ]),
  ]

  return { bundle, cashBalance, omf, pensionGroup, selection, labelSlots: labelSlots(selection.months), checks }
}

function requireSheet(workbook: LegacyWorkbook, name: string): LegacySheet {
  const sheet = workbook.get(name)

  if (sheet === undefined)
    throw new Error(`The workbook has no tab ${name}.`)

  return sheet
}
