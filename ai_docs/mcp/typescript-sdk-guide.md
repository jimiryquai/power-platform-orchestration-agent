# MCP TypeScript SDK Guide

## Overview
The Model Context Protocol (MCP) TypeScript SDK enables building MCP clients and servers with support for multiple transport methods and standardized protocol interactions.

## Installation
```bash
npm install @modelcontextprotocol/sdk
```

## Core Server Implementation Pattern

### Basic Server Setup
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});
```

### Tool Registration
```typescript
// Register a tool with input validation
server.registerTool("add", {
  title: "Addition Tool",
  description: "Add two numbers together",
  inputSchema: { 
    a: z.number(), 
    b: z.number() 
  }
}, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }]
}));
```

### Server Connection
```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Key MCP Concepts

### 1. Resources
Expose data to LLMs - endpoints for loading information into context

### 2. Tools
Perform actions and computations - functionality for executing code or producing side effects

### 3. Prompts
Define interaction templates - reusable templates for LLM interactions

### 4. Completions
Provide intelligent argument suggestions

## Transport Options

### stdio Transport
- Best for command-line and direct integrations
- Used with Claude Desktop
- Simple setup with StdioServerTransport

### HTTP Transport
- For remote server communication
- Streamable HTTP support
- Session-based and stateless modes

## Tool Response Format
```typescript
{
  content: [
    { 
      type: "text", 
      text: "Response text here" 
    }
  ]
}
```

## Advanced Features
- Dynamic server modification
- User input elicitation
- OAuth request proxying
- Backwards compatibility with legacy transports

## Claude Desktop Integration
Configure in claude_desktop_config.json:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

## Best Practices
1. Use the newer `McpServer` class instead of manual request handlers
2. Implement proper input validation with Zod schemas
3. Return structured content responses
4. Handle errors gracefully
5. Use stdio transport for Claude Desktop integration