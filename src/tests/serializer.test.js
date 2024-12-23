import schema from './schema'
import { Serializer } from '../serializer'

describe('serialize', () => {
  test('it serializes a mutation without a schema', () => {
    const serializer = new Serializer()
    const data = { id: 1, title: 'Clean the kitchen' }

    const result = serializer.serialize('todos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'Clean the kitchen',
        },
      },
    })
  })

  test('it serializes a mutation with a schema', () => {
    const serializer = new Serializer({ schema })
    const data = {
      id: 1,
      title: 'Clean the kitchen',
      user: {
        id: 2,
        name: 'Steve',
      },
      comments: [{ id: '1', text: 'Almost done...' }],
    }

    const result = serializer.serialize('todos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'Clean the kitchen',
        },
        relationships: {
          user: {
            data: {
              type: 'users',
              id: '2',
            },
          },
          comments: {
            data: [{ type: 'comments', id: '1' }],
          },
        },
      },
    })
  })

  test('it serializes polymorphic resources', () => {
    const serializer = new Serializer({ schema })

    const data = {
      id: 1,
      name: 'todo.jpg',
      owner_type: 'todos',
      owner: {
        id: 1,
      },
    }

    const result = serializer.serialize('photos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'photos',
        attributes: {
          name: 'todo.jpg',
        },
        relationships: {
          owner: {
            data: {
              type: 'todos',
              id: '1',
            },
          },
        },
      },
    })
  })

  test('it omits read-only fields', () => {
    const serializer = new Serializer({ schema })
    const data = {
      id: 1,
      title: 'Clean the kitchen',
      status: 'done',
    }

    const result = serializer.serialize('todos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'Clean the kitchen',
        },
      },
    })
  })

  test('it supports a field serializer', () => {
    const serializer = new Serializer({
      schema: {
        ...schema,
        todos: {
          ...schema.todos,
          fields: {
            ...schema.todos.fields,
            title: {
              serialize: (val, attrs) => {
                return `${val}${attrs.description}`
              },
            },
          },
        },
      },
    })

    const data = {
      id: 1,
      title: 'foo',
      description: 'bar',
    }

    const result = serializer.serialize('todos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'foobar',
          description: 'bar',
        },
      },
    })
  })
})

