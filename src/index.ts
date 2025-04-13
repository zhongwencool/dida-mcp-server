import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { systemPrompt } from './systemPrompt';
import {
    authenticateWithStoredTokens,
    registerAuthTools,
    loadTokensFromConfig
} from './auth';
import { registerTaskTools } from './tasks';
import { registerProjectTools } from './projects';
import { registerCachedDataResource } from './resources/cached-data';

// Create server instance
const server = new McpServer({
    name: "dida-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},  // Enable resources capability
        tools: {},
        prompts: {},
    }
});

// Register resources
registerCachedDataResource(server);

// Import authentication state from config
import {
    accessToken,
    isOAuthAuth,
    v2AccessToken
} from './config';

// Load tokens from config file
loadTokensFromConfig();

// Register all tools
registerAuthTools(server);
registerTaskTools(server);
registerProjectTools(server);

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
    console.error("=== Dida MCP Server ===");
    console.error("Server is running and ready to process requests via stdio");
    console.error("This server provides tools to interact with TickTick/Dida365 tasks and projects");
    console.error("----------------------------");

    // Show authentication status for both APIs
    console.error("Authentication Status:");

    if (isOAuthAuth && accessToken) {
        console.error("✅ V1 API (OAuth): Authenticated - Open API access is available");
    } else {
        console.error("❌ V1 API (OAuth): Not authenticated - Open API features will not work");
    }

    if (v2AccessToken) {
        console.error("✅ V2 API (Username/Password): Authenticated - Full API access is available");
    } else {
        console.error("❌ V2 API (Username/Password): Not authenticated - Some features may be limited");
    }

    // Authentication instructions if needed
    if (!isOAuthAuth || !accessToken || !v2AccessToken) {
        console.error("\n📋 Authentication Instructions:");
        console.error("To authenticate with both API methods, run the following command:");
        console.error("  npm run get-token");
        console.error("This will guide you through the authentication process for both APIs.");
        console.error("Having both authentication methods provides the most complete functionality.");
    }

    // Automatically authenticate with stored tokens
    if ((isOAuthAuth && accessToken) || v2AccessToken) {
        console.error("\n🔄 Initializing connection to TickTick/Dida365...");
        try {
            const result = await authenticateWithStoredTokens();
            if (result.content && result.content.length > 0 && result.content[0].text) {
                console.error(result.content[0].text);
            }
            console.error("\n✨ Server is ready to use! Connect with your MCP client to begin.");
        } catch (error) {
            console.error(`❌ Authentication error: ${error instanceof Error ? error.message : String(error)}`);
            console.error("Please check your configuration and try again.");
        }
    } else {
        console.error("\n⚠️ No valid authentication tokens found. Limited functionality available.");
        console.error("Please authenticate first for full functionality.");
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
