// Formulas found in the legacy sheets: inline sums such as `120+45` or `15*2`, and totals such as `SUM(C2:E2)`,
// `F40+N40` or `O42-O40`.
//   expression = [sign] term (('+' | '-') term)*
//   term       = factor ('*' factor)*
//   factor     = number | cell | 'SUM(' cell ':' cell ')'
// Anything else is unsupported and parses to null.

export type Factor = { kind: 'number'; value: number } | { kind: 'cell'; address: string } | { kind: 'sum'; from: string; to: string }

export interface Term {
  sign: 1 | -1
  factors: Factor[]
  text: string
}

export interface InlineSumPart {
  position: number
  text: string
  euros: number
}

type SymbolKind = '+' | '-' | '*' | ':' | ')'
type Token = { kind: 'number'; value: number } | { kind: 'cell'; address: string } | { kind: 'sum' } | { kind: SymbolKind }

interface PlacedToken {
  token: Token
  start: number
  end: number
}

const tokenPattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|(\$?[A-Z]{1,3}\$?\d+)|(SUM\()|([-+*:)]))/iy

export function parseLegacyFormula(formula: string): Term[] | null {
  const text = formula.trim().replace(/^=/, '')
  const tokens = tokenize(text)

  return tokens === null ? null : toTerms(tokens, text)
}

// The parts of an inline sum, or null when the formula is not made of plain numbers only.
export function inlineSumParts(formula: string): InlineSumPart[] | null {
  const terms = parseLegacyFormula(formula)

  if (terms === null || terms.some(term => term.factors.some(factor => factor.kind !== 'number')))
    return null

  return terms.map((term, index) => ({
    position: index + 1,
    text: term.text,
    euros: term.sign * term.factors.reduce((product, factor) => product * (factor.kind === 'number' ? factor.value : 1), 1),
  }))
}

function tokenize(text: string): PlacedToken[] | null {
  const pattern = new RegExp(tokenPattern)
  const tokens: PlacedToken[] = []

  while (pattern.lastIndex < text.length) {
    const searchStart = pattern.lastIndex
    const match = pattern.exec(text)

    if (match === null)
      return text.slice(searchStart).trim() === '' ? tokens : null

    const [whole, number, cell, sum, symbol] = match
    const start = searchStart + whole.length - whole.trimStart().length

    if (number !== undefined)
      tokens.push({ token: { kind: 'number', value: Number(number) }, start, end: pattern.lastIndex })
    else if (cell !== undefined)
      tokens.push({ token: { kind: 'cell', address: cell.toUpperCase().replaceAll('$', '') }, start, end: pattern.lastIndex })
    else if (sum !== undefined)
      tokens.push({ token: { kind: 'sum' }, start, end: pattern.lastIndex })
    else
      tokens.push({ token: { kind: symbol as SymbolKind }, start, end: pattern.lastIndex })
  }

  return tokens
}

function toTerms(tokens: readonly PlacedToken[], text: string): Term[] | null {
  const terms: Term[] = []
  let position = 0
  const kindAt = (offset = 0) => tokens[position + offset]?.token.kind

  const readFactor = (): Factor | null => {
    const token = tokens[position]?.token

    if (token?.kind === 'number' || token?.kind === 'cell') {
      position++
      return token
    }

    const from = tokens[position + 1]?.token
    const to = tokens[position + 3]?.token

    if (token?.kind !== 'sum' || from?.kind !== 'cell' || kindAt(2) !== ':' || to?.kind !== 'cell' || kindAt(4) !== ')')
      return null

    position += 5
    return { kind: 'sum', from: from.address, to: to.address }
  }

  while (position < tokens.length) {
    const operator = kindAt()
    const sign = operator === '-' ? -1 : 1

    if (operator === '+' || operator === '-')
      position++
    else if (terms.length > 0)
      return null

    const start = tokens[position]?.start
    const first = readFactor()

    if (first === null || start === undefined)
      return null

    const factors = [first]

    while (kindAt() === '*') {
      position++
      const next = readFactor()

      if (next === null)
        return null

      factors.push(next)
    }

    terms.push({ sign, factors, text: text.slice(start, tokens[position - 1].end) })
  }

  return terms.length > 0 ? terms : null
}
