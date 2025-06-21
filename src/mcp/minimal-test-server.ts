#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function main() {
  const server = new McpServer({
    name: "test-server",
    version: "1.0.0"
  });

  // Register a simple tool
  server.tool(
    "hello",
    "A simple hello world tool",
    async () => {
      return {
        content: [{
          type: "text",
          text: "Hello from MCP server!"
        }]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("✅ Minimal test server started with 'hello' tool");
}

main().catch(error => {
  console.error("❌ Server failed:", error);
  process.exit(1);
});