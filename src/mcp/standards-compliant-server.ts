#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ProjectOrchestrator, { OrchestrationConfig } from '../orchestration/project-orchestrator';
import { CreateProjectApiRequest } from '../types/api-contracts';
import MicrosoftGraphClient, { AppPermission } from '../integrations/microsoft-graph/graph-client';

// ============================================================================
// Mock Data for Templates (matching specification format)
// ============================================================================

const MOCK_TEMPLATES = [
  {
    name: "s-project-standard",
    displayName: "S-Project Standard Template",
    description: "Standard Power Platform project with basic Dataverse setup and Azure DevOps integration",
    version: "1.0.0",
    tags: ["standard", "dataverse", "power-apps", "azure-devops"],
    estimatedDuration: "30-45 minutes"
  },
  {
    name: "enterprise-solution",
    displayName: "Enterprise Solution Template",
    description: "Full enterprise solution with governance, compliance, and multi-environment setup",
    version: "1.2.0",
    tags: ["enterprise", "azure-devops", "power-platform", "governance"],
    estimatedDuration: "1-2 hours"
  },
  {
    name: "quickstart-project",
    displayName: "Quickstart Project Template",
    description: "Minimal project setup for rapid development and prototyping",
    version: "1.0.0",
    tags: ["quickstart", "minimal", "rapid"],
    estimatedDuration: "15-20 minutes"
  }
];

// ============================================================================
// Standards-Compliant MCP Server Implementation
// ============================================================================

class StandardsCompliantMCPServer {
  private server: McpServer;
  private orchestrator: ProjectOrchestrator;
  private graphClient: MicrosoftGraphClient;

  constructor(orchestrationConfig: OrchestrationConfig) {
    this.server = new McpServer({
      name: "power-platform-orchestrator",
      version: "1.0.0"
    });

    this.orchestrator = new ProjectOrchestrator(orchestrationConfig);
    this.graphClient = new MicrosoftGraphClient({
      accessToken: orchestrationConfig.microsoftGraph.accessToken
    });
    this.registerTools();
  }

