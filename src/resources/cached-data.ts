import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectsMap, tagsMap, inboxId } from '../config';
import fetch from 'node-fetch';
import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../auth/helpers';

// Global reference to the server instance for cache updates
let serverInstance: McpServer | null = null;

// Function to update the project cache from the API
export async function updateProjectCache(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/project`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.error(`Failed to update project cache: ${response.statusText}`);
            return false;
        }

        const projects = await response.json();
        projectsMap.clear();

        projects.forEach((project: any) => {
            projectsMap.set(project.id, {
                id: project.id,
                name: project.name,
                color: project.color
            });

        });

        // Add inbox project to projectsMap
        if (inboxId) {
            projectsMap.set(inboxId, {
                id: inboxId,
                name: "Inbox",
                color: "None"
            });
        };

        // Notify resource subscribers if server is available
        if (serverInstance) {
            // This will trigger a notification to clients that the resource has changed
            serverInstance.server.sendResourceListChanged();
        }

        return true;
    } catch (error) {
        console.error(`Error updating project cache: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

export function registerCachedDataResource(server: McpServer) {
    // Store server instance for later use
    serverInstance = server;

    // Register the resource
    server.resource(
        "cached-projects-and-tags",
        "dida://cached/projects-and-tags",
        {
            description: "Currently cached projects and tags data from TickTick",
            mimeType: "application/json"
        },
        async (uri) => {
            const cachedData = {
                projects: Array.from(projectsMap.values()),
                inboxId,
                tags: Array.from(tagsMap.values())
            };

            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(cachedData, null, 2)
                    }
                ]
            };
        }
    );
}
