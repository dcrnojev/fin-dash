import type { SpreadsheetRef } from '../data'
import type { CreatedSpreadsheet } from '../setup/createSpreadsheetFromImport'
import { CreateFromImport } from './CreateFromImport'
import { SpreadsheetChooser } from './SpreadsheetChooser'

interface SetupScreenProps {
  onChosen: (spreadsheet: SpreadsheetRef) => void
  onCreated: (created: CreatedSpreadsheet) => void
  onError: (error: unknown) => void
}

// Shown while no spreadsheet is remembered on this device.
export function SetupScreen({ onChosen, onCreated, onError }: SetupScreenProps) {
  return (
    <div className="setup">
      <SpreadsheetChooser onChosen={onChosen} onError={onError} />
      <CreateFromImport onCreated={onCreated} />
    </div>
  )
}
