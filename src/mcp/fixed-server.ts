#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  console.error("Starting fixed server...");
  
  const server = new McpServer({
    name: "Fixed Server",
    version: "1.0.0",
  });

  console.error("Server created");

  // Register one simple tool
  server.tool(
    "hello",
    "Say hello",
    async () => {
      console.error("Hello tool called!");
      return {
        content: [
          {
            type: "text",
            text: "Hello from fixed server!",
          },
        ],
      };
    }
  );

  console.error("Tool registered");

  const transport = new StdioServerTransport();
  console.error("Transport created");
  
  await server.connect(transport);
  console.error("Server connected - should be ready for requests");
}

main().catch((error) => {
  console.error("Server failed:", error);
  process.exit(1);
});