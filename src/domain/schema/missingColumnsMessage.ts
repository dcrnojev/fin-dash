// What to do about columns a write needs that the tab's header row lacks.
export function missingColumnsMessage(tab: string, names: readonly string[]): string {
  const columns = names.length > 1 ? 'columns' : 'a column'
  return `Add ${columns} named exactly ${names.join(' and ')} to the header row of the ${tab} tab; existing rows can stay blank.`
}