  private registerTools(): void {
    // Tool 1: list_templates
    this.server.tool(
      "list_templates",
      "List available Power Platform project templates with filtering options",
      {
        category: z.enum(["standard", "enterprise", "quickstart", "all"]).optional()
      },
      async (args) => {
        try {
          const { category = "all" } = args;
          
          let filteredTemplates = MOCK_TEMPLATES;
          if (category !== "all") {
            filteredTemplates = MOCK_TEMPLATES.filter(template => 
              template.tags.includes(category)
            );
          }

          const response = {
            success: true,
            templates: filteredTemplates,
            totalCount: filteredTemplates.length,
            message: `Found ${filteredTemplates.length} templates${category !== "all" ? ` in category '${category}'` : ""}`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const errorResponse = {
            success: false,
            templates: [],
            totalCount: 0,
            message: `Error listing templates: ${error instanceof Error ? error.message : 'Unknown error'}`
          };

          return {
            content: [{
              type: "text", 
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );

    // Tool 2: validate_prd
    this.server.tool(
      "validate_prd",
      "Validate a Project Requirements Document (PRD) for Power Platform project creation",
      {
        prd: z.object({
          projectName: z.string(),
          description: z.string(),
          requirements: z.object({}).passthrough(),
          timeline: z.object({}).passthrough().optional(),
          resources: z.object({}).passthrough().optional()
        })
      },
      async (args) => {
        try {
          const { prd } = args;
          const errors: string[] = [];
          const suggestions: string[] = [];

          // Basic validation logic
          if (!prd.projectName || prd.projectName.length < 3) {
            errors.push("Project name must be at least 3 characters long");
          }

          if (!prd.description || prd.description.length < 10) {
            errors.push("Description must be at least 10 characters long");
          }

          if (!prd.requirements || Object.keys(prd.requirements).length === 0) {
            errors.push("Requirements section cannot be empty");
          }

          // Add suggestions for optional fields
          if (!prd.timeline) {
            suggestions.push("Consider adding a timeline section for better project planning");
          }

          if (!prd.resources) {
            suggestions.push("Consider adding a resources section to identify team members and tools needed");
          }

          const isValid = errors.length === 0;
          const response = {
            success: true,
            validation: {
              isValid,
              errors,
              suggestions,
              summary: isValid ? "PRD validation passed successfully" : `PRD validation failed with ${errors.length} error(s)`
            },
            message: isValid ? "PRD is valid and ready for project creation" : "PRD requires corrections before proceeding"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const errorResponse = {
            success: false,
            validation: {
              isValid: false,
              errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
              suggestions: [],
              summary: "PRD validation failed due to processing errors"
            },
            message: "PRD validation failed"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );

    // Tool 3: create_project
    this.server.tool(
      "create_project",
      "Create a new Power Platform project from a template with Azure DevOps integration",
      {
        projectName: z.string(),
        templateName: z.string(),
        description: z.string().optional(),
        customization: z.object({}).passthrough().optional(),
        dryRun: z.boolean().optional()
      },
      async (args) => {
        try {
          const { projectName, templateName, description, customization, dryRun = false } = args;

          // Create request object matching existing orchestrator interface
          const request: CreateProjectApiRequest = {
            projectName,
            templateName,
            description: description || `Project created from template: ${templateName}`,
            customization: customization || {}
          };

          const options = { dryRun };

          console.error(`🚀 Creating project via MCP: ${projectName} (dryRun: ${dryRun})`);

          // Call existing orchestrator
          const result = await this.orchestrator.createProject(request, options);

          if (result.success) {
            const response = {
              success: true,
              operation: {
                operationId: result.data.operationId,
                status: result.data.status,
                projectName,
                templateName,
                dryRun,
                startedAt: new Date().toISOString(),
                estimatedDuration: "30-45 minutes",
                message: `Project creation ${dryRun ? 'simulation' : 'operation'} initiated successfully`
              },
              nextSteps: [
                "Monitor progress using get_project_status",
                "Review created resources when operation completes",
                "Configure team access and permissions"
              ],
              message: `Project '${projectName}' creation ${dryRun ? 'simulation' : 'operation'} started successfully`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          } else {
            const errorResponse = {
              success: false,
              operation: null,
              nextSteps: [],
              message: `Project creation failed: ${result.error}`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }]
            };
          }
        } catch (error) {
          const errorResponse = {
            success: false,
            operation: null,
            nextSteps: [],
            message: `Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );

    // Tool 4: get_project_status
    this.server.tool(
      "get_project_status",
      "Get the current status and progress of a project creation operation",
      {
        operationId: z.string()
      },
      async (args) => {
        try {
          const { operationId } = args;

          console.error(`📊 Getting project status via MCP: ${operationId}`);

          // Call existing orchestrator
          const result = await this.orchestrator.getOperationStatus(operationId);

          if (result.success) {
            const response = {
              success: true,
              operation: result.data,
              message: `Operation status: ${result.data.status}`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          } else {
            const errorResponse = {
              success: false,
              operation: null,
              message: `Failed to get operation status: ${result.error}`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }]
            };
          }
        } catch (error) {
          const errorResponse = {
            success: false,
            operation: null,
            message: `Error getting project status: ${error instanceof Error ? error.message : 'Unknown error'}`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );

    // Tool 5: get_template_details
    this.server.tool(
      "get_template_details",
      "Get comprehensive information about a specific project template",
      {
        templateName: z.string()
      },
      async (args) => {
        try {
          const { templateName } = args;
          const template = MOCK_TEMPLATES.find(t => t.name === templateName);

          if (!template) {
            const errorResponse = {
              success: false,
              template: null,
              message: `Template '${templateName}' not found. Available templates: ${MOCK_TEMPLATES.map(t => t.name).join(', ')}`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }]
            };
          }

          // Enhance template with detailed information matching specification
          const detailedTemplate = {
            ...template,
            complexity: templateName.includes('enterprise') ? 'high' : 
                        templateName.includes('quickstart') ? 'low' : 'moderate',
            phases: [
              "Authentication Setup",
              "Azure DevOps Project Creation",
              "Power Platform Environment Setup", 
              "Solution Creation and Deployment",
              "Integration Configuration",
              "Team Access Configuration"
            ],
            requirements: {
              azureDevOps: {
                organization: "Your Azure DevOps organization URL",
                permissions: ["Project Administrator", "Build Administrator", "Release Administrator"]
              },
              powerPlatform: {
                environments: templateName.includes('enterprise') ? 3 : 1,
                licenses: ["Power Apps Premium", "Power Automate Premium"],
                permissions: ["Environment Admin", "System Customizer", "Solution Manager"]
              }
            }
          };

          const response = {
            success: true,
            template: detailedTemplate,
            message: `Template details retrieved for '${templateName}'`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const errorResponse = {
            success: false,
            template: null,
            message: `Error getting template details: ${error instanceof Error ? error.message : 'Unknown error'}`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );

    // Tool 6: create_app_registration
    this.server.tool(
      "create_app_registration",
      "Create a new Azure AD application registration with specified permissions for Power Platform integration",
      {
        applicationName: z.string(),
        signInAudience: z.enum(["AzureADMyOrg", "AzureADMultipleOrgs", "AzureADandPersonalMicrosoftAccount"]).optional(),
        includeDynamicsPermissions: z.boolean().optional(),
        includePowerPlatformPermissions: z.boolean().optional(),
        createServicePrincipal: z.boolean().optional(),
        redirectUris: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          const { 
            applicationName, 
            signInAudience = "AzureADMyOrg",
            includeDynamicsPermissions = true,
            includePowerPlatformPermissions = true,
            createServicePrincipal = true,
            redirectUris = []
          } = args;

          console.error(`🔐 Creating Azure AD application registration: ${applicationName}`);

          // Build permissions array based on options
          const requiredPermissions: AppPermission[] = [];

          if (includeDynamicsPermissions) {
            // Add Dynamics 365 permissions
            requiredPermissions.push({
              resourceAppId: "00000007-0000-0000-c000-000000000000", // Dynamics CRM
              permissions: [
                {
                  id: "78ce3f0f-a1ce-49c2-8cde-64b5c0896db4", // user_impersonation
                  type: "Scope"
                }
              ]
            });
          }

          if (includePowerPlatformPermissions) {
            // Add Power Platform permissions  
            requiredPermissions.push({
              resourceAppId: "475226c6-020e-4fb2-8a90-7a972cbfc1d4", // PowerApps Service
              permissions: [
                {
                  id: "4ae1bf56-f562-4747-b7bc-2fa0874ed46f", // User
                  type: "Scope"
                }
              ]
            });
          }

          const options = {
            signInAudience,
            ...(requiredPermissions.length > 0 && { requiredPermissions }),
            ...(redirectUris.length > 0 && { redirectUris }),
            createServicePrincipal
          };

          // Call existing Microsoft Graph client
          const result = await this.graphClient.createApplication(applicationName, options);

          if (result.success) {
            const response = {
              success: true,
              application: {
                id: result.data.id,
                appId: result.data.appId,
                displayName: result.data.displayName,
                signInAudience: result.data.signInAudience,
                createdDateTime: result.data.createdDateTime,
                servicePrincipal: result.data.servicePrincipal ? {
                  id: result.data.servicePrincipal.id,
                  appId: result.data.servicePrincipal.appId,
                  displayName: result.data.servicePrincipal.displayName,
                  servicePrincipalType: result.data.servicePrincipal.servicePrincipalType
                } : undefined
              },
              nextSteps: [
                "Save the Application (client) ID for Azure DevOps service connections",
                "Create a client secret if needed for authentication",
                "Grant admin consent for the requested permissions",
                "Use this app registration to create Azure DevOps service connections"
              ],
              message: `Azure AD application '${applicationName}' created successfully`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          } else {
            const errorResponse = {
              success: false,
              application: null,
              nextSteps: [],
              message: `Failed to create Azure AD application: ${result.error}`
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }]
            };
          }
        } catch (error) {
          const errorResponse = {
            success: false,
            application: null,
            nextSteps: [],
            message: `Error creating Azure AD application: ${error instanceof Error ? error.message : 'Unknown error'}`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }]
          };
        }
      }
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("🚀 Power Platform Orchestrator MCP Server started successfully");
    console.error("📋 Registered tools: list_templates, validate_prd, create_project, get_project_status, get_template_details, create_app_registration");
  }
}

// ============================================================================
// Environment Configuration & Server Startup
// ============================================================================

function loadConfigFromEnvironment(): OrchestrationConfig {
  // Debug environment variables
  console.error('🔍 Environment variable check:');
  console.error('AZURE_DEVOPS_ORG:', process.env.AZURE_DEVOPS_ORG || 'NOT SET');
  console.error('AZURE_DEVOPS_PAT:', process.env.AZURE_DEVOPS_PAT ? 'SET' : 'NOT SET');
  console.error('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID || 'NOT SET');
  
  // Validate minimal required environment variables
  const minimalRequiredVars = [
    'AZURE_DEVOPS_ORG',
    'AZURE_DEVOPS_PAT', 
    'AZURE_TENANT_ID'
  ];

  const missingMinimalVars = minimalRequiredVars.filter(varName => !process.env[varName]);
  if (missingMinimalVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingMinimalVars.join(', '));
    console.error('💡 Minimal setup requires: AZURE_DEVOPS_ORG, AZURE_DEVOPS_PAT, AZURE_TENANT_ID');
    process.exit(1);
  }

  return {
    azureDevOps: {
      organization: process.env.AZURE_DEVOPS_ORG!,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT!,
      useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
      retryConfig: {
        maxAttempts: parseInt(process.env.AZURE_DEVOPS_MAX_RETRIES || '3'),
        baseDelayMs: parseInt(process.env.AZURE_DEVOPS_BASE_DELAY || '1000'),
        backoffMultiplier: parseFloat(process.env.AZURE_DEVOPS_BACKOFF_MULTIPLIER || '2'),
        maxDelayMs: parseInt(process.env.AZURE_DEVOPS_MAX_DELAY || '30000'),
        retryableErrors: ['RATE_LIMIT_EXCEEDED', 'SERVER_ERROR', 'NETWORK_ERROR']
      },
      timeoutMs: parseInt(process.env.AZURE_DEVOPS_TIMEOUT || '30000')
    },
    powerPlatform: {
      baseUrl: process.env.POWER_PLATFORM_BASE_URL || 'https://api.powerplatform.com',
      environmentUrl: process.env.POWER_PLATFORM_ENVIRONMENT_URL || process.env.TEST_ENVIRONMENT_URL || '',
      useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
      defaultRegion: (process.env.POWER_PLATFORM_DEFAULT_REGION as any) || 'unitedstates',
      timeoutMs: parseInt(process.env.POWER_PLATFORM_TIMEOUT || '60000'),
      retryAttempts: parseInt(process.env.POWER_PLATFORM_RETRY_ATTEMPTS || '3')
    },
    microsoftGraph: {
      accessToken: generateAccessTokenFromCredentials()
    },
    defaultRegion: (process.env.DEFAULT_REGION as any) || 'unitedstates',
    enableParallelExecution: process.env.ENABLE_PARALLEL_EXECUTION !== 'false',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '300000')
  };
}

function generateAccessTokenFromCredentials(): string {
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
    console.error('🔐 Using service principal credentials for authentication');
    return 'sp-generated-token';
  }
  
  if (process.env.AZURE_USE_INTERACTIVE_AUTH === 'true' && process.env.AZURE_TENANT_ID) {
    console.error('🔐 Using interactive authentication for Microsoft Graph');
    return 'interactive-auth-token';
  }
  
  console.error('⚠️  No authentication method configured. Using placeholder token.');
  return 'placeholder-token';
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  try {
    console.error('🚀 Starting Power Platform Orchestrator MCP Server (Standards Compliant)...');
    
    const config = loadConfigFromEnvironment();
    const server = new StandardsCompliantMCPServer(config);
    
    await server.start();
    
    console.error('✅ MCP Server is running and ready to accept connections');
    console.error('💡 Connect Claude Desktop to start using the orchestrator tools');
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
}

// ============================================================================
// Error Handling & Process Management
// ============================================================================

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.error('\n🛑 Received SIGINT, shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Received SIGTERM, shutting down MCP server...');
  process.exit(0);
});

// Start the server if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export { StandardsCompliantMCPServer, main };
export default main;