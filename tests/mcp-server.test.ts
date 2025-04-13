import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock response data for Open API
const mockTokenResponse = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'tasks:read tasks:write'
};

const mockProjectsResponse = [
  {
    id: 'project1',
    name: 'Work',
    color: '#FF0000',
    viewMode: 'list',
    kind: 'TASK'
  },
  {
    id: 'project2',
    name: 'Personal',
    color: '#00FF00',
    viewMode: 'list',
    kind: 'TASK'
  },
  {
    id: 'inbox-project-id',
    name: 'Inbox',
    color: '#0000FF',
    viewMode: 'list',
    kind: 'TASK'
  }
];

const mockProjectDataResponse = {
  project: {
    id: 'project1',
    name: 'Work',
    color: '#FF0000',
    closed: false,
    viewMode: 'list',
    kind: 'TASK'
  },
  tasks: [
    {
      id: 'task1',
      projectId: 'project1',
      title: 'Task 1',
      content: 'Task 1 content',
      priority: 0,
      status: 0,
      tags: ['important']
    },
    {
      id: 'task2',
      projectId: 'project1',
      title: 'Task 2',
      content: 'Task 2 content',
      priority: 0,
      status: 0,
      tags: []
    }
  ],
  columns: []
};

const mockTaskResponse = {
  id: 'task1',
  projectId: 'project1',
  title: 'Task 1',
  content: 'Task 1 content',
  priority: 0,
  status: 0,
  tags: ['important']
};

const mockCreatedTaskResponse = {
  id: 'new-task-id',
  projectId: 'project1',
  title: 'New Task',
  content: 'New Task content',
  priority: 0,
  status: 0
};

