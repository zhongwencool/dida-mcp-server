import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock response data
const mockMoveTaskResponse = {
  id2etag: { 'task1': 'ybukfyon' },
  id2error: {}
};

describe('Move Task API', () => {
  beforeEach(() => {
    // Reset mocks
    mockedFetch.mockReset();
  });

  test('should move a task from one project to another', async () => {
    // Mock successful move task response
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoveTaskResponse
    } as any);

    const moveRequest = [
      {
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2'
      }
    ];

    const response = await fetch('https://api.dida365.com/api/v2/batch/taskProject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 't=mock-token',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
        'x-device': expect.any(String)
      },
      body: JSON.stringify(moveRequest),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toEqual(mockMoveTaskResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/api/v2/batch/taskProject',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(moveRequest),
      })
    );
  });

  test('should handle errors when moving a task', async () => {
    // Mock error response
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id2etag: {},
        id2error: { 'task1': 'Task not found' }
      })
    } as any);

    const moveRequest = [
      {
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2'
      }
    ];

    const response = await fetch('https://api.dida365.com/api/v2/batch/taskProject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 't=mock-token',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
        'x-device': expect.any(String)
      },
      body: JSON.stringify(moveRequest),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.id2error).toHaveProperty('task1');
    expect(data.id2error.task1).toBe('Task not found');
  });

  test('should handle API errors', async () => {
    // Mock API error response
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized'
    } as any);

    const moveRequest = [
      {
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2'
      }
    ];

    const response = await fetch('https://api.dida365.com/api/v2/batch/taskProject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 't=mock-token',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
        'x-device': expect.any(String)
      },
      body: JSON.stringify(moveRequest),
    });

    expect(response.ok).toBe(false);
    expect(response.statusText).toBe('Unauthorized');
  });
});
