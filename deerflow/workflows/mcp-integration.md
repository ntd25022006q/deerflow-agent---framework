# Deerflow MCP Integration Guide

> **Model Context Protocol (MCP) Integration for Agent Capabilities**
> This document defines how Deerflow agents integrate with MCP servers to extend
> their capabilities beyond core file operations. MCP provides a standardized
> protocol for connecting agents to external tools, data sources, and services.

---

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [MCP Tools: When to Use What](#mcp-tools-when-to-use-what)
3. [MCP Server Configuration](#mcp-server-configuration)
4. [Tool Registration Protocol](#tool-registration-protocol)
5. [Tool Invocation Rules](#tool-invocation-rules)
6. [MCP Tool Directory](#mcp-tool-directory)
7. [Custom MCP Tool Development](#custom-mcp-tool-development)
8. [MCP Debugging and Logging](#mcp-debugging-and-logging)
9. [MCP Security Considerations](#mcp-security-considerations)

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI agents to
interact with external tools, data sources, and services through a unified interface.
In the Deerflow framework, MCP serves as the extensibility layer that allows agents
to go beyond file read/write operations.

### Core Concepts

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Deerflow   │         │   MCP Protocol   │         │   MCP Server    │
│   Agent      │────────▶│   (JSON-RPC)     │────────▶│   (Tool Host)   │
│              │◀────────│                  │◀────────│                 │
└─────────────┘         └──────────────────┘         └─────────────────┘
       │                                                    │
       │              Tool Invocation Flow                   │
       │                                                    │
       ▼                                                    ▼
  Agent decides        1. Agent sends tool request         External system
  a tool is needed     2. Server validates request         (filesystem,
                       3. Server executes tool             database,
                       4. Server returns result            API, etc.)
                       5. Agent processes result
```

### MCP Architecture in Deerflow

- **Agent Layer**: The Deerflow agent decides when and how to use MCP tools.
- **Protocol Layer**: JSON-RPC 2.0 communication between agent and MCP servers.
- **Server Layer**: MCP servers host tools that interact with external systems.
- **Tool Layer**: Individual tools within servers that perform specific operations.

---

## MCP Tools: When to Use What

### Tool Selection Decision Tree

```
What does the agent need to do?
│
├── Read/Write files
│   ├── Local filesystem → Use built-in Read/Write tools (NOT MCP)
│   └── Remote filesystem → Use MCP filesystem server
│
├── Search codebase
│   ├── Pattern search → Use built-in Grep/Glob tools (NOT MCP)
│   └── Semantic search → Use MCP semantic search tool
│
├── Execute commands
│   ├── Shell commands → Use built-in Bash tool (NOT MCP)
│   └── Remote execution → Use MCP SSH/remote server
│
├── Database operations
│   └── → Use MCP database server (PostgreSQL, MySQL, SQLite, etc.)
│
├── Web operations
│   ├── Fetch web page content → Use MCP web reader
│   ├── Search the web → Use MCP web search
│   └── Browse web pages → Use MCP browser automation
│
├── API interactions
│   ├── REST APIs → Use MCP HTTP client
│   ├── GraphQL → Use MCP GraphQL client
│   └── Third-party APIs → Use specific MCP integrations
│
├── Version control
│   ├── Basic git operations → Use built-in Bash tool
│   └── Advanced git workflows → Use MCP Git server
│
├── Communication
│   ├── Send notifications → Use MCP notification server
│   └── Post messages → Use MCP Slack/Discord/email servers
│
└── Specialized operations
    ├── Image generation → Use MCP image generation server
    ├── LLM calls → Use MCP LLM server
    ├── Code execution → Use MCP sandbox server
    └── File conversion → Use MCP conversion server
```

### MCP vs. Built-in Tools

| Operation | Built-in Tool | MCP Tool | When to Choose MCP |
|-----------|--------------|----------|-------------------|
| File read/write | Read, Write | filesystem | Remote files, special permissions |
| Code search | Grep, Glob | semantic-search | Natural language search |
| Shell commands | Bash | ssh, remote-exec | Remote machine execution |
| Database query | N/A | postgres, mysql | Any database operation |
| Web content | N/A | web-reader, web-search | Web scraping, research |
| Browser automation | N/A | browser, playwright | E2E testing, web interaction |
| Git operations | Bash (git) | git | Complex workflows, multi-repo |
| Notifications | N/A | slack, email, notification | External communication |

**Rule of Thumb**: Use built-in tools when they suffice. Use MCP tools when the
operation is outside the agent's native capabilities or requires specialized handling.

---

## MCP Server Configuration

### Configuration File Location

MCP servers are configured in the project's MCP configuration file:

```
deerflow/mcp-config.json
```

### Configuration Schema

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/mcp-config.json",
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@organization/mcp-server-package"],
      "env": {
        "API_KEY": "${ENV_VAR_NAME}",
        "BASE_URL": "https://api.example.com"
      },
      "disabled": false,
      "timeout": 30000,
      "retryCount": 3,
      "retryDelay": 1000
    }
  },
  "globalSettings": {
    "defaultTimeout": 30000,
    "maxConcurrentTools": 5,
    "logLevel": "info",
    "enableTelemetry": false
  }
}
```

### Server Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `command` | string | Yes | Command to start the MCP server process |
| `args` | string[] | No | Arguments passed to the command |
| `env` | object | No | Environment variables for the server process |
| `disabled` | boolean | No | If true, the server is not started (default: false) |
| `timeout` | number | No | Tool invocation timeout in milliseconds (default: 30000) |
| `retryCount` | number | No | Number of retries on failure (default: 3) |
| `retryDelay` | number | No | Delay between retries in milliseconds (default: 1000) |

### Environment Variable Handling

Sensitive values (API keys, tokens) MUST be stored as environment variables,
never hardcoded in the configuration:

```json
{
  "env": {
    "DATABASE_URL": "${DEERFLOW_DB_URL}",
    "API_KEY": "${DEERFLOW_API_KEY}"
  }
}
```

The `${VAR_NAME}` syntax is resolved at runtime from the agent's environment.

---

## Tool Registration Protocol

### How Tools Are Registered

1. **Server Startup**: When an MCP server starts, it sends a list of available tools.
2. **Tool Discovery**: The agent discovers tools via the `tools/list` MCP method.
3. **Tool Registration**: Each tool is registered with its schema in the agent's tool registry.
4. **Capability Matching**: The agent matches tools to task requirements during planning.

### Tool Schema Format

Every MCP tool must provide a JSON Schema describing its inputs:

```json
{
  "name": "query_database",
  "description": "Execute a read-only SQL query against the project database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The SQL query to execute (SELECT only)"
      },
      "database": {
        "type": "string",
        "enum": ["primary", "analytics", "cache"],
        "description": "Which database to query against"
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of rows to return (default: 100, max: 1000)"
      }
    },
    "required": ["query"],
    "additionalProperties": false
  }
}
```

### Registration Requirements

1. **Unique Name**: Tool name must be unique across all registered MCP servers.
   - Use namespaced format: `server-name:tool-name` if conflicts exist.
2. **Clear Description**: Tool description must explain what the tool does, when to use it,
   and any important limitations.
3. **Complete Schema**: Input schema must define all parameters with types, descriptions,
   and constraints.
4. **Required Fields**: Mark essential parameters as required.
5. **No Additional Properties**: Set `additionalProperties: false` to prevent unexpected inputs.

---

## Tool Invocation Rules

### Invocation Protocol

```
1. VALIDATE: Check tool exists and is enabled.
2. AUTHORIZE: Verify the agent has permission to use the tool.
3. PREPARE: Construct input parameters matching the tool schema.
4. INVOKE: Send tool request via MCP protocol.
5. TIMEOUT: Wait for response within configured timeout.
6. RETRY: On transient failure, retry per configured retry policy.
7. PROCESS: Handle the response (success or error).
8. LOG: Record the invocation, parameters, result, and duration.
```

### Invocation Rules

| Rule | Description |
|------|-------------|
| **Schema Compliance** | All parameters must match the tool's input schema exactly. |
| **Timeout Enforcement** | Every invocation must have a timeout; no infinite waits. |
| **Idempotency** | Prefer idempotent tools; avoid tools with side effects when possible. |
| **Error Handling** | All tool errors must be caught and handled gracefully. |
| **Logging** | Every invocation must be logged (tool name, params, result, duration). |
| **Rate Limiting** | Respect rate limits; implement backoff when limits are hit. |
| **Batching** | Batch multiple operations when the tool supports it. |
| **Read-First** | Use read-only tools before write tools to validate approach. |

### Error Handling Protocol

```typescript
interface ToolInvocationResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    suggestion?: string;
  };
  metadata: {
    toolName: string;
    serverName: string;
    duration: number;
    timestamp: string;
    attemptNumber: number;
  };
}
```

### Retry Policy

1. **Retryable Errors**: Network timeouts, rate limits (429), server errors (5xx).
2. **Non-Retryable Errors**: Invalid parameters (400), unauthorized (401), not found (404).
3. **Exponential Backoff**: `delay = baseDelay * 2^(attempt - 1)` with jitter.
4. **Max Retries**: Respect the server's configured retry count (default: 3).
5. **Circuit Breaker**: After 5 consecutive failures, pause invocations for 60 seconds.

---

## MCP Tool Directory

### Recommended MCP Servers

#### Filesystem & Code

| Server | Package | Description | Use Case |
|--------|---------|-------------|----------|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | File operations on allowed directories | Remote file access, sandboxed reads |
| **Git** | `@modelcontextprotocol/server-git` | Git repository operations | Advanced git workflows, multi-repo management |
| **GitHub** | `@modelcontextprotocol/server-github` | GitHub API integration | Issues, PRs, Actions, repository management |

#### Database

| Server | Package | Description | Use Case |
|--------|---------|-------------|----------|
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | PostgreSQL database queries | Database inspection, schema analysis, data queries |
| **SQLite** | `@modelcontextprotocol/server-sqlite` | SQLite database operations | Local database access, testing |
| **MySQL** | Community MCP MySQL server | MySQL database queries | MySQL database inspection |

#### Web & Browser

| Server | Package | Description | Use Case |
|--------|---------|-------------|----------|
| **Puppeteer** | `@modelcontextprotocol/server-puppeteer` | Browser automation | Web scraping, E2E testing, screenshots |
| **Fetch** | `@modelcontextprotocol/server-fetch` | HTTP requests | API testing, web content retrieval |
| **Brave Search** | `@modelcontextprotocol/server-brave-search` | Web search via Brave | Research, documentation lookup |

#### Communication

| Server | Package | Description | Use Case |
|--------|---------|-------------|----------|
| **Slack** | `@modelcontextprotocol/server-slack` | Slack messaging | Notifications, channel management |
| **Email** | Community MCP email server | Email operations | Sending notifications, reading emails |

#### Development Tools

| Server | Package | Description | Use Case |
|--------|---------|-------------|----------|
| **Memory** | `@modelcontextprotocol/server-memory` | Persistent knowledge graph | Context persistence across sessions |
| **Sequential Thinking** | `@modelcontextprotocol/server-sequential-thinking` | Dynamic reasoning | Complex problem decomposition |
| **Everything** | `@modelcontextprotocol/server-everything` | Test server with all MCP features | MCP development and testing |

### Server Selection Guide

```
Need to interact with a database?
  └── PostgreSQL → @modelcontextprotocol/server-postgres
  └── SQLite → @modelcontextprotocol/server-sqlite
  └── MySQL → Community MySQL MCP server

Need to access web content?
  └── Fetch a single URL → @modelcontextprotocol/server-fetch
  └── Search the web → @modelcontextprotocol/server-brave-search
  └── Full browser automation → @modelcontextprotocol/server-puppeteer

Need to manage code repositories?
  └── GitHub operations → @modelcontextprotocol/server-github
  └── Local git operations → @modelcontextprotocol/server-git

Need persistent context?
  └── Cross-session memory → @modelcontextprotocol/server-memory
```

---

## Custom MCP Tool Development

### When to Build a Custom MCP Server

Build a custom MCP server when:

1. No existing MCP server provides the needed functionality.
2. You need to integrate with a proprietary internal system.
3. You need domain-specific tools optimized for your workflow.
4. You need to enforce custom access controls or validation.

### MCP Server Template

```typescript
// my-custom-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'my-custom-server',
  version: '1.0.0',
  description: 'Custom MCP server for Deerflow-specific operations',
});

// Register a tool
server.tool(
  'my_custom_tool',
  'Description of what this tool does and when to use it',
  {
    param1: {
      type: 'string',
      description: 'Description of param1',
    },
    param2: {
      type: 'number',
      description: 'Description of param2',
      default: 42,
    },
  },
  async ({ param1, param2 }) => {
    try {
      // Tool implementation
      const result = await performOperation(param1, param2);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Development Checklist

- [ ] Server starts and connects via stdio transport.
- [ ] All tools respond to `tools/list` with correct schemas.
- [ ] All tools validate input parameters against their schema.
- [ ] All tools return structured responses (content array).
- [ ] All tools handle errors gracefully with `isError: true`.
- [ ] Tools are idempotent where possible.
- [ ] Tools have clear, descriptive names and descriptions.
- [ ] Tools complete within the configured timeout.
- [ ] Server handles SIGTERM/SIGINT gracefully.
- [ ] Server has no memory leaks (verified with load testing).
- [ ] Configuration uses environment variables for secrets.
- [ ] Package includes proper `package.json` with MCP metadata.

### Publishing a Custom MCP Server

1. **Package the server** as an npm package.
2. **Include installation instructions** in the README.
3. **Provide an MCP configuration snippet** for easy integration.
4. **Test with the Deerflow agent** before deploying.
5. **Register in the project's MCP configuration** file.

---

## MCP Debugging and Logging

### Logging Configuration

Configure MCP logging in `mcp-config.json`:

```json
{
  "globalSettings": {
    "logLevel": "debug",
    "logFile": "./logs/mcp.log",
    "logRotation": {
      "maxSize": "10MB",
      "maxFiles": 5
    }
  }
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | Tool invocations failed, server connection lost |
| `warn` | Retryable failures, approaching rate limits, degraded performance |
| `info` | Tool invocations started/completed, server connections established |
| `debug` | Detailed request/response payloads, internal state changes |

### Debugging Techniques

#### 1. Enable Verbose Logging

Set log level to `debug` to see full request/response payloads:

```json
{
  "globalSettings": {
    "logLevel": "debug"
  }
}
```

#### 2. Test Tool Directly

Invoke MCP tools directly to isolate issues:

```bash
# Send a tools/list request
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npx @org/mcp-server

# Send a tools/call request
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tool-name","arguments":{"param":"value"}},"id":2}' | npx @org/mcp-server
```

#### 3. Check Server Health

Verify MCP servers are running and responsive:

```bash
# List available tools (server health check)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npx @org/mcp-server
```

#### 4. Inspect Connection Issues

Common connection issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Server not starting | Command not found | Verify `command` and `args` in config |
| Connection timeout | Server slow to start | Increase timeout value |
| Tool not found | Server not listing tools | Check server logs for startup errors |
| Permission denied | Environment variable missing | Verify `env` configuration |
| Invalid response | Server returning non-JSON | Check server output format |

#### 5. Performance Profiling

Log tool invocation durations to identify slow operations:

```typescript
// Instrumented tool call
const startTime = Date.now();
const result = await tool.invoke(params);
const duration = Date.now() - startTime;

if (duration > 5000) {
  logger.warn(`Slow MCP tool invocation: ${tool.name} took ${duration}ms`);
}
```

### Log Format

All MCP logs should follow a structured format:

```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "level": "info",
  "event": "tool_invocation",
  "server": "postgres-server",
  "tool": "query_database",
  "requestId": "req-123",
  "duration": 245,
  "status": "success",
  "metadata": {
    "paramCount": 2,
    "resultSize": "1.2KB"
  }
}
```

---

## MCP Security Considerations

### Principle of Least Privilege

- **Tool Permissions**: Only enable MCP servers and tools that are needed for the current task.
- **Filesystem Access**: MCP filesystem servers should be restricted to specific allowed directories.
- **Database Access**: MCP database servers should use read-only credentials when possible.
- **Network Access**: MCP servers should only be able to reach required endpoints.

### Configuration Security

```json
{
  "mcpServers": {
    "postgres-readonly": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"],
      "env": {
        "POSTGRES_URL": "${DEERFLOW_DB_READONLY_URL}"
      },
      "permissions": {
        "allowedTools": ["query", "list_tables", "describe_table"],
        "deniedTools": ["execute", "modify", "drop"]
      }
    }
  }
}
```

### Security Checklist

- [ ] No API keys or secrets hardcoded in MCP configuration.
- [ ] All secrets reference environment variables (`${VAR_NAME}`).
- [ ] Filesystem servers are restricted to specific allowed directories.
- [ ] Database servers use read-only credentials by default.
- [ ] Network-accessible tools validate and sanitize all inputs.
- [ ] Tool outputs are sanitized before being returned to the agent.
- [ ] Rate limiting is configured for all external-facing tools.
- [ ] MCP server processes run with minimal OS permissions.
- [ ] Server dependencies are audited for known vulnerabilities.
- [ ] Tool invocation logs do not contain sensitive data (passwords, tokens).

---

*This MCP integration document is a core component of the Deerflow Agent Framework.
MCP tools extend agent capabilities beyond file operations. Use them judiciously
and always prefer built-in tools when they suffice.*
