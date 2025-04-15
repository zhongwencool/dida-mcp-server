import { registerTaskTools } from '../../src/tasks/tools';
import * as config from '../../src/config';
import fetch from 'node-fetch';
import { createMockResponse, mockTasks, mockBatchCheckResponse, mockProjectDataResponse } from '../mocks';
import { parseJsonResponse } from '../utils';

// Mock the config module
jest.mock('../../src/config', () => {
  let mockAccessToken = 'mock-access-token';
  let mockV2AccessToken = 'mock-v2-access-token';
  let mockInboxId = 'inbox1';
  let mockIsOAuthAuth = true;

  return {
    API_BASE_URL: 'https://api.dida365.com/open/v1',
    API_V2_BASE_URL: 'https://api.dida365.com/api/v2',
    get accessToken() { return mockAccessToken; },
    get v2AccessToken() { return mockV2AccessToken; },
    get isOAuthAuth() { return mockIsOAuthAuth; },
    get inboxId() { return mockInboxId; },
    setAuthTokens: jest.fn().mockImplementation((v1Token, isOAuth, v2Token, newInboxId) => {
      mockAccessToken = v1Token;
      mockIsOAuthAuth = isOAuth;
      mockV2AccessToken = v2Token;
      if (newInboxId !== undefined) {
        mockInboxId = newInboxId;
      }
    }),
  };
});

