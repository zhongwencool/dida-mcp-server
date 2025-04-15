// Authentication helper functions

import fetch from 'node-fetch';
import fs from 'fs';
import {
    API_BASE_URL,
    API_V2_BASE_URL,
    V2_HEADERS,
    CONFIG_FILE,
    accessToken,
    v2AccessToken,
    isOAuthAuth,
    projectsMap,
    tagsMap,
    inboxId,
    setAuthTokens,
    resetCacheData
} from '../config';
import { createJsonResponse, createJsonErrorResponse } from '../utils/response';

// Helper function to get v1 API auth headers (Open API)
export function getAuthHeaders() {
    if (!accessToken) {
        throw new Error('Not authenticated with v1 API');
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
}

// Helper function to get v2 API auth headers
export function getV2AuthHeaders() {
    if (!v2AccessToken) {
        throw new Error('Not authenticated with v2 API');
    }

    return {
        ...V2_HEADERS,
        'Cookie': `t=${v2AccessToken}`
    };
}

// Load tokens from config file
export function loadTokensFromConfig(): boolean {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            let v1TokenLoaded = false;
            let v2TokenLoaded = false;

            // Check if v1 OAuth token is available and not expired
            if (config.access_token && config.expires_at && config.expires_at > Date.now()) {
                setAuthTokens(config.access_token, true, v2AccessToken, config.inboxId);
                v1TokenLoaded = true;
                console.error('Found valid OAuth access token (v1), using it for authentication');
            } else if (config.access_token) {
                console.error('OAuth access token (v1) has expired. Please run "npm run get-token" to obtain a new token.');
            }

            // Check if v2 token is available
            if (config.v2_access_token) {
                setAuthTokens(accessToken, v1TokenLoaded, config.v2_access_token, config.inboxId);
                v2TokenLoaded = true;
                console.error('Found v2 API access token, using it for v2 API calls');
            }

            // Log if inboxId was loaded from config
            if (config.inboxId) {
                console.error(`Found inboxId in config: ${config.inboxId}`);
            }

            return v1TokenLoaded || v2TokenLoaded;
        }
    } catch (error) {
        console.error(`Error loading access tokens: ${error instanceof Error ? error.message : String(error)}`);
    }

    return false;
}

