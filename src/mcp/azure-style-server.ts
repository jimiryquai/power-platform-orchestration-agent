#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Exactly like Azure DevOps MCP
export async function main() {
  const server = new McpServer({
    name: "Test Power Platform MCP Server",
    version: "1.0.0",
  });

  // Register tool exactly like Azure DevOps does
  server.tool(
    "list_test_items",
    "List test items",
    {
      project: z.string(),
    },
    async (params) => {
      return {
        content: [
          {
            type: "text",
            text: `Test items for project: ${params.project}`,
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  console.log("Test Power Platform MCP Server version: 1.0.0");
  await server.connect(transport);
}

// Error handling like Azure DevOps
main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});