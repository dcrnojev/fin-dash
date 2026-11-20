import { dataStore } from '../data'
import { columnTexts } from '../domain/schema/columnTexts'
import { rowsForHeader } from '../domain/schema/rowsForHeader'
import type { TabSpec } from '../domain/schema/tabSpec'
import { unusedId } from './unusedId'

// Reads the tab again right before appending, so an id added since the ledger was read, by the other partner or by
// hand, is not used twice, and the row follows the tab's current column order.
export async function appendWithUnusedId<T>(
  spreadsheetId: string,
  spec: TabSpec<T>,
  label: string,
  fallbackId: string,
  build: (id: string) => T
): Promise<T> {
  const { values } = await dataStore.readTabs(spreadsheetId, [spec.name])
  const rows = values[spec.name] ?? []
  const value = build(unusedId(label, columnTexts(rows, 'id'), fallbackId))

  await dataStore.appendRows(spreadsheetId, spec.name, rowsForHeader(spec, rows[0] ?? [], [value]))
  return value
}
