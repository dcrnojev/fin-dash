import { appSchemaVersion } from '../../src/domain/schema/meta.ts'
import type { Bundle, MonthRecord, PotId, Snapshot } from '../../src/domain/types.ts'
import { buildSnapshots, keepAtPotLevel } from './buildSnapshots.ts'
import { cashBalanceSheetName, readCashBalance, type CashBalanceSheet, type LegacySnapshotRow } from './cashBalanceSheet.ts'
import { checkCellIntegrity } from './checks/checkCellIntegrity.ts'
import { checkCoverage, Coverage } from './checks/checkCoverage.ts'
import { checkLegacyTotals } from './checks/checkLegacyTotals.ts'
import { checkOmfRunningSum } from './checks/checkOmfRunningSum.ts'
import type { CheckResult } from './checks/checkResult.ts'
import { checkSnapshotOffsets } from './checks/checkSnapshotOffsets.ts'
import { labelGroups, type LabelGroup } from './labelGroups.ts'
import { markCashBalanceCoverage, markIgnoredSheets, markOmfCoverage } from './legacyCoverage.ts'
import { legacyPeople, legacyPots, secondPillarPotId } from './legacyPots.ts'
import type { LegacySheet, LegacyWorkbook } from './legacySheet.ts'
import { chooseMonthEnds, type MonthEndSelection } from './monthEndChoice.ts'
import { omfBalanceSnapshots, omfContributions } from './omfImport.ts'
import { omfSheetName, readOmf, type OmfSheet } from './omfSheet.ts'

// Open question 1 of the design, at its default.
const monthEndRule = 'last calendar day, entered by the 5th'

export interface CashFlowImport {
  bundle: Bundle
  cashBalance: CashBalanceSheet
  omf: OmfSheet
  pensionPot: PotId
  selection: MonthEndSelection<LegacySnapshotRow>
  labelGroups: LabelGroup[]
  checks: CheckResult[]
}

// The month-end workbook: CashBalance snapshots at pot level, the OMF pension log, and the reconciliation of both.
export function importCashFlow(workbook: LegacyWorkbook): CashFlowImport {
  const cashBalance = readCashBalance(requireSheet(workbook, cashBalanceSheetName))
  const omf = readOmf(requireSheet(workbook, omfSheetName), cashBalance.people)
  const selection = chooseMonthEnds(cashBalance.rows.map(row => ({ date: row.date, item: row })))
  const cashBalanceSnapshots = buildSnapshots(selection.months, keepAtPotLevel)
  const pensionPot = secondPillarPotId(omf.owner)
  const pensionSnapshots = omfBalanceSnapshots(omf, pensionPot)
  const contributions = omfContributions(omf, pensionPot)
  const pots = legacyPots(cashBalance.people, omf.owner)

  const months = selection.months.map((choice): MonthRecord => ({
    month: choice.month,
    status: choice.chosen === null ? 'gap' : 'legacy',
    closedOn: null,
    closedBy: null,
    frozenPlan: null,
    note: choice.chosen === null ? 'no snapshot dated from the 20th to the 5th of the next month' : null,
  }))

  const potOrder = new Map(pots.map((pot, index) => [pot.id, index]))
  const potPosition = (snapshot: Snapshot) => potOrder.get(snapshot.pot) ?? 0
  const snapshotOrder = (a: Snapshot, b: Snapshot) => a.month.localeCompare(b.month) || potPosition(a) - potPosition(b)

  const bundle: Bundle = {
    meta: {
      schemaVersion: appSchemaVersion,
      currency: 'EUR',
      goLiveMonth: null,
      legacyLastMonth: months.at(-1)?.month ?? null,
      monthEndRule,
      lastWriteAppVersion: null,
    },
    people: legacyPeople(cashBalance.people),
    pots,
    holdings: [],
    snapshots: [...cashBalanceSnapshots, ...pensionSnapshots].sort(snapshotOrder),
    contributions,
    months,
  }

  const chosenRows = new Set(selection.months.flatMap(choice => (choice.chosen === null ? [] : [choice.chosen.item.row])))
  const importedSourceRefs = new Set(cashBalanceSnapshots.map(snapshot => snapshot.sourceRef))
  const coverage = new Coverage()

  markCashBalanceCoverage(cashBalance, chosenRows, importedSourceRefs, coverage)
  markOmfCoverage(omf, coverage)
  markIgnoredSheets(workbook, coverage)

  const problems = new Map([
    ...cashBalance.problems.map(problem => [`${cashBalance.sheet.name}!${problem.address}`, problem.message] as const),
    ...omf.problems.map(problem => [`${omf.sheet.name}!${problem.address}`, problem.message] as const),
  ])

  const checks = [
    checkCellIntegrity(cashBalance, chosenRows, bundle.snapshots, omf, contributions),
    checkLegacyTotals(cashBalance, chosenRows, cashBalanceSnapshots),
    checkCoverage(workbook, coverage, problems),
    checkOmfRunningSum(omf),
    checkSnapshotOffsets([
      {
        name: cashBalance.sheet.name,
        explanation: 'it was the closest reading in the window from the 20th to the 5th of the next month',
        snapshots: cashBalanceSnapshots,
      },
      {
        name: omf.sheet.name,
        explanation: 'OMF balances keep the calendar month of their date, like the payments on the same row',
        snapshots: pensionSnapshots,
      },
    ]),
  ]

  return { bundle, cashBalance, omf, pensionPot, selection, labelGroups: labelGroups(selection.months), checks }
}

function requireSheet(workbook: LegacyWorkbook, name: string): LegacySheet {
  const sheet = workbook.get(name)

  if (sheet === undefined)
    throw new Error(`The workbook has no tab ${name}.`)

  return sheet
}
