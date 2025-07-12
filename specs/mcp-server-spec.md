# Power Platform Orchestration MCP Server Specification

## Overview
This document defines the requirements and specifications for the Power Platform Orchestration MCP Server that enables Claude Desktop users to create and manage Power Platform projects through conversational AI.

## Server Identity
- **Name**: `power-platform-orchestrator`
- **Version**: `1.0.0`
- **Description**: Intelligent conversational orchestration agent for Power Platform project setup and management

## Required Tools

### 1. list_templates
**Purpose**: List available Power Platform project templates

**Input Schema**:
```typescript
{
  category?: "standard" | "enterprise" | "quickstart" | "all"
}
```

**Output**: List of available templates with metadata
```typescript
{
  success: boolean;
  templates: Array<{
    name: string;
    displayName: string;
    description: string;
    version: string;
    tags: string[];
    estimatedDuration: string;
  }>;
  totalCount: number;
  message: string;
}
```

### 2. validate_prd
**Purpose**: Validate a Project Requirements Document (PRD)

**Input Schema**:
```typescript
{
  prd: {
    projectName: string;
    description: string;
    requirements: object;
    timeline?: object;
    resources?: object;
  }
}
```

**Output**: Validation results with errors and suggestions
```typescript
{
  success: boolean;
  validation: {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
    summary: string;
  };
  message: string;
}
```

### 3. create_project
**Purpose**: Create a new Power Platform project from PRD

**Input Schema**:
```typescript
{
  projectName: string;
  templateName: string;
  description?: string;
  customization?: object;
  dryRun?: boolean;
}
```

**Output**: Project creation operation details
```typescript
{
  success: boolean;
  operation: {
    operationId: string;
    status: "initializing" | "running" | "completed" | "failed";
    projectName: string;
    templateName: string;
    dryRun: boolean;
    startedAt: string;
    estimatedDuration: string;
    message: string;
  };
  nextSteps: string[];
  message: string;
}
```

### 4. get_project_status
**Purpose**: Get the status of a project creation operation

**Input Schema**:
```typescript
{
  operationId: string;
}
```

**Output**: Current operation status and progress
```typescript
{
  success: boolean;
  operation: {
    operationId: string;
    status: "initializing" | "running" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    progress: {
      totalSteps: number;
      completedSteps: number;
      currentStep?: string;
    };
    results?: {
      azureDevOps?: {
        projectUrl: string;
        workItemsCreated: number;
        repositoriesCreated: number;
      };
      powerPlatform?: {
        environmentUrl: string;
        solutionsCreated: number;
      };
    };
  };
  message: string;
}
```

### 5. get_template_details
**Purpose**: Get detailed information about a specific project template

**Input Schema**:
```typescript
{
  templateName: string;
}
```

**Output**: Comprehensive template information
```typescript
{
  success: boolean;
  template: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    estimatedDuration: string;
    complexity: "low" | "moderate" | "high";
    phases: string[];
    requirements: {
      azureDevOps: {
        organization: string;
        permissions: string[];
      };
      powerPlatform: {
        environments: number;
        licenses: string[];
        permissions: string[];
      };
    };
  };
  message: string;
}
```

## Implementation Requirements

### 1. Technology Stack
- **Runtime**: Node.js with TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` (latest version)
- **Transport**: stdio (for Claude Desktop integration)
- **Validation**: Zod schemas for input validation

### 2. Error Handling
- All tools must handle errors gracefully
- Return structured error responses with meaningful messages
- Use appropriate MCP error codes
- Log errors to stderr for debugging

### 3. Response Format
All tool responses must follow MCP standards:
```typescript
{
  content: [{
    type: "text",
    text: string; // JSON.stringify of the actual response
  }]
}
```

### 4. Environment Variables
Required environment variables for production use:
- `AZURE_DEVOPS_ORG`: Azure DevOps organization
- `AZURE_DEVOPS_PAT`: Personal Access Token
- `AZURE_TENANT_ID`: Azure tenant ID
- `POWER_PLATFORM_ENVIRONMENT_URL`: Default Power Platform environment
- `DEBUG_LOGGING`: Enable debug logging (optional)

## Claude Desktop Integration

### Configuration File
Location: User's Claude Desktop config file

```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npm",
      "args": ["run", "start:mcp"],
      "cwd": "/absolute/path/to/project",
      "env": {
        "AZURE_DEVOPS_ORG": "...",
        "AZURE_DEVOPS_PAT": "...",
        "AZURE_TENANT_ID": "...",
        "POWER_PLATFORM_ENVIRONMENT_URL": "...",
        "DEBUG_LOGGING": "true"
      }
    }
  }
}
```

### Development Configuration
For TypeScript development:
```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npm",
      "args": ["run", "start:mcp:dev"],
      "cwd": "/absolute/path/to/project",
      "env": { "..." }
    }
  }
}
```

## Testing Requirements

### 1. Manual Testing
- Server starts without errors
- All 5 tools are available in Claude Desktop
- Tools respond with correct format
- Error cases are handled properly

### 2. Automated Testing
- Unit tests for each tool handler
- Integration tests with MCP protocol
- Validation of input/output schemas

### 3. End-to-End Testing
- Full project creation workflow
- Status monitoring throughout process
- Error recovery scenarios

## Performance Requirements

### 1. Startup Time
- Server must start within 5 seconds
- Claude Desktop timeout is typically 60 seconds

### 2. Response Time
- `list_templates`: < 1 second
- `validate_prd`: < 2 seconds
- `create_project`: < 3 seconds (initiation only)
- `get_project_status`: < 1 second
- `get_template_details`: < 1 second

### 3. Memory Usage
- Server should use < 100MB memory at startup
- Graceful handling of long-running operations

## Security Requirements

### 1. Authentication
- Secure handling of Azure credentials
- No logging of sensitive information
- Environment variable validation

### 2. Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention (if applicable)
- Path traversal prevention

### 3. Error Information
- No sensitive data in error messages
- Sanitized logs for debugging

## Future Enhancements

### Phase 2 Features
- Real Azure DevOps integration
- Actual Power Platform environment creation
- File system operations for project templates

### Phase 3 Features
- Advanced project customization
- Multi-environment deployment
- Integration with Microsoft Graph API

## Success Criteria

### MVP Success
1. ✅ Server compiles without TypeScript errors
2. ✅ Server starts successfully with `npm run start:mcp:dev`
3. ✅ All 5 tools appear in Claude Desktop
4. ✅ Each tool returns properly formatted responses
5. ✅ Basic project creation workflow works end-to-end

### Production Ready
1. Real integrations with Azure DevOps and Power Platform
2. Comprehensive error handling and logging
3. Performance meets requirements
4. Security requirements fulfilled
5. Automated test coverage > 80%