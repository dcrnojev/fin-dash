import type { SpreadsheetRef } from '../data'
import type { CreatedSpreadsheet } from '../setup/createSpreadsheetFromImport'
import { CreateFromImport } from './CreateFromImport'
import { SpreadsheetChooser } from './SpreadsheetChooser'

interface SetupScreenProps {
  creating: boolean
  onChosen: (spreadsheet: SpreadsheetRef) => void
  onCreated: (created: CreatedSpreadsheet) => void
  onCreatingChange: (creating: boolean) => void
  onError: (error: unknown) => void
}

// Shown while no spreadsheet is remembered on this device.
export function SetupScreen({ creating, onChosen, onCreated, onCreatingChange, onError }: SetupScreenProps) {
  return (
    <div className="setup">
      <SpreadsheetChooser disabled={creating} onChosen={onChosen} onError={onError} />
      <CreateFromImport onCreated={onCreated} onCreatingChange={onCreatingChange} />
    </div>
  )
}
