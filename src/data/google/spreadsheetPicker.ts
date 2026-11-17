import type { SpreadsheetRef } from '../types'
import type { GoogleConfig } from './googleConfig'
import { loadPicker } from './googleGlobals'

// Choosing a file here is what grants the drive.file scope access to it. setAppId must be the Cloud project number
// of the OAuth client, or the grant does not reach this app.
export async function pickSpreadsheet(accessToken: string, config: GoogleConfig): Promise<SpreadsheetRef | null> {
  const picker = await loadPicker()

  // Google's docs advise list mode with drive.file: the app has no access to thumbnails of files not yet chosen.
  const spreadsheetsView = new picker.DocsView(picker.ViewId.SPREADSHEETS).setMode(picker.DocsViewMode.LIST)

  return new Promise<SpreadsheetRef | null>(resolve => {
    new picker.PickerBuilder()
      .setTitle('Choose the family finance spreadsheet')
      .addView(spreadsheetsView)
      .setOAuthToken(accessToken)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.projectNumber)
      .setCallback(response => {
        const pickedDocument = response.docs?.[0]

        if (response.action === picker.Action.PICKED && pickedDocument)
          resolve({ id: pickedDocument.id, name: pickedDocument.name })
        else if (response.action === picker.Action.CANCEL)
          resolve(null)
      })
      .build()
      .setVisible(true)
  })
}
