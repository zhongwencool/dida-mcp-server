// Project management tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fetch from 'node-fetch';
import { API_BASE_URL, accessToken } from '../config';
import { getAuthHeaders } from '../auth/helpers';
import { updateProjectCache } from '../resources/cached-data';

// Register project management tools
export function registerProjectTools(server: McpServer) {
    // Tool to manually refresh the project cache
    server.tool(
        "refresh-project-cache",
        "Manually refresh the project cache from the API",
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

                const success = await updateProjectCache();

                if (success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Project cache refreshed successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Failed to refresh project cache. Check server logs for details.",
                            },
                        ],
                    };
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error refreshing project cache: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
    );
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

                // Update the project cache
                await updateProjectCache();

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

                // Update the project cache after creating a new project
                await updateProjectCache();

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

                // Update the project cache after deleting a project
                await updateProjectCache();

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
}
