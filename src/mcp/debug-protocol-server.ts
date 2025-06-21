#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export async function main() {
  console.error("=== DEBUG PROTOCOL SERVER ===");
  
  const server = new McpServer({
    name: "Debug Protocol Server",
    version: "1.0.0",
  });

  console.error("Server created");

  // Register a simple tool
  server.tool(
    "debug_tool",
    "A debug tool",
    {
      message: z.string().optional(),
    },
    async (params) => {
      console.error("DEBUG_TOOL CALLED with params:", params);
      return {
        content: [
          {
            type: "text",
            text: `Debug tool called with: ${JSON.stringify(params)}`,
          },
        ],
      };
    }
  );

  console.error("Tool registered");

  // Access the underlying server to add debug handlers
  const underlyingServer = server.server;
  
  // Override list tools to debug
  underlyingServer.addRequestHandler("tools/list", async () => {
    console.error("=== TOOLS/LIST CALLED ===");
    const result = {
      tools: [
        {
          name: "debug_tool",
          description: "A debug tool",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string" }
            }
          }
        }
      ]
    };
    console.error("Returning tools:", JSON.stringify(result, null, 2));
    return result;
  });

  // Log all incoming requests
  underlyingServer.addRequestHandler("initialize", async (request) => {
    console.error("=== INITIALIZE REQUEST ===", JSON.stringify(request, null, 2));
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "Debug Protocol Server",
        version: "1.0.0"
      }
    };
  });

  const transport = new StdioServerTransport();
  console.error("Transport created");
  
  console.error("Debug Protocol Server version: 1.0.0");
  await server.connect(transport);
  console.error("Server connected and ready");
}

main().catch((error) => {
  console.error("Error starting debug server:", error);
  process.exit(1);
});