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

// Add authentication tools to the server
export function registerAuthTools(server: McpServer) {
    // Tool to check authentication status
    server.tool(
        "check-auth-status",
        "Check the current authentication status",
        {},
        async () => {
            try {
                let statusMessage = "Authentication Status:\n";

                // Check v1 API status
                if (accessToken) {
                    statusMessage += "✅ V1 API (OAuth): Authenticated\n";
                } else {
                    statusMessage += "❌ V1 API (OAuth): Not authenticated\n";
                }

                // Check v2 API status
                if (v2AccessToken) {
                    statusMessage += "✅ V2 API: Authenticated\n";
                } else {
                    statusMessage += "❌ V2 API: Not authenticated\n";
                }

                // Add project and tag info if available
                statusMessage += `\nCached data:\n- Projects: ${projectsMap.size}\n- Tags: ${tagsMap.size}\n- Inbox ID: ${inboxId || 'Not found'}`;

                return {
                    content: [
                        {
                            type: "text",
                            text: statusMessage
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error checking authentication status: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
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
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Not authenticated. Please login first.",
                            },
                        ],
                    };
                }

                // Format projects for display
                const projects = Array.from(projectsMap.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color || 'None'
                }));

                // Format tags for display
                const tags = Array.from(tagsMap.values()).map(t => ({
                    name: t.name,
                    label: t.label,
                    color: t.color || 'None'
                }));

                return {
                    content: [
                        {
                            type: "text",
                            text: `Inbox ID: ${inboxId || 'Not found'}\n\nCached Projects (${projects.length}):\n${JSON.stringify(projects, null, 2)}\n\nCached Tags (${tags.length}):\n${JSON.stringify(tags, null, 2)}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error listing cached data: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
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
                // Ensure the content array has the correct type structure
                return {
                    content: authResult.content.map(item => ({
                        type: "text" as const,
                        text: item.text
                    }))
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `Authentication error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
    );
}
