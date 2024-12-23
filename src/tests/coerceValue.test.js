import { coerceValue, parseSchema } from '../functions'

test('it coerces string values', () => {
  expect(coerceValue('hello', 'string')).toBe('hello')
  expect(coerceValue(123, 'string')).toBe('123')
  expect(coerceValue(true, 'string')).toBe('true')
  expect(coerceValue(null, 'string')).toBe('')
})

test('it coerces number values', () => {
  expect(coerceValue('123', 'number')).toBe(123)
  expect(coerceValue('3.14', 'number')).toBe(3)
  expect(coerceValue(true, 'number')).toBeNaN()
  expect(coerceValue(null, 'number')).toBeNull()
})

test('it coerces float values', () => {
  expect(coerceValue('3.14', 'float')).toBe(3.14)
  expect(coerceValue('123', 'float')).toBe(123)
  expect(coerceValue(true, 'float')).toBeNaN()
  expect(coerceValue(null, 'float')).toBeNull()
})

test('it coerces date values', () => {
  const date = new Date('2022-01-01')
  expect(coerceValue('2022-01-01', 'date')).toEqual(date)
  expect(coerceValue('invalid-date', 'date')).toBeNull()
  expect(coerceValue(true, 'date')).toBeNull()
  expect(coerceValue(null, 'date')).toBeNull()
})

test('it coerces boolean values', () => {
  expect(coerceValue('true', 'boolean')).toBe(true)
  expect(coerceValue('false', 'boolean')).toBe(false)
  expect(coerceValue('invalid-boolean', 'boolean')).toBe(true)
  expect(coerceValue(null, 'boolean')).toBe(false)
})

test('it returns the value for unknown types', () => {
  expect(coerceValue('value', 'unknown')).toBe('value')
  expect(coerceValue(123, 'unknown')).toBe(123)
  expect(coerceValue(true, 'unknown')).toBe(true)
  expect(coerceValue(null, 'unknown')).toBeNull()
})

test('it populates type field with parent type', () => {
  expect(coerceValue('something', 'type', { parentType: 'users' })).toBe('users')
  expect(coerceValue(null, 'type', { parentType: 'todos' })).toBe('todos')
  expect(coerceValue('fallback', 'type', {})).toBe('fallback')
})

test('it populates type field with parent type using only string type definition', () => {
  const schema = parseSchema({
    users: {
      type: 'users',
      fields: {
        test: 'string',
        testType: 'type',
      },
    },
  })

  const result = coerceValue('fallback', 'testType', {
    parentType: 'users',
    field: schema.users.fields.testType,
  })

  expect(result).toBe('users')
})

