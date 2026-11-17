import { useCallback, useEffect, useState } from 'react'
import { loadLedger, type LoadedLedger } from './loadLedger'

export type LedgerState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; loaded: LoadedLedger }

// Loads the spreadsheet when the component mounts and again whenever `reload` is called.
export function useLedger(spreadsheetId: string): { state: LedgerState; reload: () => void } {
  const [state, setState] = useState<LedgerState>({ status: 'loading' })
  const [loadCount, setLoadCount] = useState(0)

  useEffect(() => {
    let ignore = false

    loadLedger(spreadsheetId)
      .then(loaded => {
        if (!ignore)
          setState({ status: 'loaded', loaded })
      })
      .catch((error: unknown) => {
        if (!ignore)
          setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
      })

    return () => {
      ignore = true
    }
  }, [spreadsheetId, loadCount])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setLoadCount(count => count + 1)
  }, [])

  return { state, reload }
}
