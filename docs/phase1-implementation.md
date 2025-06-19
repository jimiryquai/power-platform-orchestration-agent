# Phase 1 Implementation Guide

This document details the Phase 1 implementation of the Power Platform Enterprise Orchestration Agent, covering the foundation and core integration components.

## Phase 1 Objectives

**Milestone: Basic Orchestration Engine**

Build the foundational components that demonstrate the core orchestration capabilities using Microsoft's official Azure DevOps MCP server and establish the basic template system.

### Key Deliverables

1. **n8n Environment Setup** - Complete n8n configuration with custom node support
2. **Microsoft Azure DevOps MCP Integration** - Full integration with official MCP server  
3. **PAC CLI Integration** - Power Platform environment management capabilities
4. **Template System** - Basic S Project template with YAML configuration
5. **Orchestration Engine** - Core workflow coordination and execution

### Acceptance Criteria

- ✅ Agent can create Azure DevOps project with basic configuration using official Microsoft MCP
- ⏳ Single environment can be provisioned via natural language command
- ⏳ Basic progress monitoring and status reporting functional
- ⏳ Template-based project creation working for standard S Project using official Azure DevOps MCP tools

## Technical Architecture

### Core Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   REST API      │    │   Orchestrator  │    │   Integrations  │
│                 │───▶│                 │───▶│                 │
│ - Health check  │    │ - Template mgmt │    │ - Azure DevOps  │
│ - Commands      │    │ - Workflow exec │    │ - Power Platform│
│ - Projects      │    │ - Status track  │    │ - n8n Workflows │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Templates     │    │   Configuration │    │   External APIs │
│                 │    │                 │    │                 │
│ - S Project     │    │ - Environment   │    │ - Azure DevOps  │
│ - Custom types  │    │ - Connections   │    │ - Power Platform│
│ - Validation    │    │ - Credentials   │    │ - n8n Instance  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Implementation Components

### 1. Configuration Management

**File**: `src/config/index.js`

**Purpose**: Centralized configuration with environment variable validation

**Key Features**:
- Service connection settings for all integrations
- Environment-specific configurations
- Credential management and validation
- Template directory configuration

**Example Configuration**:
```javascript
{
  azure: {
    devops: {
      organization: process.env.AZURE_DEVOPS_ORG,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT
    }
  },
  mcp: {
    azureDevOps: {
      enabled: true,
      serverName: 'azure-devops'
    }
  }
}
```

### 2. Azure DevOps MCP Integration

**File**: `src/integrations/azure-devops/mcp-client.js`

**Purpose**: Interface with Microsoft's official Azure DevOps MCP server

**Key Operations**:
- Project creation and configuration
- Work item management (epics, features, user stories)
- Sprint and iteration setup
- Repository and branching configuration
- Build pipeline management

**MCP Commands Used**:
- `project_create` - Create new Azure DevOps projects
- `wit_create_work_item` - Create work items with hierarchy
- `work_create_iterations` - Set up sprint structure
- `repo_list_repos_by_project` - Repository management
- `build_get_definitions` - Pipeline configuration

**Example Usage**:
```javascript
const client = new AzureDevOpsMCPClient();
await client.connect();

const project = await client.createProject({
  name: 'CustomerPortal',
  description: 'Customer portal application',
  processTemplate: 'Agile'
});
```

### 3. Power Platform Integration

**File**: `src/integrations/power-platform/pac-client.js`

**Purpose**: Power Platform environment and solution management via PAC CLI

**Key Operations**:
- Environment provisioning with Dataverse
- Solution creation and deployment
- Security role configuration
- Data import/export operations

**PAC Commands Used**:
- `pac admin create` - Environment provisioning
- `pac solution init` - Solution initialization
- `pac solution export/import` - Solution lifecycle
- `pac data export/import` - Data operations

**Example Usage**:
```javascript
const client = new PACClient();
await client.authenticate();

const environment = await client.createEnvironment({
  name: 'customerportal-dev',
  displayName: 'Customer Portal Development',
  location: 'northeurope',
  dataverse: true
});
```

### 4. n8n Workflow Management

**File**: `src/integrations/n8n/workflow-manager.js`

**Purpose**: n8n workflow creation, execution, and monitoring

**Key Operations**:
- Workflow CRUD operations via n8n API
- Execution management and monitoring
- Template-based workflow generation
- Dynamic workflow creation from project templates

**n8n API Integration**:
- REST API for workflow management
- Webhook support for event-driven execution
- Execution status monitoring
- Error handling and retry logic

**Example Usage**:
```javascript
const manager = new N8NWorkflowManager();
const workflow = await manager.createProjectSetupWorkflow({
  projectName: 'CustomerPortal',
  template: 's-project-template'
});
```

### 5. Project Orchestrator

**File**: `src/workflows/orchestrator.js`

**Purpose**: Main orchestration engine coordinating all project setup phases

**Key Features**:
- Template loading and validation
- Multi-phase project setup execution
- Parallel processing where possible
- Error handling and rollback capabilities
- Status tracking and reporting

**Orchestration Phases**:
1. **Template Processing** - Load and validate project template
2. **Azure DevOps Setup** - Create project, sprints, and work items
3. **Power Platform Setup** - Provision environments in parallel
4. **n8n Workflow Creation** - Generate monitoring workflows

**Example Flow**:
```javascript
const orchestrator = new ProjectOrchestrator();
await orchestrator.initialize();

const result = await orchestrator.setupProject({
  projectName: 'CustomerPortal',
  templateName: 's-project-template',
  description: 'Customer portal application'
});
```

