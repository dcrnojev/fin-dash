import type { Change, HeadlineFigure, HeadlineFigures } from '../calc/headlineFigures'
import type { MonthEndHistory, MonthTotal } from '../calc/monthEndHistory'
import { monthFigure, type MonthFigure } from '../calc/monthFigure'
import { sparkline } from '../calc/sparkline'
import { addMonths } from '../domain/month'
import type { Month } from '../domain/types'
import { displayFigure, displayMonth, displayMonthName } from '../format'
import { ChangeText } from './ChangeText'
import { Sparkline } from './Sparkline'

const sparklineMonths = 12

interface HeadlineTilesProps {
  figures: HeadlineFigures
  history: MonthEndHistory
  hideAmounts: boolean
}

export function HeadlineTiles({ figures, history, hideAmounts }: HeadlineTilesProps) {
  const tiles = [
    { label: 'Total cash', figure: figures.cash, months: history.cash.months },
    { label: 'Total investments', figure: figures.investments, months: history.investments.months },
    { label: 'Cash and investments', figure: figures.combined, months: history.combined },
  ]

  return (
    <ul className="tiles">
      {tiles.map(tile => (
        <Tile key={tile.label} {...tile} month={figures.month} hideAmounts={hideAmounts} />
      ))}
    </ul>
  )
}

interface TileProps {
  label: string
  figure: HeadlineFigure
  months: readonly MonthTotal[]
  month: Month
  hideAmounts: boolean
}

function Tile({ label, figure, months, month, hideAmounts }: TileProps) {
  const value = monthFigure(figure)
  const previousMonth = addMonths(month, -1)
  const yearEarlier = addMonths(month, -12)

  return (
    <li className="card tile">
      <span className="tile-label">
        {label}
        <StateChip figure={value} />
      </span>
      <span className={value === null ? 'tile-value muted' : 'tile-value'}>{value === null ? 'unknown' : displayFigure(value, hideAmounts)}</span>
      <Sparkline line={sparkline(months, month, sparklineMonths)} />
      <dl className="tile-changes">
        <dt>vs {displayMonthName(previousMonth)}</dt>
        <dd>
          <TileChange measured={figure.versusPreviousMonth} estimated={figure.estimatedVersusPreviousMonth} hideAmounts={hideAmounts} />
        </dd>
        <dt>vs {displayMonth(yearEarlier)}</dt>
        <dd>
          <TileChange measured={figure.versusYearEarlier} estimated={figure.estimatedVersusYearEarlier} hideAmounts={hideAmounts} />
        </dd>
      </dl>
    </li>
  )
}

function StateChip({ figure }: { figure: MonthFigure | null }) {
  if (figure?.state === 'estimated')
    return <span className="chip chip-dashed" title="Some groups have no month-end balance this month and are estimated.">Estimated</span>

  if (figure?.state === 'at-least')
    return <span className="chip chip-dashed" title="A group has no month-end balance this month and cannot be estimated.">At least</span>

  return null
}

interface TileChangeProps {
  // At most one of the two is set.
  measured: Change | null
  estimated: Change | null
  hideAmounts: boolean
}

function TileChange({ measured, estimated, hideAmounts }: TileChangeProps) {
  const change = measured ?? estimated

  if (change === null)
    return <span className="muted">no complete figure</span>

  return <ChangeText amount={change.amount} ratio={change.ratio} estimated={estimated !== null} hideAmounts={hideAmounts} />
}
