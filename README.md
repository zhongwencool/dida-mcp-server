# 滴答清单 MCP Server (Dida MCP Server)

一个用于滴答清单（TickTick）的 Model Context Protocol (MCP) 服务器，提供项目、任务和标签管理功能。该服务器与官方滴答清单 API 集成，通过 MCP 工具提供无缝的任务管理体验。

## 功能特点

- **OAuth认证**：使用安全的OAuth访问令牌登录到您的滴答清单账户
- **项目管理**：列出、创建、更新和删除项目
- **任务管理**：列出、创建、完成和删除任务
- **标签管理**：在创建或更新任务时添加标签
- **MCP 集成**：通过 MCP 工具暴露所有功能

## 系统要求

- Node.js 18.x 或更高版本
- npm 或 yarn
- 滴答清单账户

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/dida-mcp-server.git
cd dida-mcp-server

# 安装依赖
npm install
```

## 构建

```bash
# 构建 TypeScript 代码
npm run build
```

## 运行

### 使用 OAuth 访问令牌认证

滴答清单使用 OAuth 2.0 访问令牌进行认证。这是一种安全的认证方式，不需要在客户端中存储您的密码。

```bash
# 第一步：构建项目
npm run build

# 第二步：获取访问令牌
npm run get-token

# 第三步：启动服务器
npm start
```

然后使用 `login-with-token` 工具完成认证。

#### OAuth 授权流程

当您运行 `npm run get-token` 时，程序会：

1. 要求您输入 Client ID 和 Client Secret
2. 启动一个本地 HTTP 服务器（在端口 3000 上）来接收授权回调
3. 自动打开浏览器，将您定向到滴答清单的授权页面
4. 当您授权应用后，滴答清单会将您重定向到本地服务器，并自动捕获授权码
5. 使用授权码获取访问令牌
6. 将访问令牌保存到配置文件中（`~/.dida-mcp-config.json`）

整个过程是自动化的，您只需要在浏览器中授权应用。

#### 获取 Client ID 和 Client Secret

要获取 Client ID 和 Client Secret，您需要在滴答清单开发者平台上创建一个应用：

1. 访问 [https://developer.dida365.com/](https://developer.dida365.com/)
2. 注册并登录
3. 创建一个新应用
4. 在应用设置中，添加重定向 URI：`http://localhost:3000/oauth/callback`
5. 获取 Client ID 和 Client Secret

## MCP 服务器配置

### 服务器设置

服务器使用 `@modelcontextprotocol/sdk` 包创建，主要配置如下：

```typescript
// 创建服务器实例
const server = new McpServer({
  name: "dida-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 连接到标准输入/输出传输
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dida MCP Server running on stdio");
  console.error("Use the 'login' tool to authenticate with TickTick before using other tools");
}
```

### 环境变量

服务器不需要任何环境变量，但您可以根据需要添加以下可选环境变量：

- `DEBUG=1`：启用调试日志
- `API_BASE_URL`：自定义 API 基础 URL（默认为 `https://api.dida365.com/api/v2`）

### 与其他 MCP 客户端集成

滴答清单 MCP 服务器完全兼容标准的 MCP 配置方式。您可以通过以下两种方式之一使用它：

#### 方式一：使用 MCP 配置文件（推荐）

在您的 MCP 客户端配置文件（通常是 `.mcp.json`）中添加以下配置：

##### 使用 OAuth 访问令牌认证

```json
{
    "mcpServers": {
        "dida": {
            "command": "node",
            "args": [
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/dida-mcp-server/build/index.js"
            ]
        }
    }
}
```

请将路径替换为您系统上的实际路径。这样配置后，您可以直接在 MCP 客户端中使用 `dida` 服务器。

##### 在不同客户端中使用示例

###### Claude

如果您使用 Claude，可以在 `~/.config/anthropic/claude.json` 文件中添加以下配置：

**使用 OAuth 访问令牌认证：**

```json
{
  "mcpServers": {
    "dida-oauth": {
      "command": "node",
      "args": [
        "/Users/yourusername/path/to/dida-mcp-server/build/index.js"
      ]
    }
  }
}
```

然后在 Claude 中使用以下命令来调用滴答清单服务器：

```
/mcp dida-oauth  # OAuth 访问令牌认证
```

###### OpenAI GPT

如果您使用 OpenAI 的 GPT，可以在 `.mcp.json` 文件中添加类似的配置，然后使用 OpenAI 的 Actions 功能来集成。

在 OpenAI 的 GPT 中，您可以创建一个自定义 GPT，并在其中添加滴答清单 MCP 服务器作为一个 Action。

###### Augment

如果您使用 Augment，可以在 Augment 的配置中添加滴答清单 MCP 服务器。在 Augment 的设置中，导航到 MCP 服务器部分，然后添加滴答清单服务器的配置。

这将启动滴答清单 MCP 服务器并将其连接到您的 AI 助手。然后您可以要求助手使用滴答清单的功能，例如：“请登录我的滴答清单账户并列出我的所有项目”。

#### 方式二：手动启动服务器

如果您想手动启动服务器，可以按照以下步骤操作：

1. 启动服务器：`npm start`
2. 将服务器的标准输入/输出连接到客户端
3. 使用客户端调用服务器提供的工具

## API 参考

服务器暴露以下 MCP 工具：

### 认证

