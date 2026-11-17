import type { ColumnFormat, TabLayout } from '../data'
import { tabColumns } from '../domain/schema/tabColumns'
import type { ColumnType } from '../domain/schema/tabSpec'
import { tabNames } from '../domain/types'

const formatsByColumnType: Partial<Record<ColumnType, ColumnFormat>> = {
  month: 'plain-text',
  money: 'money',
  date: 'date',
}

// Column formats for the tabs as the app writes them, in the order of the tab specs.
export function tabLayouts(): TabLayout[] {
  return tabNames.map(tab => ({
    tab,
    columnFormats: tabColumns[tab].map(column => formatsByColumnType[column.type] ?? 'automatic'),
  }))
}
