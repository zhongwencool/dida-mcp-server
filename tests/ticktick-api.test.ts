import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock response data
const mockLoginResponse = {
  token: 'mock-token',
  userId: 'mock-user-id',
  username: 'mock-username',
  inboxId: 'mock-inbox-id'
};

const mockProjectsResponse = [
  {
    id: 'project1',
    name: 'Work',
    color: '#FF0000',
    sortOrder: -1099511627776,
    kind: 'TASK'
  },
  {
    id: 'project2',
    name: 'Personal',
    color: '#00FF00',
    sortOrder: -1099511627775,
    kind: 'TASK'
  }
];

const mockBatchCheckResponse = {
  checkPoint: 12345,
  syncTaskBean: {
    update: [
      {
        id: 'task1',
        title: 'Task 1',
        content: 'Task 1 content',
        projectId: 'project1',
        status: 0,
        tags: ['important']
      },
      {
        id: 'task2',
        title: 'Task 2',
        content: 'Task 2 content',
        projectId: 'project2',
        status: 0,
        tags: []
      }
    ],
    add: [],
    delete: [],
    empty: false
  },
  tags: [
    { name: 'important', color: '#FF0000' },
    { name: 'personal', color: '#00FF00' }
  ],
  inboxId: 'mock-inbox-id'
};

const mockBatchTaskResponse = {
  id2etag: {
    'new-task-id': 'etag1'
  },
  id2error: {}
};

describe('TickTick API Integration', () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  describe('Authentication', () => {
    test('should successfully login with valid credentials', async () => {
      // Mock successful login response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/user/signon?wc=true&remember=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'test@example.com', password: 'password' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockLoginResponse);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/user/signon?wc=true&remember=true',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'test@example.com', password: 'password' }),
        })
      );
    });

    test('should handle login failure', async () => {
      // Mock failed login response
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ errorCode: 'AUTH_FAILED', errorMessage: 'Invalid credentials' })
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/user/signon?wc=true&remember=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'test@example.com', password: 'wrong-password' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data).toEqual({ errorCode: 'AUTH_FAILED', errorMessage: 'Invalid credentials' });
    });
  });

  describe('Project Management', () => {
    test('should list all projects', async () => {
      // Mock successful projects response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsResponse
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockProjectsResponse);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
          }),
        })
      );
    });

    test('should create a new project', async () => {
      const newProject = {
        id: 'new-project-id',
        name: 'New Project',
        color: '#0000FF',
        sortOrder: -1099511627774,
        kind: 'TASK'
      };

      // Mock successful project creation response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newProject
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(newProject);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProject),
        })
      );
    });
  });

  describe('Task Management', () => {
    test('should list all tasks', async () => {
      // Mock successful batch check response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchCheckResponse
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/batch/check/0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockBatchCheckResponse);
      expect(data.syncTaskBean.update.length).toBe(2);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/check/0',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
          }),
        })
      );
    });

    test('should create a new task', async () => {
      const newTask = {
        id: 'new-task-id',
        title: 'New Task',
        content: 'New Task content',
        projectId: 'project1',
        status: 0,
        tags: ['important'],
        sortOrder: -2199023452160,
        timeZone: 'Asia/Shanghai',
        isAllDay: false,
        createdTime: '2023-01-01T00:00:00.000Z',
        modifiedTime: '2023-01-01T00:00:00.000Z'
      };

      const batchRequest = {
        add: [newTask],
        update: [],
        delete: [],
        addAttachments: [],
        updateAttachments: [],
        deleteAttachments: []
      };

      // Mock successful task creation response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchTaskResponse
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/batch/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
        body: JSON.stringify(batchRequest),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockBatchTaskResponse);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(batchRequest),
        })
      );
    });

    test('should complete a task', async () => {
      // First mock the batch check to get the task
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchCheckResponse
      } as any);

      // Then mock the batch task update
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchTaskResponse
      } as any);

      // First get the task
      const checkResponse = await fetch('https://api.dida365.com/api/v2/batch/check/0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
      });

      const checkData = await checkResponse.json();
      const task = checkData.syncTaskBean.update[0];

      // Then update the task
      const updatedTask = {
        ...task,
        status: 2, // COMPLETED
        modifiedTime: '2023-01-02T00:00:00.000Z',
        completedTime: '2023-01-02T00:00:00.000Z'
      };

      const batchRequest = {
        add: [],
        update: [updatedTask],
        delete: [],
        addAttachments: [],
        updateAttachments: [],
        deleteAttachments: []
      };

      const response = await fetch('https://api.dida365.com/api/v2/batch/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
        body: JSON.stringify(batchRequest),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockBatchTaskResponse);
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenLastCalledWith(
        'https://api.dida365.com/api/v2/batch/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(batchRequest),
        })
      );
    });
  });

  describe('Tag Management', () => {
    test('should list all tags', async () => {
      // Mock successful batch check response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchCheckResponse
      } as any);

      const response = await fetch('https://api.dida365.com/api/v2/batch/check/0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.tags).toEqual(mockBatchCheckResponse.tags);
      expect(data.tags.length).toBe(2);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/check/0',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
          }),
        })
      );
    });

    test('should add a tag to a task', async () => {
      // First mock the batch check to get the task
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchCheckResponse
      } as any);

      // Then mock the batch task update
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBatchTaskResponse
      } as any);

      // First get the task
      const checkResponse = await fetch('https://api.dida365.com/api/v2/batch/check/0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
      });

      const checkData = await checkResponse.json();
      const task = checkData.syncTaskBean.update[1]; // Task without tags

      // Then update the task with a new tag
      const updatedTask = {
        ...task,
        tags: ['personal'],
        modifiedTime: '2023-01-02T00:00:00.000Z'
      };

      const batchRequest = {
        add: [],
        update: [updatedTask],
        delete: [],
        addAttachments: [],
        updateAttachments: [],
        deleteAttachments: []
      };

      const response = await fetch('https://api.dida365.com/api/v2/batch/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 't=mock-token'
        },
        body: JSON.stringify(batchRequest),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockBatchTaskResponse);
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenLastCalledWith(
        'https://api.dida365.com/api/v2/batch/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(batchRequest),
        })
      );
    });
  });
});
