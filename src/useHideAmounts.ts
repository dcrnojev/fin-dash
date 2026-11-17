import { useState } from 'react'
import { readStoredString, writeStoredString } from './localStore'

const hideAmountsKey = 'fin-dash.hide-amounts'

// Whether euro figures are masked, remembered on this device.
export function useHideAmounts(): [boolean, (hide: boolean) => void] {
  const [hideAmounts, setHideAmounts] = useState(() => readStoredString(hideAmountsKey) === 'true')

  function changeHideAmounts(hide: boolean) {
    writeStoredString(hideAmountsKey, String(hide))
    setHideAmounts(hide)
  }

  return [hideAmounts, changeHideAmounts]
}
