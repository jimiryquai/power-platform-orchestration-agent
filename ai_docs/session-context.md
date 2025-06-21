# Power Platform Orchestration Agent - Session Context

## Quick Project Overview
An intelligent conversational orchestration agent that automates enterprise-level Power Platform project setup through Claude Desktop integration with specialized MCP servers.

## Current Status
- **Phase**: TypeScript migration in progress
- **Main Branch**: `main`
- **Architecture**: MCP-based with direct REST API integration
- **Target**: Enterprise automation with <2 hour project setup

## Essential Files to Read First
1. **CLAUDE.md** - Project instructions and development guidelines
2. **ai_docs/prd.md** - Complete product requirements and vision
3. **ai_docs/architecture-flow.md** - System architecture and data flow
4. **ai_docs/project-structure.md** - Codebase organization

## Key Development Commands
```bash
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Check code style  
npm run typecheck    # Run TypeScript checks
npm run build        # Build the project
```

## Critical Architecture Knowledge

### Power Platform Integration Patterns
- **NEVER** manually derive navigation properties
- Use `SchemaAwarePowerPlatformClient` in `src/integrations/power-platform/schema-aware-client.ts`
- Work with Display Names, not logical names
- Navigation properties auto-generated from schema

### Test Environment
- **URL**: `https://james-dev.crm11.dynamics.com/api/data/v9.2`
- **Auth**: Interactive auth available with `AZURE_USE_INTERACTIVE_AUTH=true`

### TypeScript Migration Rules
- **ZERO TOLERANCE** for `any` type
- All functions MUST have explicit return types
- All parameters MUST be explicitly typed
- Prefer union types over enums

## Current Priority Tasks
1. Complete TypeScript migration
2. Implement MCP server integrations
3. Build template-driven automation
4. Add comprehensive test coverage

## Common Blockers & Solutions
- **Navigation Properties**: Use schema-aware client, don't guess
- **Authentication**: Service principal for automation, interactive for testing  
- **Rate Limiting**: Official Microsoft MCPs handle this automatically
- **Type Safety**: Use strict TypeScript, no shortcuts

## Recent Progress
- Major TypeScript migration milestone achieved
- Schema-aware Power Platform client implemented
- Enterprise-grade type safety established
- MCP architecture foundation complete

This context enables immediate productive development without needing to re-discover project patterns and constraints.