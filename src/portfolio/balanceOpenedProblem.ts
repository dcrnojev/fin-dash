import { monthIndex } from '../domain/month.ts'
import type { Month } from '../domain/types.ts'
import { displayMonth } from '../format.ts'

// A balance opened in a month already closed would leave that month without its value, so its group total turns unknown.
export function balanceOpenedProblem(opened: Month, monthToClose: Month | null): string | null {
  if (monthToClose === null || monthIndex(opened) >= monthIndex(monthToClose))
    return null

  const closedMonths = `${displayMonth(monthToClose)} is the next month to close`
  return `${closedMonths}, so a balance added now must open in ${displayMonth(monthToClose)} or later.`
}
