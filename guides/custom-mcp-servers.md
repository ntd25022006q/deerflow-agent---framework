# Creating Custom MCP Servers for Deerflow Framework

This guide teaches you how to build custom Model Context Protocol (MCP) servers
that integrate with the Deerflow Agent Framework. MCP servers expose specialized
tools that AI agents can invoke to perform operations beyond the standard
file, search, git, and testing capabilities.

---

## Table of Contents

1. [Understanding MCP in Deerflow](#understanding-mcp-in-deerflow)
2. [MCP Server Architecture](#mcp-server-architecture)
3. [Prerequisites](#prerequisites)
4. [Creating Your First MCP Server](#creating-your-first-mcp-server)
5. [Tool Definition and Registration](#tool-definition-and-registration)
6. [Handling Tool Parameters](#handling-tool-parameters)
7. [Error Handling and Validation](#error-handling-and-validation)
8. [Registering Your Server with Deerflow](#registering-your-server-with-deerflow)
9. [Testing Your MCP Server](#testing-your-mcp-server)
10. [Advanced Patterns](#advanced-patterns)
11. [Deployment and Distribution](#deployment-and-distribution)
12. [Security Considerations](#security-considerations)

---

## Understanding MCP in Deerflow

The Model Context Protocol (MCP) is a standardized communication protocol that
enables AI agents to invoke tools on a local or remote server. In the Deerflow
ecosystem, MCP servers provide the operational interface between AI agents and
the project workspace.

### How MCP Works in Deerflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  AI Agent    │────>│  MCP Client  │────>│  MCP Server      │
│  (Cursor,    │     │  (built-in)  │     │  (your server)   │
│   Cline,     │     │              │     │                  │
│   Windsurf)  │<────│              │<────│                  │
└──────────────┘     └──────────────┘     └──────────────────┘
                            │
                     stdin/stdout
                     JSON-RPC 2.0
```

1. The AI agent sends a tool invocation request via the MCP client.
2. The MCP client forwards the request to the appropriate MCP server.
3. The MCP server executes the tool and returns the result.
4. The MCP client forwards the result back to the AI agent.

### Existing Deerflow MCP Servers

| Server       | Package                        | Purpose                    |
|-------------|--------------------------------|----------------------------|
| `filesystem`| `@deerflow/mcp-server-filesystem` | File read/write/list     |
| `search`    | `@deerflow/mcp-server-search`  | Codebase search             |
| `git`       | `@deerflow/mcp-server-git`     | Git operations              |
| `testing`   | `@deerflow/mcp-server-testing`  | Test execution              |
| `validation`| `@deerflow/mcp-server-validation`| Quality gate execution    |
| `documentation`| `@deerflow/mcp-server-documentation`| Doc generation         |
| `security`  | `@deerflow/mcp-server-security` | Security auditing           |
| `performance`| `@deerflow/mcp-server-performance`| Bundle analysis          |

---

## MCP Server Architecture

A Deerflow MCP server is a Node.js process that:

1. Communicates via **stdin/stdout** using **JSON-RPC 2.0**.
2. Exposes a set of **tools** with typed parameter schemas.
3. Handles **tool invocation** requests and returns structured results.
4. Supports **health checks** for monitoring.
5. Respects **timeout** and **retry** configurations.

### Standard Server Structure

```
my-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Server entry point
│   ├── tools/             # Tool implementations
│   │   ├── tool-one.ts
│   │   ├── tool-two.ts
│   │   └── index.ts       # Tool registry
│   ├── handlers/          # Request handlers
│   │   ├── initialize.ts
│   │   └── tool-call.ts
│   └── utils/             # Shared utilities
├── tests/
│   ├── tools/
│   │   ├── tool-one.test.ts
│   │   └── tool-two.test.ts
│   └── integration.test.ts
└── README.md
```

---

## Prerequisites

Before building a custom MCP server, ensure you have:

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.0.0
- **@deerflow/mcp-sdk** (the MCP SDK for Deerflow)

```bash
npm install --save-dev typescript @types/node
npm install @deerflow/mcp-sdk
```

---

## Creating Your First MCP Server

### Step 1: Initialize the Project

```bash
mkdir my-deerflow-mcp-server
cd my-deerflow-mcp-server
npm init -y

# Install dependencies
npm install @deerflow/mcp-sdk
npm install --save-dev typescript @types/node vitest
```

### Step 2: Configure TypeScript

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

### Step 3: Create the Server Entry Point

```typescript
// src/index.ts
import { McpServer, ToolDefinition } from '@deerflow/mcp-sdk';
import { analyzeComplexity } from './tools/analyze-complexity';
import { generateScaffold } from './tools/generate-scaffold';

// Define your server
const server = new McpServer({
  name: 'my-custom-server',
  version: '1.0.0',
  description: 'Custom MCP server for project-specific operations',
});

// Register tools
server.registerTool({
  name: 'analyze_complexity',
  description: 'Analyze cyclomatic complexity of TypeScript/JavaScript files.',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to analyze.',
      },
      threshold: {
        type: 'number',
        description: 'Maximum allowed complexity per function.',
        default: 10,
      },
    },
    required: ['filePath'],
  },
  handler: async (params, context) => {
    return analyzeComplexity(params.filePath, params.threshold, context);
  },
});

server.registerTool({
  name: 'generate_scaffold',
  description: 'Generate a scaffold file for a new React component.',
  parameters: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: 'PascalCase name for the component.',
      },
      type: {
        type: 'string',
        enum: ['page', 'layout', 'component', 'widget'],
        description: 'Type of scaffold to generate.',
        default: 'component',
      },
      directory: {
        type: 'string',
        description: 'Target directory (relative to project root).',
        default: 'src/components',
      },
    },
    required: ['componentName'],
  },
  handler: async (params, context) => {
    return generateScaffold(params, context);
  },
});

// Start the server
server.start();
```

### Step 4: Implement Tool Handlers

```typescript
// src/tools/analyze-complexity.ts
import * as fs from 'fs';
import * as path from 'path';
import { ToolResult, ToolContext } from '@deerflow/mcp-sdk';

interface ComplexityResult {
  filePath: string;
  functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    complexity: number;
    status: 'ok' | 'exceeds_threshold';
  }>;
  totalFunctions: number;
  exceedsThreshold: number;
  averageComplexity: number;
}

export async function analyzeComplexity(
  filePath: string,
  threshold: number,
  context: ToolContext,
): Promise<ToolResult> {
  const absPath = path.resolve(context.workspaceRoot, filePath);

  if (!fs.existsSync(absPath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`,
    };
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  const results = analyzeFunctions(content, threshold);

  return {
    success: true,
    data: {
      filePath,
      ...results,
    },
  };
}

function analyzeFunctions(
  content: string,
  threshold: number,
): Omit<ComplexityResult, 'filePath'> {
  // Simple complexity analysis: count decision points
  const functionRegex =
    /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\w+\s*=>))/g;

  const functions: ComplexityResult['functions'] = [];
  let match: RegExpExecArray | null;

  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1] || match[2] || 'anonymous';
    const startLine = content.slice(0, match.index).split('\n').length;

    // Count decision points in the next block (simplified)
    const blockStart = match.index;
    const blockEnd = findBlockEnd(content, blockStart);
    const block = content.slice(blockStart, blockEnd);

    const decisionPoints = (block.match(/\bif\b|\belse\b|\bcase\b|\bfor\b|\bwhile\b|\?\?|\?\.|&&|\|\|/g) || []).length;
    const complexity = decisionPoints + 1; // +1 for the function itself

    functions.push({
      name,
      startLine,
      endLine: content.slice(0, blockEnd).split('\n').length,
      complexity,
      status: complexity > threshold ? 'exceeds_threshold' : 'ok',
    });
  }

  const total = functions.length;
  const exceeds = functions.filter(f => f.status === 'exceeds_threshold').length;
  const avg = total > 0
    ? functions.reduce((sum, f) => sum + f.complexity, 0) / total
    : 0;

  return {
    functions,
    totalFunctions: total,
    exceedsThreshold: exceeds,
    averageComplexity: Math.round(avg * 100) / 100,
  };
}

function findBlockEnd(content: string, start: number): number {
  let depth = 0;
  let foundFirstBrace = false;

  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') {
      foundFirstBrace = true;
      depth++;
    } else if (content[i] === '}') {
      depth--;
      if (foundFirstBrace && depth === 0) return i + 1;
    }
  }

  return content.length;
}
```

### Step 5: Create the Package Manifest

```json
{
  "name": "@deerflow/mcp-server-my-custom",
  "version": "1.0.0",
  "description": "Custom MCP server for project-specific operations",
  "main": "dist/index.js",
  "bin": {
    "deerflow-mcp-my-custom": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@deerflow/mcp-sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Tool Definition and Registration

### Tool Definition Schema

Every tool must have a complete JSON Schema definition:

```typescript
interface ToolDefinition {
  name: string;              // Unique tool identifier (snake_case)
  description: string;       // Human-readable description for AI agents
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required?: string[];     // Required parameter names
  };
  handler: ToolHandler;      // Function that executes the tool
  usage?: ToolUsage;         // Usage rules (confirmation, rate limits)
}
```

### Parameter Types

| JSON Schema Type | Deerflow Types     | Description                      |
|-----------------|--------------------|------------------------------------|
| `string`        | string             | Text values                        |
| `number`        | number             | Integer or floating-point         |
| `boolean`       | boolean            | True/false                         |
| `array`         | Array<T>           | Lists of values                    |
| `object`        | Record<string, T>  | Key-value maps                     |
| `enum`          | string (constrained)| One of a fixed set of values     |

### Usage Rules

```typescript
interface ToolUsage {
  requiresConfirmation?: boolean;    // Prompt user before execution
  modifiesFiles?: boolean;           // Whether this tool modifies files
  rateLimit?: string;                // e.g., "30/minute"
  confirmationMessage?: string;      // Custom confirmation prompt
  note?: string;                     // Additional usage notes
}
```

---

## Error Handling and Validation

### Standard Error Response

```typescript
// Always return structured errors
return {
  success: false,
  error: {
    code: 'FILE_NOT_FOUND',
    message: 'File not found: src/components/Header.tsx',
    details: { filePath: 'src/components/Header.tsx' },
  },
};
```

### Error Codes

| Code                  | HTTP Analogy  | Description                        |
|-----------------------|---------------|------------------------------------|
| `FILE_NOT_FOUND`      | 404           | Requested resource does not exist   |
| `PERMISSION_DENIED`   | 403           | Operation not allowed by scope      |
| `INVALID_PARAMETERS`  | 400           | Parameters failed validation        |
| `TIMEOUT`             | 408           | Operation exceeded time limit       |
| `INTERNAL_ERROR`      | 500           | Unexpected server error             |
| `RATE_LIMITED`        | 429           | Too many requests                   |
| `VALIDATION_FAILED`   | 422           | Business logic validation failed    |

### Parameter Validation

```typescript
function validateParams(params: unknown, schema: object): ValidationResult {
  // Use a lightweight JSON schema validator
  // e.g., ajv, zod, or manual validation
}

// In your handler:
export async function myToolHandler(params: unknown, context: ToolContext): Promise<ToolResult> {
  const validation = validateParams(params, mySchema);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: validation.errors.join('; '),
      },
    };
  }
  // ... proceed with validated params
}
```

---

## Registering Your Server with Deerflow

### Step 1: Add to mcp-config.json

Add your server to the MCP configuration file:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "name": "my-custom-server",
      "description": "Custom operations for my project",
      "command": "npx",
      "args": ["-y", "@deerflow/mcp-server-my-custom"],
      "env": {
        "DEERFLOW_WORKSPACE_ROOT": "${workspaceFolder}",
        "DEERFLOW_LOG_LEVEL": "info"
      },
      "settings": {
        "myCustomOption": "value"
      },
      "timeout": 30000,
      "retries": 2
    }
  }
}
```

### Step 2: Add to deerflow.config.yaml

Enable the server in the main config:

```yaml
mcp:
  enabled: true
  servers:
    - filesystem
    - search
    - git
    - testing
    - validation
    - my-custom-server    # Your custom server
```

### Step 3: Register Tools in tools-registry.json

Add your tools to the tools registry:

```json
{
  "tools": [
    {
      "name": "analyze_complexity",
      "server": "my-custom-server",
      "description": "Analyze cyclomatic complexity of source files.",
      "parameters": {
        "type": "object",
        "properties": {
          "filePath": { "type": "string" },
          "threshold": { "type": "number", "default": 10 }
        },
        "required": ["filePath"]
      },
      "usage": {
        "requiresConfirmation": false,
        "modifiesFiles": false,
        "rateLimit": "50/minute"
      }
    }
  ]
}
```

---

## Testing Your MCP Server

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { analyzeComplexity } from './analyze-complexity';

describe('analyzeComplexity', () => {
  const mockContext = { workspaceRoot: '/project' };

  it('should analyze a simple function', async () => {
    // Create a temp file for testing
    const result = await analyzeComplexity(
      'tests/fixtures/simple.ts',
      10,
      mockContext,
    );
    expect(result.success).toBe(true);
    expect(result.data.totalFunctions).toBeGreaterThan(0);
  });

  it('should return error for non-existent file', async () => {
    const result = await analyzeComplexity(
      'nonexistent.ts',
      10,
      mockContext,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should flag functions exceeding threshold', async () => {
    const result = await analyzeComplexity(
      'tests/fixtures/complex.ts',
      5,
      mockContext,
    );
    expect(result.success).toBe(true);
    expect(result.data.exceedsThreshold).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { McpClient } from '@deerflow/mcp-sdk/testing';

describe('MCP Server Integration', () => {
  let client: McpClient;

  it('should start the server and list tools', async () => {
    client = new McpClient({
      command: 'npx',
      args: ['-y', '@deerflow/mcp-server-my-custom'],
    });

    await client.connect();
    const tools = await client.listTools();

    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'analyze_complexity' }),
    );
    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'generate_scaffold' }),
    );
  });

  it('should invoke analyze_complexity tool', async () => {
    const result = await client.callTool('analyze_complexity', {
      filePath: 'src/index.ts',
      threshold: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('functions');
  });

  afterAll(async () => {
    await client?.disconnect();
  });
});
```

### Health Check Test

```bash
# Test that your server responds to health checks
npx @deerflow/mcp-server-my-custom --health-check

# Expected output:
# OK: my-custom-server v1.0.0
# Tools: 2 registered
# Status: healthy
```

---

## Advanced Patterns

### Streaming Results

For long-running operations, stream results incrementally:

```typescript
server.registerTool({
  name: 'batch_analyze',
  description: 'Analyze multiple files and stream results.',
  parameters: {
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'string' } },
    },
    required: ['files'],
  },
  handler: async (params, context, stream) => {
    for (const file of params.files) {
      const result = await analyzeComplexity(file, 10, context);
      await stream.write(result);
    }
    return { success: true, data: { totalFiles: params.files.length } };
  },
});
```

### Caching

Add caching to expensive operations:

```typescript
import { LRUCache } from 'lru-cache';

const analysisCache = new LRUCache<string, ToolResult>({
  max: 100,
  ttl: 60_000, // 1 minute
});

server.registerTool({
  name: 'cached_analyze',
  handler: async (params, context) => {
    const cacheKey = `${params.filePath}:${fs.statSync(params.filePath).mtimeMs}`;
    const cached = analysisCache.get(cacheKey);
    if (cached) return cached;

    const result = await analyzeComplexity(params.filePath, params.threshold, context);
    analysisCache.set(cacheKey, result);
    return result;
  },
});
```

---

## Security Considerations

1. **Validate all inputs** — Never trust parameter values from AI agents
2. **Enforce scope** — Only operate within the configured workspace root
3. **No shell injection** — Never construct shell commands from user parameters
4. **Rate limiting** — Set appropriate rate limits for expensive operations
5. **Confirmation** — Require confirmation for destructive operations
6. **Logging** — Log all tool invocations for audit trail
7. **Timeouts** — Set reasonable timeouts to prevent hanging

---

## Deployment and Distribution

### Publish to npm

```bash
# Build
npm run build

# Publish (scoped package)
npm publish --access public
```

### Use in Projects

Other projects can use your server by:

1. Adding it to `mcp-config.json`
2. Adding it to `deerflow.config.yaml`
3. Registering tools in `tools-registry.json`

### Local Development

For development, link your server locally:

```bash
# In your server project
npm link

# In the consumer project
npm link @deerflow/mcp-server-my-custom

# Use directly in mcp-config.json
# "command": "deerflow-mcp-my-custom"  (instead of "npx -y ...")
```
