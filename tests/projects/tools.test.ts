import { registerProjectTools } from '../../src/projects/tools';
import * as config from '../../src/config';
import fetch from 'node-fetch';
import { createMockResponse, mockProjects } from '../mocks';
import * as cachedData from '../../src/resources/cached-data';
import { parseJsonResponse } from '../utils';

// Mock the config module
jest.mock('../../src/config', () => {
  let mockAccessToken = 'mock-access-token';
  let mockV2AccessToken = 'mock-v2-access-token';
  let mockInboxId = 'inbox1';
  let mockIsOAuthAuth = true;

  return {
    API_BASE_URL: 'https://api.dida365.com/open/v1',
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

// Mock the cached-data module
jest.mock('../../src/resources/cached-data', () => ({
  updateProjectCache: jest.fn().mockResolvedValue(true),
}));

// Mock the auth helpers
jest.mock('../../src/auth/helpers', () => ({
  getAuthHeaders: jest.fn().mockReturnValue({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-access-token',
  }),
}));

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Project Tools', () => {
  let mockServer: any;

  beforeEach(() => {
    // Create a mock server object
    mockServer = {
      tool: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should register all project tools', () => {
    registerProjectTools(mockServer);

    // Verify that tool was called for each project tool
    expect(mockServer.tool).toHaveBeenCalledTimes(5);

    // Verify refresh-project-cache tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'refresh-project-cache',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify list-projects tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'list-projects',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify create-project tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'create-project',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify update-project tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'update-project',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    // Verify delete-project tool
    expect(mockServer.tool).toHaveBeenCalledWith(
      'delete-project',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle refresh-project-cache tool execution', async () => {
    registerProjectTools(mockServer);

    // Get the handler function for refresh-project-cache
    const refreshProjectCacheHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'refresh-project-cache'
    )[3];

    // Execute the handler
    const result = await refreshProjectCacheHandler({});

    // Verify updateProjectCache was called
    expect(cachedData.updateProjectCache).toHaveBeenCalled();

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Project cache refreshed successfully.');
    expect(jsonResponse.data.refreshed).toBe(true);
  });

  it('should handle list-projects tool execution', async () => {
    // Mock successful API response
    mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockProjects));

    registerProjectTools(mockServer);

    // Get the handler function for list-projects
    const listProjectsHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'list-projects'
    )[3];

    // Execute the handler
    const result = await listProjectsHandler({});

    // Verify fetch was called with correct parameters
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/open/v1/project',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-access-token',
        }),
      })
    );

    // Verify updateProjectCache was called
    expect(cachedData.updateProjectCache).toHaveBeenCalled();

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.data).toEqual(mockProjects);
  });

  it('should handle create-project tool execution', async () => {
    // Mock successful API response
    const createdProject = { ...mockProjects[0], id: 'new-project-id' };
    mockedFetch.mockResolvedValueOnce(createMockResponse(200, createdProject));

    registerProjectTools(mockServer);

    // Get the handler function for create-project
    const createProjectHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'create-project'
    )[3];

    // Execute the handler
    const result = await createProjectHandler({
      name: 'New Project',
      color: '#FF0000',
    });

    // Verify fetch was called with correct parameters
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/open/v1/project',
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
      name: 'New Project',
      color: '#FF0000',
      viewMode: 'list',
      kind: 'TASK',
    });

    // Verify updateProjectCache was called
    expect(cachedData.updateProjectCache).toHaveBeenCalled();

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Project created successfully');
    expect(jsonResponse.data).toEqual(createdProject);
  });

  it('should handle update-project tool execution', async () => {
    // Mock successful API response
    const updatedProject = { ...mockProjects[0], name: 'Updated Project' };
    mockedFetch.mockResolvedValueOnce(createMockResponse(200, updatedProject));

    registerProjectTools(mockServer);

    // Get the handler function for update-project
    const updateProjectHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'update-project'
    )[3];

    // Execute the handler
    const result = await updateProjectHandler({
      id: 'project1',
      name: 'Updated Project',
    });

    // Verify fetch was called with correct parameters
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/open/v1/project/project1',
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
      name: 'Updated Project',
    });

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Project updated successfully');
    expect(jsonResponse.data).toEqual(updatedProject);
  });

  it('should handle delete-project tool execution', async () => {
    // Mock successful API response
    mockedFetch.mockResolvedValueOnce(createMockResponse(200, {}));

    registerProjectTools(mockServer);

    // Get the handler function for delete-project
    const deleteProjectHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'delete-project'
    )[3];

    // Execute the handler
    const result = await deleteProjectHandler({
      id: 'project1',
    });

    // Verify fetch was called with correct parameters
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.dida365.com/open/v1/project/project1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-access-token',
        }),
      })
    );

    // Verify updateProjectCache was called
    expect(cachedData.updateProjectCache).toHaveBeenCalled();

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Project with ID project1 deleted successfully');
    expect(jsonResponse.data.id).toBe('project1');
  });

  it('should handle not authenticated case', async () => {
    // Temporarily set accessToken to null
    const originalToken = config.accessToken;
    const originalV2Token = config.v2AccessToken;
    const originalInboxId = config.inboxId;
    config.setAuthTokens(null, config.isOAuthAuth, originalV2Token, originalInboxId);

    registerProjectTools(mockServer);

    // Get the handler function for list-projects
    const listProjectsHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'list-projects'
    )[3];

    // Execute the handler
    const result = await listProjectsHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.message).toBe('Not authenticated. Please login first.');

    // Restore accessToken
    config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, originalInboxId);
  });

  it('should handle API error in list-projects', async () => {
    // Mock failed API response
    mockedFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));

    registerProjectTools(mockServer);

    // Get the handler function for list-projects
    const listProjectsHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'list-projects'
    )[3];

    // Execute the handler
    const result = await listProjectsHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.message).toBe('Failed to get projects: Error');
  });

  it('should handle exception in refresh-project-cache', async () => {
    // Mock updateProjectCache to throw an error
    (cachedData.updateProjectCache as jest.Mock).mockRejectedValueOnce(new Error('Cache error'));

    registerProjectTools(mockServer);

    // Get the handler function for refresh-project-cache
    const refreshProjectCacheHandler = mockServer.tool.mock.calls.find(
      (call: any) => call[0] === 'refresh-project-cache'
    )[3];

    // Execute the handler
    const result = await refreshProjectCacheHandler({});

    // Verify the result
    expect(result.content[0].type).toBe('text');
    const jsonResponse = parseJsonResponse(result.content[0].text);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toContain('Cache error');
  });
});
