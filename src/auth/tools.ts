// Authentication tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    accessToken,
    v2AccessToken,
    projectsMap,
    tagsMap,
    inboxId
} from '../config';
import { authenticateWithStoredTokens } from './helpers';
import { createJsonResponse, createJsonErrorResponse } from '../utils/response';

// Add authentication tools to the server
export function registerAuthTools(server: McpServer) {
    // Tool to check authentication status
    server.tool(
        "check-auth-status",
        "Check the current authentication status",
        {},
        async () => {
            try {
                // Create a structured status object
                const statusData = {
                    v1Api: {
                        authenticated: !!accessToken,
                        method: "OAuth"
                    },
                    v2Api: {
                        authenticated: !!v2AccessToken
                    },
                    cachedData: {
                        projects: projectsMap.size,
                        tags: tagsMap.size,
                        inboxId: inboxId || null
                    }
                };

                return createJsonResponse(statusData);
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error));
            }
        }
    );

    // Tool to list cached projects and tags
    server.tool(
        "list-cached-data",
        "List all cached projects and tags from the last authentication",
        {},
        async () => {
            try {
                if (!accessToken && !v2AccessToken) {
                    return createJsonResponse(null, false, "Not authenticated. Please login first.");
                }

                // Format projects for display
                const projects = Array.from(projectsMap.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color || null
                }));

                // Format tags for display
                const tags = Array.from(tagsMap.values()).map(t => ({
                    name: t.name,
                    label: t.label,
                    color: t.color || null
                }));

                const cachedData = {
                    inboxId: inboxId || null,
                    projects,
                    tags
                };

                return createJsonResponse(cachedData);
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error));
            }
        }
    );

    // Tool to authenticate with stored tokens
    server.tool(
        "authenticate",
        "Authenticate with stored tokens and fetch project and tag data",
        {},
        async () => {
            try {
                const authResult = await authenticateWithStoredTokens();

                // Extract the text message from the result
                const resultText = authResult.content[0]?.text || "Authentication completed";

                // Create a structured response
                const authData = {
                    v1Api: {
                        authenticated: !!accessToken,
                        method: "OAuth"
                    },
                    v2Api: {
                        authenticated: !!v2AccessToken
                    },
                    cachedData: {
                        projects: projectsMap.size,
                        tags: tagsMap.size,
                        inboxId: inboxId || null
                    }
                };

                return createJsonResponse(authData, true, resultText);
            } catch (error) {
                return createJsonErrorResponse(error instanceof Error ? error : String(error));
            }
        }
    );
}
