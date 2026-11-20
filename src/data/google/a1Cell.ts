// The A1 name of a cell: row 5, column 0 is A5; column 26 is AA.
export function a1Cell(row: number, column: number): string {
  let letters = ''

  for (let rest = column + 1; rest > 0; rest = Math.floor((rest - 1) / 26))
    letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters

  return `${letters}${row}`
}
