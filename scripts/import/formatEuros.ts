import { centsToEuros } from '../../src/domain/money.ts'
import type { Cents } from '../../src/domain/types.ts'

export function formatEuros(cents: Cents): string {
  return centsToEuros(cents).toFixed(2)
}
