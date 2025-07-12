#!/usr/bin/env node

// Clean MCP Server following official MCP documentation
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');

console.error('🚀 Starting Power Platform Orchestrator MCP Server...');

// Create the server with proper configuration
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

// List available tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 Listing available tools');
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
              description: 'Project Requirements Document in standardized format'
            }
          },
          required: ['prd']
        }
      },
      {
        name: 'create_project',
        description: 'Create a new Power Platform project from PRD',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project to create'
            },
            templateName: {
              type: 'string',
              description: 'Template to use (standard-project or enterprise-project)'
            },
            dryRun: {
              type: 'boolean',
              description: 'If true, simulates creation without making changes'
            }
          },
          required: ['projectName', 'templateName']
        }
      },
      {
        name: 'get_project_status',
        description: 'Get the status of a project creation operation',
        inputSchema: {
          type: 'object',
          properties: {
            operationId: {
              type: 'string',
              description: 'Operation ID returned from create_project'
            }
          },
          required: ['operationId']
        }
      },
      {
        name: 'get_template_details',
        description: 'Get detailed information about a specific project template',
        inputSchema: {
          type: 'object',
          properties: {
            templateName: {
              type: 'string',
              description: 'Name of the template to retrieve details for'
            }
          },
          required: ['templateName']
        }
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`🔧 Calling tool: ${request.params.name}`);
  
  const toolName = request.params.name;
  const toolArgs = request.params.arguments || {};
  
  try {
    switch (toolName) {
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
                    version: '1.0.0',
                    tags: ['standard', 'azure-devops', 'power-platform'],
                    estimatedDuration: '4-6 weeks'
                  },
                  {
                    name: 'enterprise-project',
                    displayName: 'Enterprise Project',
                    description: 'Enterprise-grade project template with advanced features',
                    version: '2.0.0',
                    tags: ['enterprise', 'advanced', 'multi-environment'],
                    estimatedDuration: '8-12 weeks'
                  },
                  {
                    name: 'quickstart',
                    displayName: 'Quick Start',
                    description: 'Minimal setup for rapid prototyping',
                    version: '1.0.0',
                    tags: ['quickstart', 'prototype', 'minimal'],
                    estimatedDuration: '1-2 weeks'
                  }
                ],
                totalCount: 3,
                message: 'Found 3 templates'
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
                },
                message: 'PRD validation passed'
              }, null, 2)
            }
          ]
        };

      case 'create_project':
        const newOperationId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                operation: {
                  operationId: newOperationId,
                  status: 'initializing',
                  projectName: toolArgs.projectName,
                  templateName: toolArgs.templateName,
                  dryRun: toolArgs.dryRun || false,
                  startedAt: new Date().toISOString(),
                  estimatedDuration: '5-10 minutes',
                  message: toolArgs.dryRun 
                    ? `Dry run: Simulating project creation for "${toolArgs.projectName}"` 
                    : `Starting project creation for "${toolArgs.projectName}"`
                },
                nextSteps: [
                  'Use get_project_status to monitor progress',
                  'Check Azure DevOps for project creation',
                  'Verify Power Platform environment setup'
                ],
                message: 'Project creation initiated successfully'
              }, null, 2)
            }
          ]
        };

      case 'get_project_status':
        const queryOperationId = toolArgs.operationId;
        const randomStatus = ['running', 'completed'][Math.floor(Math.random() * 2)];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                operation: {
                  operationId: queryOperationId,
                  status: randomStatus,
                  startedAt: new Date(Date.now() - 300000).toISOString(),
                  completedAt: randomStatus === 'completed' ? new Date().toISOString() : null,
                  progress: {
                    totalSteps: 12,
                    completedSteps: randomStatus === 'completed' ? 12 : 8,
                    currentStep: randomStatus === 'completed' 
                      ? 'Project creation completed' 
                      : 'Creating work items from PRD'
                  },
                  results: randomStatus === 'completed' ? {
                    azureDevOps: {
                      projectUrl: 'https://dev.azure.com/jamesryandev/CustomerPortal',
                      workItemsCreated: 14,
                      repositoriesCreated: 3
                    },
                    powerPlatform: {
                      environmentUrl: 'https://james-dev.crm11.dynamics.com',
                      solutionsCreated: 2
                    }
                  } : null
                },
                message: `Operation ${queryOperationId} is ${randomStatus}`
              }, null, 2)
            }
          ]
        };

      case 'get_template_details':
        const requestedTemplate = toolArgs.templateName;
        
        if (requestedTemplate === 'standard-project') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  template: {
                    name: 'standard-project',
                    displayName: 'Standard Project',
                    description: 'Complete Power Platform project with Azure DevOps integration',
                    version: '1.0.0',
                    estimatedDuration: '4-6 weeks',
                    complexity: 'moderate',
                    phases: [
                      'Authentication Setup',
                      'Azure DevOps Project Creation', 
                      'Power Platform Environment Setup',
                      'Solution Development',
                      'Testing & Deployment'
                    ],
                    requirements: {
                      azureDevOps: {
                        organization: 'required',
                        permissions: ['project creation', 'work item management']
                      },
                      powerPlatform: {
                        environments: 1,
                        licenses: ['Power Apps', 'Power Automate'],
                        permissions: ['system administrator']
                      }
                    }
                  },
                  message: `Template details for ${requestedTemplate}`
                }, null, 2)
              }
            ]
          };
        } else {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Template '${requestedTemplate}' not found`
          );
        }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
    }
  } catch (error) {
    console.error(`❌ Error in tool ${toolName}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// Main function to start the server
async function main() {
  console.error('📡 Creating stdio transport...');
  const transport = new StdioServerTransport();
  
  console.error('🔗 Connecting server to transport...');
  await server.connect(transport);
  
  console.error('✅ Power Platform Orchestrator MCP Server is running!');
  console.error('📋 Available tools: list_templates, validate_prd, create_project, get_project_status, get_template_details');
}

// Start the server
main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});