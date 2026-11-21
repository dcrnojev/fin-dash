import type { Cents } from '../domain/types'
import { displaySignedEuros, displaySignedPercent } from '../format'

interface ChangeTextProps {
  // Null when only the ratio is known, as for a group's change.
  amount: Cents | null
  // Null when the earlier figure is zero.
  ratio: number | null
  // A change against or to an estimated figure.
  estimated?: boolean
  // The percentage alone, for tight places; it is also all that shows while amounts are hidden.
  percentOnly?: boolean
  hideAmounts: boolean
}

// A change with an arrow and its colour: up green, down red. The arrow repeats the direction for colour-blind readers.
export function ChangeText({ amount, ratio, estimated = false, percentOnly = false, hideAmounts }: ChangeTextProps) {
  const sign = Math.sign(amount ?? ratio ?? 0)
  const direction = sign > 0 ? 'up' : sign < 0 ? 'down' : 'flat'
  const text = changeLabel(hideAmounts || percentOnly ? null : amount, ratio)

  if (text === null)
    return null

  return (
    <span className={`change change-${direction}`}>
      {direction !== 'flat' && (
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d={direction === 'up' ? 'M5 1 9.5 8.5H.5z' : 'M5 9 .5 1.5h9z'} />
        </svg>
      )}
      {estimated ? `≈ ${text}` : text}
    </span>
  )
}

function changeLabel(amount: Cents | null, ratio: number | null): string | null {
  const percent = ratio === null ? null : displaySignedPercent(ratio)

  if (amount === null)
    return percent

  const euros = displaySignedEuros(amount, false)
  return percent === null ? euros : `${euros} (${percent})`
}
