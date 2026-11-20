import { isValidId } from '../domain/ids.ts'

const maxIdLength = 40

// A slug of the label that no row of the tab uses yet: lowercase ASCII letters and digits joined by dashes, with -2, -3
// and so on added when the slug is taken. A label with nothing to slug, such as one made of symbols, uses `fallback`.
export function unusedId(label: string, takenIds: Iterable<string>, fallback: string): string {
  const taken = new Set(takenIds)
  const slug = slugOf(label)
  const base = isValidId(slug) ? slug : fallback

  for (let suffix = 1; ; suffix++) {
    const ending = suffix === 1 ? '' : `-${suffix}`
    const id = `${base.slice(0, maxIdLength - ending.length).replace(/-+$/, '')}${ending}`

    if (!taken.has(id))
      return id
  }
}

function slugOf(label: string): string {
  return label
    .toLowerCase()
    // Splits each letter from its accent so the accent can be dropped. Croatian đ has no such split.
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('đ', 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxIdLength)
    .replace(/-+$/, '')
}
