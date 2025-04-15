import { registerAuthTools } from '../../src/auth/tools';
import { authenticateWithStoredTokens } from '../../src/auth/helpers';
import * as config from '../../src/config';
import { parseJsonResponse } from '../utils';

// Mock the config module
jest.mock('../../src/config', () => {
  let mockAccessToken = 'mock-access-token';
  let mockV2AccessToken = 'mock-v2-access-token';
  let mockInboxId = 'inbox1';
  let mockIsOAuthAuth = true;

  return {
    get accessToken() { return mockAccessToken; },
    get v2AccessToken() { return mockV2AccessToken; },
    get isOAuthAuth() { return mockIsOAuthAuth; },
    get inboxId() { return mockInboxId; },
    projectsMap: new Map([['project1', { id: 'project1', name: 'Project 1', color: '#FF0000' }]]),
    tagsMap: new Map([['tag1', { name: 'tag1', rawName: 'tag1', label: 'tag1', color: '#FF0000' }]]),
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
  authenticateWithStoredTokens: jest.fn().mockResolvedValue({
    content: [{ text: 'Authentication successful' }],
  }),
}));

describe('Auth Tools', () => {
  let mockServer: any;

  beforeEach(() => {
    // Create a mock server object
    mockServer = {
      tool: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should register all auth tools', () => {
    registerAuthTools(mockServer);

    // Verify that tool was called for each auth tool
    expect(mockServer.tool).toHaveBeenCalledTimes(3);

    // Verify check-auth-status tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'check-auth-status',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify list-cached-data tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'list-cached-data',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify authenticate tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'authenticate',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle check-auth-status tool execution', async () => {
    registerAuthTools(mockServer);

    // Get the handler function for check-auth-status
    const checkAuthStatusHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'check-auth-status'
    )[3];

    // Execute the handler
    const result = await checkAuthStatusHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.data.v1Api.authenticated).toBe(true);
    expect(jsonResponse.data.v2Api.authenticated).toBe(true);
    expect(jsonResponse.data.cachedData.projects).toBe(1);
    expect(jsonResponse.data.cachedData.tags).toBe(1);
    expect(jsonResponse.data.cachedData.inboxId).toBe('inbox1');
  });

  it('should handle list-cached-data tool execution', async () => {
    registerAuthTools(mockServer);

    // Get the handler function for list-cached-data
    const listCachedDataHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'list-cached-data'
    )[3];

    // Execute the handler
    const result = await listCachedDataHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.data.inboxId).toBe('inbox1');
    expect(jsonResponse.data.projects.length).toBe(1);
    expect(jsonResponse.data.projects[0].name).toBe('Project 1');
    expect(jsonResponse.data.tags.length).toBe(1);
    expect(jsonResponse.data.tags[0].name).toBe('tag1');
  });

  it('should handle authenticate tool execution', async () => {
    registerAuthTools(mockServer);

    // Get the handler function for authenticate
    const authenticateHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'authenticate'
    )[3];

    // Execute the handler
    const result = await authenticateHandler({});

    // Verify authenticateWithStoredTokens was called
    expect(authenticateWithStoredTokens).toHaveBeenCalled();

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Authentication successful');
  });

  it('should handle error in authenticate tool', async () => {
    // Mock authenticateWithStoredTokens to throw an error
    (authenticateWithStoredTokens as jest.Mock).mockRejectedValueOnce(new Error('Auth error'));

    registerAuthTools(mockServer);

    // Get the handler function for authenticate
    const authenticateHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'authenticate'
    )[3];

    // Execute the handler
    const result = await authenticateHandler({});

    // Verify the result contains error message
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toContain('Auth error');
  });

  it('should handle not authenticated case in list-cached-data', async () => {
    // Temporarily set both tokens to null
    const originalV1Token = config.accessToken;
    const originalV2Token = config.v2AccessToken;
    const originalInboxId = config.inboxId;
    config.setAuthTokens(null, config.isOAuthAuth, null, originalInboxId);

    registerAuthTools(mockServer);

    // Get the handler function for list-cached-data
    const listCachedDataHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'list-cached-data'
    )[3];

    // Execute the handler
    const result = await listCachedDataHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.message).toBe('Not authenticated. Please login first.');

    // Restore tokens
    config.setAuthTokens(originalV1Token, config.isOAuthAuth, originalV2Token, originalInboxId);
  });
});
