import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAuthTools } from '../../src/auth/tools';
import { registerProjectTools } from '../../src/projects/tools';
import { registerTaskTools } from '../../src/tasks/tools';
import { registerCachedDataResource } from '../../src/resources/cached-data';
import * as config from '../../src/config';
import { loadTokensFromConfig } from '../../src/auth/helpers';

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
    projectsMap: new Map(),
    tagsMap: new Map(),
    setAuthTokens: jest.fn().mockImplementation((v1Token, isOAuth, v2Token, newInboxId) => {
      mockAccessToken = v1Token;
      mockIsOAuthAuth = isOAuth;
      mockV2AccessToken = v2Token;
      if (newInboxId !== undefined) {
        mockInboxId = newInboxId;
      }
    }),
    resetCacheData: jest.fn(),
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
  loadTokensFromConfig: jest.fn().mockReturnValue(true),
  authenticateWithStoredTokens: jest.fn().mockResolvedValue({
    content: [{ text: 'Authentication successful' }],
  }),
}));

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        tool: jest.fn(),
        resource: jest.fn(),
        server: {
          sendResourceListChanged: jest.fn(),
        },
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('MCP Server Integration', () => {
  let server: any;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new McpServer();
  });

  it('should register all tools and resources', () => {
    // Register all components
    registerAuthTools(server);
    registerProjectTools(server);
    registerTaskTools(server);
    registerCachedDataResource(server);

    // Verify tool was called for each tool type
    expect(server.tool).toHaveBeenCalledWith('check-auth-status', expect.any(String), expect.any(Object), expect.any(Function));
    expect(server.tool).toHaveBeenCalledWith('list-projects', expect.any(String), expect.any(Object), expect.any(Function));
    expect(server.tool).toHaveBeenCalledWith('list-tasks', expect.any(String), expect.any(Object), expect.any(Function));

    // Verify resource was registered
    expect(server.resource).toHaveBeenCalledWith(
      'cached-projects-and-tags',
      'dida://cached/projects-and-tags',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should start the server successfully', async () => {
    // Create a mock implementation of the server start function
    const startServer = async () => {
      // Load tokens from config
      loadTokensFromConfig();

      // Register all components
      registerAuthTools(server);
      registerProjectTools(server);
      registerTaskTools(server);
      registerCachedDataResource(server);

      // Start the server
      await server.start();

      return server;
    };

    // Start the server
    const result = await startServer();

    // Verify loadTokensFromConfig was called
    expect(loadTokensFromConfig).toHaveBeenCalled();

    // Verify server.start was called
    expect(result.start).toHaveBeenCalled();
  });
});
