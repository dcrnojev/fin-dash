import type { Change, HeadlineFigure, HeadlineFigures } from '../calc/headlineFigures'
import { addMonths } from '../domain/month'
import type { Month } from '../domain/types'
import { displayEuros, displayMonth, displaySignedEuros, displaySignedPercent } from '../format'

interface HeadlineTilesProps {
  figures: HeadlineFigures
  hideAmounts: boolean
}

export function HeadlineTiles({ figures, hideAmounts }: HeadlineTilesProps) {
  const tiles = [
    { label: 'Total cash', figure: figures.cash },
    { label: 'Total investments', figure: figures.investments },
    { label: 'Cash and investments', figure: figures.combined },
  ]

  return (
    <div className="headline">
      <p className="muted">At the end of {displayMonth(figures.month)}</p>
      <ul className="tiles">
        {tiles.map(tile => (
          <li key={tile.label} className="tile">
            <span className="tile-label">{tile.label}</span>
            <TileValue figure={tile.figure} hideAmounts={hideAmounts} />
            <ChangeLine
              measured={tile.figure.versusPreviousMonth}
              estimated={tile.figure.estimatedVersusPreviousMonth}
              since={addMonths(figures.month, -1)}
              hideAmounts={hideAmounts}
            />
            <ChangeLine
              measured={tile.figure.versusYearEarlier}
              estimated={tile.figure.estimatedVersusYearEarlier}
              since={addMonths(figures.month, -12)}
              hideAmounts={hideAmounts}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TileValue({ figure, hideAmounts }: { figure: HeadlineFigure; hideAmounts: boolean }) {
  const estimatedNote = <span className="tile-note">Estimated: some pots have no snapshot this month.</span>

  if (figure.total !== null)
    return <span className="tile-value">{displayEuros(figure.total, hideAmounts)}</span>

  if (figure.estimatedTotal !== null) {
    return (
      <span className="tile-value">
        {displayEuros(figure.estimatedTotal, hideAmounts)}
        {estimatedNote}
      </span>
    )
  }

  if (figure.knownPart !== null) {
    return (
      <span className="tile-value">
        <span className="tile-qualifier">at least </span>
        {displayEuros(figure.knownPart, hideAmounts)}
        <span className="tile-note">A pot has no snapshot this month and cannot be estimated.</span>
        {figure.knownPartIncludesEstimates && estimatedNote}
      </span>
    )
  }

  return <span className="tile-value muted">unknown</span>
}

interface ChangeLineProps {
  // At most one of the two is set.
  measured: Change | null
  estimated: Change | null
  since: Month
  hideAmounts: boolean
}

function ChangeLine({ measured, estimated, since, hideAmounts }: ChangeLineProps) {
  const change = measured ?? estimated

  if (change === null)
    return <span className="tile-change muted">vs {displayMonth(since)}: no complete figure</span>

  const direction = change.amount > 0 ? 'up' : change.amount < 0 ? 'down' : 'flat'
  const percent = change.ratio === null ? '' : ` (${displaySignedPercent(change.ratio)})`

  return (
    <span className={`tile-change change-${direction}`}>
      vs {displayMonth(since)}: {displaySignedEuros(change.amount, hideAmounts)}
      {percent}
      {estimated !== null && ' (estimated)'}
    </span>
  )
}
