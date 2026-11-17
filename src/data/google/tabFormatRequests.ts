import type { ColumnFormat, TabLayout } from '../types'

// One request of the Sheets batchUpdate call, as the REST API takes it.
export type SheetsRequest = Record<string, unknown>

// Number format patterns use ',' and '.' whatever the spreadsheet's locale; Sheets shows them with the locale's separators.
const numberFormats: Record<Exclude<ColumnFormat, 'automatic'>, { type: string; pattern: string }> = {
  'plain-text': { type: 'TEXT', pattern: '@' },
  money: { type: 'NUMBER', pattern: '#,##0.00' },
  date: { type: 'DATE', pattern: 'yyyy-mm-dd' },
}

export function tabFormatRequests(sheetId: number, layout: TabLayout): SheetsRequest[] {
  const frozenHeader: SheetsRequest = {
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  }

  const boldHeader: SheetsRequest = {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: 'userEnteredFormat.textFormat.bold',
    },
  }

  const columnFormats = layout.columnFormats.flatMap((format, columnIndex): SheetsRequest[] => {
    if (format === 'automatic')
      return []

    return [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
          cell: { userEnteredFormat: { numberFormat: numberFormats[format] } },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
    ]
  })

  return [frozenHeader, boldHeader, ...columnFormats]
}
