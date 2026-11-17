import { describe, expect, it } from 'vitest'
import type { IsoDate } from '../../src/domain/types.ts'
import { chooseMonthEnds } from './monthEndChoice.ts'

function select(dates: string[]) {
  return chooseMonthEnds(dates.map(date => ({ date: date as IsoDate, item: date })))
}

describe('chooseMonthEnds', () => {
  it('picks the reading closest to month end when there are two a month', () => {
    const { months, outsideWindows } = select(['2030-01-08', '2030-01-30', '2030-02-03', '2030-02-12', '2030-02-27'])

    expect(months.map(choice => [choice.month, choice.chosen?.item])).toEqual([
      ['2030-01', '2030-01-30'],
      ['2030-02', '2030-02-27'],
    ])
    expect(outsideWindows).toEqual(['2030-01-08', '2030-02-12'])
  })

  it('lets a reading from the first days of the next month win when it is closer', () => {
    const { months } = select(['2030-03-25', '2030-04-02'])

    expect(months).toHaveLength(1)
    expect(months[0]).toMatchObject({ month: '2030-03', chosen: { item: '2030-04-02', offsetDays: 2 } })
    expect(months[0].candidates).toHaveLength(2)
  })

  it('marks months without a reading in their window as gaps', () => {
    const { months, outsideWindows } = select(['2030-02-28', '2030-03-07', '2030-05-31'])

    expect(months.map(choice => [choice.month, choice.chosen?.item ?? null])).toEqual([
      ['2030-02', '2030-02-28'],
      ['2030-03', null],
      ['2030-04', null],
      ['2030-05', '2030-05-31'],
    ])
    expect(outsideWindows).toEqual(['2030-03-07'])
  })

  it('prefers the earlier reading when two are equally far from month end', () => {
    const { months } = select(['2030-08-01', '2030-07-30'])

    expect(months[0]).toMatchObject({ month: '2030-07', chosen: { item: '2030-07-30', offsetDays: -1 } })
  })
})
