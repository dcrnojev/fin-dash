import { DataError, type DataStore } from '../types'
import { readGoogleConfig } from './googleConfig'
import { GoogleSession } from './googleSession'
import { SheetsApi } from './sheetsApi'
import { pickSpreadsheet } from './spreadsheetPicker'

export function createGoogleDataStore(): DataStore {
  const { config, problem } = readGoogleConfig()

  if (!config)
    return createUnconfiguredStore(problem)

  const session = new GoogleSession(config.clientId)
  const sheets = new SheetsApi(session)

  return {
    setupProblem: null,
    currentUser: () => session.currentUser(),
    rememberedEmail: () => session.rememberedEmail(),
    resumeSession: () => session.resumeSession(),
    signIn: () => session.signIn(),
    signOut: () => session.signOut(),
    chooseSpreadsheet: async () => pickSpreadsheet(await session.accessToken(), config),
    getSpreadsheet: spreadsheetId => sheets.getSpreadsheet(spreadsheetId),
    createSpreadsheet: (title, tabNames) => sheets.createSpreadsheet(title, tabNames),
    appendRows: (spreadsheetId, tab, rows) => sheets.appendRows(spreadsheetId, tab, rows),
    updateCells: (spreadsheetId, updates) => sheets.updateCells(spreadsheetId, updates),
    writeTabs: (spreadsheetId, tabs) => sheets.writeTabs(spreadsheetId, tabs),
    readTabs: (spreadsheetId, tabNames) => sheets.readTabs(spreadsheetId, tabNames),
    formatTabs: (spreadsheetId, layouts) => sheets.formatTabs(spreadsheetId, layouts),
  }
}

function createUnconfiguredStore(problem: string): DataStore {
  const fail = () => Promise.reject(new DataError('failed', problem))

  return {
    setupProblem: problem,
    currentUser: () => null,
    rememberedEmail: () => null,
    resumeSession: () => Promise.resolve(null),
    signIn: fail,
    signOut: () => {},
    chooseSpreadsheet: fail,
    getSpreadsheet: fail,
    createSpreadsheet: fail,
    appendRows: fail,
    updateCells: fail,
    writeTabs: fail,
    readTabs: fail,
    formatTabs: fail,
  }
}
