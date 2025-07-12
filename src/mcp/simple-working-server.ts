#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function main() {
  const server = new McpServer({
    name: "Simple Working Server",
    version: "1.0.0",
  });

  // Register one simple tool
  server.tool(
    "hello",
    "Say hello",
    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Hello from simple working server!",
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Simple working server started with 'hello' tool");
}

main().catch((error) => {
  console.error("Server failed:", error);
  process.exit(1);
});