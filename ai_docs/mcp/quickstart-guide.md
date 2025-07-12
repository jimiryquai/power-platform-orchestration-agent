# MCP Server Quickstart Guide

## Overview
This guide walks through building a functional MCP server that integrates with Claude for Desktop, demonstrating the core MCP concepts.

## Prerequisites
- Latest Node.js installed
- Familiarity with TypeScript and LLMs
- Claude for Desktop application

## Project Setup Steps

### 1. Project Initialization
```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
```

### 2. Install Dependencies
```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node ts-node
```

### 3. TypeScript Configuration
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Server Implementation Pattern

### Basic Server Structure
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0"
});

// Tool implementations go here

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Example Tool Implementation
```typescript
server.registerTool(
  "get-forecast",
  {
    title: "Get Weather Forecast",
    description: "Get weather forecast for a location",
    inputSchema: {
      latitude: z.number(),
      longitude: z.number()
    }
  },
  async ({ latitude, longitude }) => {
    // API call logic here
    const forecast = await fetchWeatherData(latitude, longitude);
    
    return {
      content: [{
        type: "text",
        text: `Weather forecast: ${forecast}`
      }]
    };
  }
);
```

## Claude for Desktop Integration

### 1. Configuration File Location
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Server Configuration
```json
{
  "mcpServers": {
    "weather-server": {
      "command": "node",
      "args": ["path/to/your/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Development Configuration
For TypeScript development:
```json
{
  "mcpServers": {
    "weather-server": {
      "command": "npx",
      "args": ["ts-node", "src/server.ts"],
      "cwd": "/absolute/path/to/project"
    }
  }
}
```

## Testing Your Server

### 1. Start Server Manually
```bash
npx ts-node src/server.ts
```

### 2. Restart Claude for Desktop
- Completely quit and restart Claude for Desktop
- Look for your server in the available tools

### 3. Test Tools
- Try using your tools in Claude conversations
- Check for proper responses and error handling

## Key MCP Server Concepts

### Resources
- Expose data to LLMs
- Static or dynamic content
- URI-based access

### Tools
- Perform actions and computations
- Input validation with schemas
- Structured output responses

### Prompts
- Reusable interaction templates
- Parameterized prompts
- Context-aware suggestions

## Best Practices

1. **Use Absolute Paths**: Always use absolute paths in Claude Desktop config
2. **Error Handling**: Implement proper error handling in tools
3. **Input Validation**: Use Zod schemas for input validation
4. **Logging**: Add console.error() for debugging (appears in Claude Desktop logs)
5. **Testing**: Test tools manually before Claude Desktop integration

## Common Issues

1. **Server Not Appearing**: Check absolute paths in config
2. **Connection Timeout**: Ensure server starts quickly
3. **Tool Errors**: Check input schemas and response format
4. **Environment Variables**: Ensure proper env var setup in config

## Next Steps
- Add more sophisticated tools
- Implement resource endpoints
- Add prompt templates
- Handle user input requests