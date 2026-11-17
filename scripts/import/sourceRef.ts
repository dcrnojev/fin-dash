// `source_ref` values name the legacy cell a row came from, such as `CF:CashBalance 2023-2024!D14`; CF is the CashFlow workbook.
const cashFlowWorkbookPrefix = 'CF'

export function cashFlowRef(sheetName: string, addresses: readonly string[]): string {
  return `${cashFlowWorkbookPrefix}:${sheetName}!${addresses.join(',')}`
}