describe('deserialize', () => {
  const success = {
    data: {
      id: '1',
      type: 'todos',
      attributes: {
        title: 'Clean the kitchen!',
        created: '2020-01-01T00:00:00.000Z',
      },
      relationships: {
        user: {
          data: {
            type: 'users',
            id: '2',
          },
        },
      },
    },
    included: [
      {
        id: '2',
        type: 'users',
        attributes: {
          name: 'Steve',
        },
      },
    ],
  }

  test('it normalizes a successful response', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize(success)

    expect(result).toEqual({
      data: {
        id: '1',
        title: 'Clean the kitchen!',
        created: '2020-01-01T00:00:00.000Z',
        user: {
          id: '2',
          name: 'Steve',
        },
      },
    })
  })

  test('it coerces typed attributes', () => {
    const serializer = new Serializer({
      schema: {
        todos: {
          fields: {
            created: {
              type: 'date',
            },
          },
        },
      },
    })
    const result = serializer.deserialize(success)

    const isDate = result.data.created instanceof Date
    expect(isDate).toEqual(true)
  })

  test('it handles polymorphic resources', () => {
    const serializer = new Serializer({ schema })

    const result = serializer.deserialize({
      data: {
        id: '1',
        type: 'photos',
        attributes: {
          name: 'photo.jpg',
        },
        relationships: {
          owner: {
            data: {
              type: 'todos',
              id: '1',
            },
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'todos',
          attributes: {
            title: 'Clean the kitchen!',
            status: 'done',
          },
        },
      ],
    })

    expect(result).toEqual({
      data: {
        id: '1',
        name: 'photo.jpg',
        url: '/photos/photo.jpg',
        owner: {
          id: '1',
          title: 'Clean the kitchen!',
          status: 'DONE',
        },
      },
    })
  })

  test('it handles errors', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({ error: 'Not found' })

    expect(result).toEqual({
      error: {
        status: '400',
        title: 'Not found',
        message: 'Not found',
      },
    })
  })

  test('it handles errors with status', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({ status: 404, error: 'Not found' })

    expect(result).toEqual({
      error: {
        status: '404',
        title: 'Not found',
        message: 'Not found',
      },
    })
  })

  test('it handles errors with errors', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({
      errors: [{ status: '404', title: 'Not found' }],
    })

    expect(result).toEqual({
      error: {
        status: '404',
        title: 'Not found',
      },
    })
  })

  test('it handles general meta data', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'Clean the kitchen!',
        },
      },
      meta: {
        total: 10,
        page: 1,
      },
    })

    expect(result).toEqual({
      data: {
        id: '1',
        title: 'Clean the kitchen!',
      },
      meta: {
        total: 10,
        page: 1,
      },
    })
  })

  test('it handles object meta data', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'Clean the kitchen!',
        },
        meta: {
          createdAt: '2023-04-26T06:00:02.000000Z',
          updatedAt: '2023-05-18T10:47:04.000000Z',
        },
      },
    })

    expect(result).toEqual({
      data: {
        id: '1',
        title: 'Clean the kitchen!',
        meta: {
          createdAt: '2023-04-26T06:00:02.000000Z',
          updatedAt: '2023-05-18T10:47:04.000000Z',
        },
      },
    })
  })

  test('deserializes data correctly', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize({
      data: [
        {
          id: '1',
          type: 'todos',
          attributes: {
            title: 'Clean the kitchen!',
          },
          meta: {
            createdAt: '2023-04-26T06:00:02.000000Z',
            updatedAt: '2023-05-18T10:47:04.000000Z',
          },
        },
        {
          id: '2',
          type: 'todos',
          attributes: {
            title: 'Buy groceries',
          },
          meta: {
            createdAt: '2023-04-14T12:00:02.000000Z',
            updatedAt: '2023-05-14T05:47:04.000000Z',
          },
        },
      ],
    })

    expect(result).toEqual({
      data: [
        {
          id: '1',
          title: 'Clean the kitchen!',
          meta: {
            createdAt: '2023-04-26T06:00:02.000000Z',
            updatedAt: '2023-05-18T10:47:04.000000Z',
          },
        },
        {
          id: '2',
          title: 'Buy groceries',
          meta: {
            createdAt: '2023-04-14T12:00:02.000000Z',
            updatedAt: '2023-05-14T05:47:04.000000Z',
          },
        },
      ],
    })
  })

  test('it populates type field with parent type using only string type definition', () => {
    const serializer = new Serializer({
      schema: {
        todos: {
          type: 'todos',
          fields: {
            todoType: 'type',
            status: 'string',
            created: 'date',
          },
        },
      },
    })

    const result = serializer.deserialize(success)

    expect(result).toEqual({
      data: {
        id: '1',
        title: 'Clean the kitchen!',
        todoType: 'todos',
        created: '2020-01-01T00:00:00.000Z',
        meta: undefined,
        user: {
          id: '2',
          name: 'Steve',
          meta: undefined
        },
      },
    })
  })

  test('it populates type field with parent type using only string type definition with complex schema', () => {
    const schema = {
      todos: {
        type: ['todos', 'tests', 'test-todos'],
        fields: {
          title: 'string',
          todoType: 'type',
        },
        relationships: {
          user: {
            type: 'users',
          },
          comments: {
            type: 'comments',
          },
        },
      },
      users: {
        type: 'users',
        fields: {
          test: 'string',
          testType: 'type',
        },
        relationships: {
          todos: {
            type: 'todos',
          },
          comments: {
            type: 'comments',
          },
        },
      },
      comments: {
        type: 'comments',
        fields: {
          test: 'string',
          testType: 'type',
        },
      },
    }

    const serializer = new Serializer({ schema })
    const result = serializer.deserialize({
      data: {
        id: '1',
        type: 'tests',
        attributes: {
          title: 'testing type',
        },
        relationships: {
          user: {
            data: {
              id: '2',
              type: 'users',
            },
          },
        },
      },
      included: [
        {
          id: '2',
          type: 'users',
          attributes: {
            test: 'test',
          },
        },
      ],
    })

    expect(result).toEqual({
      data: {
        id: '1',
        title: 'testing type',
        todoType: 'tests',
        meta: undefined,
        user: {
          id: '2',
          test: 'test',
          testType: 'users',
        },
      },
    })
  })
})

