import { createGoogleDataStore } from './google/googleDataStore'
import type { DataStore } from './types'

// The only way UI code reaches the data. Swapping the storage means returning a different DataStore here.
export const dataStore: DataStore = createGoogleDataStore()

export { DataError } from './types'
export type {
  CellUpdate,
  CellValue,
  ColumnFormat,
  DataErrorKind,
  SignedInUser,
  SpreadsheetRef,
  SpreadsheetTabs,
  TabLayout,
  TabRows,
} from './types'
