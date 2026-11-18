import { useState } from 'react'
import { getLocalStorage, readStoredString, writeStoredString } from './webStorage'

const hideAmountsKey = 'fin-dash.hide-amounts'

// Whether euro figures are masked, remembered on this device.
export function useHideAmounts(): [boolean, (hide: boolean) => void] {
  const [hideAmounts, setHideAmounts] = useState(() => readStoredString(getLocalStorage, hideAmountsKey) === 'true')

  function changeHideAmounts(hide: boolean) {
    writeStoredString(getLocalStorage, hideAmountsKey, String(hide))
    setHideAmounts(hide)
  }

  return [hideAmounts, changeHideAmounts]
}
