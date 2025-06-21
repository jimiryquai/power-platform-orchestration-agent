# Claude Desktop Testing Setup Guide

## Prerequisites

1. **Node.js 18+** installed
2. **Azure DevOps organization** with appropriate permissions
3. **Azure account** with permissions to create app registrations (or existing Service Principal)
4. **Claude Desktop** installed

**Note**: You don't need an Azure Service Principal upfront - the system can help create one using your logged-in Azure credentials.

## Phase 2.1: Build and Validate

### 1. Install Dependencies
```bash
cd /path/to/power-platform-orchestration-agent
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Validate MCP Setup
```bash
npm run validate:mcp
```

If validation fails, address the reported issues before continuing.

## Phase 2.2: Environment Configuration

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Configure Required Variables
Edit `.env` with your Azure credentials:

**Option A: Minimal Setup (Recommended for first-time users)**
```bash
# Azure DevOps Configuration (Required)
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Azure Interactive Auth (for creating Service Principal)
AZURE_USE_INTERACTIVE_AUTH=true
AZURE_TENANT_ID=87654321-4321-4321-4321-210987654321

# Optional Configuration
POWER_PLATFORM_DEFAULT_REGION=unitedstates
ENABLE_PARALLEL_EXECUTION=true
DEBUG_LOGGING=true
```

**Option B: Full Setup (If you already have Service Principal)**
```bash
# Azure DevOps Configuration
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Azure Service Principal (if you already have one)
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_CLIENT_SECRET=your-service-principal-secret
AZURE_TENANT_ID=87654321-4321-4321-4321-210987654321

