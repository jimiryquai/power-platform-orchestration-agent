#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

class DebugMCPServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "debug-test-server",
      version: "1.0.0"
    });

    this.registerSimpleTools();
  }

  private registerSimpleTools(): void {
    // Ultra simple tool with no parameters
    this.server.tool(
      "hello_world",
      "Simple test tool that returns hello world",
      async (args) => {
        return {
          content: [{
            type: "text",
            text: "Hello, World! This tool is working."
          }]
        };
      }
    );

    // Simple tool with one parameter
    this.server.tool(
      "echo_message",
      "Echo back a message",
      {
        message: z.string()
      },
      async (args) => {
        const { message } = args;
        return {
          content: [{
            type: "text",
            text: `You said: ${message}`
          }]
        };
      }
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("🚀 Debug MCP Server started");
    console.error("📋 Registered tools: hello_world, echo_message");
  }
}

async function main(): Promise<void> {
  try {
    console.error('🚀 Starting Debug MCP Server...');
    
    const server = new DebugMCPServer();
    await server.start();
    
    console.error('✅ Debug MCP Server is running');
    
  } catch (error) {
    console.error('❌ Failed to start debug server:', error);
    process.exit(1);
  }
}

// Start the server if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export { DebugMCPServer };