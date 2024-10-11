import { ApiClient } from '../client';
import { parseSchema } from '../functions';

describe('ApiClient', () => {
  let client;
  let mockSchema;

  beforeEach(() => {
    mockSchema = parseSchema({
      todos: {
        type: 'todos',
      },
      users: {
        type: 'users',
      },
    });

    client = new ApiClient({
      url: 'http://localhost:8080/api/v1',
      schema: mockSchema,
    });
  });

  test('mutate invalidates related queries', async () => {
    const todosQuery = client.createQuery({ key: 'todos' });
    todosQuery.cache = { data: [{ id: '1', title: 'Old Todo' }] };
    client.cache.push(todosQuery);

    client.request = jest.fn().mockResolvedValue({
      data: { id: '2', type: 'todos', attributes: { title: 'New Todo' } },
    });

    await client.mutate(['todos'], { title: 'New Todo' });

    expect(todosQuery.cache).toBeNull();
  });

  test('mutate invalidates single custom invalidation rule', async () => {
    const todosQuery = client.createQuery({ key: 'todos' });
    todosQuery.cache = { data: [{ id: '1', title: 'Old Todo' }] };
    client.cache.push(todosQuery);

    client.request = jest.fn().mockResolvedValue({
      data: { id: '2', type: 'todos', attributes: { title: 'New Todo' } },
    });

    await client.mutate(['todos'], { title: 'New Todo' }, { invalidate: 'todos' });

    expect(todosQuery.cache).toBeNull();
  });

  test('mutate invalidates multiple custom invalidation rules', async () => {
    const todosQuery = client.createQuery({ key: 'todos' });
    todosQuery.cache = { data: [{ id: '1', title: 'Old Todo' }] };
    client.cache.push(todosQuery);

    const usersQuery = client.createQuery({ key: 'users' });
    usersQuery.cache = { data: [{ id: '1', name: 'John' }] };
    client.cache.push(usersQuery);

    client.request = jest.fn().mockResolvedValue({
      data: { id: '2', type: 'todos', attributes: { title: 'New Todo' } },
    });

    await client.mutate(['todos'], { title: 'New Todo' }, { invalidate: ['todos', 'users'] });

    expect(todosQuery.cache).toBeNull();
    expect(usersQuery.cache).toBeNull();
  })
});
