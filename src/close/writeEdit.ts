import { dataStore, type CellValue } from '../data'
import { rowsByKey } from '../domain/schema/rowsByKey'
import { rowsForHeader } from '../domain/schema/rowsForHeader'
import { snapshotsTab } from '../domain/schema/snapshotsTab'
import type { IsoDate, Month, Snapshot } from '../domain/types'
import { countOf } from '../format'
import { planEdit, type EditPlan, type ValueChange } from './editPlan'
import { messageOf } from './messageOf'
import { monthRowsChanged, monthRowsChangedMessage } from './monthRowsChanged'

export interface WrittenEdit {
  changedCount: number
  addedCount: number
}

const nothingWritten = 'Nothing was written.'

// Reads `snapshots` again, overwrites only the value, as_of and source cells of each changed row, then appends the rows
// for added values after reading again. Never deletes a row and never touches the months row. Stops before writing when
// a changed row is missing or repeated, or when the month's rows changed since the form opened.
export async function writeEdit(
  spreadsheetId: string,
  month: Month,
  changes: readonly ValueChange[],
  openedWith: readonly Snapshot[],
  writtenOn: IsoDate
): Promise<WrittenEdit> {
  const beforeUpdates = await readSnapshots(spreadsheetId, failure => `Reading the sheet again failed: ${failure} ${nothingWritten}`)

  let plan: EditPlan

  try {
    plan = planEdit(month, changes, beforeUpdates, writtenOn)
    // Only checks, before anything is written, that the header has a column for every added value.
    rowsForHeader(snapshotsTab, beforeUpdates[0] ?? [], plan.added)
  } catch (error) {
    throw new Error(`${messageOf(error)} ${nothingWritten}`)
  }

  const changedRows = monthRowsChanged(month, openedWith, rowsByKey(snapshotsTab, beforeUpdates))

  if (changedRows.length > 0)
    throw new Error(`${monthRowsChangedMessage(month, changedRows)} ${nothingWritten} Read the sheet again to see them.`)

  if (plan.updates.length > 0) {
    try {
      await dataStore.updateCells(spreadsheetId, plan.updates)
    } catch (error) {
      throw new Error(`Changing ${countOf(plan.updated.length, 'value')} failed: ${messageOf(error)} ${nothingWritten}`)
    }
  }

  const written = { changedCount: plan.updated.length, addedCount: plan.added.length }

  if (plan.added.length === 0)
    return written

  const notAdded = (failure: string) => {
    if (plan.updated.length === 0)
      return `Adding ${countOf(plan.added.length, 'value')} failed: ${failure} ${nothingWritten}`

    const added = `${countOf(plan.updated.length, 'value')} changed, but ${countOf(plan.added.length, 'value')} could not be added: ${failure}`
    return `${added} Read the sheet again, then edit again to add them.`
  }

  const beforeAppend = plan.updates.length === 0 ? beforeUpdates : await readSnapshots(spreadsheetId, notAdded)
  const keysUpdated = new Set(plan.updated.map(snapshotsTab.key))
  const expected = [...openedWith.filter(snapshot => !keysUpdated.has(snapshotsTab.key(snapshot))), ...plan.updated]
  const changedSinceUpdate = monthRowsChanged(month, expected, rowsByKey(snapshotsTab, beforeAppend))

  if (changedSinceUpdate.length > 0)
    throw new Error(notAdded(monthRowsChangedMessage(month, changedSinceUpdate)))

  try {
    await dataStore.appendRows(spreadsheetId, snapshotsTab.name, rowsForHeader(snapshotsTab, beforeAppend[0] ?? [], plan.added))
  } catch (error) {
    throw new Error(notAdded(messageOf(error)))
  }

  return written
}

async function readSnapshots(spreadsheetId: string, failureMessage: (failure: string) => string): Promise<CellValue[][]> {
  try {
    return (await dataStore.readTabs(spreadsheetId, [snapshotsTab.name])).values[snapshotsTab.name] ?? []
  } catch (error) {
    throw new Error(failureMessage(messageOf(error)))
  }
}
