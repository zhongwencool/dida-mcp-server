import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock response data
const mockProjectDataResponse = {
  project: {
    id: 'project1',
    name: 'Work',
    color: '#FF0000',
    closed: false,
    groupId: '6436176a47fd2e05f26ef56e',
    viewMode: 'list',
    kind: 'TASK'
  },
  tasks: [
    {
      id: 'task1',
      isAllDay: true,
      projectId: 'project1',
      title: 'Task Title',
      content: 'Task Content',
      desc: 'Task Description',
      timeZone: 'America/Los_Angeles',
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
      startDate: '2019-11-13T03:00:00+0000',
      dueDate: '2019-11-14T03:00:00+0000',
      reminders: [
        'TRIGGER:P0DT9H0M0S',
        'TRIGGER:PT0S'
      ],
      priority: 1,
      status: 0,
      completedTime: '2019-11-13T03:00:00+0000',
      sortOrder: 12345,
      items: [
        {
          id: 'subtask1',
          status: 0,
          title: 'Subtask Title',
          sortOrder: 12345,
          startDate: '2019-11-13T03:00:00+0000',
          isAllDay: false,
          timeZone: 'America/Los_Angeles',
          completedTime: '2019-11-13T03:00:00+0000'
        }
      ]
    }
  ],
  columns: [
    {
      id: 'column1',
      projectId: 'project1',
      name: 'Column Name',
      sortOrder: 0
    }
  ]
};

describe('Project Data API', () => {
  test('should get project data with tasks and columns', async () => {
    // Mock successful project data response
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjectDataResponse
    } as any);

    const response = await fetch('https://api.dida365.com/api/v2/project/project1/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 't=mock-token'
      },
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toEqual(mockProjectDataResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/api/v2/project/project1/data',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Cookie': 't=mock-token'
        }),
      })
    );
  });

  test('should handle error when getting project data', async () => {
    // Mock failed project data response
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    } as any);

    const response = await fetch('https://api.dida365.com/api/v2/project/invalid-id/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 't=mock-token'
      },
    });

    expect(response.ok).toBe(false);
    expect(response.statusText).toBe('Not Found');
  });
});
