import { getAuthHeaders, getV2AuthHeaders, authenticateWithStoredTokens } from '../../src/auth/helpers';
import * as config from '../../src/config';
import fetch from 'node-fetch';
import { createMockResponse, mockBatchCheckResponse, mockProjects } from '../mocks';

// Mock the config module
jest.mock('../../src/config', () => {
  let mockAccessToken = 'mock-access-token';
  let mockV2AccessToken = 'mock-v2-access-token';
  let mockInboxId = 'inbox1';
  let mockIsOAuthAuth = true;

  return {
    API_BASE_URL: 'https://api.dida365.com/open/v1',
    API_V2_BASE_URL: 'https://api.dida365.com/api/v2',
    V2_HEADERS: {
      'User-Agent': 'MockUserAgent',
      'x-device': 'MockDevice',
      'Content-Type': 'application/json',
    },
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
    CONFIG_FILE: './.dida-mcp-config.json',
  };
});

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    access_token: 'mock-access-token',
    v2_access_token: 'mock-v2-access-token',
    expires_at: Date.now() + 3600000, // 1 hour in the future
    inboxId: 'inbox1',
  })),
  writeFileSync: jest.fn(),
}));

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthHeaders', () => {
    it('should return correct headers when accessToken is available', () => {
      const headers = getAuthHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-access-token',
      });
    });

    it('should throw error when accessToken is not available', () => {
      // Temporarily set accessToken to null
      const originalToken = config.accessToken;
      const originalV2Token = config.v2AccessToken;
      const originalInboxId = config.inboxId;
      config.setAuthTokens(null, config.isOAuthAuth, originalV2Token, originalInboxId);

      expect(() => getAuthHeaders()).toThrow('Not authenticated with v1 API');

      // Restore accessToken
      config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, originalInboxId);
    });
  });

  describe('getV2AuthHeaders', () => {
    it('should return correct headers when v2AccessToken is available', () => {
      const headers = getV2AuthHeaders();
      expect(headers).toEqual({
        'User-Agent': 'MockUserAgent',
        'x-device': 'MockDevice',
        'Content-Type': 'application/json',
        'Cookie': 't=mock-v2-access-token',
      });
    });

    it('should throw error when v2AccessToken is not available', () => {
      // Temporarily set v2AccessToken to null
      const originalToken = config.accessToken;
      const originalV2Token = config.v2AccessToken;
      const originalInboxId = config.inboxId;
      config.setAuthTokens(originalToken, config.isOAuthAuth, null, originalInboxId);

      expect(() => getV2AuthHeaders()).toThrow('Not authenticated with v2 API');

      // Restore v2AccessToken
      config.setAuthTokens(originalToken, config.isOAuthAuth, originalV2Token, originalInboxId);
    });
  });

  describe('authenticateWithStoredTokens', () => {
    it('should return error message when no tokens are available', async () => {
      // Temporarily set both tokens to null
      const originalV1Token = config.accessToken;
      const originalV2Token = config.v2AccessToken;
      const originalInboxId = config.inboxId;
      config.setAuthTokens(null, config.isOAuthAuth, null, originalInboxId);

      const result = await authenticateWithStoredTokens();
      expect(result.content[0].text).toContain('No access tokens available');

      // Restore tokens
      config.setAuthTokens(originalV1Token, config.isOAuthAuth, originalV2Token, originalInboxId);
    });

    it('should authenticate with v2 token and update cache data', async () => {
      // Mock successful v2 API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockBatchCheckResponse));

      const result = await authenticateWithStoredTokens();

      // Verify fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/api/v2/batch/check/0',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Cookie': 't=mock-v2-access-token',
          }),
        })
      );

      // Verify result contains success message
      expect(result.content[0].text).toContain('Successfully authenticated with v2 API token');

      // Verify resetCacheData was called
      expect(config.resetCacheData).toHaveBeenCalled();
    });

    it('should fall back to v1 token if v2 authentication fails', async () => {
      // Mock failed v2 API response and successful v1 API response
      mockedFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));
      mockedFetch.mockResolvedValueOnce(createMockResponse(200, mockProjects));

      const result = await authenticateWithStoredTokens();

      // Verify v1 API fetch was called
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.dida365.com/open/v1/project',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );

      // Verify result contains success message for v1 API
      expect(result.content[0].text).toContain('Successfully authenticated with v1 API token');
    });

    it('should return error message when both authentication methods fail', async () => {
      // Mock failed responses for both v1 and v2 API
      mockedFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));
      mockedFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));

      const result = await authenticateWithStoredTokens();

      // Verify result contains error message
      expect(result.content[0].text).toContain('Authentication failed with all available methods');
    });
  });
});
