#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { packageVersion } from "./version.js";

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
  console.error("Starting Final Test MCP Server...");
  
  const server = new McpServer({
    name: "Final Test MCP Server", 
    version: packageVersion,
  });

  configureTestTools(server);

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("Final Test MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});