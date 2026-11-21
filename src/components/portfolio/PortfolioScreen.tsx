import type { Ledger, Month } from '../../domain/types'
import { PageHeader } from '../PageHeader'
import { AddBalanceForm } from './AddBalanceForm'
import { AddGroupForm } from './AddGroupForm'
import { GroupList } from './GroupList'

interface PortfolioScreenProps {
  ledger: Ledger
  spreadsheetId: string
  monthToClose: Month | null
  onWritten: (message: string) => void
  onBack: () => void
  onReread: () => void
}

export function PortfolioScreen({ ledger, spreadsheetId, monthToClose, onWritten, onBack, onReread }: PortfolioScreenProps) {
  return (
    <section className="screen">
      <PageHeader
        title="Portfolio"
        description="What the family owns and who owns it."
        actions={
          <button type="button" className="link-button" onClick={onBack}>
            Back to home
          </button>
        }
      />

      <p className="notice">
        Ids, opened months, a group's kind and a balance's group cannot be edited, because existing month-end balance rows depend on them:
        for another kind or group, add a new group or balance.
      </p>

      <GroupList ledger={ledger} spreadsheetId={spreadsheetId} onSaved={onWritten} onReread={onReread} />

      <div className="form-columns">
        <AddGroupForm spreadsheetId={spreadsheetId} groups={ledger.groups} people={ledger.people} onAdded={onWritten} />
        <AddBalanceForm
          spreadsheetId={spreadsheetId}
          groups={ledger.groups}
          balances={ledger.balances}
          people={ledger.people}
          monthToClose={monthToClose}
          onAdded={onWritten}
        />
      </div>
    </section>
  )
}
