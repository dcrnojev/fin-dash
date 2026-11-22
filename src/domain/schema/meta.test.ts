import { describe, expect, it } from 'vitest'
import type { Issue } from '../types.ts'
import { metaFromEntries } from './meta.ts'
import type { MetaEntry } from './metaTab.ts'

const required: MetaEntry[] = [
  { key: 'schema_version', value: 2 },
  { key: 'currency', value: 'EUR' },
]

function goalOf(value: MetaEntry['value']): { goal: number | null | undefined; issues: Issue[] } {
  const issues: Issue[] = []
  const meta = metaFromEntries([...required, { key: 'monthly_savings_goal', value }], issues)

  return { goal: meta?.monthlySavingsGoal, issues }
}

describe('metaFromEntries', () => {
  it('reads the monthly savings goal in euros as cents', () => {
    expect(goalOf(512.5)).toEqual({ goal: 512_50, issues: [] })
  })

  it('reads a cleared goal cell as no goal, without an issue', () => {
    expect(goalOf(null)).toEqual({ goal: null, issues: [] })
  })

  it('leaves out a goal that is not an amount above zero, with a warning', () => {
    for (const value of [0, -50, 'soon']) {
      const { goal, issues } = goalOf(value)

      expect(goal).toBeNull()
      expect(issues.map(issue => [issue.severity, issue.code])).toEqual([['warning', 'invalid-monthly-savings-goal']])
    }
  })
})
