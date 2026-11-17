// localStorage can be missing or throw (private windows, blocked site data); the app then just forgets between visits.

export function readStoredString(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStoredString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}
