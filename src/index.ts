import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
// No longer need parseArgs as we automatically detect the token file

// Create server instance
const server = new McpServer({
    name: "dida-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Config file path
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.dida-mcp-config.json');

// TickTick API base URL
const API_BASE_URL = 'https://api.dida365.com/api/v2';

// User agent and device information
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:95.0) Gecko/20100101 Firefox/95.0";
const getDeviceInfo = () => {
    const deviceId = '6490' + crypto.randomBytes(10).toString('hex');
    return JSON.stringify({
        "platform": "web",
        "os": "OS X",
        "device": "Firefox 123.0",
        "name": "unofficial api!",
        "version": 4531,
        "id": deviceId,
        "channel": "website",
        "campaign": "",
        "websocket": ""
    });
};

// Authentication state
let accessToken: string | null = null;
let inboxId: string | null = null;
let isOAuthAuth = false;

// Automatically check for and load access token from config file if it exists
try {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

        // Check if token is expired
        if (config.expires_at && config.expires_at > Date.now()) {
            accessToken = config.access_token;
            isOAuthAuth = true;
            console.error('Found valid OAuth access token, using it for authentication');
        } else {
            console.error('Access token has expired. Please run "npm run get-token" to obtain a new token.');
        }
    }
} catch (error) {
    console.error(`Error loading access token: ${error instanceof Error ? error.message : String(error)}`);
}

// Task status enum
enum TaskStatus {
    TODO = 0,
    COMPLETED = 2
}

// Task priority enum
enum TaskPriority {
    NONE = 0,
    LOW = 1,
    MEDIUM = 3,
    HIGH = 5
}

// Helper function to get auth headers
function getAuthHeaders() {
    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
}

