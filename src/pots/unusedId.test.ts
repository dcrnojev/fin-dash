import { describe, expect, it } from 'vitest'
import { unusedId } from './unusedId.ts'

describe('unusedId', () => {
  it('slugs the label, dropping accents, and numbers it past the ids already taken', () => {
    expect(unusedId('Štednja đački račun (EUR)', [], 'pot')).toBe('stednja-dacki-racun-eur')
    expect(unusedId('Cash A', ['cash-a', 'cash-a-2'], 'pot')).toBe('cash-a-3')
  })

  it('falls back for a label with nothing to slug and stays within 40 characters', () => {
    expect(unusedId('€ €', ['pot'], 'pot')).toBe('pot-2')
    expect(unusedId('a'.repeat(50), ['a'.repeat(40)], 'pot')).toBe(`${'a'.repeat(38)}-2`)
  })
})
