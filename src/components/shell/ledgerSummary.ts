import { closesBeforeMonthEnd } from '../../close/closesEarly'
import { nextMonthToClose } from '../../close/nextMonthToClose'
import type { IsoDate, Ledger, Month } from '../../domain/types'
import { issueCounts, type IssueCounts } from '../../ledger/issueCounts'

// What the menu shows about the loaded spreadsheet.
export interface LedgerSummary {
  monthToClose: Month | null
  // The month to close has ended, so closing it no longer counts as early.
  closeDue: boolean
  // False for a spreadsheet the app shows read-only.
  canWrite: boolean
  issueCounts: IssueCounts
}

export function ledgerSummary(ledger: Ledger, canWrite: boolean, today: IsoDate): LedgerSummary {
  const monthToClose = nextMonthToClose(ledger)

  return {
    monthToClose,
    closeDue: monthToClose !== null && !closesBeforeMonthEnd(monthToClose, today),
    canWrite,
    issueCounts: issueCounts(ledger.issues),
  }
}
