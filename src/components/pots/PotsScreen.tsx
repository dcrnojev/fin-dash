import type { Ledger, Month } from '../../domain/types'
import { AddHoldingForm } from './AddHoldingForm'
import { AddPotForm } from './AddPotForm'
import { PotList } from './PotList'

interface PotsScreenProps {
  ledger: Ledger
  spreadsheetId: string
  tabLinks: Readonly<Record<string, string>>
  monthToClose: Month | null
  onAdded: (message: string) => void
  onBack: () => void
}

export function PotsScreen({ ledger, spreadsheetId, tabLinks, monthToClose, onAdded, onBack }: PotsScreenProps) {
  return (
    <section className="screen">
      <div className="screen-header">
        <h2>Pots and holdings</h2>
        <button type="button" className="link-button" onClick={onBack}>
          Back to the dashboard
        </button>
      </div>

      <p className="notice">
        Closing a pot or a holding is done by hand in the sheet for now: type its last month into <code>closed_month</code> in
        the <TabLink href={tabLinks.pots} name="pots" /> or <TabLink href={tabLinks.holdings} name="holdings" /> tab, then read
        the spreadsheet again.
      </p>

      <PotList pots={ledger.pots} holdings={ledger.holdings} people={ledger.people} />

      <div className="form-columns">
        <AddPotForm spreadsheetId={spreadsheetId} pots={ledger.pots} onAdded={onAdded} />
        <AddHoldingForm
          spreadsheetId={spreadsheetId}
          pots={ledger.pots}
          holdings={ledger.holdings}
          people={ledger.people}
          monthToClose={monthToClose}
          onAdded={onAdded}
        />
      </div>
    </section>
  )
}

function TabLink({ href, name }: { href: string | undefined; name: string }) {
  if (href === undefined)
    return <code>{name}</code>

  return (
    <a href={href} target="_blank" rel="noreferrer">
      {name}
    </a>
  )
}