// Mock the auth helpers
jest.mock('../../src/auth/helpers', () => ({
  getAuthHeaders: jest.fn().mockReturnValue({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-access-token',
  }),
  getV2AuthHeaders: jest.fn().mockReturnValue({
    'User-Agent': 'MockUserAgent',
    'x-device': 'MockDevice',
    'Content-Type': 'application/json',
    'Cookie': 't=mock-v2-access-token',
  }),
}));

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Task Tools', () => {
  let mockServer: any;

  beforeEach(() => {
    // Create a mock server object
    mockServer = {
      tool: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should register all task tools', () => {
    registerTaskTools(mockServer);

    // Verify that tool was called for each task tool
    expect(mockServer.tool).toHaveBeenCalledWith('list-tasks', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('create-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('complete-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('update-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('get-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('delete-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('move-task', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('batch-update-tasks', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('batch-move-tasks', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockServer.tool).toHaveBeenCalledWith('batch-delete-tasks', expect.any(String), expect.any(Object), expect.any(Function));
  });

  describe('list-tasks', () => {
    it('should list tasks from a specified project', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockProjectDataResponse));

      registerTaskTools(mockServer);

      // Get the handler function for list-tasks
      const listTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'list-tasks'
      )[3];

      // Execute the handler
      const result = await listTasksHandler({ projectId: 'project1' });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/data',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.tasks).toEqual(mockTasks);
    });

    it('should use inbox ID when no project is specified', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockProjectDataResponse));

      registerTaskTools(mockServer);

      // Get the handler function for list-tasks
      const listTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'list-tasks'
      )[3];

      // Execute the handler
      const result = await listTasksHandler({});

      // Verify fetch was called with inbox ID
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/inbox1/data',
        expect.any(Object)
      );

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.tasks).toEqual(mockTasks);
    });

    it('should handle missing inbox ID', async () => {
      // Temporarily set inboxId to null
      const originalToken = config.accessToken;
      const originalV2Token = config.v2AccessToken;
      const originalInboxId = config.inboxId;
      config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, null);

      registerTaskTools(mockServer);

      // Get the handler function for list-tasks
      const listTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'list-tasks'
      )[3];

      // Execute the handler
      const result = await listTasksHandler({});

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.message).toContain('Inbox ID not found');

      // Restore inboxId
      config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, originalInboxId);
    });
  });

  describe('create-task', () => {
    it('should create a task with all parameters', async () => {
      // Mock successful API response
      const createdTask = { ...mockTasks[0], id: 'new-task-id' };
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, createdTask));

      registerTaskTools(mockServer);

      // Get the handler function for create-task
      const createTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'create-task'
      )[3];

      // Execute the handler
      const result = await createTaskHandler({
        title: 'New Task',
        content: 'Task content',
        priority: 3,
        dueDate: '2023-12-31T23:59:59Z',
        projectId: 'project1',
        tags: 'work,important',
      });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse(mockedFetch.mock.calls[0][1]!.body as string);
      expect(requestBody).toEqual({
        title: 'New Task',
        content: 'Task content',
        priority: 3,
        dueDate: '2023-12-31T23:59:59Z',
        projectId: 'project1',
        tags: ['work', 'important'],
        timeZone: 'Asia/Shanghai',
        isAllDay: false,
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toBe('Task created successfully');
      expect(jsonResponse.data).toEqual(createdTask);
    });

    it('should use inbox ID when no project is specified', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[0]));

      registerTaskTools(mockServer);

      // Get the handler function for create-task
      const createTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'create-task'
      )[3];

      // Execute the handler
      await createTaskHandler({
        title: 'New Task',
      });

      // Verify the request body uses inbox ID
      const requestBody = JSON.parse(mockedFetch.mock.calls[0][1]!.body as string);
      expect(requestBody.projectId).toBe('inbox1');
    });
  });

  describe('complete-task', () => {
    it('should complete a task', async () => {
      // Mock successful API responses
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockBatchCheckResponse));
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, { id: 'task1' }));

      registerTaskTools(mockServer);

      // Get the handler function for complete-task
      const completeTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'complete-task'
      )[3];

      // Execute the handler
      const result = await completeTaskHandler({ id: 'task1' });

      // Verify fetch was called for batch/check
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/check/0',
        expect.any(Object)
      );

      // Verify fetch was called for complete endpoint
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/task/task1/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toBe('Task marked as completed successfully');
      expect(jsonResponse.data.id).toBe('task1');
      expect(jsonResponse.data.completed).toBe(true);
    });

    it('should handle task not found', async () => {
      // Mock API response with no matching task
      const emptyResponse = {
        ...mockBatchCheckResponse,
        syncTaskBean: {
          update: [],
          add: [],
          empty: true,
        },
      };
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, emptyResponse));

      registerTaskTools(mockServer);

      // Get the handler function for complete-task
      const completeTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'complete-task'
      )[3];

      // Execute the handler
      const result = await completeTaskHandler({ id: 'nonexistent-task' });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.message).toContain('Task with ID nonexistent-task not found');
    });
  });

  describe('update-task', () => {
    it('should update a task with all parameters', async () => {
      // Mock successful API responses
      const updatedTask = { ...mockTasks[0], title: 'Updated Task' };
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[0])); // Get existing task
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, updatedTask)); // Update task

      registerTaskTools(mockServer);

      // Get the handler function for update-task
      const updateTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'update-task'
      )[3];

      // Execute the handler
      const result = await updateTaskHandler({
        id: 'task1',
        projectId: 'project1',
        title: 'Updated Task',
        tags: 'work,updated',
      });

      // Verify fetch was called to get the task
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/task/task1',
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Verify fetch was called to update the task
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/task/task1',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse(mockedFetch.mock.calls[1][1]!.body as string);
      expect(requestBody.title).toBe('Updated Task');
      expect(requestBody.tags).toEqual(['work', 'updated']);

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Task updated successfully');
      expect(jsonResponse.data).toEqual(updatedTask);
    });
  });

  describe('get-task', () => {
    it('should get a task by ID', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[0]));

      registerTaskTools(mockServer);

      // Get the handler function for get-task
      const getTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'get-task'
      )[3];

      // Execute the handler
      const result = await getTaskHandler({
        id: 'task1',
        projectId: 'project1',
      });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/task/task1',
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data).toEqual(mockTasks[0]);
    });

    it('should use inbox ID when no project is specified', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[0]));

      registerTaskTools(mockServer);

      // Get the handler function for get-task
      const getTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'get-task'
      )[3];

      // Execute the handler
      await getTaskHandler({ id: 'task1' });

      // Verify fetch was called with inbox ID
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/inbox1/task/task1',
        expect.any(Object)
      );
    });
  });

  describe('delete-task', () => {
    it('should delete a task', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, {}));

      registerTaskTools(mockServer);

      // Get the handler function for delete-task
      const deleteTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'delete-task'
      )[3];

      // Execute the handler
      const result = await deleteTaskHandler({
        id: 'task1',
        projectId: 'project1',
      });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/task/task1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Task with ID task1 deleted successfully');
      expect(jsonResponse.data.id).toBe('task1');
    });
  });

  describe('move-task', () => {
    it('should move a task between projects', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, {}));

      registerTaskTools(mockServer);

      // Get the handler function for move-task
      const moveTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'move-task'
      )[3];

      // Execute the handler
      const result = await moveTaskHandler({
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2',
      });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/taskProject',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Cookie': 't=mock-v2-access-token',
          }),
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse(mockedFetch.mock.calls[0][1]!.body as string);
      expect(requestBody).toEqual([
        {
          taskId: 'task1',
          fromProjectId: 'project1',
          toProjectId: 'project2',
        },
      ]);

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Task moved successfully');
      expect(jsonResponse.data.taskId).toBe('task1');
      expect(jsonResponse.data.fromProjectId).toBe('project1');
      expect(jsonResponse.data.toProjectId).toBe('project2');
    });

    it('should handle missing v2 token', async () => {
      // Temporarily set v2AccessToken to null
      const originalToken = config.accessToken;
      const originalV2Token = config.v2AccessToken;
      const originalInboxId = config.inboxId;
      config.setAuthTokens(originalToken, config.isOAuthAuth, null, originalInboxId);

      registerTaskTools(mockServer);

      // Get the handler function for move-task
      const moveTaskHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'move-task'
      )[3];

      // Execute the handler
      const result = await moveTaskHandler({
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.message).toContain('Not authenticated with v2 API');

      // Restore v2AccessToken
      config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, originalInboxId);
    });
  });

  describe('batch operations', () => {
    it('should handle batch-update-tasks', async () => {
      // Mock successful API responses for each task
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[0])); // Get task 1
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, { ...mockTasks[0], title: 'Updated Task 1' })); // Update task 1
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockTasks[1])); // Get task 2
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, { ...mockTasks[1], title: 'Updated Task 2' })); // Update task 2

      registerTaskTools(mockServer);

      // Get the handler function for batch-update-tasks
      const batchUpdateTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'batch-update-tasks'
      )[3];

      // Execute the handler
      const result = await batchUpdateTasksHandler({
        tasks: [
          {
            id: 'task1',
            projectId: 'project1',
            title: 'Updated Task 1',
          },
          {
            id: 'task2',
            projectId: 'project1',
            title: 'Updated Task 2',
          },
        ],
      });

      // Verify fetch was called for each task
      expect(mockedFetch).toHaveBeenCalledTimes(4);

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Batch update completed: 2 tasks updated successfully');
      expect(jsonResponse.data.summary.success).toBe(2);
    });

    it('should handle batch-move-tasks', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, {}));

      registerTaskTools(mockServer);

      // Get the handler function for batch-move-tasks
      const batchMoveTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'batch-move-tasks'
      )[3];

      // Execute the handler
      const result = await batchMoveTasksHandler({
        moves: [
          {
            taskId: 'task1',
            fromProjectId: 'project1',
            toProjectId: 'project2',
          },
          {
            taskId: 'task2',
            fromProjectId: 'project1',
            toProjectId: 'project2',
          },
        ],
      });

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/taskProject',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse(mockedFetch.mock.calls[0][1]!.body as string);
      expect(requestBody.length).toBe(2);

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Successfully moved 2 tasks');
      expect(jsonResponse.data.moves.length).toBe(2);
    });

    it('should handle batch-delete-tasks', async () => {
      // Mock successful API responses for each task
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, {})); // Delete task 1
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, {})); // Delete task 2

      registerTaskTools(mockServer);

      // Get the handler function for batch-delete-tasks
      const batchDeleteTasksHandler = mockServer.tool.mock.calls.find(
        (call: any) => call[0] === 'batch-delete-tasks'
      )[3];

      // Execute the handler
      const result = await batchDeleteTasksHandler({
        tasks: [
          {
            id: 'task1',
            projectId: 'project1',
          },
          {
            id: 'task2',
            projectId: 'project1',
          },
        ],
      });

      // Verify fetch was called for each task
      expect(mockedFetch).toHaveBeenCalledTimes(2);

      // Verify the result
      expect(result.content[0].type).toBe('text');
      const jsonResponse = parseJsonResponse(result.content[0].text);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('Batch delete completed: 2 tasks deleted successfully');
      expect(jsonResponse.data.summary.success).toBe(2);
    });
  });
});
