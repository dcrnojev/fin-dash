import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import type { LegacyCell, LegacySheet, LegacyWorkbook } from './legacySheet.ts'

// The only module that touches SheetJS. Dates stay serial numbers (no `cellDates`), so no time zone can shift a day.
export function readWorkbook(path: string): LegacyWorkbook {
  const workbook = XLSX.read(readFileSync(path), { type: 'buffer', cellFormula: true, cellDates: false })
  const sheets = new Map<string, LegacySheet>()

  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name]
    const cells = new Map<string, LegacyCell>()

    for (const [address, cell] of Object.entries(worksheet)) {
      // Keys starting with '!' are sheet metadata such as the used range, not cells.
      if (address.startsWith('!'))
        continue

      const { r, c } = XLSX.utils.decode_cell(address)
      const sheetCell = cell as XLSX.CellObject

      cells.set(address, {
        address,
        column: XLSX.utils.encode_col(c),
        row: r + 1,
        value: cellValue(sheetCell),
        formula: sheetCell.f ?? null,
        comment: sheetCell.c?.map(comment => comment.t).join('\n') ?? null,
      })
    }

    sheets.set(name, { name, cells })
  }

  return sheets
}

function cellValue(cell: XLSX.CellObject): LegacyCell['value'] {
  switch (cell.t) {
    case 'n':
    case 's':
    case 'b':
      return cell.v as number | string | boolean
    case 'e':
      return cell.w ?? '#ERROR'
    default:
      return null
  }
}
