import { messageOf } from '../close/messageOf'
import { dataStore, type CellUpdate } from '../data'
import type { TabSpec } from '../domain/schema/tabSpec'
import { planRowEdit } from './planRowEdit'

const nothingWritten = 'Nothing was written.'

// Reads the tab again and overwrites, in one request, only the cells of the row's editable columns that the edit
// changes. Never adds or deletes a row. Stops before writing when the id has no row or more than one, or when the row
// changed since the form opened.
export async function writeRowEdit<T>(
  spreadsheetId: string,
  spec: TabSpec<T>,
  openedWith: T,
  edited: T,
  editableColumns: readonly string[]
): Promise<void> {
  let updates: CellUpdate[]

  try {
    const values = (await dataStore.readTabs(spreadsheetId, [spec.name])).values[spec.name] ?? []
    updates = planRowEdit(spec, values, openedWith, edited, editableColumns)
  } catch (error) {
    throw new Error(`${messageOf(error)} ${nothingWritten}`)
  }

  try {
    await dataStore.updateCells(spreadsheetId, updates)
  } catch (error) {
    throw new Error(`Saving failed: ${messageOf(error)} ${nothingWritten}`)
  }
}
