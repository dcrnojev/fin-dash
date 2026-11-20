import type { Ledger, Month } from '../../domain/types'
import { AddHoldingForm } from './AddHoldingForm'
import { AddPotForm } from './AddPotForm'
import { PotList } from './PotList'

interface PotsScreenProps {
  ledger: Ledger
  spreadsheetId: string
  monthToClose: Month | null
  onWritten: (message: string) => void
  onBack: () => void
  onReread: () => void
}

export function PotsScreen({ ledger, spreadsheetId, monthToClose, onWritten, onBack, onReread }: PotsScreenProps) {
  return (
    <section className="screen">
      <div className="screen-header">
        <h2>Pots and holdings</h2>
        <button type="button" className="link-button" onClick={onBack}>
          Back to the dashboard
        </button>
      </div>

      <p className="notice">
        Ids, opened months, a pot's kind and a holding's pot cannot be edited, because existing snapshot rows depend on them:
        for another kind or pot, add a new pot or holding.
      </p>

      <PotList ledger={ledger} spreadsheetId={spreadsheetId} onSaved={onWritten} onReread={onReread} />

      <div className="form-columns">
        <AddPotForm spreadsheetId={spreadsheetId} pots={ledger.pots} people={ledger.people} onAdded={onWritten} />
        <AddHoldingForm
          spreadsheetId={spreadsheetId}
          pots={ledger.pots}
          holdings={ledger.holdings}
          people={ledger.people}
          monthToClose={monthToClose}
          onAdded={onWritten}
        />
      </div>
    </section>
  )
}
