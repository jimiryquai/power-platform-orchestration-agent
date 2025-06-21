#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
// Mock Operation Storage
// ============================================================================

const MOCK_OPERATIONS = new Map<string, any>();

// ============================================================================
// Working MCP Server Implementation
// ============================================================================

class WorkingMCPServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "power-platform-orchestrator",
      version: "1.0.0"
    });

    this.registerTools();
  }

  private registerTools(): void {
    // Tool 1: list_templates
    this.server.registerTool(
      "list_templates",
      {
        title: "List Power Platform Project Templates",
        description: "List available Power Platform project templates with filtering options",
        inputSchema: {
          category: z.enum(["standard", "enterprise", "quickstart", "all"]).optional()
        }
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
    this.server.registerTool(
      "validate_prd",
      {
        title: "Validate Project Requirements Document",
        description: "Validate a Project Requirements Document (PRD) for Power Platform project creation",
        inputSchema: {
          prd: z.object({
            projectName: z.string(),
            description: z.string(),
            requirements: z.object({}).passthrough(),
            timeline: z.object({}).passthrough().optional(),
            resources: z.object({}).passthrough().optional()
          })
        }
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
    this.server.registerTool(
      "create_project",
      {
        title: "Create Power Platform Project",
        description: "Create a new Power Platform project from a template (currently in mock mode)",
        inputSchema: {
          projectName: z.string(),
          templateName: z.string(),
          description: z.string().optional(),
          customization: z.object({}).passthrough().optional(),
          dryRun: z.boolean().optional()
        }
      },
      async (args) => {
        try {
          const { projectName, templateName, dryRun = false } = args;

          // Generate operation ID
          const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          console.error(`🚀 Creating project via MCP: ${projectName} (dryRun: ${dryRun})`);

          // Create mock operation
          const operation = {
            operationId,
            status: "initializing" as const,
            projectName,
            templateName,
            dryRun,
            startedAt: new Date().toISOString(),
            estimatedDuration: "30-45 minutes",
            message: `Project creation ${dryRun ? 'simulation' : 'operation'} initiated successfully`
          };

          // Store operation for status tracking
          MOCK_OPERATIONS.set(operationId, operation);

          // Simulate async processing
          setTimeout(() => {
            const op = MOCK_OPERATIONS.get(operationId);
            if (op) {
              op.status = "running";
              op.progress = {
                totalSteps: 5,
                completedSteps: 1,
                currentStep: "Creating Azure DevOps project"
              };
              MOCK_OPERATIONS.set(operationId, op);
            }
          }, 2000);

          const response = {
            success: true,
            operation,
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
    this.server.registerTool(
      "get_project_status",
      {
        title: "Get Project Creation Status",
        description: "Get the current status and progress of a project creation operation",
        inputSchema: {
          operationId: z.string()
        }
      },
      async (args) => {
        try {
          const { operationId } = args;
          const operation = MOCK_OPERATIONS.get(operationId);

          if (!operation) {
            const errorResponse = {
              success: false,
              operation: null,
              message: "Operation not found"
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }]
            };
          }

          // Simulate progress for demo
          if (operation.status === "running" && !operation.completedAt) {
            const elapsed = Date.now() - new Date(operation.startedAt).getTime();
            if (elapsed > 10000) { // Complete after 10 seconds for demo
              operation.status = "completed";
              operation.completedAt = new Date().toISOString();
              operation.progress = {
                totalSteps: 5,
                completedSteps: 5,
                currentStep: "Project creation complete"
              };
              operation.results = {
                azureDevOps: {
                  projectUrl: "https://dev.azure.com/jamesryandev/TestProject",
                  workItemsCreated: 12,
                  repositoriesCreated: 2
                },
                powerPlatform: {
                  environmentUrl: "https://james-dev.crm11.dynamics.com",
                  solutionsCreated: 1
                }
              };
              MOCK_OPERATIONS.set(operationId, operation);
            }
          }

          const response = {
            success: true,
            operation,
            message: `Operation status: ${operation.status}`
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
    this.server.registerTool(
      "get_template_details",
      {
        title: "Get Template Details",
        description: "Get comprehensive information about a specific project template",
        inputSchema: {
          templateName: z.string()
        }
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

    // Tool 6: create_app_registration (mock implementation)
    this.server.registerTool(
      "create_app_registration",
      {
        title: "Create Azure AD App Registration",
        description: "Create a new Azure AD application registration (currently in mock mode - will be connected to real Graph API once TypeScript issues are resolved)",
        inputSchema: {
          applicationName: z.string(),
          signInAudience: z.enum(["AzureADMyOrg", "AzureADMultipleOrgs", "AzureADandPersonalMicrosoftAccount", "PersonalMicrosoftAccount"]).optional(),
          includeDynamicsPermissions: z.boolean().optional(),
          includePowerPlatformPermissions: z.boolean().optional(),
          createServicePrincipal: z.boolean().optional(),
          redirectUris: z.array(z.string()).optional()
        }
      },
      async (args) => {
        try {
          const { 
            applicationName, 
            signInAudience = "AzureADMyOrg",
            createServicePrincipal = true
          } = args;

          console.error(`🔐 Creating Azure AD application registration: ${applicationName} (MOCK MODE)`);

          // Generate mock app registration details
          const mockAppId = `12345678-1234-1234-1234-${Date.now().toString().slice(-12)}`;
          const mockObjectId = `87654321-4321-4321-4321-${Date.now().toString().slice(-12)}`;

          const response = {
            success: true,
            application: {
              id: mockObjectId,
              appId: mockAppId,
              displayName: applicationName,
              signInAudience,
              createdDateTime: new Date().toISOString(),
              servicePrincipal: createServicePrincipal ? {
                id: `sp-${mockObjectId}`,
                appId: mockAppId,
                displayName: applicationName,
                servicePrincipalType: "Application"
              } : undefined
            },
            nextSteps: [
              "Save the Application (client) ID for Azure DevOps service connections",
              "Create a client secret if needed for authentication",
              "Grant admin consent for the requested permissions",
              "Use this app registration to create Azure DevOps service connections",
              "NOTE: This is currently MOCK data - real Graph API integration will be enabled once TypeScript compilation issues are resolved"
            ],
            message: `Azure AD application '${applicationName}' created successfully (MOCK MODE)`,
            note: "This is currently returning mock data. Once TypeScript compilation issues are resolved, this will connect to the real Microsoft Graph API."
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
    
    console.error("🚀 Power Platform Orchestrator MCP Server started successfully (Working Version)");
    console.error("📋 Registered tools: list_templates, validate_prd, create_project, get_project_status, get_template_details, create_app_registration");
    console.error("ℹ️  Note: Currently running with mock implementations due to TypeScript compilation issues in dependencies");
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  try {
    console.error('🚀 Starting Power Platform Orchestrator MCP Server (Working Version)...');
    
    const server = new WorkingMCPServer();
    await server.start();
    
    console.error('✅ MCP Server is running and ready to accept connections');
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
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

export { WorkingMCPServer, main };
export default main;