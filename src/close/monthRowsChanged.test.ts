import { describe, expect, it } from 'vitest'
import { rowsByKey } from '../domain/schema/rowsByKey.ts'
import { snapshotsTab } from '../domain/schema/snapshotsTab.ts'
import type { Month } from '../domain/types.ts'
import { snapshot } from './closeTestData.ts'
import { monthRowsChanged } from './monthRowsChanged.ts'

const november = '2030-11' as Month
const header = ['month', 'pot_id', 'holding_id', 'value', 'as_of']

describe('monthRowsChanged', () => {
  it("names the month's rows added, removed or changed since the form opened, and ignores other months", () => {
    const openedWith = [snapshot('2030-11', 'cash-a', 10_00), snapshot('2030-11', 'cash-b', 20_00), snapshot('2030-10', 'cash-a', 9_00)]

    const fresh = rowsByKey(snapshotsTab, [
      header,
      ['2030-11', 'cash-a', '', 10, ''],
      ['2030-11', 'cash-b', '', 25, ''],
      ['2030-11', 'broker', 'broker-x', 5, ''],
      ['2030-12', 'cash-a', '', 11, ''],
    ])

    expect(monthRowsChanged(november, openedWith, fresh)).toEqual(['broker/broker-x', 'cash-b'])
    expect(monthRowsChanged(november, openedWith.slice(0, 1), rowsByKey(snapshotsTab, [header]))).toEqual(['cash-a'])
  })
})
