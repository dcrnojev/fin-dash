import { describe, expect, it } from 'vitest'
import { checkImportFile } from './checkImportFile'

const bundle = {
  meta: {
    schemaVersion: 1,
    currency: 'EUR',
    goLiveMonth: null,
    legacyLastMonth: null,
    monthEndRule: null,
    lastWriteAppVersion: null,
  },
  people: [{ id: 'pa', name: 'Partner A', role: 'adult', note: null }],
  groups: [],
  balances: [],
  monthEndBalances: [],
  contributions: [],
  months: [],
}

describe('checkImportFile', () => {
  it('accepts a bundle whose cells are all text, numbers or true/false', () => {
    expect(checkImportFile(JSON.stringify(bundle)).problem).toBeNull()
  })

  it('rejects a bundle with a cell the spreadsheet cannot hold, naming its tab and row', () => {
    const withObjectNote = { ...bundle, people: [{ ...bundle.people[0], note: {} }] }
    const result = checkImportFile(JSON.stringify(withObjectNote))

    expect(result.check).toBeNull()
    expect(result.problem).toMatch(/^The people tab, row 2, column note /)
  })
})
