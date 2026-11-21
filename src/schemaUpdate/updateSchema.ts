import { messageOf } from '../close/messageOf'
import { dataStore, type CellUpdate, type SpreadsheetRef, type TabRename } from '../data'
import type { IsoDate } from '../domain/types'
import { planSchemaUpdate, schemaUpdateTabs, versionAfter, type SchemaUpdatePlan } from './schemaUpdatePlan'

export type SchemaUpdateStep = 'reading' | 'backup' | 'renaming' | 'version'

export function backupTitle(spreadsheetName: string, today: IsoDate): string {
  return `${spreadsheetName} backup before update to version ${versionAfter} ${today}`
}

// Plans again from a fresh read, then writes in an order that can be resumed: the backup copy first, then every tab and
// header rename in one request, which Google applies whole or not at all, and schema_version last, so a spreadsheet that
// still says version 1 is one the update can run on again. Resolves with the backup.
export async function updateSchema(
  spreadsheet: SpreadsheetRef,
  today: IsoDate,
  onStep: (step: SchemaUpdateStep) => void
): Promise<SpreadsheetRef> {
  onStep('reading')
  let plan: SchemaUpdatePlan

  try {
    plan = planSchemaUpdate((await dataStore.readTabs(spreadsheet.id, schemaUpdateTabs)).values)
  } catch (error) {
    throw new Error(`Reading the spreadsheet failed, so nothing was changed: ${messageOf(error)}`)
  }

  const { tabs, versionCell, problems } = plan

  if (problems.length > 0 || versionCell === null)
    throw new Error(`Nothing was changed. ${problems.join(' ')}`)

  onStep('backup')
  let backup: SpreadsheetRef

  try {
    backup = await dataStore.copySpreadsheet(spreadsheet.id, backupTitle(spreadsheet.name, today))
  } catch (error) {
    throw new Error(`Making the backup copy failed, so nothing was changed: ${messageOf(error)}`)
  }

  const backupNote = `The backup ${backup.name} is in Google Drive.`

  if (tabs.length > 0) {
    onStep('renaming')

    const renames: TabRename[] = tabs.flatMap(tab => (tab.renameFrom === null ? [] : [{ from: tab.renameFrom, to: tab.tab }]))

    const headerCells: CellUpdate[] = tabs.flatMap(tab =>
      tab.headerRenames.map(rename => ({ tab: tab.renameFrom ?? tab.tab, row: 1, column: rename.column, value: rename.to }))
    )

    try {
      await dataStore.renameTabsAndUpdateCells(spreadsheet.id, renames, headerCells)
    } catch (error) {
      const message = messageOf(error)
      throw new Error(`The backup was made, but renaming the tabs and headers failed, so they are as they were: ${message} ${backupNote}`)
    }
  }

  onStep('version')

  try {
    await dataStore.updateCells(spreadsheet.id, [{ tab: '_meta', ...versionCell, value: versionAfter }])
  } catch (error) {
    const message = `The backup was made and the tabs and headers renamed, but writing schema_version ${versionAfter} failed`
    throw new Error(`${message}: ${messageOf(error)} ${backupNote} Updating again carries on from here.`)
  }

  return backup
}
