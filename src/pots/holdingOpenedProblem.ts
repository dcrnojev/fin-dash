import { monthIndex } from '../domain/month.ts'
import type { Month } from '../domain/types.ts'
import { displayMonth } from '../format.ts'

// A holding opened in a month already closed would leave that month without its value, so its pot total turns unknown.
export function holdingOpenedProblem(opened: Month, monthToClose: Month | null): string | null {
  if (monthToClose === null || monthIndex(opened) >= monthIndex(monthToClose))
    return null

  const closedMonths = `${displayMonth(monthToClose)} is the next month to close`
  return `${closedMonths}, so a holding added now must open in ${displayMonth(monthToClose)} or later.`
}
