#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const packageVersion = "1.0.0";

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

function configureTestTools(server) {
  console.error("Configuring test tools...");
  
  server.tool(
    "hello_test", 
    "Simple hello test", 
    {
      message: z.string().describe("Message to echo"),
    }, 
    async ({ message }) => {
      console.error(`Tool called with message: ${message}`);
      return {
        content: [{ type: "text", text: `Echo: ${message}` }],
      };
    }
  );
  
  console.error("Test tools configured successfully");
}

async function main() {
  try {
    console.error("Starting Debug MCP Server...");
    
    const server = new McpServer({
      name: "Debug MCP Server", 
      version: packageVersion,
    });
    
    console.error("Server created successfully");
    
    configureTestTools(server);
    
    const transport = new StdioServerTransport();
    console.error("Transport created, connecting...");
    
    await server.connect(transport);
    console.error("Debug MCP Server connected and running on stdio");
    
    // Keep process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error("Error in main():", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main();