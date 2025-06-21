# Power Platform Orchestration Agent

## Project Overview
An intelligent conversational orchestration agent that automates enterprise-level Power Platform project setup and management through Claude Desktop integration with specialized MCP servers.

## Common Commands
```bash
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Check code style
npm run typecheck    # Run TypeScript checks
npm run build        # Build the project
```

## Key Files and Their Purpose
- `src/integrations/azure-devops/mcp-client.js` - Azure DevOps API integration (working)
- `src/integrations/power-platform/mcp-client.js` - Power Platform Dataverse API integration (working)
- `src/templates/s-project-template.yaml` - S-Project template definition
- `src/workflows/orchestrator.js` - Main orchestration logic (needs n8n removal)
- `src/config/index.js` - Environment configuration
- `ai_docs/architecture-decisions.md` - Architecture decisions and key insights
- `_project_progress/` - Session tracking and progress logs
- `ai_docs/session-context.md` - Quick session startup context
- `specs/` - Detailed technical specifications

## Power Platform / Dataverse Patterns (CRITICAL KNOWLEDGE)

### Lookup Field Navigation Properties
**NEVER FORGET**: In Dataverse Web API, lookup fields use navigation properties based on the Lookup.SchemaName from relationship definition:
- Lookup field logical name: `jr_parenttable`
- Relationship Lookup.SchemaName: `jr_ParentTable` (set during relationship creation)
- Navigation property: `jr_ParentTable@odata.bind`
- **CRITICAL**: The navigation property name comes from the Lookup.SchemaName, NOT from transforming the logical name
- Format: `"SchemaName@odata.bind": "/entitycollection(guid)"`
- Working example: `"jr_ParentTable@odata.bind": "/jr_parenttables(12345678-1234-1234-1234-123456789012)"`

### Session Efficiency Rules - AUTOMATED SOLUTION
**NEVER manually derive navigation properties again!** Use the schema-aware client:

1. **Use SchemaAwarePowerPlatformClient** - `src/integrations/power-platform/schema-aware-client.ts`
2. **Work with Display Names** - "Parent Table", "Child Table" (human-readable)
3. **Automatic navigation properties** - Generated from Display Names, not logical names
4. **Self-documenting code** - Schema tracks all tables and relationships automatically
5. **Type-safe lookups** - No more guessing @odata.bind property names

```typescript
// OLD WAY (error-prone):
const child = { 
  jr_name: 'Child', 
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentId})` // Had to guess this!
};

// NEW WAY (automated):
await client.createChildRecord('Child Table', 'Parent Table', 
  { jr_name: 'Child' }, parentId, environmentUrl); // Lookup handled automatically!
```

### Relationship Creation
- Use exact JSON structure for relationship metadata
- SchemaName is REQUIRED for custom entities
- ReferencingAttribute and ReferencedAttribute must match field logical names
- Navigation properties are auto-generated based on SchemaName

### Working Examples (TESTED & VERIFIED)

#### Create Child Record with Parent Lookup:
```javascript
const childRecord = {
  jr_name: 'Child Record Name',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentGuid})`
};
await client.createRecord('jr_childtables', childRecord, environmentUrl);
```

#### Add Table to Solution:
```javascript
const result = await client.addTableToSolution('jr_parenttable', 'JRTestSolution', environmentUrl);
// Uses SolutionUniqueName parameter, NOT SolutionId
```

#### Create One-to-Many Relationship:
```javascript
const relationshipData = {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "jr_parenttable_jr_childtable",
  "ReferencedEntity": "jr_parenttable",
  "ReferencingEntity": "jr_childtable",
  "ReferencedAttribute": "jr_parenttableid",
  "ReferencingAttribute": "jr_parenttable",
  "Lookup": {
    "AttributeType": "Lookup",
    "SchemaName": "jr_ParentTable"
  }
};
```

## TypeScript Migration Guidelines

### Current Status
The project is currently in JavaScript and needs migration to TypeScript.

### Migration Approach
1. Set up TypeScript configuration with strict mode
2. Convert files incrementally, starting with leaf modules
3. Add proper type definitions for all interfaces
4. Use strict null checks and no implicit any

### Type Safety Rules - ZERO TOLERANCE FOR 'any'
- **MANDATORY**: All functions MUST have explicit return types
- **BANNED**: Using `any` type is STRICTLY FORBIDDEN (ESLint will fail the build)
- **MANDATORY**: All function parameters MUST be explicitly typed
- **MANDATORY**: All variables MUST have explicit types or proper type inference
- **MANDATORY**: Use proper domain-specific interfaces for all API contracts
- **MANDATORY**: Prefer union types over enums for string literals
- **MANDATORY**: All async functions MUST be properly typed with Promise<T>
- **BANNED**: Type assertions (as any) are forbidden - fix the types instead
- **ENTERPRISE STANDARD**: Code must be self-documenting through strong types

## Code Style Guidelines

### General Principles
- One export per file for clear module boundaries
- Functions should have a single purpose (< 20 lines)
- Use descriptive names - avoid abbreviations
- Prefer composition over inheritance

