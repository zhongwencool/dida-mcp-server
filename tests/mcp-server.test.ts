import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('node-fetch');
jest.mock('uuid');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

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

describe('TickTick MCP Server', () => {
  let server: McpServer;
  
  beforeEach(() => {
    // Reset mocks
    mockedFetch.mockReset();
    mockedUuidv4.mockReset();
    
    // Mock UUID generation
    mockedUuidv4.mockReturnValue('00000000-0000-0000-0000-000000000000');
    
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
  });
  
  describe('Authentication Tool', () => {
    test('login tool should authenticate successfully', async () => {
      // Mock successful login response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse
      } as any);
      
      // Get the tool handler
      const handler = (server as any)._registeredTools['login'].callback;
      
      // Call the handler
      const result = await handler({ username: 'test@example.com', password: 'password' });
      
      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/user/signon?wc=true&remember=true',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'test@example.com', password: 'password' }),
        })
      );
      
      // Verify result
      expect(result.content[0].text).toContain('Successfully logged in');
    });
    
    test('login tool should handle authentication failure', async () => {
      // Mock failed login response
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ errorCode: 'AUTH_FAILED', errorMessage: 'Invalid credentials' })
      } as any);
      
      // Get the tool handler
      const handler = (server as any)._registeredTools['login'].callback;
      
      // Call the handler
      const result = await handler({ username: 'test@example.com', password: 'wrong-password' });
      
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
        'https://api.dida365.com/api/v2/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
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
        json: async () => mockBatchTaskResponse
      } as any);
      
      // Get the tool handler
      const handler = (server as any)._registeredTools['create-task'].callback;
      
      // Call the handler
      const result = await handler({ 
        title: 'Test Task', 
        content: 'Test Content',
        projectId: 'project1'
      });
      
      // Verify UUID was called
      expect(mockedUuidv4).toHaveBeenCalled();
      
      // Verify fetch was called with correct arguments
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Cookie': 't=mock-token'
          }),
          body: expect.stringContaining('Test Task'),
        })
      );
      
      // Verify result
      expect(result.content[0].text).toContain('Task created successfully');
    });
  });
});
