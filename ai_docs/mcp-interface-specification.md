# Power Platform Orchestrator - MCP Interface Specification

## Overview

The Power Platform Orchestrator provides a client-agnostic interface through the Model Context Protocol (MCP) for automating enterprise-level Power Platform project setup and management. This specification defines the standardized interface that any MCP-compatible client can use to interact with the orchestrator.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │────│   MCP Server    │────│  Orchestration  │
│ (Claude Desktop,│    │    (This Spec)  │    │     Engine      │
│  Custom Apps)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼──────┐    ┌──────▼──────┐
            │ Azure DevOps │    │Power Platform│
            │ Integration  │    │ Integration │
            └──────────────┘    └─────────────┘
```

## Connection Information

### Server Execution
```bash
# Install globally
npm install -g power-platform-orchestration-agent

# Run MCP server
npx power-platform-orchestrator

# Or run locally
npm run start:mcp
```

### MCP Client Configuration
```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": ["power-platform-orchestrator"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-org",
        "AZURE_DEVOPS_PAT": "your-pat-token",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

## Available Tools

### 1. create_project

**Description**: Create a new Power Platform project with Azure DevOps integration

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "projectName": {
      "type": "string",
      "description": "Name of the project to create"
    },
    "templateName": {
      "type": "string",
      "description": "Template to use for project creation",
      "enum": ["standard-project", "enterprise-project", "quickstart"]
    },
    "description": {
      "type": "string",
      "description": "Project description"
    },
    "customization": {
      "type": "object",
      "description": "Project customization options",
      "properties": {
        "region": {
          "type": "string",
          "enum": ["unitedstates", "europe", "asia"]
        },
        "environmentCount": {
          "type": "number",
          "minimum": 1,
          "maximum": 10
        },
        "includeDevEnvironment": {
          "type": "boolean"
        }
      }
    },
    "options": {
      "type": "object",
      "description": "Execution options",
      "properties": {
        "dryRun": {
          "type": "boolean",
          "description": "Perform validation only without creating resources"
        },
        "skipAzureDevOps": {
          "type": "boolean",
          "description": "Skip Azure DevOps project creation"
        },
        "skipPowerPlatform": {
          "type": "boolean",
          "description": "Skip Power Platform environment creation"
        },
        "skipAppRegistration": {
          "type": "boolean",
          "description": "Skip Azure AD app registration"
        }
      }
    }
  },
  "required": ["projectName", "templateName"]
}
```

**Response Format**:
```json
{
  "success": true,
  "operationId": "proj_1234567890_abc123def",
  "status": "started|running|completed|failed",
  "progress": {
    "totalSteps": 12,
    "completedSteps": 3,
    "currentStep": "Creating Azure DevOps project"
  },
  "message": "Project creation initiated successfully"
}
```

### 2. get_project_status

**Description**: Get the status of a project creation operation

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "operationId": {
      "type": "string",
      "description": "Operation ID returned from create_project"
    }
  },
  "required": ["operationId"]
}
```

**Response Format**:
```json
{
  "success": true,
  "operation": {
    "operationId": "proj_1234567890_abc123def",
    "status": "running",
    "startedAt": "2024-01-15T10:30:00Z",
    "progress": {
      "totalSteps": 12,
      "completedSteps": 8,
      "currentStep": "Creating Power Platform environments"
    },
    "logs": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "level": "info",
        "message": "Starting project creation"
      }
    ]
  },
  "message": "Operation status: running"
}
```

### 3. list_templates

**Description**: List available project templates

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "description": "Filter templates by category",
      "enum": ["standard", "enterprise", "quickstart", "all"]
    }
  }
}
```

**Response Format**:
```json
{
  "success": true,
  "templates": [
    {
      "name": "standard-project",
      "displayName": "Standard Project",
      "description": "Standard Power Platform project with Azure DevOps integration",
      "version": "1.0.0",
      "tags": ["standard", "azure-devops", "power-platform"],
      "parameters": [
        {
          "name": "projectName",
          "displayName": "Project Name",
          "description": "Name of the project to create",
          "type": "string",
          "required": true
        }
      ]
    }
  ],
  "totalCount": 3,
  "message": "Found 3 templates"
}
```

### 4. validate_prd

**Description**: Validate a Project Requirements Document (PRD) for orchestration

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "prd": {
      "type": "object",
      "description": "Project Requirements Document in standardized format",
      "properties": {
        "projectName": { "type": "string" },
        "description": { "type": "string" },
        "requirements": {
          "type": "object",
          "properties": {
            "azureDevOps": { "type": "object" },
            "powerPlatform": { "type": "object" },
            "integration": { "type": "object" }
          }
        },
        "timeline": { "type": "object" },
        "resources": { "type": "object" }
      },
      "required": ["projectName", "description", "requirements"]
    },
    "templateName": {
      "type": "string",
      "description": "Template to validate against"
    }
  },
  "required": ["prd"]
}
```