// Authentication with stored tokens
export async function authenticateWithStoredTokens() {
    try {
        // Check if we have any token available
        if ((!accessToken) && !v2AccessToken) {
            return createJsonResponse(null, false, "No access tokens available. Please run the server and make sure you've generated a token using get-access-token.js or configured v2 API token in the config file.");
        }

        let authMessage = '';
        let v2AuthSuccess = false;

        // Create temporary maps for storing data
        const tempProjectsMap = new Map(projectsMap);
        const tempTagsMap = new Map(tagsMap);
        let tempInboxId = inboxId;

        // Try v2 API authentication if token is available
        if (v2AccessToken) {
            try {
                // Use the batch/check API to verify the v2 token works and get project and tag data
                const v2Response = await fetch(`${API_V2_BASE_URL}/batch/check/0`, {
                    method: 'GET',
                    headers: {
                        ...V2_HEADERS,
                        'Cookie': `t=${v2AccessToken}`
                    },
                });

                if (v2Response.ok) {
                    const data = await v2Response.json();

                    // Clear existing data
                    tempProjectsMap.clear();
                    tempTagsMap.clear();
                    tempInboxId = null;

                    // Store project groups data
                    if (data.projectProfiles && Array.isArray(data.projectProfiles)) {
                        data.projectProfiles.forEach((project: any) => {
                            tempProjectsMap.set(project.id, {
                                id: project.id,
                                name: project.name,
                                color: project.color
                            });
                        });
                    }
                    // Add inbox project to projectsMap
                    if (data.inboxId) {
                        tempInboxId = data.inboxId;
                        tempProjectsMap.set(data.inboxId, {
                            id: data.inboxId,
                            name: "Inbox",
                            color: "None"
                        });
                    }

                    // Store tags data
                    if (data.tags && Array.isArray(data.tags)) {
                        data.tags.forEach((tag: any) => {
                            tempTagsMap.set(tag.name, {
                                name: tag.name,
                                rawName: tag.rawName,
                                label: tag.label,
                                color: tag.color
                            });
                        });
                    }

                    v2AuthSuccess = true;
                    authMessage += `Successfully authenticated with v2 API token\n`;
                } else {
                    authMessage += `V2 API authentication failed: ${v2Response.statusText}\n`;
                }
            } catch (v2Error) {
                authMessage += `V2 API authentication error: ${v2Error instanceof Error ? v2Error.message : String(v2Error)}\n`;
            }
        }

        // Try v1 API authentication if token is available and v2 failed
        let v1AuthSuccess = false;
        if (accessToken) {
            try {
                // For v1 API, we'll use the projects endpoint to verify the token
                const v1Response = await fetch(`${API_BASE_URL}/project`, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (v1Response.ok) {
                    // If v2 authentication didn't succeed, we need to populate the projects and tags
                    if (!v2AuthSuccess) {
                        const projects = await v1Response.json();

                        // Clear existing data if v2 didn't already populate it
                        tempProjectsMap.clear();
                        tempTagsMap.clear();
                        tempInboxId = null;

                        // Store project data
                        projects.forEach((project: any) => {
                            tempProjectsMap.set(project.id, {
                                id: project.id,
                                name: project.name,
                                color: project.color
                            });

                            // Add inbox project to projectsMap
                            if (inboxId) {
                                tempInboxId = inboxId;
                                tempProjectsMap.set(inboxId, {
                                    id: inboxId,
                                    name: "Inbox",
                                    color: "None"
                                });
                            };
                        });
                    }

                    v1AuthSuccess = true;
                    authMessage += `Successfully authenticated with v1 API token\n`;
                } else {
                    authMessage += `V1 API authentication failed: ${v1Response.statusText}\n`;
                }
            } catch (v1Error) {
                authMessage += `V1 API authentication error: ${v1Error instanceof Error ? v1Error.message : String(v1Error)}\n`;
            }
        }

        // Check if any authentication method succeeded
        if (!v1AuthSuccess && !v2AuthSuccess) {
            return createJsonResponse(null, false, `Authentication failed with all available methods:\n${authMessage}`);
        }

        // Update the global state with our temporary maps
        resetCacheData();
        tempProjectsMap.forEach((project, id) => {
            projectsMap.set(id, project);
        });
        tempTagsMap.forEach((tag, name) => {
            tagsMap.set(name, tag);
        });
        if (tempInboxId) {
            setAuthTokens(accessToken, isOAuthAuth, v2AccessToken, tempInboxId);

            // Save inboxId to config file
            try {
                let config: Record<string, any> = {};
                if (fs.existsSync(CONFIG_FILE)) {
                    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
                }
                config.inboxId = tempInboxId;
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
                console.error(`Saved inboxId to config: ${tempInboxId}`);
            } catch (error) {
                console.error(`Error saving inboxId to config: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Create a structured response with authentication results
        const authData = {
            v1Api: {
                authenticated: v1AuthSuccess,
                method: "OAuth"
            },
            v2Api: {
                authenticated: v2AuthSuccess
            },
            cachedData: {
                projects: tempProjectsMap.size,
                tags: tempTagsMap.size,
                inboxId: tempInboxId || null
            }
        };

        return createJsonResponse(authData, true, `${authMessage}Found ${tempProjectsMap.size} projects and ${tempTagsMap.size} tags\nInbox ID: ${tempInboxId || 'Not found'}`);
    } catch (error) {
        return createJsonErrorResponse(error instanceof Error ? error : String(error), "Authentication failed");
    }
}
