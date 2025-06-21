#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function main() {
  console.error("Starting exact copy server...");
  
  const server = new McpServer({
    name: "Exact Copy Server",
    version: "1.0.0",
  });

  // Register a tool exactly like Azure DevOps MCP does
  server.tool(
    "test_tool",
    "A test tool",
    {
      message: z.string().describe("Message to echo"),
    },
    async (params) => {
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${params.message}`,
          },
        ],
      };
    }
  );

  console.error("Tool registered");

  const transport = new StdioServerTransport();
  console.error("Transport created");
  
  await server.connect(transport);
  console.error("Server connected and ready");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});