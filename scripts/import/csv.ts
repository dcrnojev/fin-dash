// A byte order mark lets Excel open the file as UTF-8, so names with diacritics survive.
const byteOrderMark = '﻿'

export function toCsv(rows: readonly (readonly (string | number | boolean)[])[]): string {
  return byteOrderMark + rows.map(row => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

function csvField(value: string | number | boolean): string {
  const text = String(value)

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
