// Project management tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fetch from 'node-fetch';
import { API_BASE_URL, accessToken } from '../config';
import { getAuthHeaders } from '../auth/helpers';
import { updateProjectCache } from '../resources/cached-data';
import { createJsonResponse, createJsonErrorResponse } from '../utils/response';

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
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
                }

                const success = await updateProjectCache();

                if (success) {
                    return createJsonResponse({ refreshed: true }, true, "Project cache refreshed successfully.");
                } else {
                    return createJsonResponse({ refreshed: false }, false, "Failed to refresh project cache. Check server logs for details.");
                }
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error), "Error refreshing project cache");
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
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
                }

                const response = await fetch(`${API_BASE_URL}/project`, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    return createJsonResponse(null, false, `Failed to get projects: ${response.statusText}`);
                }

                const projects = await response.json();

                // Update the project cache
                await updateProjectCache();

                return createJsonResponse(projects);
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error), "Error listing projects");
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
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
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
                    return createJsonResponse(null, false, `Failed to create project: ${response.statusText}`);
                }

                const project = await response.json();

                // Update the project cache after creating a new project
                await updateProjectCache();

                return createJsonResponse(project, true, "Project created successfully");
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error), "Error creating project");
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
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
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
                    return createJsonResponse(null, false, `Failed to update project: ${response.statusText}`);
                }

                const project = await response.json();

                // Update the project cache after updating a project
                await updateProjectCache();

                return createJsonResponse(project, true, "Project updated successfully");
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error), "Error updating project");
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
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
                }

                const response = await fetch(`${API_BASE_URL}/project/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    return createJsonResponse(null, false, `Failed to delete project: ${response.statusText}`);
                }

                // Update the project cache after deleting a project
                await updateProjectCache();

                return createJsonResponse({ id }, true, `Project with ID ${id} deleted successfully`);
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error), "Error deleting project");
            }
        }
    );
}
