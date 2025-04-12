import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch';
// No longer need uuid or crypto for Open API implementation
import fs from 'fs';
import path from 'path';
// Import system prompt
import { systemPrompt } from './systemPrompt';
// No longer need parseArgs as we automatically detect the token file

// Create server instance
const server = new McpServer({
    name: "dida-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    }
});

// Config file path
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.dida-mcp-config.json');

// TickTick API base URL for Open API
const API_BASE_URL = 'https://api.dida365.com/open/v1';

// Authentication state
let accessToken: string | null = null;
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

// Task status and priority enums are no longer needed as we're using the raw values from the API

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
            const response = await fetch(`${API_BASE_URL}/project`, {
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

            const response = await fetch(`${API_BASE_URL}/project`, {
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

            const newProject = {
                name: name,
                color: color || "#F18181", // Default color
                viewMode: "list",
                kind: "TASK"
            };

            const response = await fetch(`${API_BASE_URL}/project`, {
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

            const response = await fetch(`${API_BASE_URL}/project/${id}`, {
                method: 'POST',
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

            const response = await fetch(`${API_BASE_URL}/project/${id}`, {
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

            let tasks = [];

            if (projectId) {
                // If projectId is provided, use the project data endpoint to get tasks
                const response = await fetch(`${API_BASE_URL}/project/${projectId}/data`, {
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
                tasks = data.tasks || [];
            } else {
                // If no projectId is provided, get all projects first
                const projectsResponse = await fetch(`${API_BASE_URL}/project`, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (!projectsResponse.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to get projects: ${projectsResponse.statusText}`,
                            },
                        ],
                    };
                }

                const projects = await projectsResponse.json();

                // For each project, get its tasks
                for (const project of projects) {
                    const projectDataResponse = await fetch(`${API_BASE_URL}/project/${project.id}/data`, {
                        method: 'GET',
                        headers: getAuthHeaders(),
                    });

                    if (projectDataResponse.ok) {
                        const projectData = await projectDataResponse.json();
                        if (projectData.tasks && projectData.tasks.length > 0) {
                            tasks.push(...projectData.tasks);
                        }
                    }
                }
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
        tags: z.string().optional().describe("Comma-separated list of tag names"),
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

            // Use inbox if no project is specified
            if (!projectId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Project ID is required for the Open API. Please specify a project ID.",
                        },
                    ],
                };
            }

            const newTask: any = {
                title: title,
                content: content || '',
                priority: priority || 0,
                projectId: projectId,
                dueDate: dueDate,
                timeZone: 'Asia/Shanghai',
                isAllDay: false
            };

            // Add tags if provided
            if (tags) {
                // Convert comma-separated string to array
                newTask.tags = tags.split(',').map(tag => tag.trim());
            }

            const response = await fetch(`${API_BASE_URL}/task`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newTask),
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

            const createdTask = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: `Task created successfully:\n${JSON.stringify(createdTask, null, 2)}`,
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

            // First we need to find the project ID for this task
            // We'll need to search through all projects
            const projectsResponse = await fetch(`${API_BASE_URL}/project`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!projectsResponse.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get projects: ${projectsResponse.statusText}`,
                        },
                    ],
                };
            }

            const projects = await projectsResponse.json();
            let taskProjectId = null;
            let foundTask = null;

            // Search for the task in each project
            for (const project of projects) {
                const projectDataResponse = await fetch(`${API_BASE_URL}/project/${project.id}/data`, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (projectDataResponse.ok) {
                    const projectData = await projectDataResponse.json();
                    if (projectData.tasks) {
                        const task = projectData.tasks.find((t: any) => t.id === id);
                        if (task) {
                            taskProjectId = project.id;
                            foundTask = task;
                            break;
                        }
                    }
                }
            }

            if (!taskProjectId || !foundTask) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${id} not found in any project`,
                        },
                    ],
                };
            }

            // Complete the task using the complete endpoint
            const response = await fetch(`${API_BASE_URL}/project/${taskProjectId}/task/${id}/complete`, {
                method: 'POST',
                headers: getAuthHeaders(),
                // No body needed for the complete endpoint
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
    "update-task",
    "Update an existing task",
    {
        id: z.string().describe("Task ID"),
        projectId: z.string().describe("Project ID"),
        title: z.string().min(1).max(200).optional().describe("Task title"),
        content: z.string().max(2000).optional().describe("Task content/description"),
        priority: z.number().min(0).max(5).optional().describe("Task priority (0-5)"),
        dueDate: z.string().datetime().optional().describe("Task due date (ISO format)"),
        startDate: z.string().datetime().optional().describe("Task start date (ISO format)"),
        isAllDay: z.boolean().optional().describe("Whether the task is an all-day task"),
        tags: z.string().optional().describe("Comma-separated list of tag names"),
    },
    async ({ id, projectId, title, content, priority, dueDate, startDate, isAllDay, tags }) => {
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

            // First get the task to update
            const getResponse = await fetch(`${API_BASE_URL}/project/${projectId}/task/${id}`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!getResponse.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get task: ${getResponse.statusText}`,
                        },
                    ],
                };
            }

            const existingTask = await getResponse.json();

            // Prepare the update data
            const updateData: any = {
                id: id,
                projectId: projectId,
                title: title || existingTask.title,
                content: content !== undefined ? content : existingTask.content,
                priority: priority !== undefined ? priority : existingTask.priority,
                dueDate: dueDate !== undefined ? dueDate : existingTask.dueDate,
                startDate: startDate !== undefined ? startDate : existingTask.startDate,
                isAllDay: isAllDay !== undefined ? isAllDay : existingTask.isAllDay,
                timeZone: existingTask.timeZone || 'Asia/Shanghai',
            };

            // Handle tags if provided
            if (tags !== undefined) {
                // Convert comma-separated string to array
                updateData.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
            } else if (existingTask.tags) {
                // Keep existing tags if not explicitly changed
                updateData.tags = existingTask.tags;
            }

            // Update the task
            const response = await fetch(`${API_BASE_URL}/task/${id}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update task: ${response.statusText}`,
                        },
                    ],
                };
            }

            const updatedTask = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Task updated successfully:\n${JSON.stringify(updatedTask, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating task: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "get-task",
    "Get a task by ID",
    {
        id: z.string().describe("Task ID"),
        projectId: z.string().describe("Project ID"),
    },
    async ({ id, projectId }) => {
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

            const response = await fetch(`${API_BASE_URL}/project/${projectId}/task/${id}`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get task: ${response.statusText}`,
                        },
                    ],
                };
            }

            const task = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(task, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting task: ${error instanceof Error ? error.message : String(error)}`,
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
        projectId: z.string().describe("Project ID"),
    },
    async ({ id, projectId }) => {
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

            // Use the provided projectId directly

            // Delete the task using the delete endpoint
            const response = await fetch(`${API_BASE_URL}/project/${projectId}/task/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task with ID ${id} not found in project ${projectId}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Task with ID ${id} deleted successfully from project ${projectId}`,
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



// Register the system prompt
server.prompt(
    "gpt-prompt",
    "Get the prompt for the GTD assistant",
    {},
    async () => {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: systemPrompt
                    }
                }
            ]
        };
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
