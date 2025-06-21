#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const packageVersion = "1.0.0";

function configureTestTools(server) {
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
  console.error("Starting ESM Test MCP Server...");
  
  const server = new McpServer({
    name: "ESM Test MCP Server", 
    version: packageVersion,
  });

  configureTestTools(server);

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("ESM Test MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});