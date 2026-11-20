import { dataStore, type CellValue } from '../data'
import { decodeTab } from '../domain/schema/decodeTab'
import { monthsTab } from '../domain/schema/monthsTab'
import { rowsByKey } from '../domain/schema/rowsByKey'
import { rowsForHeader } from '../domain/schema/rowsForHeader'
import { snapshotsTab } from '../domain/schema/snapshotsTab'
import type { Month, MonthRecord, Snapshot } from '../domain/types'
import { countOf, displayMonth } from '../format'
import type { CloseRows } from './closeRows'
import { messageOf } from './messageOf'
import { monthRowsChanged, monthRowsChangedMessage } from './monthRowsChanged'

export interface WrittenClose {
  snapshotRowsWritten: number
  // Rows the sheet already had for the month when the form opened, shown read-only and left as they were.
  snapshotRowsKept: number
}

type TabValues = Record<string, CellValue[][]>

const nothingWritten = 'Nothing was written.'
const finishLater = 'Read the sheet again, then close again to finish; the rows already written are kept.'

// Reads `months` and `snapshots` again right before each append, and stops when the month got a months row or its
// snapshot rows changed since the form opened. The snapshot rows go first and the months row last, so a close that fails
// midway leaves the month open, and closing again after reading the sheet finishes it. Every error says what was written.
export async function writeClose(spreadsheetId: string, rows: CloseRows, openedWith: readonly Snapshot[]): Promise<WrittenClose> {
  const { month } = rows.monthRecord
  const written = { snapshotRowsWritten: rows.snapshots.length, snapshotRowsKept: rows.keptCount }
  const beforeSnapshots = await readTabs(spreadsheetId, failure => `Reading the sheet again failed: ${failure} ${nothingWritten}`)
  const problem = closeProblem(beforeSnapshots, month, openedWith)

  if (problem !== null)
    throw new Error(`${problem} ${nothingWritten}`)

  let snapshotCells: CellValue[][]

  try {
    snapshotCells = rowsForHeader(snapshotsTab, beforeSnapshots[snapshotsTab.name]?.[0] ?? [], rows.snapshots)
    // Only checks, before anything is written, that the months tab can take the row.
    monthCells(beforeSnapshots, rows.monthRecord)
  } catch (error) {
    throw new Error(`${messageOf(error)} ${nothingWritten}`)
  }

  if (rows.snapshots.length === 0) {
    await appendMonthRow(spreadsheetId, beforeSnapshots, rows.monthRecord, failure => `${failure} ${nothingWritten}`)
    return written
  }

  try {
    await dataStore.appendRows(spreadsheetId, snapshotsTab.name, snapshotCells)
  } catch (error) {
    const failed = `Writing ${countOf(rows.snapshots.length, 'snapshot row')} failed: ${messageOf(error)}`
    throw new Error(`${failed} ${displayMonth(month)} is not closed.`)
  }

  const wrote = `${countOf(rows.snapshots.length, 'snapshot row')} for ${displayMonth(month)} went into the sheet, but the month is not closed.`
  const afterWrote = (failure: string) => `${wrote} ${failure} ${finishLater}`
  const beforeMonthRow = await readTabs(spreadsheetId, failure => afterWrote(`Reading the sheet again failed: ${failure}`))
  const laterProblem = closeProblem(beforeMonthRow, month, [...openedWith, ...rows.snapshots])

  if (laterProblem !== null)
    throw new Error(afterWrote(laterProblem))

  await appendMonthRow(spreadsheetId, beforeMonthRow, rows.monthRecord, afterWrote)
  return written
}

async function readTabs(spreadsheetId: string, failureMessage: (failure: string) => string): Promise<TabValues> {
  try {
    return (await dataStore.readTabs(spreadsheetId, [monthsTab.name, snapshotsTab.name])).values
  } catch (error) {
    throw new Error(failureMessage(messageOf(error)))
  }
}

async function appendMonthRow(
  spreadsheetId: string,
  values: TabValues,
  record: MonthRecord,
  failureMessage: (failure: string) => string
): Promise<void> {
  try {
    await dataStore.appendRows(spreadsheetId, monthsTab.name, monthCells(values, record))
  } catch (error) {
    throw new Error(failureMessage(`Marking the month closed failed: ${messageOf(error)}`))
  }
}

function monthCells(values: TabValues, record: MonthRecord): CellValue[][] {
  return rowsForHeader(monthsTab, values[monthsTab.name]?.[0] ?? [], [record])
}

// Why the month cannot be closed now, or null. Problems in these tabs already show in Data health; here only the
// readable rows matter.
function closeProblem(values: TabValues, month: Month, expectedSnapshots: readonly Snapshot[]): string | null {
  const monthName = displayMonth(month)
  const existingRecord = decodeTab(monthsTab, values[monthsTab.name] ?? [], []).find(record => record.month === month)

  if (existingRecord?.status === 'closed') {
    const closedBy = existingRecord.closedBy === null ? '' : ` by ${existingRecord.closedBy}`
    return `${monthName} is already closed${closedBy}; two people should not close a month at once.`
  }

  if (existingRecord !== undefined) {
    const problem = `The months tab already has a row for ${monthName} with status ${existingRecord.status}.`
    return `${problem} The app cannot change that row: delete it in the months tab, then close again.`
  }

  const changedRows = monthRowsChanged(month, expectedSnapshots, rowsByKey(snapshotsTab, values[snapshotsTab.name] ?? []))

  return changedRows.length === 0 ? null : `${monthRowsChangedMessage(month, changedRows)} Read the sheet again to see them.`
}
