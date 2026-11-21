import { describe, expect, it } from 'vitest'
import { unusedId } from './unusedId.ts'

describe('unusedId', () => {
  it('slugs the label, dropping accents, and numbers it past the ids already taken', () => {
    expect(unusedId('Štednja đački račun (EUR)', [], 'group')).toBe('stednja-dacki-racun-eur')
    expect(unusedId('Cash A', ['cash-a', 'cash-a-2'], 'group')).toBe('cash-a-3')
  })

  it('falls back for a label with nothing to slug and stays within 40 characters', () => {
    expect(unusedId('€ €', ['group'], 'group')).toBe('group-2')
    expect(unusedId('a'.repeat(50), ['a'.repeat(40)], 'group')).toBe(`${'a'.repeat(38)}-2`)
  })
})