| 工具 | 描述 | 参数 |
|------|-------------|------------|
| `login-with-token` | 使用 OAuth 访问令牌登录到滴答清单 | 无（需要先运行 `npm run get-token` 并使用 `--token-auth` 启动服务器） |

### 项目管理

| 工具 | 描述 | 参数 |
|------|-------------|------------|
| `list-projects` | 列出所有项目 | 无 |
| `create-project` | 创建新项目 | `name`: 项目名称<br>`color`: (可选) 项目颜色（十六进制格式） |
| `update-project` | 更新现有项目 | `id`: 项目 ID<br>`name`: (可选) 项目名称<br>`color`: (可选) 项目颜色（十六进制格式） |
| `delete-project` | 删除项目 | `id`: 项目 ID |

### 任务管理

| 工具 | 描述 | 参数 |
|------|-------------|------------|
| `list-tasks` | 列出所有任务 | `projectId`: (可选) 按项目 ID 筛选任务 |
| `create-task` | 创建新任务 | `title`: 任务标题<br>`content`: (可选) 任务内容/描述<br>`priority`: (可选) 任务优先级 (0-5)<br>`dueDate`: (可选) 任务截止日期 (ISO 格式)<br>`projectId`: (可选) 项目 ID<br>`tags`: (可选) 逗号分隔的标签列表 |
| `update-task` | 更新现有任务 | `id`: 任务 ID<br>`projectId`: 项目 ID<br>`title`: (可选) 任务标题<br>`content`: (可选) 任务内容/描述<br>`priority`: (可选) 任务优先级 (0-5)<br>`dueDate`: (可选) 任务截止日期 (ISO 格式)<br>`startDate`: (可选) 任务开始日期 (ISO 格式)<br>`isAllDay`: (可选) 是否为全天任务<br>`tags`: (可选) 逗号分隔的标签列表 |
| `complete-task` | 将任务标记为已完成 | `id`: 任务 ID |
| `delete-task` | 删除任务 | `id`: 任务 ID<br>`projectId`: 项目 ID |

### 标签管理

标签管理功能已集成到任务创建和更新工具中。在创建或更新任务时，可以使用 `tags` 参数指定逗号分隔的标签列表。

## 技术实现细节

### 项目结构

```
dida-mcp-server/
├── src/
│   ├── index.ts         # 主服务器实现
│   └── types/
│       └── index.ts     # 类型定义
├── tests/
│   ├── mcp-server.test.ts      # MCP 服务器测试
│   └── ticktick-api.test.ts    # 滴答清单 API 测试
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### 依赖项

主要依赖项包括：

- `@modelcontextprotocol/sdk`: MCP 服务器实现
- `node-fetch`: 用于 HTTP 请求
- `uuid`: 生成唯一 ID
- `zod`: 参数验证

### 实现注意事项

- 服务器直接与官方滴答清单 API 集成
- 在使用其他工具之前需要进行身份验证
- 所有数据都存储在您的滴答清单账户中
- 通过 MCP 服务器进行的更改将反映在滴答清单应用程序中
- 服务器使用标准输入/输出进行通信，便于与其他 MCP 客户端集成
- 服务器使用特定的请求头（User-Agent 和 x-device）模拟浏览器行为，确保与滴答清单 API 的兼容性

## 使用示例

以下是如何使用 MCP 服务器与客户端的示例：

```typescript
// 登录到滴答清单
await client.callTool("login", {
  username: "your-username",
  password: "your-password"
});

// 创建项目
const projectResult = await client.callTool("create-project", {
  name: "工作任务",
  color: "#FF0000"
});

const project = JSON.parse(projectResult.content[0].text.split("\n")[1]);

// 在项目中创建带有标签的任务
await client.callTool("create-task", {
  title: "完成季度报告",
  content: "完成第三季度财务报告",
  priority: 3,
  dueDate: "2023-10-15T00:00:00Z",
  projectId: project.id,
  tags: "紧急,工作"
});

// 列出项目中的所有任务
const tasksResult = await client.callTool("list-tasks", {
  projectId: project.id
});

const tasks = JSON.parse(tasksResult.content[0].text);
const task = tasks[0];

// 更新任务并添加标签
await client.callTool("update-task", {
  id: task.id,
  projectId: task.projectId,
  title: task.title + " (已更新)",
  priority: 5,
  tags: "紧急,重要,季度报告"
});

console.log(tasksResult.content[0].text);
```

## 测试

```bash
# 运行所有测试
npm test

# 以监视模式运行测试
npm run test:watch
```

测试使用 Jest 框架，并模拟 API 调用以避免实际的网络请求。

## 故障排除

### 常见问题

1. **认证失败**：确保您的用户名和密码正确。如果使用第三方登录，您需要在滴答清单网站上设置密码。

2. **API 限制**：滴答清单 API 可能有请求限制，如果遇到 429 错误，请减少请求频率。

3. **连接问题**：确保您的网络可以访问 `api.dida365.com`。

### 调试

启用调试日志以获取更多信息：

```bash
DEBUG=1 npm start
```

## 参考资料

本实现基于以下滴答清单 API 文档：
- [GalaxyXieyu/dida_api](https://github.com/GalaxyXieyu/dida_api)
- [luke1879012/dida_api](https://github.com/luke1879012/dida_api)

## 许可证

ISC
