import { parseMonth } from '../domain/month.ts'
import type { Month } from '../domain/types.ts'

export type Route =
  | { page: 'home' }
  | { page: 'close' }
  | { page: 'months' }
  | { page: 'edit'; month: Month }
  | { page: 'portfolio' }
  | { page: 'health' }
  | { page: 'setup' }

const pagesWithoutParameters = ['close', 'months', 'portfolio', 'health', 'setup'] as const

// '#/months/2026-10' and the like. Anything the app does not know opens the home page.
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#?\/?/, '').split('/').filter(part => part !== '')

  if (parts.length === 1) {
    const page = pagesWithoutParameters.find(known => known === parts[0])

    if (page !== undefined)
      return { page }
  }

  if (parts.length === 2 && parts[0] === 'months') {
    const month = parseMonth(parts[1])

    if (month !== null)
      return { page: 'edit', month }
  }

  return { page: 'home' }
}

export function routeHash(route: Route): string {
  switch (route.page) {
    case 'home':
      return '#/'
    case 'edit':
      return `#/months/${route.month}`
    default:
      return `#/${route.page}`
  }
}
