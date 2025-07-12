#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const packageVersion = "1.0.0";

function configureTestTools(server) {
    server.tool("hello_test", "Simple hello test", {
        message: z.string().describe("Message to echo"),
    }, async ({ message }) => {
        return {
            content: [{ type: "text", text: JSON.stringify({ echo: message }, null, 2) }],
        };
    });
}

async function main() {
    console.error("Starting Azure Clone MCP Server...");
    
    const server = new McpServer({
        name: "Azure Clone MCP Server",
        version: packageVersion,
    });
    
    configureTestTools(server);
    
    const transport = new StdioServerTransport();
    console.error("Connecting server to transport...");
    await server.connect(transport);
    console.error("Azure Clone MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});