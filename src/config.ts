// Configuration constants and variables

import path from 'path';
import crypto from 'crypto';

// Config file path
export const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.dida-mcp-config.json');

// TickTick API base URLs
export const API_BASE_URL = 'https://api.dida365.com/open/v1';
export const API_V2_BASE_URL = 'https://api.dida365.com/api/v2';

// v2 API headers constants
export const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0";
export const X_DEVICE = '{"platform":"web","os":"OS X","device":"Firefox 123.0","name":"unofficial api!","version":4531,' +
    '"id":"6490' + crypto.randomBytes(10).toString('hex') + '","channel":"website","campaign":"","websocket":""}';

// v2 API headers
export const V2_HEADERS = {
    'User-Agent': USER_AGENT,
    'x-device': X_DEVICE,
    'Content-Type': 'application/json'
};

// Authentication state (will be initialized in index.ts)
export let accessToken: string | null = null; // v1 API token
export let isOAuthAuth = false;
export let v2AccessToken: string | null = null; // v2 API token

// Set authentication tokens
export function setAuthTokens(v1Token: string | null, isOAuth: boolean, v2Token: string | null, newInboxId?: string | null) {
    accessToken = v1Token;
    isOAuthAuth = isOAuth;
    v2AccessToken = v2Token;

    // Update inbox ID if provided
    if (newInboxId !== undefined) {
        inboxId = newInboxId;
    }
}

// Store project and tag data
export interface ProjectInfo {
    id: string;
    name: string;
    color?: string;
}

export interface TagInfo {
    name: string;
    rawName: string;
    label: string;
    color?: string;
}

// Cache for projects and tags
export let projectsMap: Map<string, ProjectInfo> = new Map();
export let inboxId: string | null = null;
export let tagsMap: Map<string, TagInfo> = new Map();

// Reset cache data
export function resetCacheData() {
    projectsMap.clear();
    inboxId = null;
    tagsMap.clear();
}

// Set cache data
export function setCacheData(
    projects: Map<string, ProjectInfo>,
    inbox: string | null,
    tags: Map<string, TagInfo>
) {
    projectsMap = projects;
    inboxId = inbox;
    tagsMap = tags;
}
