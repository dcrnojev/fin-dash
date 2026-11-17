export interface GoogleConfig {
  clientId: string
  apiKey: string
  projectNumber: string
}

export type GoogleConfigResult = { config: GoogleConfig; problem: null } | { config: null; problem: string }

export function readGoogleConfig(): GoogleConfigResult {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY?.trim() ?? ''
  const projectNumber = import.meta.env.VITE_GOOGLE_PROJECT_NUMBER?.trim() ?? ''

  const missingNames = [
    clientId ? null : 'VITE_GOOGLE_CLIENT_ID',
    apiKey ? null : 'VITE_GOOGLE_API_KEY',
    projectNumber ? null : 'VITE_GOOGLE_PROJECT_NUMBER',
  ].filter(name => name !== null)

  if (missingNames.length > 0)
    return { config: null, problem: `Missing ${missingNames.join(', ')} in .env.local. See README.md for the setup.` }

  return { config: { clientId, apiKey, projectNumber }, problem: null }
}
