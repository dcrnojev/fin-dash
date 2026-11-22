import { messageOf } from '../close/messageOf'
import { dataStore } from '../data'
import { metaTab } from '../domain/schema/metaTab'
import type { Cents } from '../domain/types'
import { planMonthlySavingsGoalWrite, type MonthlySavingsGoalWrite } from './planMonthlySavingsGoalWrite'

const nothingWritten = 'Nothing was written.'

// Reads `_meta` again right before writing, so the goal's row is found where the sheet has it now, then overwrites its
// value cell or appends the row. A null goal clears the cell.
export async function writeMonthlySavingsGoal(spreadsheetId: string, goal: Cents | null): Promise<void> {
  let write: MonthlySavingsGoalWrite

  try {
    const values = (await dataStore.readTabs(spreadsheetId, [metaTab.name])).values[metaTab.name] ?? []
    write = planMonthlySavingsGoalWrite(values, goal)
  } catch (error) {
    throw new Error(`${messageOf(error)} ${nothingWritten}`)
  }

  try {
    if (write.kind === 'update')
      await dataStore.updateCells(spreadsheetId, write.updates)

    if (write.kind === 'append')
      await dataStore.appendRows(spreadsheetId, metaTab.name, write.rows)
  } catch (error) {
    throw new Error(`Saving failed: ${messageOf(error)} ${nothingWritten}`)
  }
}