**Response Format**:
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "errors": [],
    "suggestions": []
  },
  "message": "PRD validation passed"
}
```

### 5. get_template_details

**Description**: Get detailed information about a specific project template

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "templateName": {
      "type": "string",
      "description": "Name of the template to retrieve details for"
    }
  },
  "required": ["templateName"]
}
```

**Response Format**:
```json
{
  "success": true,
  "template": {
    "name": "standard-project",
    "displayName": "Standard Project",
    "description": "Complete Power Platform project with Azure DevOps integration",
    "version": "1.0.0",
    "estimatedDuration": "4-6 weeks",
    "complexity": "moderate",
    "phases": [
      "Authentication Setup",
      "Azure DevOps Project Creation",
      "Power Platform Environment Setup"
    ],
    "requirements": {
      "azureDevOps": {
        "organization": "required",
        "permissions": ["project creation", "work item management"]
      }
    }
  },
  "message": "Template details for standard-project"
}
```

## PRD (Project Requirements Document) Format

### Standard PRD Structure

```json
{
  "projectName": "MyPowerPlatformProject",
  "description": "A comprehensive Power Platform solution for customer management",
  "requirements": {
    "azureDevOps": {
      "organization": "myorg",
      "projectTemplate": "Agile",
      "workItemTypes": ["Epic", "Feature", "User Story", "Task"],
      "repositories": ["main-solution", "deployment-scripts"],
      "pipelines": {
        "ci": true,
        "cd": true,
        "environments": ["dev", "test", "prod"]
      }
    },
    "powerPlatform": {
      "environments": [
        {
          "name": "Development",
          "type": "development",
          "region": "unitedstates",
          "sku": "Developer"
        },
        {
          "name": "Production",
          "type": "production",
          "region": "unitedstates",
          "sku": "Production"
        }
      ],
      "solutions": [
        {
          "name": "CustomerManagement",
          "description": "Main customer management solution",
          "components": ["entities", "forms", "views", "workflows"]
        }
      ],
      "publisher": {
        "name": "MyOrganization",
        "prefix": "myorg"
      }
    },
    "integration": {
      "authentication": "service-principal",
      "permissions": {
        "powerPlatform": ["system-administrator"],
        "azureDevOps": ["project-administrator"]
      },
      "dataConnections": ["sharepoint", "sql-server"],
      "apis": ["microsoft-graph", "custom-api"]
    }
  },
  "timeline": {
    "estimatedDuration": "6 weeks",
    "phases": [
      {
        "name": "Setup",
        "duration": "1 week",
        "deliverables": ["Azure DevOps project", "Development environment"]
      },
      {
        "name": "Development",
        "duration": "4 weeks",
        "deliverables": ["Core solution", "Test cases"]
      },
      {
        "name": "Deployment",
        "duration": "1 week",
        "deliverables": ["Production deployment", "Documentation"]
      }
    ]
  },
  "resources": {
    "team": {
      "projectManager": 1,
      "developers": 2,
      "testers": 1
    },
    "infrastructure": {
      "environments": 2,
      "storage": "standard",
      "monitoring": "basic"
    }
  }
}
```

## Error Handling

