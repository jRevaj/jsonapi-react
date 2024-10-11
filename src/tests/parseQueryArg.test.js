import schema from './schema'
import { parseQueryArg } from '../functions'

test('it parses a string', () => {
  const result = parseQueryArg('todos', schema)

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses a string with slashes', () => {
  const result = parseQueryArg('/todos/')

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses a string with an ID', () => {
  const result = parseQueryArg('/todos/1')

  expect(result).toEqual({
    url: '/todos/1',
    id: '1',
    params: {},
    keys: ['todos'],
  })
})

test('it parses a string with an UUID', () => {
  const uuid = '48004eaf-d51d-4e2e-916d-ccd554245a5e'
  const result = parseQueryArg(`todos/${uuid}`)

  expect(result).toEqual({
    url: `/todos/${uuid}`,
    id: uuid,
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array', () => {
  const result = parseQueryArg(['todos'])

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array with an ID', () => {
  const result = parseQueryArg(['todos', 1])

  expect(result).toEqual({
    url: '/todos/1',
    id: '1',
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array with an UUID', () => {
  const uuid = '48004eaf-d51d-4e2e-916d-ccd554245a5e'
  const result = parseQueryArg(['todos', uuid])

  expect(result).toEqual({
    url: `/todos/${uuid}`,
    id: uuid,
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array with multiple segments', () => {
  const result = parseQueryArg(['users', 1, 'todos'])

  expect(result).toEqual({
    url: '/users/1/todos',
    id: '1',
    params: {},
    keys: ['users', 'todos'],
  })
})

test('it parses an array with page refinements', () => {
  const result = parseQueryArg(['todos', { page: { size: 20 } }])

  expect(result).toEqual({
    url: '/todos?page[size]=20',
    id: null,
    params: { page: { size: 20 } },
    keys: ['todos'],
  })
})

test('it parses relationship queries string with IDs', () => {
  const result = parseQueryArg('todos/1/relationships/user')

  expect(result).toEqual({
    url: '/todos/1/relationships/user',
    id: '1',
    params: {},
    keys: ['todos', 'relationships', 'user'],
  })
})

test('it parses relationship queries array with IDs', () => {
  const result = parseQueryArg(['todos', 1, 'relationships', 'user'])

  expect(result).toEqual({
    url: '/todos/1/relationships/user',
    id: '1',
    params: {},
    keys: ['todos', 'relationships', 'user'],
  })
})

test('it parses relationship queries string with UUIDs', () => {
  const uuid = 'cd61c9be-7912-4925-a90e-4457ff4bd13e'
  const result = parseQueryArg(`todos/${uuid}/relationships/user`)

  expect(result).toEqual({
    url: `/todos/${uuid}/relationships/user`,
    id: uuid,
    params: {},
    keys: ['todos', 'relationships', 'user'],
  })
})

test('it parses relationship queries array with UUIDs', () => {
  const uuid = 'cd61c9be-7912-4925-a90e-4457ff4bd13e'
  const result = parseQueryArg(['todos', uuid, 'relationships', 'user'])

  expect(result).toEqual({
    url: `/todos/${uuid}/relationships/user`,
    id: uuid,
    params: {},
    keys: ['todos', 'relationships', 'user'],
  })
})

test('it parses complex queries', () => {
  const result = parseQueryArg(['todos', 1, 'relationships', 'user', { include: 'address', page: { size: 20 } }])

  expect(result).toEqual({
    url: '/todos/1/relationships/user?include=address&page[size]=20',
    id: '1',
    params: { include: 'address', page: { size: 20 } },
    keys: ['todos', 'relationships', 'user'],
  })
})
