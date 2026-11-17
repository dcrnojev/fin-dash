const idPattern = /^[a-z0-9][a-z0-9-]{1,39}$/

// The owner of shared pots; no `people` row has this id.
export const householdOwner = 'household'

export function isValidId(text: string): boolean {
  return idPattern.test(text)
}
