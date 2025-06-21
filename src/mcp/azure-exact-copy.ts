#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export const packageVersion = "1.0.0";

function configureTestTools(server: McpServer) {
  server.tool(
    "hello_test", 
    "Simple hello test", 
    {
      message: z.string().describe("Message to echo"),
    }, 
    async ({ message }) => {
      return {
        content: [{ type: "text", text: `Echo: ${message}` }],
      };
    }
  );
}

async function main() {
  console.error("Starting Test MCP Server...");
  
  const server = new McpServer({
    name: "Test MCP Server",
    version: packageVersion,
  });

  configureTestTools(server);

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("Test MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});