// Authentication tools
server.tool(
    "login-with-token",
    "Login to TickTick using an access token",
    {},
    async () => {
        try {
            if (!isOAuthAuth || !accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Access token not available. Please run the server and make sure you've generated a token using get-access-token.js",
                        },
                    ],
                };
            }

            // Use the projects API to verify the token works
            const response = await fetch(`${API_BASE_URL}/projects`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Authentication failed: ${response.statusText}`,
                        },
                    ],
                };
            }

            const projects = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully authenticated with access token\nFound ${projects.length} projects`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Project management tools
server.tool(
    "list-projects",
    "List all projects",
    {},
    async () => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            const response = await fetch(`${API_BASE_URL}/projects`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get projects: ${response.statusText}`,
                        },
                    ],
                };
            }

            const projects = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(projects, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "create-project",
    "Create a new project",
    {
        name: z.string().min(1).max(100).describe("Project name"),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Project color (hex format)"),
    },
    async ({ name, color }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // Generate a unique ID for the project
            const projectId = uuidv4().replace(/-/g, '');

            const newProject = {
                id: projectId,
                name: name,
                color: color || null,
                sortOrder: -1099511627776, // Default sort order
                kind: "TASK"
            };

            const response = await fetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newProject),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create project: ${response.statusText}`,
                        },
                    ],
                };
            }

            const project = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Project created successfully:\n${JSON.stringify(project, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating project: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "update-project",
    "Update an existing project",
    {
        id: z.string().describe("Project ID"),
        name: z.string().min(1).max(100).optional().describe("Project name"),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Project color (hex format)"),
    },
    async ({ id, name, color }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (color !== undefined) updateData.color = color;

            const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update project: ${response.statusText}`,
                        },
                    ],
                };
            }

            const project = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Project updated successfully:\n${JSON.stringify(project, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating project: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "delete-project",
    "Delete a project",
    {
        id: z.string().describe("Project ID"),
    },
    async ({ id }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to delete project: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Project with ID ${id} deleted successfully`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error deleting project: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "get-project-data",
    "Get comprehensive project data including tasks, subtasks, and columns",
    {
        projectId: z.string().describe("Project ID"),
    },
    async ({ projectId }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // Use the project/{projectId}/data endpoint to get comprehensive project data
            const response = await fetch(`${API_BASE_URL}/project/${projectId}/data`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get project data: ${response.statusText}`,
                        },
                    ],
                };
            }

            const projectData = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(projectData, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting project data: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Task management tools
server.tool(
    "list-tasks",
    "List all tasks",
    {
        projectId: z.string().optional().describe("Filter tasks by project ID"),
    },
    async ({ projectId }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // TickTick doesn't have a direct endpoint to get all tasks
            // We need to use the batch/check endpoint to get all tasks
            const response = await fetch(`${API_BASE_URL}/batch/check/0`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tasks: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();

            // Combine tasks from different sources in the response
            let tasks = [];

            if (data.syncTaskBean && !data.syncTaskBean.empty) {
                if (data.syncTaskBean.update && data.syncTaskBean.update.length > 0) {
                    tasks.push(...data.syncTaskBean.update);
                }

                if (data.syncTaskBean.add && data.syncTaskBean.add.length > 0) {
                    tasks.push(...data.syncTaskBean.add);
                }
            }

            // Filter by project ID if provided
            if (projectId) {
                tasks = tasks.filter(task => task.projectId === projectId);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tasks, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "create-task",
    "Create a new task",
    {
        title: z.string().min(1).max(200).describe("Task title"),
        content: z.string().max(2000).optional().describe("Task content/description"),
        priority: z.number().min(0).max(5).optional().describe("Task priority (0-5)"),
        dueDate: z.string().datetime().optional().describe("Task due date (ISO format)"),
        projectId: z.string().optional().describe("Project ID (defaults to inbox)"),
        tags: z.array(z.string()).optional().describe("Array of tag names"),
    },
    async ({ title, content, priority, dueDate, projectId, tags }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // Generate a unique ID for the task
            const taskId = uuidv4().replace(/-/g, '');
            const now = new Date().toISOString();

            // Use inbox if no project is specified
            const taskProjectId = projectId || inboxId;

            if (!taskProjectId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No project ID specified and inbox ID not available. Please login first.",
                        },
                    ],
                };
            }

            const newTask = {
                id: taskId,
                title: title,
                content: content || '',
                priority: priority || 0,
                status: 0, // TODO status
                projectId: taskProjectId,
                dueDate: dueDate,
                tags: tags || [],
                sortOrder: -2199023452160, // Default sort order
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

            const response = await fetch(`${API_BASE_URL}/batch/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create task: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            if (result.id2error && result.id2error[taskId]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create task: ${result.id2error[taskId]}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Task created successfully:\n${JSON.stringify(newTask, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "complete-task",
    "Mark a task as completed",
    {
        id: z.string().describe("Task ID"),
    },
    async ({ id }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // First get all tasks to find the one we want to update
            const checkResponse = await fetch(`${API_BASE_URL}/batch/check/0`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!checkResponse.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tasks: ${checkResponse.statusText}`,
                        },
                    ],
                };
            }

            const checkData = await checkResponse.json();

            // Find the task in the response
            let existingTask = null;

            if (checkData.syncTaskBean && !checkData.syncTaskBean.empty) {
                if (checkData.syncTaskBean.update && checkData.syncTaskBean.update.length > 0) {
                    existingTask = checkData.syncTaskBean.update.find((t: any) => t.id === id);
                }

                if (!existingTask && checkData.syncTaskBean.add && checkData.syncTaskBean.add.length > 0) {
                    existingTask = checkData.syncTaskBean.add.find((t: any) => t.id === id);
                }
            }

            if (!existingTask) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${id} not found`,
                        },
                    ],
                };
            }

            // Update the task status to completed
            const now = new Date().toISOString();

            const updatedTask = {
                ...existingTask,
                status: TaskStatus.COMPLETED,
                modifiedTime: now,
                completedTime: now
            };

            const batchRequest = {
                add: [],
                update: [updatedTask],
                delete: [],
                addAttachments: [],
                updateAttachments: [],
                deleteAttachments: []
            };

            const response = await fetch(`${API_BASE_URL}/batch/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to complete task: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            if (result.id2error && result.id2error[id]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to complete task: ${result.id2error[id]}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Task marked as completed successfully`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error completing task: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "delete-task",
    "Delete a task",
    {
        id: z.string().describe("Task ID"),
    },
    async ({ id }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            const batchRequest = {
                add: [],
                update: [],
                delete: [id],
                addAttachments: [],
                updateAttachments: [],
                deleteAttachments: []
            };

            const response = await fetch(`${API_BASE_URL}/batch/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${id} not found`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Task with ID ${id} deleted successfully`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error deleting task: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Tag management tools
server.tool(
    "list-tags",
    "List all tags",
    {},
    async () => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // TickTick doesn't have a direct endpoint to get all tags
            // We need to use the batch/check endpoint to get all tags
            const response = await fetch(`${API_BASE_URL}/batch/check/0`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tags: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();

            // Extract tags from the response
            const tags = data.tags || [];

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tags, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing tags: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "add-tag-to-task",
    "Add a tag to a task",
    {
        taskId: z.string().describe("Task ID"),
        tagName: z.string().min(1).describe("Tag name"),
    },
    async ({ taskId, tagName }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // First get all tasks to find the one we want to update
            const checkResponse = await fetch(`${API_BASE_URL}/batch/check/0`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!checkResponse.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tasks: ${checkResponse.statusText}`,
                        },
                    ],
                };
            }

            const checkData = await checkResponse.json();

            // Find the task in the response
            let existingTask = null;

            if (checkData.syncTaskBean && !checkData.syncTaskBean.empty) {
                if (checkData.syncTaskBean.update && checkData.syncTaskBean.update.length > 0) {
                    existingTask = checkData.syncTaskBean.update.find((t: any) => t.id === taskId);
                }

                if (!existingTask && checkData.syncTaskBean.add && checkData.syncTaskBean.add.length > 0) {
                    existingTask = checkData.syncTaskBean.add.find((t: any) => t.id === taskId);
                }
            }

            if (!existingTask) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${taskId} not found`,
                        },
                    ],
                };
            }

            // Add the tag to the task
            const now = new Date().toISOString();

            // Create a new tags array if it doesn't exist
            const currentTags = existingTask.tags || [];

            // Check if the tag already exists
            if (currentTags.includes(tagName)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Tag "${tagName}" is already added to this task`,
                        },
                    ],
                };
            }

            const updatedTask = {
                ...existingTask,
                tags: [...currentTags, tagName],
                modifiedTime: now
            };

            const batchRequest = {
                add: [],
                update: [updatedTask],
                delete: [],
                addAttachments: [],
                updateAttachments: [],
                deleteAttachments: []
            };

            const response = await fetch(`${API_BASE_URL}/batch/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to add tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            if (result.id2error && result.id2error[taskId]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to add tag: ${result.id2error[taskId]}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Tag "${tagName}" added to task successfully`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error adding tag: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "remove-tag-from-task",
    "Remove a tag from a task",
    {
        taskId: z.string().describe("Task ID"),
        tagName: z.string().min(1).describe("Tag name"),
    },
    async ({ taskId, tagName }) => {
        try {
            if (!accessToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Not authenticated. Please login first.",
                        },
                    ],
                };
            }

            // First get all tasks to find the one we want to update
            const checkResponse = await fetch(`${API_BASE_URL}/batch/check/0`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!checkResponse.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tasks: ${checkResponse.statusText}`,
                        },
                    ],
                };
            }

            const checkData = await checkResponse.json();

            // Find the task in the response
            let existingTask = null;

            if (checkData.syncTaskBean && !checkData.syncTaskBean.empty) {
                if (checkData.syncTaskBean.update && checkData.syncTaskBean.update.length > 0) {
                    existingTask = checkData.syncTaskBean.update.find((t: any) => t.id === taskId);
                }

                if (!existingTask && checkData.syncTaskBean.add && checkData.syncTaskBean.add.length > 0) {
                    existingTask = checkData.syncTaskBean.add.find((t: any) => t.id === taskId);
                }
            }

            if (!existingTask) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${taskId} not found`,
                        },
                    ],
                };
            }

            // Remove the tag from the task
            const now = new Date().toISOString();

            // Create a new tags array if it doesn't exist
            const currentTags = existingTask.tags || [];

            // Check if the tag exists
            if (!currentTags.includes(tagName)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Tag "${tagName}" is not on this task`,
                        },
                    ],
                };
            }

            const updatedTask = {
                ...existingTask,
                tags: currentTags.filter((tag: string) => tag !== tagName),
                modifiedTime: now
            };

            const batchRequest = {
                add: [],
                update: [updatedTask],
                delete: [],
                addAttachments: [],
                updateAttachments: [],
                deleteAttachments: []
            };

            const response = await fetch(`${API_BASE_URL}/batch/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to remove tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            if (result.id2error && result.id2error[taskId]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to remove tag: ${result.id2error[taskId]}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Tag "${tagName}" removed from task successfully`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error removing tag: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Dida MCP Server running on stdio");

    if (isOAuthAuth && accessToken) {
        console.error("Using OAuth access token for authentication");
        console.error("Use the 'login-with-token' tool to complete authentication");
    } else {
        console.error("To use OAuth access token authentication:");
        console.error("Run 'npm run get-token' to obtain a token");
        console.error("The server will automatically use the token on next startup");
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
