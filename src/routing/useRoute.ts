import { useMemo, useSyncExternalStore } from 'react'
import { parseRoute, routeHash, type Route } from './route'

// The page lives in the URL hash, so a static host such as GitHub Pages serves every page from index.html, and the
// browser's back button moves between pages. Links are plain <a href={routeHash(route)}> elements.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeToHash, readHash)
  return useMemo(() => parseRoute(hash), [hash])
}

// For moving on after an action, such as a write; a click on a link needs no call.
export function navigate(route: Route): void {
  window.location.hash = routeHash(route)
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function readHash(): string {
  return window.location.hash
}
