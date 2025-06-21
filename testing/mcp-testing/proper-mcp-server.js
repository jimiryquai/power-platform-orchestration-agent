#!/usr/bin/env node

// Proper MCP Server following official documentation
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

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
              description: 'Project Requirements Document in standardized format',
              properties: {
                projectName: { type: 'string' },
                description: { type: 'string' },
                requirements: { type: 'object' }
              },
              required: ['projectName', 'description', 'requirements']
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
            customization: {
              type: 'object',
              description: 'Optional customization parameters'
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
  
  const { name, arguments: args } = request.params;
  
  try {
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
        const prd = args.prd;
        const errors = [];
        const suggestions = [];
        
        // Basic validation
        if (!prd.projectName || prd.projectName.length < 3) {
          errors.push('Project name must be at least 3 characters');
        }
        if (!prd.description || prd.description.length < 10) {
          errors.push('Description must be at least 10 characters');
        }
        if (!prd.requirements || Object.keys(prd.requirements).length === 0) {
          errors.push('Requirements section cannot be empty');
        }
        
        // Suggestions
        if (!prd.timeline) {
          suggestions.push('Consider adding a timeline section with project phases');
        }
        if (!prd.resources) {
          suggestions.push('Consider adding a resources section for team planning');
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                validation: {
                  isValid: errors.length === 0,
                  errors: errors,
                  suggestions: suggestions,
                  summary: errors.length === 0 
                    ? 'PRD validation passed' 
                    : `PRD validation failed with ${errors.length} errors`
                },
                message: errors.length === 0 ? 'PRD is valid' : 'PRD needs corrections'
              }, null, 2)
            }
          ]
        };

      case 'create_project':
        const operationId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { projectName, templateName, dryRun } = args;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                operation: {
                  operationId: operationId,
                  status: 'initializing',
                  projectName: projectName,
                  templateName: templateName,
                  dryRun: dryRun || false,
                  startedAt: new Date().toISOString(),
                  estimatedDuration: '5-10 minutes',
                  message: dryRun 
                    ? `Dry run: Simulating project creation for "${projectName}"` 
                    : `Starting project creation for "${projectName}"`
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
        const { operationId } = args;
        
        // Simulate different statuses
        const statuses = ['running', 'completed', 'failed'];
        const randomStatus = statuses[Math.floor(Math.random() * 2)]; // Mostly running or completed
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                operation: {
                  operationId: operationId,
                  status: randomStatus,
                  startedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                  completedAt: randomStatus === 'completed' ? new Date().toISOString() : null,
                  progress: {
                    totalSteps: 12,
                    completedSteps: randomStatus === 'completed' ? 12 : 8,
                    currentStep: randomStatus === 'completed' 
                      ? 'Project creation completed' 
                      : 'Creating Power Platform environments'
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
                message: `Operation ${operationId} is ${randomStatus}`
              }, null, 2)
            }
          ]
        };

      case 'get_template_details':
        const { templateName } = args;
        
        const templates = {
          'standard-project': {
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
                permissions: ['project creation', 'work item management', 'repository creation']
              },
              powerPlatform: {
                environments: 1,
                licenses: ['Power Apps', 'Power Automate'],
                permissions: ['system administrator']
              }
            },
            deliverables: [
              'Configured Azure DevOps project',
              'Power Platform development environment',
              'Base solution with core components',
              'CI/CD pipelines',
              'Documentation'
            ]
          },
          'enterprise-project': {
            name: 'enterprise-project',
            displayName: 'Enterprise Project',
            description: 'Advanced enterprise-grade implementation with multiple environments',
            version: '2.0.0',
            estimatedDuration: '8-12 weeks',
            complexity: 'high',
            phases: [
              'Enterprise Architecture Review',
              'Security & Compliance Setup',
              'Multi-Environment Provisioning',
              'Advanced Solution Development',
              'Integration Setup',
              'Performance Testing',
              'Production Deployment'
            ],
            requirements: {
              azureDevOps: {
                organization: 'required',
                permissions: ['organization admin', 'security management']
              },
              powerPlatform: {
                environments: 3,
                licenses: ['Power Apps', 'Power Automate', 'Power BI'],
                permissions: ['global administrator', 'power platform administrator']
              }
            },
            deliverables: [
              'Enterprise architecture documentation',
              'Multi-environment setup (Dev/Test/Prod)',
              'Advanced security configuration',
              'Integration with enterprise systems',
              'Performance benchmarks',
              'Comprehensive testing suite'
            ]
          }
        };
        
        const template = templates[templateName];
        
        if (!template) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Template '${templateName}' not found`
          );
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                template: template,
                message: `Template details for ${templateName}`
              }, null, 2)
            }
          ]
        };

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`❌ Error in tool ${name}:`, error);
    
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