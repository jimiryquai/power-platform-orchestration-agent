# Power Platform Orchestration Agent - Quick Reference

## Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run test         # Run all tests
npm run lint         # Check code style
npm run typecheck    # TypeScript validation
npm run build        # Build for production
```

### Testing
```bash
# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:watch          # Watch mode

# Environment setup for testing
export AZURE_USE_INTERACTIVE_AUTH=true
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
```

## Key File Locations

### Configuration
- `src/config/index.ts` - Main configuration
- `.env.example` - Environment template
- `tsconfig.json` - TypeScript config

### Core Integration Files
- `src/integrations/power-platform/schema-aware-client.ts` - Power Platform automation
- `src/types/power-platform.ts` - Power Platform type definitions
- `src/types/dataverse-schema.ts` - Dataverse schema types

### Documentation
- `CLAUDE.md` - Project instructions and patterns
- `ai_docs/session-context.md` - Quick session startup context
- `specs/` - Detailed technical specifications

## Power Platform Quick Patterns

### CRITICAL: Lookup Navigation Properties
- **ALWAYS** use SchemaName format: `jr_ParentTable@odata.bind`
- **NEVER** use logical name: `jr_parenttable@odata.bind` ❌
- Check relationship SchemaName if unsure

### Schema-Aware Client Usage (RECOMMENDED)
```typescript
// CORRECT - Use schema-aware client
await client.createChildRecord(
  'Child Table',      // Display name
  'Parent Table',     // Display name  
  { jr_name: 'Test' }, // Data
  parentId,           // Parent GUID
  environmentUrl      // Environment
);

// WRONG - Manual navigation property (error-prone)
const record = {
  jr_name: 'Test',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentId})` // Don't guess!
};
```

### Manual Patterns (If Schema-Aware Client Not Available)
```javascript
// 1. Create parent-child records
const parent = await client.createRecord('jr_parenttables', { jr_name: 'Parent' }, envUrl);

const child = {
  jr_name: 'Child',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parent.data.jr_parenttableid})`
};
await client.createRecord('jr_childtables', child, envUrl);

// 2. Add tables to solution
await client.addTableToSolution('jr_parenttable', 'SolutionUniqueName', envUrl);
await client.addTableToSolution('jr_childtable', 'SolutionUniqueName', envUrl);

// 3. Create relationship
const relationship = {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "jr_parenttable_jr_childtable",
  "ReferencedEntity": "jr_parenttable",
  "ReferencingEntity": "jr_childtable",
  "ReferencedAttribute": "jr_parenttableid",
  "ReferencingAttribute": "jr_parenttable",
  "Lookup": {
    "AttributeType": "Lookup", 
    "SchemaName": "jr_ParentTable"  // This becomes the navigation property
  }
};
```

### Navigation Property Pattern
```typescript
// The client automatically resolves:
// Display Name "Parent Table" → Lookup.SchemaName "jr_ParentTable" → "jr_ParentTable@odata.bind"
```

### Debugging Navigation Properties
If lookup fails, check relationship definition:
```javascript
const relationshipResult = await client.executeDataverseRequest(
  'GET',
  "EntityDefinitions(LogicalName='jr_childtable')?$expand=ManyToOneRelationships",
  null,
  environmentUrl
);
```

## Azure DevOps MCP Functions

### Work Items
```typescript
// Create work item
mcp__azure_devops__wit_create_work_item(project, workItemType, fields)

// Update work item  
mcp__azure_devops__wit_update_work_item(id, updates)

// Create parent-child relationship
mcp__azure_devops__wit_add_child_work_item(parentId, project, workItemType, title, description)

// Link work items
mcp__azure_devops__wit_work_items_link(project, updates)
```

### Projects & Repos
```typescript
// List projects
mcp__azure_devops__core_list_projects()

// List repositories
mcp__azure_devops__repo_list_repos_by_project(project)

// Create pull request
mcp__azure_devops__repo_create_pull_request(repositoryId, sourceRefName, targetRefName, title)
```

## Common API Endpoints

### Dataverse Web API
```
Base URL: https://[environment].crm[N].dynamics.com/api/data/v9.2

Tables:     GET    /EntityDefinitions
Create:     POST   /[entitylogicalname]s
Update:     PATCH  /[entitylogicalname]s([id])
Delete:     DELETE /[entitylogicalname]s([id])
Metadata:   GET    /EntityDefinitions([id])
```

### Power Platform Admin API
```
Base URL: https://api.bap.microsoft.com

Environments: GET /providers/Microsoft.BusinessAppPlatform/environments
Create Env:   POST /providers/Microsoft.BusinessAppPlatform/environments
```

### Azure DevOps REST API
```
Base URL: https://dev.azure.com/[organization]/_apis

Projects:     GET  /projects?api-version=6.0
Work Items:   POST /wit/workitems/$[type]?api-version=6.0
Repositories: GET  /git/repositories?api-version=6.0
```

## TypeScript Patterns

### Type Safety Rules
```typescript
// MANDATORY - Explicit return types
function createTable(data: TableData): Promise<string> {
  // Implementation
}

// MANDATORY - No 'any' types
interface ApiResponse<T> {
  data: T;  // Not 'any'
  status: number;
}

// PREFERRED - Union types over enums
type Status = 'pending' | 'running' | 'completed' | 'failed';
```

### Error Handling
```typescript
// Use Result pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Custom error types
class DataverseError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'DataverseError';
  }
}
```

## Environment Variables

### Required for Development
```bash
# Azure Authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_USE_INTERACTIVE_AUTH=true  # For testing

# Azure DevOps
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PAT=your-personal-access-token

# Power Platform Test Environment
POWER_PLATFORM_ENVIRONMENT_URL=https://james-dev.crm11.dynamics.com/api/data/v9.2
```

## Testing Patterns

### Integration Test Setup
```typescript
describe('Power Platform Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    await setupTestEnvironment();
  });

  test('creates table with relationships', async () => {
    const client = new SchemaAwarePowerPlatformClient();
    // Test implementation
  });
});
```

### Mocking Strategy
```typescript
// Mock external APIs only, use real MCP servers
jest.mock('../src/integrations/power-platform/api-client');

// Use real test environment for integration tests
const testEnvironmentUrl = process.env.POWER_PLATFORM_ENVIRONMENT_URL;
```

## Common Troubleshooting

### Authentication Issues
1. Check service principal permissions
2. Verify tenant ID and client ID
3. Try interactive auth for testing: `AZURE_USE_INTERACTIVE_AUTH=true`

### Navigation Property Errors
1. Use `SchemaAwarePowerPlatformClient` instead of manual derivation
2. Check relationship `Lookup.SchemaName` in metadata
3. Verify table exists before creating relationships

### Type Errors
1. Run `npm run typecheck` for detailed errors
2. Check interface definitions in `src/types/`
3. Ensure all functions have explicit return types

### MCP Connection Issues
1. Verify MCP server is running
2. Check authentication credentials
3. Review network connectivity and firewall rules

## Template System

### S-Project Template
- **Duration**: 12 weeks (6 sprints)
- **Environments**: Dev, Test, Prod
- **Work Items**: Epics → Features → User Stories
- **Location**: `src/templates/s-project-template.yaml`

### Custom Templates
- Follow existing template structure
- Define in YAML format
- Include parameter validation
- Test with orchestrator before deployment

## Performance Tips

1. **Use batch operations** for multiple API calls
2. **Cache metadata** for session duration  
3. **Parallel execution** where dependencies allow
4. **Schema-aware client** eliminates navigation property lookup overhead

This quick reference provides the essential information needed for productive development sessions.