#!/usr/bin/env node

console.error("=== ULTRA SIMPLE START ===");

try {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  console.error("McpServer imported");
  
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  console.error("StdioServerTransport imported");
  
  const server = new McpServer({
    name: "Ultra Simple",
    version: "1.0.0",
  });
  console.error("Server created");
  
  const transport = new StdioServerTransport();
  console.error("Transport created");
  
  console.error("About to connect...");
  await server.connect(transport);
  console.error("=== CONNECTED SUCCESSFULLY ===");
  
} catch (error) {
  console.error("ERROR:", error);
  console.error("STACK:", error.stack);
  process.exit(1);
}