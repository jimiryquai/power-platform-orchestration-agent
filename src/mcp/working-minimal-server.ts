#!/usr/bin/env node

// Exact copy of Azure DevOps MCP pattern
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export const packageVersion = "1.0.0";

async function main() {
  const server = new McpServer({
    name: "Working Minimal Server",
    version: packageVersion,
  });

  // Register tool exactly like Azure DevOps MCP does it
  server.tool(
    "hello_test",
    "Simple hello test",
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

  const transport = new StdioServerTransport();
  console.log("Working Minimal Server version: " + packageVersion);
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});