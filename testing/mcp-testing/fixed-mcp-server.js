#!/usr/bin/env node

// Fixed MCP Server - Handles initialization properly
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

console.error('🚀 Starting fixed MCP server...');

const server = new Server(
  {
    name: 'power-platform-orchestrator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Import request schemas
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// CRITICAL: Handle initialization to prevent timeout
const initializeSchema = {
  method: 'initialize',
  params: {
    type: 'object',
    properties: {
      protocolVersion: { type: 'string' },
      capabilities: { type: 'object' },
      clientInfo: { type: 'object' }
    }
  }
};

server.setRequestHandler(initializeSchema, async (request) => {
  console.error('🤝 Initialize request received:', JSON.stringify(request.params));
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: 'power-platform-orchestrator',
      version: '1.0.0'
    }
  };
});

// Add list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 Tools list requested');
  return {
    tools: [
      {
        name: 'list_templates',
        description: 'List available Power Platform project templates',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter templates by category',
              enum: ['standard', 'enterprise', 'quickstart', 'all']
            }
          }
        }
      },
      {
        name: 'validate_prd',
        description: 'Validate a Project Requirements Document (PRD)',
        inputSchema: {
          type: 'object',
          properties: {
            prd: {
              type: 'object',
              description: 'Project Requirements Document'
            }
          },
          required: ['prd']
        }
      },
      {
        name: 'create_project',
        description: 'Create a new Power Platform project',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project'
            },
            templateName: {
              type: 'string',
              description: 'Template to use'
            }
          },
          required: ['projectName', 'templateName']
        }
      }
    ]
  };
});

// Add call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error('🔧 Tool call requested:', request.params.name);
  
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'list_templates':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              templates: [
                {
                  name: 'standard-project',
                  displayName: 'Standard Project',
                  description: 'Standard Power Platform project with Azure DevOps integration',
                  version: '1.0.0'
                },
                {
                  name: 'enterprise-project',
                  displayName: 'Enterprise Project', 
                  description: 'Enterprise-grade project with advanced features',
                  version: '2.0.0'
                }
              ]
            }, null, 2)
          }
        ]
      };
      
    case 'validate_prd':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              validation: {
                isValid: true,
                errors: [],
                suggestions: ['PRD structure looks good!']
              }
            }, null, 2)
          }
        ]
      };
      
    case 'create_project':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              operation: {
                operationId: `proj_${Date.now()}`,
                status: 'running',
                message: `Creating project "${args.projectName}" with template "${args.templateName}"`
              }
            }, null, 2)
          }
        ]
      };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Handle any other requests to prevent timeouts
server.setRequestHandler({ method: 'notifications/cancelled' }, async (request) => {
  console.error('❌ Request cancelled:', request.params);
  return { success: true };
});

async function main() {
  console.error('📡 Creating transport...');
  const transport = new StdioServerTransport();
  
  console.error('🔗 Connecting server to transport...');
  await server.connect(transport);
  
  console.error('✅ Fixed MCP server is running and ready!');
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.error('🛑 Server shutting down...');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Server failed to start:', error);
  process.exit(1);
});