describe('TickTick MCP Server', () => {
  let server: McpServer;

  beforeEach(() => {
    // Reset mocks
    mockedFetch.mockReset();

    // Create a new server instance for each test
    server = new McpServer({
      name: 'dida-mcp-server-test',
      version: '1.0.0',
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    // Register simplified versions of the tools for testing
    server.tool(
      'login',
      'Login to TickTick',
      {
        username: jest.requireActual('zod').z.string(),
        password: jest.requireActual('zod').z.string(),
      },
      async ({ username, password }) => {
        try {
          const response = await fetch('https://api.dida365.com/api/v2/user/signon?wc=true&remember=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `Authentication failed: ${errorData.errorCode} - ${errorData.errorMessage}`,
                },
              ],
            };
          }

          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: `Successfully logged in as ${data.username}\\nInbox ID: ${data.inboxId}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error during login: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      'list-projects',
      'List all projects',
      {},
      async () => {
        try {
          const response = await fetch('https://api.dida365.com/api/v2/projects', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 't=mock-token',
            },
          });

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to get projects: ${response.statusText}`,
                },
              ],
            };
          }

          const projects = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(projects, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      'create-task',
      'Create a new task',
      {
        title: jest.requireActual('zod').z.string(),
        content: jest.requireActual('zod').z.string().optional(),
        projectId: jest.requireActual('zod').z.string().optional(),
      },
      async ({ title, content, projectId }) => {
        try {
          const taskId = uuidv4().replace(/-/g, '');
          const now = new Date().toISOString();

          const newTask = {
            id: taskId,
            title,
            content: content || '',
            projectId: projectId || 'mock-inbox-id',
            status: 0,
            sortOrder: -2199023452160,
            timeZone: 'Asia/Shanghai',
            isAllDay: false,
            createdTime: now,
            modifiedTime: now
          };

          const batchRequest = {
            add: [newTask],
            update: [],
            delete: [],
            addAttachments: [],
            updateAttachments: [],
            deleteAttachments: []
          };

          const response = await fetch('https://api.dida365.com/api/v2/batch/task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 't=mock-token',
            },
            body: JSON.stringify(batchRequest),
          });

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to create task: ${response.statusText}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `Task created successfully:\\n${JSON.stringify(newTask, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      'move-task',
      'Move a task from one project to another',
      {
        taskId: jest.requireActual('zod').z.string(),
        fromProjectId: jest.requireActual('zod').z.string(),
        toProjectId: jest.requireActual('zod').z.string(),
      },
      async ({ taskId, fromProjectId, toProjectId }) => {
        try {
          const moveRequest = [
            {
              taskId,
              fromProjectId,
              toProjectId
            }
          ];

          const response = await fetch('https://api.dida365.com/api/v2/batch/taskProject', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 't=mock-token',
            },
            body: JSON.stringify(moveRequest),
          });

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to move task: ${response.statusText}`,
                },
              ],
            };
          }

          const result = await response.json();

          // Check for errors in the response
          if (result.id2error && Object.keys(result.id2error).length > 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to move task: ${JSON.stringify(result.id2error)}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `Task moved successfully from project ${fromProjectId} to project ${toProjectId}\\nResponse: ${JSON.stringify(result, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error moving task: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }
    );
  });

  describe('Authentication Tool', () => {
    test('login-with-token tool should authenticate successfully', async () => {
      // Mock successful projects response for token verification
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsResponse
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['login-with-token'].callback;

      // Call the handler
      const result = await handler({});

      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          }),
        })
      );

      // Verify result
      expect(result.content[0].text).toContain('Successfully authenticated with access token');
    });

    test('login-with-token tool should handle authentication failure', async () => {
      // Mock failed projects response
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['login-with-token'].callback;

      // Call the handler
      const result = await handler({});

      // Verify result
      expect(result.content[0].text).toContain('Authentication failed');
    });
  });

  describe('Project Management Tools', () => {
    test('list-projects tool should return projects', async () => {
      // Mock successful projects response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsResponse
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['list-projects'].callback;

      // Call the handler
      const result = await handler({});

      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          }),
        })
      );

      // Verify result
      expect(result.content[0].text).toBe(JSON.stringify(mockProjectsResponse, null, 2));
    });
  });

  describe('Task Management Tools', () => {
    test('create-task tool should create a task', async () => {
      // Mock successful task creation response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedTaskResponse
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['create-task'].callback;

      // Call the handler
      const result = await handler({
        title: 'New Task',
        content: 'New Task content',
        projectId: 'project1',
        priority: 0
      });

      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          }),
          body: expect.stringContaining('New Task'),
        })
      );

      // Verify result
      expect(result.content[0].text).toContain('Task created successfully');
    });

    test('create-task tool should use Inbox project when no projectId is provided', async () => {
      // Mock projects response to find Inbox
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsResponse
      } as any);

      // Mock successful task creation response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockCreatedTaskResponse,
          projectId: 'inbox-project-id'
        })
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['create-task'].callback;

      // Call the handler without projectId
      const result = await handler({
        title: 'New Inbox Task',
        content: 'New Inbox Task content',
        priority: 0
      });

      // Verify first fetch was to get projects
      expect(mockedFetch).toHaveBeenNthCalledWith(1,
        'https://api.dida365.com/open/v1/project',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );

      // Verify second fetch was to create task with inbox project ID
      expect(mockedFetch).toHaveBeenNthCalledWith(2,
        'https://api.dida365.com/open/v1/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          }),
          body: expect.stringContaining('inbox-project-id'),
        })
      );

      // Verify result
      expect(result.content[0].text).toContain('Task created successfully');
    });

    test('get-task tool should retrieve a task', async () => {
      // Mock successful task retrieval response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaskResponse
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['get-task'].callback;

      // Call the handler
      const result = await handler({
        id: 'task1',
        projectId: 'project1'
      });

      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project/project1/task/task1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );

      // Verify result
      expect(result.content[0].text).toBe(JSON.stringify(mockTaskResponse, null, 2));
    });

    test('move-task tool should move a task between projects', async () => {
      // Mock response for move task
      const mockMoveTaskResponse = {
        id2etag: { 'task1': 'ybukfyon' },
        id2error: {}
      };

      // Mock successful move task response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoveTaskResponse
      } as any);

      // Get the tool handler
      const handler = (server as any)._registeredTools['move-task'].callback;

      // Call the handler
      const result = await handler({
        taskId: 'task1',
        fromProjectId: 'project1',
        toProjectId: 'project2'
      });

      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/taskProject',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
          }),
          body: JSON.stringify([
            {
              taskId: 'task1',
              fromProjectId: 'project1',
              toProjectId: 'project2'
            }
          ])
        })
      );

      // Verify result
      expect(result.content[0].text).toContain('Task moved successfully');
      expect(result.content[0].text).toContain('ybukfyon');
    });
  });
});
