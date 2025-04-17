# Dida MCP Server

A Model Context Protocol (MCP) server for interacting with TickTick/Dida365 task management service. This server provides tools to manage tasks, projects, and tags through the TickTick API.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Overview

Dida MCP Server is built on the [Model Context Protocol](https://modelcontextprotocol.io/) framework, enabling AI assistants to interact with your TickTick/Dida365 account. It provides a comprehensive set of tools for task and project management, allowing AI assistants to help organize your tasks according to GTD (Getting Things Done) principles.

## Features

- **Authentication**: OAuth-based authentication with TickTick/Dida365 API
- **Task Management**: Create, read, update, delete, and move tasks
- **Project Management**: Create, read, update, and delete projects
- **Batch Operations**: Efficiently manage multiple tasks at once
- **GTD Assistant**: Built-in system prompt for GTD-based task organization
- **Cached Data**: Efficient caching of projects and tags data

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- TickTick/Dida365 account
- Client ID and Client Secret from [Dida365 Developer Center](https://developer.dida365.com/manage) (for OAuth authentication)

## Installation

### Option 1: Install from npm (Recommended)

```bash
# Install globally
npm install -g dida-mcp-server

# Or install locally in your project
npm install dida-mcp-server
```

### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/zhongwencool/dida-mcp-server.git
cd dida-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Authentication

Before using the server, you need to authenticate with TickTick/Dida365. The server supports two authentication methods:

1. **OAuth Authentication (V1 API)**: Uses the Dida365 Open API with OAuth tokens
2. **Username/Password Authentication (V2 API)**: Uses the internal API with session tokens

### Using get-access-token

The `get-access-token` script handles the authentication process for both API versions. To use it:

```bash
# If installed globally
dida-get-token

# If installed locally or from source
npm run get-token
```

The script will:

1. Prompt you for your TickTick/Dida365 username and password (for V2 API)
2. Prompt you for your [Client ID and Client Secret](https://developer.dida365.com/manage) ([for V1 API OAuth])
3. Start a local server on port 3000 to handle the OAuth callback
4. Open your browser to authorize the application
5. Exchange the authorization code for an access token
6. Store both tokens in the configuration file at `~/.dida-mcp-config.json`
7. Display a success page with token information and MCP server configuration

#### Prerequisites for OAuth Authentication

To use OAuth authentication, you need to:

1. Register your application in the Dida365 Developer Center
2. Set your redirect URI to `http://localhost:3000/oauth/callback`
3. Obtain a Client ID and Client Secret

#### Configuration File

The authentication process creates a configuration file at `~/.dida-mcp-config.json` with the following structure:

```json
{
  "access_token": "your-v1-oauth-token",
  "refresh_token": "your-refresh-token",
  "expires_at": 1234567890000,
  "token_type": "bearer",
  "v2_access_token": "your-v2-session-token",
  "inboxId": "your-inbox-project-id"
}
```

This file is automatically detected and used by the server when it starts.

## Usage

### Starting the Server

```bash
# If installed globally
dida-mcp-server

# If installed locally or from source
npm start
```

The server will automatically attempt to authenticate using stored tokens and display the authentication status.

### Connecting with an MCP Client

You can connect to the server using any MCP-compatible client. The server provides a configuration that can be added to your MCP client configuration:

```json
{
  "mcpServers": {
    "dida": {
      "command": "dida-mcp-server"
    }
  }
}
```

Or if you installed it locally:

```json
{
  "mcpServers": {
    "dida": {
      "command": "node",
      "args": [
        "/path/to/node_modules/dida-mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Available Tools

### Authentication Tools

- `check-auth-status`: Check the current authentication status

### Project Management Tools

- `list-projects`: Get all projects
- `create-project`: Create a new project
- `update-project`: Update an existing project
- `delete-project`: Delete a project
- `refresh-project-cache`: Manually refresh the project cache

### Task Management Tools

- `list-tasks`: Get tasks from a project (defaults to inbox)
- `create-task`: Create a new task
- `get-task`: Get a specific task by ID
- `update-task`: Update a task
- `batch-update-tasks`: Update multiple tasks at once
- `complete-task`: Mark a task as completed
- `delete-task`: Delete a task
- `batch-delete-tasks`: Delete multiple tasks at once
- `move-task`: Move a task to a different project
- `batch-move-tasks`: Move multiple tasks to different projects

### Data Query Tools

- `list-cached-data`: View cached projects and tags data

## System Prompts

The server includes two built-in prompts:

1. **GTD Assistant Prompt**: A system prompt that provides guidance on using the tools to implement GTD methodology
2. **Process Inbox Prompt**: A user-level prompt that helps organize tasks in the inbox according to GTD principles

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server in watch mode, automatically recompiling and restarting when changes are made.

### Running Tests

```bash
npm test
```

Or to run tests in watch mode:

```bash
npm run test:watch
```

## Project Structure

```
├── dist/              # Compiled JavaScript files
├── src/
│   ├── auth/           # Authentication-related code
│   ├── projects/       # Project management tools
│   ├── resources/      # Resource definitions (cached data)
│   ├── tasks/          # Task management tools
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── config.ts       # Configuration management
│   ├── get-access-token.ts  # Token acquisition script
│   ├── index.ts        # Main server entry point
│   └── systemPrompt.ts # GTD assistant system prompt
├── tests/              # Test files
├── package.json        # Project metadata and dependencies
├── LICENSE             # ISC License file
└── tsconfig.json      # TypeScript configuration
```

## API Documentation

This project uses the Dida365 Open API. For more information, see the [Dida365 Open API Documentation](./Dida365%20Open%20API.md).

## License

ISC

## Publishing to NPM

To publish the package to NPM, follow these steps:

```bash
# Login to npm (if not already logged in)
npm login

# Build the project
npm run build

# Test the package
npm test

# Publish to npm
npm publish
```

To update the package:

1. Update the version in `package.json`
2. Run `npm publish`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework
- [TickTick/Dida365](https://dida365.com/) for the task management service
