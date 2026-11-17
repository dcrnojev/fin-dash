// sessionStorage lasts as long as the browser tab, reloads included. Like localStorage it can be missing or throw,
// and the app then just asks again.

export function readSessionString(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSessionString(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}

export function removeSessionValue(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Nothing to do: remembering is a convenience.
  }
}
