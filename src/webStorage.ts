// localStorage and sessionStorage can be missing or throw, even on access (private windows, blocked site data), so each
// function takes a getter and calls it inside its try. The app then just forgets, or asks again.

type StorageGetter = () => Storage

export const getLocalStorage: StorageGetter = () => window.localStorage
export const getSessionStorage: StorageGetter = () => window.sessionStorage

export function readStoredString(storage: StorageGetter, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

export function writeStoredString(storage: StorageGetter, key: string, value: string): void {
  try {
    storage().setItem(key, value)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}

export function removeStoredValue(storage: StorageGetter, key: string): void {
  try {
    storage().removeItem(key)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}
