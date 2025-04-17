#!/usr/bin/env node

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

// Register the inbox processing prompt
server.prompt(
    "process-inbox",
    "Process and organize tasks in your TickTick inbox according to GTD principles",
    {},
    async () => {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `请帮我处理滴答清单收件箱中的任务，按照GTD方法论进行整理：
1. 使用list-cached-data工具获取项目列表(projectId)和标签数据
2. 使用list-tasks工具获取收件箱中的所有任务(taskId)
3. 批量处理任务:
   3.1 使用batch-update-tasks工具批量更新任务，确保符合SMART原则（具体、可测量、可实现、可执行、有时限）:
     3.1.1 优化任务title: 确保任务以动词开头，清晰具体
     3.1.2 重写任务content: 确保任务描述清晰具体, 将模糊的描述改为具体的行动步骤。
     3.1.3 设置任务优先级priority(0-5): 根据重要性和紧急性设置任务优先级
     3.1.4 添加相关标签tags: 根据任务特点添加情境标签,比如"高精力,programming"
   3.2 使用batch-move-tasks工具根据任务性质将其批量分配到已存在的合适项目中。
4. 提供处理摘要：总结处理了多少任务，如何分类，添加了哪些标签，设置了哪些优先级，以及任何需要用户进一步澄清的事项。
`
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
                try {
                    const jsonResponse = JSON.parse(result.content[0].text);
                    console.error(jsonResponse.message || 'Authentication completed successfully');
                } catch (e) {
                    console.error(result.content[0].text);
                }
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
