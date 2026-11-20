// The error's message ending in a full stop, so a sentence can follow it.
export function messageOf(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).trim()

  return /[.!?]$/.test(message) ? message : `${message}.`
}
