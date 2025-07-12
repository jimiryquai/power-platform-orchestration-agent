#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const packageVersion = "1.0.0";

async function main() {
  console.error("=== Starting Final Debug MCP Server ===");
  
  try {
    const server = new McpServer({
      name: "Final Debug MCP Server",
      version: packageVersion,
    });
    
    console.error("Server instance created");

    // Server instance created successfully

    // Register a simple tool
    console.error("Registering hello_test tool...");
    server.tool(
      "hello_test",
      "Simple hello test", 
      {
        message: z.string().describe("Message to echo"),
      },
      async ({ message }) => {
        console.error(`Tool called with: ${message}`);
        return {
          content: [{ type: "text", text: `Echo: ${message}` }],
        };
      }
    );
    console.error("Tool registered successfully");

    const transport = new StdioServerTransport();
    console.error("Transport created");

    console.error("Calling server.connect()...");
    await server.connect(transport);
    console.error("=== Server connected successfully ===");

    // Log server state
    console.error(`Server connected: ${server.isConnected()}`);
    
  } catch (error) {
    console.error("Error in main:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main();