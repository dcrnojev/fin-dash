import { displayWholeEuros } from '../../format'

// Shared look of the chart frame: recessive hairline grid and axes, so the data carries the colour.

export const gridProps = { vertical: false, stroke: 'var(--chart-grid)' }

export const axisTick = { fill: 'var(--color-muted)', fontSize: 12 }

export function euroAxisProps(hideAmounts: boolean) {
  return {
    width: 'auto' as const,
    tick: axisTick,
    axisLine: false,
    tickLine: false,
    tickFormatter: (cents: number) => displayWholeEuros(cents, hideAmounts),
  }
}

export const chartMargin = { top: 16, right: 8, bottom: 0, left: 0 }
