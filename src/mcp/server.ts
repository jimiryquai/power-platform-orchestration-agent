// MCP Server - Model Context Protocol server for Power Platform Orchestration
// Provides client-agnostic interface for project orchestration via MCP

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import ProjectOrchestrator, { OrchestrationConfig } from '../orchestration/project-orchestrator';
import { 
  CreateProjectApiRequest, 
  ValidateTemplateRequest,
  ListTemplatesResponse 
} from '../types/api-contracts';
import { ProjectTemplate } from '../types/data-models';

// ============================================================================
// MCP Server Configuration
// ============================================================================

export interface McpServerConfig {
  readonly orchestrationConfig: OrchestrationConfig;
  readonly serverName?: string;
  readonly serverVersion?: string;
  readonly enableDebugLogging?: boolean;
}

// ============================================================================
// MCP Tool Definitions
// ============================================================================

interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, any>;
    readonly required?: readonly string[];
  };
}

const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'create_project',
    description: 'Create a new Power Platform project with Azure DevOps integration',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project to create'
        },
        templateName: {
          type: 'string',
          description: 'Template to use for project creation',
          enum: ['standard-project', 'enterprise-project', 'quickstart']
        },
        description: {
          type: 'string',
          description: 'Project description'
        },
        customization: {
          type: 'object',
          description: 'Project customization options',
          properties: {
            region: {
              type: 'string',
              enum: ['unitedstates', 'europe', 'asia']
            },
            environmentCount: {
              type: 'number',
              minimum: 1,
              maximum: 10
            },
            includeDevEnvironment: {
              type: 'boolean'
            }
          }
        },
        options: {
          type: 'object',
          description: 'Execution options',
          properties: {
            dryRun: {
              type: 'boolean',
              description: 'Perform validation only without creating resources'
            },
            skipAzureDevOps: {
              type: 'boolean',
              description: 'Skip Azure DevOps project creation'
            },
            skipPowerPlatform: {
              type: 'boolean',
              description: 'Skip Power Platform environment creation'
            },
            skipAppRegistration: {
              type: 'boolean',
              description: 'Skip Azure AD app registration'
            }
          }
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
    name: 'list_templates',
    description: 'List available project templates',
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
    description: 'Validate a Project Requirements Document (PRD) for orchestration',
    inputSchema: {
      type: 'object',
      properties: {
        prd: {
          type: 'object',
          description: 'Project Requirements Document in standardized format',
          properties: {
            projectName: { type: 'string' },
            description: { type: 'string' },
            requirements: {
              type: 'object',
              properties: {
                azureDevOps: { type: 'object' },
                powerPlatform: { type: 'object' },
                integration: { type: 'object' }
              }
            },
            timeline: { type: 'object' },
            resources: { type: 'object' }
          },
          required: ['projectName', 'description', 'requirements']
        },
        templateName: {
          type: 'string',
          description: 'Template to validate against'
        }
      },
      required: ['prd']
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
] as const;

// ============================================================================
// MCP Server Implementation
// ============================================================================

export class PowerPlatformMcpServer {
  private readonly server: Server;
  private readonly orchestrator: ProjectOrchestrator;
  private readonly config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.orchestrator = new ProjectOrchestrator(config.orchestrationConfig);
    
    this.server = new Server(
      {
        name: config.serverName || 'power-platform-orchestrator',
        version: config.serverVersion || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
    
    if (config.enableDebugLogging) {
      console.log('🔧 Power Platform MCP Server initialized', {
        serverName: this.server.name,
        toolCount: MCP_TOOLS.length,
        azureDevOpsOrg: config.orchestrationConfig.azureDevOps.organization
      });
    }
  }

  // ============================================================================
  // Server Lifecycle
  // ============================================================================

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('🚀 Power Platform MCP Server started');
    console.log(`📋 Available tools: ${MCP_TOOLS.map(t => t.name).join(', ')}`);
  }

  async stop(): Promise<void> {
    await this.server.close();
    console.log('🛑 Power Platform MCP Server stopped');
  }

  // ============================================================================
  // Tool Handler Setup
  // ============================================================================

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: MCP_TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'create_project':
            return await this.handleCreateProject(args);
          
          case 'get_project_status':
            return await this.handleGetProjectStatus(args);
          
          case 'list_templates':
            return await this.handleListTemplates(args);
          
          case 'validate_prd':
            return await this.handleValidatePrd(args);
          
          case 'get_template_details':
            return await this.handleGetTemplateDetails(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`Tool execution error [${name}]:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // ============================================================================
  // Tool Implementations
  // ============================================================================

  private async handleCreateProject(args: any): Promise<any> {
    this.validateArgs(args, ['projectName', 'templateName']);
    
    const request: CreateProjectApiRequest = {
      projectName: args.projectName,
      templateName: args.templateName,
      description: args.description,
      customization: args.customization
    };

    const options = args.options || {};
    
    console.log(`🚀 Creating project via MCP: ${request.projectName}`);
    
    const result = await this.orchestrator.createProject(request, options);
    
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              operationId: result.data.operationId,
              status: result.data.status,
              progress: result.data.progress,
              message: `Project creation ${options.dryRun ? 'validation' : 'initiated'} successfully`
            }, null, 2)
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
              message: 'Project creation failed'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async handleGetProjectStatus(args: any): Promise<any> {
    this.validateArgs(args, ['operationId']);
    
    console.log(`📊 Getting project status via MCP: ${args.operationId}`);
    
    const result = await this.orchestrator.getOperationStatus(args.operationId);
    
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              operation: result.data,
              message: `Operation status: ${result.data.status}`
            }, null, 2)
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
              message: 'Failed to get operation status'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async handleListTemplates(args: any): Promise<any> {
    console.log('📋 Listing templates via MCP');
    
    // In a real implementation, this would query a template repository
    const templates: ListTemplatesResponse = {
      templates: [
        {
          name: 'standard-project',
          displayName: 'Standard Project',
          description: 'Standard Power Platform project with Azure DevOps integration',
          version: '1.0.0',
          tags: ['standard', 'azure-devops', 'power-platform'],
          parameters: [
            {
              name: 'projectName',
              displayName: 'Project Name',
              description: 'Name of the project to create',
              type: 'string',
              required: true
            },
            {
              name: 'region',
              displayName: 'Azure Region', 
              description: 'Azure region for resource deployment',
              type: 'choice',
              required: false,
              defaultValue: 'unitedstates',
              allowedValues: ['unitedstates', 'europe', 'asia']
            }
          ]
        },
        {
          name: 'enterprise-project',
          displayName: 'Enterprise Project',
          description: 'Enterprise-grade project template with advanced features',
          version: '2.0.0',
          tags: ['enterprise', 'advanced', 'multi-environment'],
          parameters: [
            {
              name: 'projectName',
              displayName: 'Project Name',
              description: 'Name of the enterprise project',
              type: 'string',
              required: true
            },
            {
              name: 'environmentCount',
              displayName: 'Environment Count',
              description: 'Number of environments to create',
              type: 'number',
              required: false,
              defaultValue: 3
            }
          ]
        },
        {
          name: 'quickstart',
          displayName: 'Quickstart Project',
          description: 'Minimal project setup for rapid development',
          version: '1.0.0',
          tags: ['quickstart', 'minimal', 'rapid'],
          parameters: [
            {
              name: 'projectName',
              displayName: 'Project Name',
              description: 'Name of the quickstart project',
              type: 'string',
              required: true
            }
          ]
        }
      ]
    };

    const filteredTemplates = args.category && args.category !== 'all'
      ? templates.templates.filter(t => t.tags.includes(args.category))
      : templates.templates;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            templates: filteredTemplates,
            totalCount: filteredTemplates.length,
            message: `Found ${filteredTemplates.length} templates`
          }, null, 2)
        }
      ]
    };
  }

  private async handleValidatePrd(args: any): Promise<any> {
    this.validateArgs(args, ['prd']);
    
    console.log('✅ Validating PRD via MCP');
    
    const { prd, templateName } = args;
    
    // Basic PRD validation
    const validationErrors: string[] = [];
    
    if (!prd.projectName || typeof prd.projectName !== 'string') {
      validationErrors.push('Project name is required and must be a string');
    }
    
    if (!prd.description || typeof prd.description !== 'string') {
      validationErrors.push('Project description is required and must be a string');
    }
    
    if (!prd.requirements || typeof prd.requirements !== 'object') {
      validationErrors.push('Requirements section is required and must be an object');
    }
    
    if (templateName) {
      const validTemplates = ['standard-project', 'enterprise-project', 'quickstart'];
      if (!validTemplates.includes(templateName)) {
        validationErrors.push(`Invalid template name. Must be one of: ${validTemplates.join(', ')}`);
      }
    }

    const isValid = validationErrors.length === 0;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            validation: {
              isValid,
              errors: validationErrors,
              suggestions: isValid ? [] : [
                'Ensure all required fields are provided',
                'Check that field types match expected formats',
                'Review template compatibility'
              ]
            },
            message: isValid ? 'PRD validation passed' : 'PRD validation failed'
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetTemplateDetails(args: any): Promise<any> {
    this.validateArgs(args, ['templateName']);
    
    console.log(`📖 Getting template details via MCP: ${args.templateName}`);
    
    const { templateName } = args;
    
    // Mock template details - in real implementation would load from repository
    const templateDetails = {
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
          'Solution Creation',
          'Integration Configuration'
        ],
        requirements: {
          azureDevOps: {
            organization: 'required',
            permissions: ['project creation', 'work item management']
          },
          powerPlatform: {
            license: 'Power Platform Developer Plan or higher',
            permissions: ['environment creation', 'solution management']
          }
        }
      },
      'enterprise-project': {
        name: 'enterprise-project',
        displayName: 'Enterprise Project',
        description: 'Enterprise-grade template with governance and compliance',
        version: '2.0.0',
        estimatedDuration: '8-12 weeks',
        complexity: 'high',
        phases: [
          'Security Review',
          'Compliance Validation',
          'Multi-Environment Setup',
          'Advanced Configuration',
          'Production Deployment'
        ]
      },
      'quickstart': {
        name: 'quickstart',
        displayName: 'Quickstart Project',
        description: 'Minimal setup for rapid development',
        version: '1.0.0',
        estimatedDuration: '1-2 weeks',
        complexity: 'low',
        phases: [
          'Basic Authentication',
          'Single Environment Setup',
          'Simple Solution Creation'
        ]
      }
    };

    const details = templateDetails[templateName as keyof typeof templateDetails];
    
    if (!details) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Template '${templateName}' not found`,
              availableTemplates: Object.keys(templateDetails)
            }, null, 2)
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            template: details,
            message: `Template details for ${templateName}`
          }, null, 2)
        }
      ]
    };
  }

  // ============================================================================
  // Error Handling & Utilities
  // ============================================================================

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('🚨 MCP Server error:', error);
    };

    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down MCP server...');
      await this.stop();
      process.exit(0);
    });
  }

  private validateArgs(args: any, requiredFields: string[]): void {
    if (!args || typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidParams, 'Arguments must be an object');
    }

    for (const field of requiredFields) {
      if (!(field in args) || args[field] === undefined || args[field] === null) {
        throw new McpError(ErrorCode.InvalidParams, `Missing required field: ${field}`);
      }
    }
  }
}

export default PowerPlatformMcpServer;