### 6. Template System

**File**: `src/templates/s-project-template.yaml`

**Purpose**: YAML-based project templates with comprehensive configuration

**Template Structure**:
```yaml
projectTemplate:
  name: "S Project Template"
  duration: 12 # weeks
  sprintCount: 6
  environments:
    - name: "Development"
      type: "development"
      region: "northeurope"
  azureDevOps:
    processTemplate: "Agile"
    repositoryStrategy: "GitFlow"
  
workItemTemplates:
  epics:
    - name: "Environment Setup"
      description: "Configure environments"
      estimatedEffort: "1 sprint"
```

### 7. REST API Layer

**File**: `src/api/routes.js`

**Purpose**: HTTP API for orchestration operations and natural language commands

**Endpoints**:
- `GET /api/health` - System health and connection status
- `GET /api/templates` - Available project templates
- `POST /api/projects` - Create new project from template
- `POST /api/commands` - Natural language command processing

**Natural Language Processing**:
- Basic intent recognition for project operations
- Parameter extraction from commands
- Suggestion engine for valid commands
- Context-aware command interpretation

**Example Commands**:
- *"Create new project CustomerPortal using s-template"*
- *"Show project status for execution abc123"*
- *"List available templates"*

## Setup and Configuration

### 1. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

**Required Environment Variables**:
```env
# Azure DevOps
AZURE_DEVOPS_ORG=your-org-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Azure Authentication
AZURE_CLIENT_ID=your-service-principal-id
AZURE_CLIENT_SECRET=your-service-principal-secret
AZURE_TENANT_ID=your-tenant-id

# Power Platform
POWER_PLATFORM_TENANT_ID=your-pp-tenant-id
POWER_PLATFORM_CLIENT_ID=your-pp-client-id
POWER_PLATFORM_CLIENT_SECRET=your-pp-client-secret
```

### 2. MCP Server Configuration

Ensure the Azure DevOps MCP server is properly configured:

```bash
claude mcp list
# Should show: azure-devops

claude mcp get azure-devops
# Verify configuration
```

### 3. Development Environment

Start the complete development environment:

```bash
# Install dependencies
npm install

# Set up templates
npm run setup:templates

# Start development environment
npm run setup:dev

# Start the orchestrator
npm start
```

### 4. Service Verification

Test all service connections:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "connections": [
    {"service": "Azure DevOps MCP", "connected": true},
    {"service": "Power Platform", "connected": true},
    {"service": "n8n", "connected": true}
  ]
}
```

## Testing Phase 1 Implementation

### 1. Template Validation

```bash
node scripts/setup-templates.js
```

### 2. Create Test Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "TestProject",
    "templateName": "s-project-template",
    "description": "Phase 1 testing project"
  }'
```

### 3. Natural Language Command

```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Create new project CustomerPortal using s-template"
  }'
```

### 4. Monitor n8n Workflows

1. Access n8n interface: http://localhost:5678
2. Login with credentials from docker-compose
3. View automatically created workflows
4. Monitor execution status

## Current Implementation Status

### ✅ Completed Features

1. **Core Architecture** - All foundational components implemented
2. **Azure DevOps MCP Client** - Full integration with official MCP server
3. **Power Platform Integration** - PAC CLI wrapper with authentication
4. **Template System** - YAML-based S Project template
5. **REST API** - Basic endpoints with natural language support
6. **Docker Environment** - Complete development setup

### 🚧 In Progress Features

1. **Connection Testing** - Comprehensive service validation
2. **Error Handling** - Robust error recovery and rollback
3. **Status Tracking** - Real-time execution monitoring
4. **Template Loading** - Dynamic template validation and loading

### 📋 Next Steps

1. **Complete connection testing implementation**
2. **Add comprehensive error handling**
3. **Implement status tracking with Redis**
4. **Create integration test suite**
5. **Add advanced natural language processing**

## Troubleshooting

### Common Issues

1. **MCP Connection Failures**
   - Verify `claude mcp list` shows azure-devops
   - Check Azure DevOps PAT permissions
   - Ensure organization name is correct

2. **Power Platform Authentication**
   - Verify service principal has Power Platform admin rights
   - Check tenant ID configuration
   - Ensure PAC CLI is installed and accessible

3. **n8n Integration Issues**
   - Verify n8n is running on correct port
   - Check n8n API key configuration
   - Ensure network connectivity between services

### Debugging Tips

1. **Enable debug logging**:
   ```env
   LOG_LEVEL=debug
   ```

2. **Check service logs**:
   ```bash
   docker-compose logs -f orchestrator
   docker-compose logs -f n8n
   ```

3. **Test individual integrations**:
   ```javascript
   // Test in Node.js REPL
   const client = require('./src/integrations/azure-devops/mcp-client');
   const azClient = new client();
   await azClient.connect();
   ```

## Success Metrics

Phase 1 is considered successful when:

- ✅ All service connections test successfully
- ⏳ S Project template creates Azure DevOps project with sprints
- ⏳ Power Platform environments are provisioned automatically  
- ⏳ n8n workflows are generated and execute successfully
- ⏳ Natural language commands are processed correctly
- ⏳ End-to-end project setup completes in under 10 minutes

This Phase 1 implementation establishes the foundation for advanced workflow automation in subsequent phases while demonstrating the core orchestration capabilities with Microsoft's official tooling.