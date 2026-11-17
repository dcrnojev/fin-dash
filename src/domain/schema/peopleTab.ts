import { personRoles, type Person, type PersonId } from '../types.ts'
import { RowReader } from './rowReader.ts'
import type { ColumnSpec, TabSpec } from './tabSpec.ts'
import { optionalCell } from './writeCells.ts'

const columns: readonly ColumnSpec[] = [
  { name: 'id', type: 'id', required: true },
  { name: 'name', type: 'text', required: true },
  { name: 'role', type: 'enum', required: true, values: personRoles },
  { name: 'note', type: 'text', required: false },
]

export const peopleTab: TabSpec<Person> = {
  name: 'people',
  columns,
  key: person => person.id,
  fromRow(cells, ref, issues) {
    const read = new RowReader(columns, cells, ref, issues)
    const id = read.id<PersonId>('id')
    const name = read.text('name')
    const role = read.choice('role', personRoles)
    const note = read.text('note')

    if (id === null || name === null || role === null || !read.ok)
      return null

    return { id, name, role, note }
  },
  toRow: person => ({ id: person.id, name: person.name, role: person.role, note: optionalCell(person.note) }),
}
