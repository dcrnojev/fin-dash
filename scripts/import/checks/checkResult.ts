export interface CheckDifference {
  cell: string
  message: string
}

// `flagged` means the check found items for the owner to look at that are not errors in the import, such as a month-end
// snapshot read far from the month end; each flagged item says why it is expected.
export interface CheckResult {
  id: string
  title: string
  status: 'pass' | 'fail' | 'flagged'
  counts: string[]
  differences: CheckDifference[]
}
