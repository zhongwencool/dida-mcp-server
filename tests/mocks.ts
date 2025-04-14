// Mock utilities for testing

import { Response } from 'node-fetch';

// Mock Response factory
export function createMockResponse(status: number, data: any): Response {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map(),
  } as unknown as Response;
  
  return response;
}

// Mock project data
export const mockProjects = [
  {
    id: 'project1',
    name: 'Project 1',
    color: '#FF0000',
  },
  {
    id: 'project2',
    name: 'Project 2',
    color: '#00FF00',
  },
];

// Mock task data
export const mockTasks = [
  {
    id: 'task1',
    projectId: 'project1',
    title: 'Task 1',
    content: 'Task 1 content',
    priority: 3,
    tags: ['work', 'important'],
  },
  {
    id: 'task2',
    projectId: 'project1',
    title: 'Task 2',
    content: 'Task 2 content',
    priority: 1,
    tags: ['personal'],
  },
];

// Mock tag data
export const mockTags = [
  {
    name: 'work',
    rawName: 'work',
    label: 'work',
    color: '#FF0000',
  },
  {
    name: 'important',
    rawName: 'important',
    label: 'important',
    color: '#00FF00',
  },
  {
    name: 'personal',
    rawName: 'personal',
    label: 'personal',
    color: '#0000FF',
  },
];

// Mock batch/check response
export const mockBatchCheckResponse = {
  projectProfiles: mockProjects,
  inboxId: 'inbox1',
  tags: mockTags,
  syncTaskBean: {
    update: mockTasks,
    add: [],
    empty: false,
  },
};

// Mock project data response
export const mockProjectDataResponse = {
  id: 'project1',
  name: 'Project 1',
  color: '#FF0000',
  tasks: mockTasks,
};

// Mock config module
export const mockConfig = {
  API_BASE_URL: 'https://api.dida365.com/open/v1',
  API_V2_BASE_URL: 'https://api.dida365.com/api/v2',
  V2_HEADERS: {
    'User-Agent': 'MockUserAgent',
    'x-device': 'MockDevice',
    'Content-Type': 'application/json',
  },
  accessToken: 'mock-access-token',
  v2AccessToken: 'mock-v2-access-token',
  isOAuthAuth: true,
  projectsMap: new Map(),
  tagsMap: new Map(),
  inboxId: 'inbox1',
  setAuthTokens: jest.fn(),
  resetCacheData: jest.fn(),
};
