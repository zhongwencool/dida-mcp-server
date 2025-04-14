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
        "Retrieves and displays all tasks from a specified project. If no project is provided, tasks from the default Inbox project will be shown. The response includes task details such as ID, title, content, due date, priority, tags, and completion status.",
        {
            projectId: z.string().optional().describe("The unique identifier of the project to list tasks from. If not provided, tasks from the default Inbox project will be shown."),
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
        "Creates a new task in TickTick with specified attributes. You can set title, content, priority (0-5), due date, project, and tags. If no project is specified, the task will be created in the Inbox. Tags should be provided as a comma-separated list without # symbols. Returns the created task details including its assigned ID.",
        {
            title: z.string().min(1).max(200).describe("The title of the task (1-200 characters). This is the primary identifier visible in task lists."),
            content: z.string().max(2000).optional().describe("Detailed description or notes for the task (up to 2000 characters). Supports plain text format."),
            priority: z.number().min(0).max(5).optional().describe("Task priority level: 0 (none), 1 (low), 3 (medium), 5 (high). Default is 0 if not specified."),
            dueDate: z.string().datetime().optional().describe("The deadline for the task in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ). If not specified, no due date will be set."),
            projectId: z.string().optional().describe("The unique identifier of the project to add the task to. If not provided, the task will be created in the Inbox project."),
            tags: z.string().optional().describe("Comma-separated list of tags to associate with the task (e.g., 'work,important,meeting'). Do not include # symbols."),
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
                    newTask.tags = tags.split(',').map(tag => tag.trim().replace(/^#/, ''));
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
        "Marks a task as completed in TickTick. This tool automatically finds the project containing the task, so you only need to provide the task ID. The task will be moved to the completed/archived section in TickTick and will no longer appear in active task lists. This action cannot be undone through the API.",
        {
            id: z.string().describe("The unique identifier of the task to mark as completed. This ID is assigned by TickTick when the task is created."),
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
        "Updates an existing task in TickTick with new attributes. You can modify any combination of title, content, priority, due date, start date, all-day status, and tags. Only the specified fields will be updated; others remain unchanged. Tags should be provided as a comma-separated list without # symbols. Returns the updated task with all its current attributes.",
        {
            id: z.string().describe("The unique identifier of the task to update. This ID is assigned by TickTick when the task is created."),
            projectId: z.string().optional().describe("The unique identifier of the project containing the task. If not provided, the Inbox project will be used."),
            title: z.string().min(1).max(200).optional().describe("New title for the task (1-200 characters). If not provided, the existing title will be kept."),
            content: z.string().max(2000).optional().describe("New detailed description or notes for the task (up to 2000 characters). If not provided, the existing content will be kept."),
            priority: z.number().min(0).max(5).optional().describe("New priority level: 0 (none), 1 (low), 3 (medium), 5 (high). If not provided, the existing priority will be kept."),
            dueDate: z.string().datetime().optional().describe("New deadline for the task in ISO 8601 format. To remove an existing due date, use an empty string."),
            startDate: z.string().datetime().optional().describe("New start date for the task in ISO 8601 format. Useful for tasks that span multiple days or have a specific start time."),
            isAllDay: z.boolean().optional().describe("Set to true for tasks that are all-day events without a specific time. Affects how due dates are displayed in TickTick."),
            tags: z.string().optional().describe("New comma-separated list of tags (e.g., 'work,important,meeting'). Replaces all existing tags. To remove all tags, provide an empty string."),
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
                    updateData.tags = tags ? tags.split(',').map(tag => tag.trim().replace(/^#/, '')) : [];
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
        "Retrieves detailed information about a specific task by its ID. You must provide the project ID containing the task, or it will default to searching in the Inbox. The response includes all task attributes such as title, content, creation time, modification time, due date, priority, tags, completion status, and any custom fields.",
        {
            id: z.string().describe("The unique identifier of the task to retrieve. This ID is assigned by TickTick when the task is created."),
            projectId: z.string().optional().describe("The unique identifier of the project containing the task. If not provided, the Inbox project will be used."),
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
        "Permanently removes a task from TickTick. You must provide the task ID and optionally the project ID (defaults to Inbox if not specified). This action cannot be undone, and all task data including content, due dates, and tags will be permanently deleted. Use with caution.",
        {
            id: z.string().describe("The unique identifier of the task to delete. This ID is assigned by TickTick when the task is created."),
            projectId: z.string().optional().describe("The unique identifier of the project containing the task. If not provided, the Inbox project will be used."),
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

    server.tool(
        "move-task",
        "Moves a task from one project to another in TickTick. You must specify the task ID, source project ID, and destination project ID. This tool preserves all task attributes including title, content, due date, priority, and tags while changing only its project association. This operation requires v2 API authentication.",
        {
            taskId: z.string().describe("The unique identifier of the task to move. This ID is assigned by TickTick when the task is created."),
            fromProjectId: z.string().describe("The unique identifier of the source project where the task is currently located."),
            toProjectId: z.string().describe("The unique identifier of the destination project where the task should be moved to."),
        },
        async ({ taskId, fromProjectId, toProjectId }) => {
            try {
                // Check if v2 token is available (required for this endpoint)
                if (!v2AccessToken) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Not authenticated with v2 API. Please login with a v2 token first.",
                            },
                        ],
                    };
                }

                // Prepare the request payload
                const moveRequest = [
                    {
                        taskId: taskId,
                        fromProjectId: fromProjectId,
                        toProjectId: toProjectId
                    }
                ];

                // Call the batch/taskProject endpoint
                const response = await fetch(`${API_V2_BASE_URL}/batch/taskProject`, {
                    method: 'POST',
                    headers: getV2AuthHeaders(),
                    body: JSON.stringify(moveRequest),
                });

                if (!response.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to move task: ${response.statusText}`,
                            },
                        ],
                    };
                }

                const result = await response.json();

                // Check for errors in the response
                if (result.id2error && Object.keys(result.id2error).length > 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to move task: ${JSON.stringify(result.id2error)}`,
                            },
                        ],
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Task moved successfully from project ${fromProjectId} to project ${toProjectId}\nResponse: ${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error moving task: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
    );
}
