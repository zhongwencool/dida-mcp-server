// Task management tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fetch from 'node-fetch';
import { 
    API_BASE_URL, 
    API_V2_BASE_URL, 
    accessToken, 
    v2AccessToken, 
    inboxId, 
    V2_HEADERS 
} from '../config';
import { getAuthHeaders, getV2AuthHeaders } from '../auth/helpers';

// Register task management tools
export function registerTaskTools(server: McpServer) {
    server.tool(
        "list-tasks",
        "List all tasks by project_id, default is inbox",
        {
            projectId: z.string().optional().describe("Filter tasks by project ID, default is inbox"),
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

                // Use inbox if no project is specified
                if (!projectId) {
                    if (!inboxId) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Inbox ID not found. Please run login-with-token first or specify a project ID.",
                                },
                            ],
                        };
                    }

                    // Use the stored inbox ID
                    projectId = inboxId;
                }

                // Get tasks for the specified project (or inbox)
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
                const tasks = data.tasks || [];

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
            projectId: z.string().optional().describe("Project ID (defaults to Inbox project if not specified)"),
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
                    if (!inboxId) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Inbox ID not found. Please run login-with-token first or specify a project ID.",
                                },
                            ],
                        };
                    }

                    // Use the stored inbox ID
                    projectId = inboxId;
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
                // We'll use the batch/check endpoint to get all tasks
                // Use v2 token if available, otherwise fall back to v1 token
                const headers = v2AccessToken ? getV2AuthHeaders() : { 'Content-Type': 'application/json', 'Cookie': `t=${accessToken}` };

                const checkResponse = await fetch(`${API_V2_BASE_URL}/batch/check/0`, {
                    method: 'GET',
                    headers: headers
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

                const data = await checkResponse.json();
                let taskProjectId = null;
                let foundTask = null;

                // Search for the task in the syncTaskBean
                if (data.syncTaskBean && !data.syncTaskBean.empty) {
                    // Check in update array
                    if (data.syncTaskBean.update && data.syncTaskBean.update.length > 0) {
                        const task = data.syncTaskBean.update.find((t: any) => t.id === id);
                        if (task) {
                            taskProjectId = task.projectId;
                            foundTask = task;
                        }
                    }

                    // If not found, check in add array
                    if (!foundTask && data.syncTaskBean.add && data.syncTaskBean.add.length > 0) {
                        const task = data.syncTaskBean.add.find((t: any) => t.id === id);
                        if (task) {
                            taskProjectId = task.projectId;
                            foundTask = task;
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
                const completeResponse = await fetch(`${API_BASE_URL}/project/${taskProjectId}/task/${id}/complete`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    // No body needed for the complete endpoint
                });

                if (!completeResponse.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to complete task: ${completeResponse.statusText}`,
                            },
                        ],
                    };
                }

                const result = await completeResponse.json();

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
            projectId: z.string().optional().describe("Project ID (defaults to Inbox project if not specified)"),
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

                // Use inbox if no project is specified
                if (!projectId) {
                    if (!inboxId) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Inbox ID not found. Please run login-with-token first or specify a project ID.",
                                },
                            ],
                        };
                    }

                    // Use the stored inbox ID
                    projectId = inboxId;
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
            projectId: z.string().optional().describe("Project ID (defaults to Inbox project if not specified)"),
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

                // Use inbox if no project is specified
                if (!projectId) {
                    if (!inboxId) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Inbox ID not found. Please run login-with-token first or specify a project ID.",
                                },
                            ],
                        };
                    }

                    // Use the stored inbox ID
                    projectId = inboxId;
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
            projectId: z.string().optional().describe("Project ID (defaults to Inbox project if not specified)"),
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

                // Use inbox if no project is specified
                if (!projectId) {
                    if (!inboxId) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Inbox ID not found. Please run login-with-token first or specify a project ID.",
                                },
                            ],
                        };
                    }

                    // Use the stored inbox ID
                    projectId = inboxId;
                }

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
}
