# Project Structure

This document outlines the organization and structure of the Power Platform Enterprise Orchestration Agent repository.

## Overview

The project is organized into logical modules that separate concerns between configuration, integrations, workflows, and APIs. This structure supports the Phase 1 implementation goals while providing a foundation for future phases.

## Directory Structure

```
power-platform-orchestration-agent/
├── src/                          # Main application source code
│   ├── config/                   # Configuration management
│   │   └── index.js             # Central configuration with env validation
│   ├── integrations/            # External service integrations
│   │   ├── azure-devops/        # Azure DevOps MCP integration
│   │   │   └── mcp-client.js    # MCP client for Azure DevOps operations
│   │   ├── power-platform/      # Power Platform integration
│   │   │   └── pac-client.js    # PAC CLI wrapper and operations
│   │   └── n8n/                 # n8n workflow management
│   │       └── workflow-manager.js # n8n API client and workflow operations
│   ├── workflows/               # Orchestration logic
│   │   └── orchestrator.js      # Main project orchestration engine
│   ├── templates/               # Project templates
│   │   └── s-project-template.yaml # Standard 12-week project template
│   ├── utils/                   # Utility functions
│   │   └── logger.js           # Winston-based logging configuration
│   ├── api/                     # REST API endpoints
│   │   └── routes.js           # Express routes for orchestration API
│   └── index.js                # Application entry point
├── docker/                      # Docker configuration
│   ├── docker-compose.yml      # Multi-service development environment
│   └── Dockerfile              # Application container definition
├── scripts/                     # Setup and utility scripts
│   └── setup-templates.js      # Template validation and setup
├── tests/                       # Test suites
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── docs/                        # Documentation
│   ├── prd.md                  # Product Requirements Document
│   ├── project-structure.md    # This file
│   ├── phase1-implementation.md # Phase 1 specific documentation
│   ├── templates.md            # Template system documentation
│   └── api-reference.md        # API endpoint documentation
├── logs/                        # Application logs (created at runtime)
├── package.json                # Node.js dependencies and scripts
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore patterns
└── README.md                   # Project overview and quick start
```

## Core Components

### Configuration (`src/config/`)

Central configuration management with environment variable validation and service connection settings.

- **Purpose**: Unified configuration for all integrations and services
- **Key Features**: Environment validation, service connection settings, template paths
- **Dependencies**: dotenv for environment variable management

### Integrations (`src/integrations/`)

Service-specific integration modules that abstract external API interactions.

#### Azure DevOps MCP Client (`src/integrations/azure-devops/mcp-client.js`)
- **Purpose**: Interface with Microsoft's official Azure DevOps MCP server
- **Key Operations**: Project creation, work item management, sprint setup, repository operations
- **Authentication**: Service principal via MCP server

#### PAC Client (`src/integrations/power-platform/pac-client.js`)
- **Purpose**: Power Platform environment and solution management
- **Key Operations**: Environment provisioning, solution deployment, data operations
- **Authentication**: Service principal authentication with Power Platform

#### n8n Workflow Manager (`src/integrations/n8n/workflow-manager.js`)
- **Purpose**: n8n workflow creation, execution, and monitoring
- **Key Operations**: Workflow CRUD operations, execution management, template generation
- **Authentication**: API key-based authentication with n8n instance

### Orchestration (`src/workflows/`)

Core business logic for project setup automation and workflow coordination.

#### Project Orchestrator (`src/workflows/orchestrator.js`)
- **Purpose**: Main orchestration engine coordinating all project setup phases
- **Key Features**: Template processing, parallel execution, error handling, status tracking
- **Integration**: Coordinates between Azure DevOps, Power Platform, and n8n services

### Templates (`src/templates/`)

YAML-based project templates defining standard project structures and configurations.

#### S Project Template (`src/templates/s-project-template.yaml`)
- **Purpose**: Standard 12-week Power Platform project template
- **Components**: Environment definitions, sprint structure, work item templates, deployment settings
- **Customization**: Supports parameter override and extension

### API Layer (`src/api/`)

REST API providing programmatic and natural language interfaces to the orchestration engine.

#### Routes (`src/api/routes.js`)
- **Endpoints**: Health check, template management, project creation, natural language commands
- **Features**: Request validation, async execution, status tracking
- **Integration**: Direct integration with Project Orchestrator

### Utilities (`src/utils/`)

Shared utility functions and services used across the application.

#### Logger (`src/utils/logger.js`)
- **Purpose**: Centralized logging with structured output
- **Features**: Multiple log levels, file and console output, JSON formatting
- **Configuration**: Environment-based log level configuration

## Docker Configuration

### Development Environment (`docker/docker-compose.yml`)
- **Services**: n8n, PostgreSQL, Redis, Orchestrator application
- **Purpose**: Complete development environment with all dependencies
- **Features**: Volume mounts for development, environment variable configuration

### Application Container (`docker/Dockerfile`)
- **Base**: Node.js 18 Alpine for minimal footprint
- **Dependencies**: PowerShell, PAC CLI, system utilities
- **Security**: Non-root user execution, health check configuration

## Phase 1 Implementation Status

### ✅ Completed Components
- [x] Repository structure and configuration
- [x] Azure DevOps MCP client integration
- [x] Power Platform PAC CLI integration
- [x] n8n workflow manager
- [x] Project orchestrator with template support
- [x] REST API with natural language parsing
- [x] Docker development environment
- [x] S Project template definition

### 🚧 In Progress Components
- [ ] Connection testing and validation
- [ ] Error handling and retry logic
- [ ] Status tracking and monitoring
- [ ] Template validation and loading

### 📋 Pending Components
- [ ] Comprehensive test suite
- [ ] Advanced natural language processing
- [ ] Workflow execution monitoring
- [ ] Production deployment configuration

## Extension Points

The architecture supports future enhancements through several extension points:

### Template System
- **Custom Templates**: New YAML templates can be added to `src/templates/`
- **Template Validation**: Enhanced validation logic in `scripts/setup-templates.js`
- **Dynamic Templates**: Runtime template generation and customization

### Integration Layer
- **New MCPs**: Additional MCP integrations can be added to `src/integrations/`
- **API Extensions**: New external APIs can be integrated following existing patterns
- **Authentication**: Pluggable authentication strategies for different services

### Orchestration Engine
- **Workflow Patterns**: New orchestration patterns can be added to `src/workflows/`
- **Parallel Processing**: Enhanced parallel execution with dependency management
- **Event Handling**: Webhook and event-driven workflow triggers

### Natural Language Processing
- **Command Parsing**: Enhanced NLP with dedicated parsing modules
- **Intent Recognition**: Machine learning-based intent classification
- **Context Management**: Conversation state and context preservation

## Development Guidelines

### Adding New Integrations
1. Create new directory under `src/integrations/`
2. Implement client class following existing patterns
3. Add configuration options to `src/config/index.js`
4. Include connection testing in orchestrator initialization
5. Add integration to Docker environment if needed

### Creating New Templates
1. Define template in YAML format under `src/templates/`
2. Follow existing template structure and naming conventions
3. Add validation logic to `scripts/setup-templates.js`
4. Test template loading and processing through orchestrator
5. Document template structure and customization options

### Extending API Endpoints
1. Add new routes to `src/api/routes.js`
2. Include request validation and error handling
3. Integrate with orchestrator operations
4. Add comprehensive logging for debugging
5. Update API documentation in `docs/api-reference.md`

This structure provides a solid foundation for the Phase 1 implementation while supporting the scalability and extensibility requirements outlined in the PRD.