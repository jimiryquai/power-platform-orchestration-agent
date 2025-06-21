# Power Platform Orchestration Agent

An intelligent conversational orchestration agent that automates enterprise-level Power Platform project setup and management through client-agnostic MCP (Model Context Protocol) servers.

## Overview

This agent reduces project setup time from weeks to hours while ensuring consistency and compliance with enterprise standards. Built with native MCP (Model Context Protocol) integration, it provides a client-agnostic interface that can be used with any MCP-compatible client including Claude Desktop, custom applications, and automation tools.

## Key Features

- **Template-Based Project Setup**: Standard "S Project" template with 3 environments and 12-week duration
- **Azure DevOps Orchestration**: Full project, sprint, and repository automation using MCP servers
- **Power Platform Integration**: Environment provisioning and data model deployment via direct API integration
- **Client-Agnostic Interface**: MCP protocol enables integration with any compatible client (Claude Desktop, custom apps, automation tools)
- **Enterprise Security**: Service Principal authentication and comprehensive audit logging
- **Zero External Dependencies**: Direct API integration without workflow engines

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Clients   │    │   Orchestrator  │    │   Azure DevOps  │
│ Claude Desktop, │───▶│   MCP Server    │───▶│   REST APIs     │
│ Custom Apps,    │    │                 │    └─────────────────┘
│ Automation Tools│    │                 │    
└─────────────────┘    │                 │    ┌─────────────────┐
                       │                 │───▶│ Power Platform  │
                       │                 │    │   REST APIs     │
                       └─────────────────┘    └─────────────────┘
```

## Technology Stack

- **MCP Protocol**: Client-agnostic integration layer supporting multiple clients
- **Azure DevOps MCP**: Project and work item management
- **Power Platform APIs**: Direct Dataverse Web API and Admin API integration
- **TypeScript**: Strongly typed, enterprise-grade codebase
- **Node.js**: Runtime environment

## Quick Start

### For MCP Client Usage (Recommended)

```bash
# Install globally for npx usage
npm install -g power-platform-orchestration-agent

# Run MCP server
npx power-platform-orchestrator

# Or install locally and run
git clone https://github.com/your-org/power-platform-orchestration-agent
cd power-platform-orchestration-agent
npm install
npm run build
npm run start:mcp
```

### For Development

```bash
# Clone and install
git clone https://github.com/your-org/power-platform-orchestration-agent
cd power-platform-orchestration-agent
npm install

# Copy environment template
cp .env.example .env

# Configure your environment variables
# Edit .env with your Azure credentials

# Build the project
npm run build

# Start MCP server in development mode
npm run mcp:dev
```

## Configuration

### Required Environment Variables

**Minimal Setup (Recommended for first-time users):**
```bash
# Azure DevOps Configuration
AZURE_DEVOPS_ORG=your-org-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Azure Authentication
AZURE_USE_INTERACTIVE_AUTH=true
AZURE_TENANT_ID=your-tenant-id
```

**Full Setup (If you already have Service Principal):**
```bash
# Azure DevOps Configuration
AZURE_DEVOPS_ORG=your-org-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Azure Service Principal
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=your-service-principal-secret
AZURE_TENANT_ID=your-tenant-id
```

**Note**: The system can help create Azure Service Principals through interactive authentication if you don't have one already.

## MCP Integration

This project provides a unified MCP server that orchestrates multiple service integrations:

### Available MCP Tools

1. **`create_project`** - Create new Power Platform projects with Azure DevOps integration
2. **`get_project_status`** - Monitor project creation progress and status
3. **`list_templates`** - List available project templates
4. **`validate_prd`** - Validate Project Requirements Documents
5. **`get_template_details`** - Get detailed template information

### Service Integrations

- **Azure DevOps**: Project creation, work item management, repository setup
- **Power Platform**: Environment provisioning, solution management, component deployment
- **Microsoft Graph**: App registration, service principal creation, permission management

### Client Configuration

For Claude Desktop, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": ["power-platform-orchestration-agent"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-org",
        "AZURE_DEVOPS_PAT": "your-token",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-secret",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

## Project Structure

```
src/
├── integrations/       # MCP server integrations
│   ├── azure-devops/   # Azure DevOps API client
│   └── power-platform/ # Power Platform API client
├── templates/          # Project templates (YAML)
├── workflows/          # Orchestration logic
├── config/            # Configuration management
├── types/             # TypeScript interfaces
└── utils/             # Shared utilities
```

## Development

### Available Scripts

```bash
npm run mcp:dev      # Start MCP server in development mode
npm run start:mcp    # Start MCP server (production)
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Check code style
npm run typecheck    # Run TypeScript checks
```

### Code Quality Standards

- **Zero tolerance for `any` types** - Enterprise-grade type safety
- **Comprehensive interfaces** - Self-documenting code
- **TDD approach** - Integration-first testing (60/30/10 split)
- **Direct API integration** - No CLI dependencies

## Documentation

- [MCP Interface Specification](ai_docs/mcp-interface-specification.md) - Complete MCP protocol documentation
- [Project Notes](PROJECT_NOTES.md) - Architecture decisions and project history
- [Claude Instructions](CLAUDE.md) - Development guidelines and patterns
- [API Documentation](ai_docs/api-reference.md) - Integration endpoints
- [Templates](ai_docs/templates.md) - Project template documentation

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Contributing

1. Follow TypeScript strict mode guidelines
2. Maintain zero `any` types policy
3. Write integration tests for new features
4. Update documentation for API changes

## License

MIT License - see [LICENSE](LICENSE) for details.