All tools return a consistent error format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "problemField",
    "expected": "string",
    "received": "number"
  }
}
```

### Common Error Codes

- `INVALID_PARAMS`: Missing or invalid input parameters
- `TEMPLATE_NOT_FOUND`: Specified template does not exist
- `OPERATION_NOT_FOUND`: Operation ID not found
- `AUTHENTICATION_FAILED`: Invalid or expired credentials
- `QUOTA_EXCEEDED`: Resource quota limits exceeded
- `VALIDATION_ERROR`: PRD or input validation failed
- `INTERNAL_ERROR`: Server-side processing error

## Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_DEVOPS_ORG` | Azure DevOps organization name | `myorganization` |
| `AZURE_DEVOPS_PAT` | Personal Access Token for Azure DevOps | `abc123...` |
| `AZURE_CLIENT_ID` | Service Principal Client ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_SECRET` | Service Principal Client Secret | `secret123...` |
| `AZURE_TENANT_ID` | Azure Active Directory Tenant ID | `87654321-4321-4321-4321-210987654321` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `POWER_PLATFORM_DEFAULT_REGION` | Default Power Platform region | `unitedstates` |
| `ENABLE_PARALLEL_EXECUTION` | Enable parallel phase execution | `true` |
| `DEBUG_LOGGING` | Enable debug logging | `false` |
| `MCP_SERVER_NAME` | MCP server name | `power-platform-orchestrator` |
| `MAX_RETRIES` | Maximum retry attempts | `3` |
| `TIMEOUT_MS` | Operation timeout in milliseconds | `300000` |

## Usage Examples

### Example 1: Create Standard Project

```typescript
// MCP Client Code
await mcpClient.callTool('create_project', {
  projectName: 'CustomerPortal',
  templateName: 'standard-project',
  description: 'Customer self-service portal',
  customization: {
    region: 'unitedstates',
    environmentCount: 2,
    includeDevEnvironment: true
  },
  options: {
    dryRun: false,
    skipAzureDevOps: false,
    skipPowerPlatform: false,
    skipAppRegistration: false
  }
});
```

### Example 2: Validate PRD

```typescript
// MCP Client Code
await mcpClient.callTool('validate_prd', {
  prd: {
    projectName: 'MyProject',
    description: 'Project description',
    requirements: {
      azureDevOps: { organization: 'myorg' },
      powerPlatform: { environments: [] },
      integration: { authentication: 'service-principal' }
    }
  },
  templateName: 'standard-project'
});
```

### Example 3: Monitor Progress

```typescript
// Create project
const createResponse = await mcpClient.callTool('create_project', {...});
const operationId = createResponse.operationId;

// Poll for status
const statusResponse = await mcpClient.callTool('get_project_status', {
  operationId: operationId
});
```

## Integration with Claude Desktop

### MCP Configuration for Claude Desktop

Create or update `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": ["power-platform-orchestration-agent"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-organization",
        "AZURE_DEVOPS_PAT": "your-personal-access-token",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "AZURE_TENANT_ID": "your-tenant-id",
        "POWER_PLATFORM_DEFAULT_REGION": "unitedstates",
        "ENABLE_PARALLEL_EXECUTION": "true",
        "DEBUG_LOGGING": "false"
      }
    }
  }
}
```

### Sample Claude Desktop Conversation

```
User: "I have a PRD for a new customer management system. Can you help me create the Power Platform project?"

Claude: "I can help you create a Power Platform project from your PRD. First, let me validate the PRD structure and then we can proceed with project creation.

Could you share your PRD? I'll use the validate_prd tool to check it, then create_project to set up your customer management system."

User: [Shares PRD document]

Claude: [Calls validate_prd tool, then create_project tool, then monitors progress with get_project_status]
```

## Security Considerations

### Authentication Flow
1. Service Principal credentials are provided via environment variables
2. MCP server authenticates with Azure services using these credentials
3. All API calls are made server-side with proper authentication
4. No credentials are exposed to the MCP client

### Access Control
- Service Principal requires appropriate permissions for Azure DevOps and Power Platform
- Principle of least privilege should be applied
- Regular credential rotation recommended

### Data Privacy
- PRD data is processed in-memory only
- No sensitive data is logged or persisted
- All communications use secure channels

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify service principal credentials
   - Check permissions in Azure DevOps and Power Platform
   - Ensure tenant ID is correct

2. **Template Not Found**
   - Use `list_templates` to see available templates
   - Check template name spelling and case

3. **Operation Timeouts**
   - Check network connectivity
   - Increase `TIMEOUT_MS` for large projects
   - Use `dryRun: true` to validate without creating resources

4. **Environment Creation Failures**
   - Verify Power Platform licensing
   - Check regional availability
   - Ensure quota limits are not exceeded

### Debug Logging

Enable debug logging for troubleshooting:

```bash
DEBUG_LOGGING=true npx power-platform-orchestrator
```

## Version Information

- **Specification Version**: 1.0.0
- **MCP Protocol Version**: 1.0.0
- **Compatible Clients**: Claude Desktop, Custom MCP clients
- **Last Updated**: January 2024

---

This specification defines the complete interface for interacting with the Power Platform Orchestrator via the Model Context Protocol, enabling client-agnostic automation of enterprise Power Platform project setup.