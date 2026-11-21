import type { Issue } from '../domain/types'

export type IssueCounts = Record<Issue['severity'], number>

export function issueCounts(issues: readonly Issue[]): IssueCounts {
  const counts: IssueCounts = { error: 0, warning: 0, info: 0 }

  for (const issue of issues)
    counts[issue.severity]++

  return counts
}