### Naming Conventions
- **Classes**: PascalCase (e.g., `ProjectManager`)
- **Variables/Functions**: camelCase (e.g., `createProject`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: Prefix with 'I' (e.g., `IProjectConfig`)
- **Boolean variables**: Start with verbs (e.g., `isLoading`, `hasError`)

### Error Handling
- Use exceptions for unexpected errors
- Always provide context when rethrowing errors
- Use proper error types (not just Error)
- Log errors with appropriate severity levels

## Testing Guidelines

### Test-Driven Development (TDD)
1. Write failing test first
2. Write minimal code to pass the test
3. Refactor while keeping tests green

### Test Organization
- **Integration-first approach**: 60% integration, 30% component, 10% unit tests
- Group tests by feature/module
- Use descriptive test names that explain the scenario
- Follow Arrange-Act-Assert pattern
- Every test starts with proper authentication
- Test with real API endpoints using test environments

### Testing Tools
- Jest for test runner
- Mock external dependencies appropriately
- Use factories for test data generation

## Environment Setup

### Required Environment Variables
```bash
AZURE_DEVOPS_ORG=           # Your Azure DevOps organization
AZURE_DEVOPS_PAT=           # Personal Access Token for Azure DevOps
AZURE_CLIENT_ID=            # Service Principal for Power Platform
AZURE_CLIENT_SECRET=        # Service Principal secret
AZURE_TENANT_ID=            # Azure tenant ID
```

### Test Environment
**James Dev Environment URL**: `https://james-dev.crm11.dynamics.com/api/data/v9.2`
- Use this URL for all Power Platform testing
- Environment supports Dataverse operations
- Interactive auth available with `AZURE_USE_INTERACTIVE_AUTH=true`

### Development Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Run `npm install`
4. Run `npm run dev` to start development

## Architecture Overview

### MCP Server Architecture
The system uses three MCP servers:
1. **Azure DevOps MCP** - Project and work item management
2. **Power Platform MCP** - Environment and solution management (to be built)
3. **Microsoft Graph API MCP** - App registration management (to be built)

### Integration Pattern
All integrations follow this pattern:
1. MCP server receives request from Claude Desktop
2. Server makes authenticated REST API calls
3. Responses are formatted and returned to Claude
4. Error handling includes retries and context

## API Integration Guidelines

### REST API Principles
- Use async/await for all API calls
- Implement exponential backoff for retries
- Log all API requests and responses (sanitize sensitive data)
- Handle rate limiting appropriately

### Authentication
- Azure DevOps: PAT token with Basic auth
- Power Platform: OAuth2 with Service Principal
- Microsoft Graph: OAuth2 with Service Principal

## Project Structure
```
src/
├── integrations/       # External service integrations
├── templates/          # Project templates (YAML)
├── workflows/          # Orchestration logic
├── api/               # HTTP API endpoints
├── config/            # Configuration management
└── utils/             # Shared utilities
```

## Session Management

### Progress Tracking
- Use `_project_progress/` folder for session logs
- Create timestamped session files
- Track completed and pending tasks
- Document blockers and resolutions

### Session Handoff
When ending a session:
1. Update PROJECT_NOTES.md with current status
2. Create session summary in _project_progress/
3. List pending tasks and blockers
4. Note any environment changes

## Common Issues and Solutions

### Azure DevOps API
- **Issue**: 400 Bad Request on project creation
- **Solution**: Ensure payload structure matches API spec exactly

### Power Platform Authentication
- **Issue**: Authentication failures
- **Solution**: Verify Service Principal has correct permissions

### TypeScript Migration
- **Issue**: Type errors in existing code
- **Solution**: Use `@ts-expect-error` temporarily, fix incrementally

## Best Practices

### Performance
- Implement proper memoization where needed
- Use pagination for large data sets
- Cache API responses appropriately
- Monitor bundle sizes

### Security
- Never commit secrets or API keys
- Use environment variables for all configuration
- Sanitize logs to remove sensitive data
- Follow principle of least privilege

### Code Quality
- Run linter before committing
- Ensure all tests pass
- Keep functions focused and small
- Document complex business logic

## AI Productivity System

The project uses a three-folder AI productivity system:

- **`ai_docs/`** - Persistent memory with session context, quick reference, and common tasks
- **`specs/`** - Detailed technical specifications for focused development work
- **`.claude/`** - Commands and settings for Claude Desktop integration

Key files for new sessions:
- **`ai_docs/session-context.md`** - Essential project context for immediate productivity
- **`ai_docs/quick-reference.md`** - Commands, patterns, and troubleshooting
- **`specs/`** - Implementation specifications for all major components

## Links and Resources
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Power Platform Admin API](https://docs.microsoft.com/en-us/power-platform/admin/admin-rest-api)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/api/overview)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)

---
*For architecture decisions and project history, see ai_docs/architecture-decisions.md*
*For session-specific progress, see _project_progress/ folder*
*For quick project context, see ai_docs/session-context.md*