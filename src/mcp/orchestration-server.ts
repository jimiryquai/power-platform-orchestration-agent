#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const packageVersion = "1.0.0";

function configureOrchestrationTools(server: McpServer) {
  server.tool(
    "list_templates", 
    "List available Power Platform project templates",
    {
      category: z.enum(["standard", "enterprise", "quickstart", "all"]).optional().describe("Template category to filter"),
    }, 
    async ({ category }) => {
      return {
        content: [{
          type: "text", 
          text: JSON.stringify({
            templates: [
              { name: "S-Project", category: "standard", description: "Small project template" },
              { name: "M-Project", category: "enterprise", description: "Medium project template" },
              { name: "L-Project", category: "enterprise", description: "Large project template" }
            ].filter(t => !category || category === "all" || t.category === category)
          }, null, 2)
        }],
      };
    }
  );

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
  console.error("Starting Power Platform Orchestration MCP Server...");
  
  const server = new McpServer({
    name: "Power Platform Orchestration MCP Server", 
    version: packageVersion,
  });

  configureOrchestrationTools(server);

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("Power Platform Orchestration MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});