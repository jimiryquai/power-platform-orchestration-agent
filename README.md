# Power Platform Enterprise Orchestration Agent

Intelligent orchestration agent using n8n that automates enterprise-level Power Platform project setup and management by integrating Microsoft's official Azure DevOps MCP server, Power Platform CLI, and other enterprise tools.

## Overview

This agent reduces project setup time from weeks to hours while ensuring consistency and compliance with enterprise standards. Built on n8n with native MCP integration and AI-powered natural language processing.

## Key Features

- **Template-Based Project Setup**: Standard "S Project" template with 3 environments and 12-week duration
- **Azure DevOps Orchestration**: Full project, sprint, and repository automation using Microsoft's official MCP
- **Power Platform Integration**: Environment provisioning and data model deployment
- **Natural Language Interface**: Conversational commands for complex workflows
- **Enterprise Security**: Service principal authentication and comprehensive audit logging

## Phase 1 Implementation Status

- [x] Repository structure setup
- [ ] n8n environment configuration
- [ ] Microsoft Azure DevOps MCP integration
- [ ] PAC CLI integration
- [ ] Basic template system
- [ ] Simple workflow orchestration

## Quick Start

```bash
# Install dependencies
npm install

# Set up development environment
npm run setup:dev

# Start the orchestration agent
npm start
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Natural       │    │      n8n        │    │   Microsoft     │
│   Language      │───▶│   Orchestration │───▶│   Azure DevOps  │
│   Interface     │    │     Engine      │    │      MCP        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Power Platform │
                       │   Environment   │
                       │   Management    │
                       └─────────────────┘
```

## Technology Stack

- **n8n**: Core orchestration engine
- **Microsoft Azure DevOps MCP**: Official first-party Azure DevOps integration
- **PAC CLI**: Power Platform operations
- **Redis**: State management
- **Node.js**: Runtime environment

## Project Structure

See [Project Structure](docs/project-structure.md) for detailed information.

## Documentation

- [PRD](docs/prd.md) - Product Requirements Document
- [Project Structure](docs/project-structure.md) - Repository organization
- [Phase 1 Implementation](docs/phase1-implementation.md) - Current phase details
- [Templates](docs/templates.md) - Project template documentation
- [API Reference](docs/api-reference.md) - Integration endpoints

## License

MIT License - see [LICENSE](LICENSE) for details.
