import { updateProjectCache, registerCachedDataResource } from '../../src/resources/cached-data';
import * as config from '../../src/config';
import fetch from 'node-fetch';
import { createMockResponse, mockProjects } from '../mocks';

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
  };
});

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

describe('Cached Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.projectsMap.clear();
  });

  describe('updateProjectCache', () => {
    it('should update project cache successfully', async () => {
      // Mock successful API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockProjects));

      const result = await updateProjectCache();

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

      // Verify result is true
      expect(result).toBe(true);

      // Verify projectsMap was updated
      expect(config.projectsMap.size).toBe(3); // 2 projects + inbox
      expect(config.projectsMap.get('project1')).toEqual({
        id: 'project1',
        name: 'Project 1',
        color: '#FF0000',
      });
      expect(config.projectsMap.get('inbox1')).toEqual({
        id: 'inbox1',
        name: 'Inbox',
        color: 'None',
      });
    });

    it('should handle API error', async () => {
      // Mock failed API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));

      const result = await updateProjectCache();

      // Verify result is false
      expect(result).toBe(false);

      // Verify projectsMap was not updated
      expect(config.projectsMap.size).toBe(0);
    });

    it('should handle exception', async () => {
      // Mock fetch to throw an error
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await updateProjectCache();

      // Verify result is false
      expect(result).toBe(false);
    });
  });

  describe('registerCachedDataResource', () => {
    it('should register resource with server', () => {
      // Create a mock server object
      const mockServer = {
        resource: jest.fn(),
        server: {
          sendResourceListChanged: jest.fn(),
        },
      };

      // Add some data to the maps
      config.projectsMap.set('project1', {
        id: 'project1',
        name: 'Project 1',
        color: '#FF0000',
      });
      config.tagsMap.set('tag1', {
        name: 'tag1',
        rawName: 'tag1',
        label: 'tag1',
        color: '#FF0000',
      });

      registerCachedDataResource(mockServer as any);

      // Verify resource was registered
      expect(mockServer.resource).toHaveBeenCalledWith(
        'cached-projects-and-tags',
        'dida://cached/projects-and-tags',
        expect.any(Object),
        expect.any(Function)
      );

      // Get the resource handler
      const resourceHandler = mockServer.resource.mock.calls[0][3];

      // Create a mock URI
      const mockUri = { href: 'dida://cached/projects-and-tags' };

      // Call the resource handler
      const result = resourceHandler(mockUri);

      // Verify the result structure
      return result.then((data: any) => {
        expect(data.contents[0].uri).toBe('dida://cached/projects-and-tags');
        expect(data.contents[0].mimeType).toBe('application/json');

        // Parse the JSON content
        const content = JSON.parse(data.contents[0].text);
        expect(content.projects).toHaveLength(1);
        expect(content.projects[0].name).toBe('Project 1');
        expect(content.tags).toHaveLength(1);
        expect(content.tags[0].name).toBe('tag1');
        expect(content.inboxId).toBe('inbox1');
      });
    });
  });
});