# Optional Configuration
POWER_PLATFORM_DEFAULT_REGION=unitedstates
ENABLE_PARALLEL_EXECUTION=true
DEBUG_LOGGING=false
```

### 3. Test Environment Variables
```bash
node -e "require('dotenv').config(); console.log('AZURE_DEVOPS_ORG:', process.env.AZURE_DEVOPS_ORG)"
```

## Phase 2.3: Claude Desktop Configuration

### 1. Locate Claude Desktop Config
Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration
Add this to your `claude_desktop_config.json`:

**Option A: Minimal Setup (Recommended)**
```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": ["power-platform-orchestration-agent"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-organization-name",
        "AZURE_DEVOPS_PAT": "your-personal-access-token",
        "AZURE_USE_INTERACTIVE_AUTH": "true",
        "AZURE_TENANT_ID": "your-tenant-id",
        "POWER_PLATFORM_DEFAULT_REGION": "unitedstates",
        "ENABLE_PARALLEL_EXECUTION": "true",
        "DEBUG_LOGGING": "true"
      }
    }
  }
}
```

**Option B: Full Setup (If you have Service Principal)**
```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": ["power-platform-orchestration-agent"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-organization-name",
        "AZURE_DEVOPS_PAT": "your-personal-access-token",
        "AZURE_CLIENT_ID": "your-service-principal-client-id",
        "AZURE_CLIENT_SECRET": "your-service-principal-secret",
        "AZURE_TENANT_ID": "your-tenant-id",
        "POWER_PLATFORM_DEFAULT_REGION": "unitedstates",
        "ENABLE_PARALLEL_EXECUTION": "true",
        "DEBUG_LOGGING": "false"
      }
    }
  }
}
```

### 3. Alternative: Local Development Setup
If you want to test with local development:

```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "node",
      "args": ["/absolute/path/to/power-platform-orchestration-agent/dist/mcp/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-organization-name",
        "AZURE_DEVOPS_PAT": "your-personal-access-token",
        "AZURE_CLIENT_ID": "your-service-principal-client-id",
        "AZURE_CLIENT_SECRET": "your-service-principal-secret",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

## Phase 2.4: Test PRD Document Creation

### Sample PRD for Testing
Create this test PRD:

```json
{
  "projectName": "Customer Management System",
  "description": "A comprehensive customer management solution with Power Platform and Azure DevOps integration",
  "requirements": {
    "azureDevOps": {
      "organization": "your-org",
      "projectTemplate": "Agile",
      "workItemTypes": ["Epic", "Feature", "User Story", "Task"],
      "repositories": ["customer-solution", "deployment-scripts"],
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

## Phase 2.5: Claude Desktop Testing

### 1. Restart Claude Desktop
Close and restart Claude Desktop to load the new MCP server configuration.

### 2. Test MCP Connection
In Claude Desktop, ask:
```
"Can you list the available Power Platform project templates?"
```

Expected response: Claude should use the `list_templates` tool and show available templates.

### 3. Test PRD Validation
In Claude Desktop, ask:
```
"Can you validate this PRD for me?" 
[paste the sample PRD from Phase 2.4]
```

Expected response: Claude should use the `validate_prd` tool and provide validation results.

### 4. Test Template Details
In Claude Desktop, ask:
```
"Can you show me details for the standard-project template?"
```

Expected response: Claude should use the `get_template_details` tool.

### 5. Test Service Principal Creation (If needed)
If you're using Option A (minimal setup), Claude can help create a Service Principal:
```
"I need to create an Azure Service Principal for Power Platform access. Can you help me create one with the appropriate permissions?"
```

Expected response: Claude should guide you through interactive authentication and use Microsoft Graph to create the Service Principal.

### 6. Test Project Creation (Dry Run)
In Claude Desktop, ask:
```
"Can you create a project using the standard-project template with these parameters:
- Project Name: Test Customer Portal
- Template: standard-project  
- Description: Test project for MCP validation
- Dry Run: true"
```

Expected response: Claude should use the `create_project` tool with dry run enabled.

### 7. Test Status Monitoring
After creating a project (dry run), ask:
```
"Can you check the status of operation [operation-id-from-previous-step]?"
```

Expected response: Claude should use the `get_project_status` tool.

## Troubleshooting

### MCP Server Not Loading
1. Check Claude Desktop logs (usually in application data folder)
2. Verify the `command` and `args` in MCP configuration
3. Test MCP server manually: `npx power-platform-orchestration-agent`

### Authentication Errors
1. Verify all environment variables are set correctly
2. Test Azure DevOps PAT: `curl -u :$AZURE_DEVOPS_PAT https://dev.azure.com/$AZURE_DEVOPS_ORG/_apis/projects`
3. Test Service Principal permissions in Azure Portal

### TypeScript Compilation Errors
1. Run `npm run typecheck` to see specific errors
2. Check Node.js version: `node --version` (should be 18+)
3. Clear and reinstall: `rm -rf node_modules package-lock.json && npm install`

### MCP Tool Execution Errors
1. Enable debug logging: `DEBUG_LOGGING=true` in environment
2. Check specific tool parameters match the expected schema
3. Verify Azure resources exist and are accessible

### Connection Timeouts
1. Increase timeout values in environment variables
2. Check network connectivity to Azure services
3. Verify firewall/proxy settings

## Success Indicators

✅ **MCP Server Loaded**: Claude Desktop shows Power Platform tools available  
✅ **Templates Listed**: `list_templates` returns standard, enterprise, and quickstart templates  
✅ **PRD Validation**: `validate_prd` correctly validates or identifies issues  
✅ **Template Details**: `get_template_details` shows comprehensive template information  
✅ **Dry Run Success**: `create_project` with dry run completes without errors  
✅ **Status Tracking**: `get_project_status` returns operation progress information  

## Typical First-Time User Workflow

### Scenario: User with Azure DevOps but no Service Principal

1. **Initial Setup** (Minimal credentials)
   ```bash
   # .env file
   AZURE_DEVOPS_ORG=mycompany
   AZURE_DEVOPS_PAT=dop_xxxxxxxxxxxxx
   AZURE_USE_INTERACTIVE_AUTH=true
   AZURE_TENANT_ID=12345678-1234-1234-1234-123456789012
   ```

2. **First Interaction with Claude**
   ```
   User: "I want to create a Power Platform project but I don't have a Service Principal set up yet."
   
   Claude: "I can help you with that! First, let me create an Azure Service Principal with the right permissions for Power Platform. This will require you to authenticate interactively."
   
   [Claude uses Microsoft Graph MCP tools to create Service Principal]
   ```

3. **Service Principal Creation**
   ```
   Claude: "I've created a Service Principal for you:
   - Application ID: abc123...
   - Client Secret: xyz789... (save this securely!)
   - Tenant ID: 12345678...
   
   You can now update your configuration to use these credentials for future operations."
   ```

4. **Project Creation**
   ```
   User: "Great! Now can you create a customer management project using the standard template?"
   
   Claude: "Absolutely! Let me create that project for you using the Service Principal we just set up."
   
   [Claude uses create_project with the new Service Principal credentials]
   ```

## Next Steps After Successful Testing

1. **Create Real Projects**: Remove `dryRun: true` for actual resource creation
2. **Test with Different Templates**: Try enterprise-project and quickstart templates
3. **Validate Azure Resources**: Check Azure DevOps and Power Platform for created resources
4. **Update Configuration**: Add Service Principal credentials to environment for future use
5. **Team Integration**: Share MCP configuration (with appropriate credentials) with team members

## Security Best Practices

- **Never commit Service Principal secrets** to version control
- **Use separate Service Principals** for different environments (dev/test/prod)
- **Rotate credentials regularly** and update MCP configuration
- **Use least privilege principle** - only grant necessary permissions
- **Store secrets securely** using Azure Key Vault or similar for production

---

This setup guide ensures comprehensive testing of the Power Platform Orchestrator MCP server with Claude Desktop, supporting both existing Service Principal users and those who need to create credentials through the system.