import { describe, expect, it } from 'vitest'
import type { Month } from '../domain/types.ts'
import { parseRoute, routeHash, type Route } from './route.ts'

describe('parseRoute', () => {
  it('reads each page and the month of an edit back from its own hash', () => {
    const routes: Route[] = [
      { page: 'home' },
      { page: 'close' },
      { page: 'months' },
      { page: 'edit', month: '2030-04' as Month },
      { page: 'pots' },
      { page: 'health' },
      { page: 'setup' },
    ]

    for (const route of routes)
      expect(parseRoute(routeHash(route))).toEqual(route)
  })

  it('opens the home page for an empty hash, an unknown page or a month that is not one', () => {
    expect(parseRoute('')).toEqual({ page: 'home' })
    expect(parseRoute('#')).toEqual({ page: 'home' })
    expect(parseRoute('#/budget')).toEqual({ page: 'home' })
    expect(parseRoute('#/months/2030-13')).toEqual({ page: 'home' })
    expect(parseRoute('#/pots/extra')).toEqual({ page: 'home' })
  })

  it('accepts a hash written without the leading slash or with a trailing one', () => {
    expect(parseRoute('#months')).toEqual({ page: 'months' })
    expect(parseRoute('#/months/2030-04/')).toEqual({ page: 'edit', month: '2030-04' })
  })
})
