# Common Development Tasks

## Project Setup Tasks

### 1. Initialize New Development Session
```bash
# Load project context immediately
/prime

# Check current status
git status
npm run typecheck
npm run lint
```

### 2. Set Up Test Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
# AZURE_TENANT_ID=your-tenant-id
# AZURE_CLIENT_ID=your-client-id
# AZURE_USE_INTERACTIVE_AUTH=true

# Test authentication
npm run test:integration
```

### 3. Create New Feature Branch
```bash
git checkout -b feature/new-feature-name
git push -u origin feature/new-feature-name
```

## Power Platform Development

### 1. Create New Table with Schema-Aware Client
```typescript
// 1. Define table metadata
const tableData = {
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "SchemaName": "jr_ProjectTable",
  "DisplayName": {
    "LocalizedLabels": [{ "Label": "Project", "LanguageCode": 1033 }]
  },
  "DisplayCollectionName": {
    "LocalizedLabels": [{ "Label": "Projects", "LanguageCode": 1033 }]
  },
  "OwnershipType": "UserOwned",
  "HasActivities": false,
  "HasNotes": true,
  "PrimaryNameAttribute": "jr_name"
};

// 2. Create table
const client = new SchemaAwarePowerPlatformClient();
const tableId = await client.createTable(tableData, environmentUrl);

// 3. Add to solution
await client.addTableToSolution('jr_projecttable', 'MySolution', environmentUrl);
```

### 2. Create Parent-Child Relationship
```typescript
// 1. Create parent table first (see above)

// 2. Create child table
const childTableData = {
  "SchemaName": "jr_TaskTable",
  "DisplayName": { "LocalizedLabels": [{ "Label": "Task", "LanguageCode": 1033 }] },
  // ... other metadata
};

// 3. Create relationship with lookup
const relationshipData = {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "jr_project_jr_task",
  "ReferencedEntity": "jr_projecttable",
  "ReferencingEntity": "jr_tasktable",
  "ReferencedAttribute": "jr_projecttableid",
  "ReferencingAttribute": "jr_project",
  "Lookup": {
    "AttributeType": "Lookup",
    "SchemaName": "jr_Project"  // This becomes navigation property
  }
};

await client.createRelationship(relationshipData, environmentUrl);
```

### 3. Create Child Record with Automatic Lookup
```typescript
// NEVER do this manually:
// const record = { 'jr_Project@odata.bind': `/jr_projecttables(${parentId})` };

// ALWAYS use schema-aware client:
const childData = {
  jr_name: 'My Task',
  jr_description: 'Task description'
};

const childId = await client.createChildRecord(
  'Task',           // Child table display name
  'Project',        // Parent table display name
  childData,        // Child data
  parentId,         // Parent GUID
  environmentUrl    // Environment URL
);
```

### 4. Bulletproof Schema-Aware Pattern (Advanced)
```typescript
// Schema-aware client that eliminates ALL guesswork
class BulletproofClient {
  private tables = new Map<string, TableDefinition>();
  private relationships = new Map<string, RelationshipDefinition>();
  private publisherPrefix = 'jr';

  // Generate all names from Display Name automatically
  generateNames(displayName: string): TableNames {
    const logicalName = this.publisherPrefix + '_' + displayName.toLowerCase().replace(/\s+/g, '');
    const schemaName = this.publisherPrefix + '_' + displayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return { logicalName, schemaName, displayName };
  }

  // Register existing table (no creation needed)
  registerExistingTable(displayName: string): TableNames {
    const names = this.generateNames(displayName);
    this.tables.set(names.logicalName, names);
    console.log(`📋 Registered: ${displayName} -> ${names.logicalName}`);
    return names;
  }

  // Create relationship with automatic navigation property
  async createRelationship(
    parentDisplayName: string, 
    childDisplayName: string, 
    environmentUrl: string
  ): Promise<RelationshipResult> {
    const parentTable = Array.from(this.tables.values())
      .find(t => t.displayName === parentDisplayName);
    const childTable = Array.from(this.tables.values())
      .find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be registered first');
    }

    const lookupSchemaName = this.publisherPrefix + '_' + parentDisplayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    const relationshipMetadata = {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: `${parentTable.logicalName}_${childTable.logicalName}`,
      ReferencedEntity: parentTable.logicalName,
      ReferencingEntity: childTable.logicalName,
      ReferencedAttribute: `${parentTable.logicalName}id`,
      ReferencingAttribute: parentTable.logicalName,
      Lookup: {
        AttributeType: 'Lookup',
        SchemaName: lookupSchemaName
      }
    };

    console.log(`🔗 Auto-generated navigation property: ${lookupSchemaName}@odata.bind`);
    
    const result = await this.baseClient.createOneToManyRelationship(relationshipMetadata, environmentUrl);
    
    if (result.success) {
      const relationshipDef = {
        parentTable,
        childTable,
        navigationProperty: `${lookupSchemaName}@odata.bind`,
        schemaName: relationshipMetadata.SchemaName
      };
      this.relationships.set(relationshipMetadata.SchemaName, relationshipDef);
    }
    
    return result;
  }

  // Create child records with ZERO guesswork
  async createChildRecordsWithAutomaticLookups(
    childDisplayName: string,
    parentDisplayName: string, 
    recordsWithParentIds: Array<{ data: Record<string, any>, parentId: string }>,
    environmentUrl: string
  ): Promise<CreateMultipleResult> {
    const childTable = Array.from(this.tables.values())
      .find(t => t.displayName === childDisplayName);
    const parentTable = Array.from(this.tables.values())
      .find(t => t.displayName === parentDisplayName);
    
    const relationshipKey = `${parentTable.logicalName}_${childTable.logicalName}`;
    const relationship = this.relationships.get(relationshipKey);
    
    if (!relationship) {
      throw new Error(`Relationship not found: ${relationshipKey}`);
    }

    // Create records with automatic lookup references - ZERO manual work!
    const recordsWithLookups = recordsWithParentIds.map(({ data, parentId }) => ({
      ...data,
      [relationship.navigationProperty]: `/${parentTable.logicalName}s(${parentId})`
    }));

    console.log(`🔗 Creating child records with AUTOMATIC lookups:`);
    console.log(`   Navigation property: ${relationship.navigationProperty}`);
    console.log(`   No guesswork - all derived from Display Names!`);
    
    return await this.baseClient.createMultipleRecords(
      `${childTable.logicalName}s`, 
      recordsWithLookups, 
      environmentUrl
    );
  }
}
```

### 5. Complete Bulletproof Demo Usage
```typescript
async function bulletproofDemo(): Promise<void> {
  const baseClient = new PowerPlatformClient();
  const client = new BulletproofClient(baseClient);
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';

  try {
    await baseClient.connect();
    console.log('🚀 BULLETPROOF DEMO: Automatic navigation properties!\n');

    // 1. Register existing tables (no creation needed)
    console.log('=== REGISTERING EXISTING TABLES ===');
    client.registerExistingTable('Order Header');
    client.registerExistingTable('Order Line');

    // 2. Create relationship with auto-generated navigation property
    console.log('\n=== CREATING RELATIONSHIP WITH AUTO NAVIGATION PROPERTY ===');
    await client.createRelationship('Order Header', 'Order Line', environmentUrl);

    // 3. Create parent records
    const orderRecords = [
      { jr_name: 'Order #1001' },
      { jr_name: 'Order #1002' }
    ];
    
    const orderResults = await baseClient.createMultipleRecords(
      'jr_orderheaders', 
      orderRecords, 
      environmentUrl
    );
    
    if (orderResults.success) {
      const orderIds = orderResults.results
        .filter(r => r.result.success)
        .map(r => r.result.data.jr_orderheaderid);

      // 4. Create child records with AUTOMATIC lookup references
      const lineRecordsWithParents = [
        { data: { jr_name: 'Product A - Qty 5' }, parentId: orderIds[0] },
        { data: { jr_name: 'Product B - Qty 3' }, parentId: orderIds[0] },
        { data: { jr_name: 'Product C - Qty 2' }, parentId: orderIds[1] }
      ];

      await client.createChildRecordsWithAutomaticLookups(
        'Order Line', 
        'Order Header', 
        lineRecordsWithParents, 
        environmentUrl
      );

      console.log('\n🎉 BULLETPROOF SUCCESS!');
      console.log('📋 Navigation properties generated automatically from Display Names');
      console.log('🔗 Lookup references created without any guesswork');
      console.log('📖 No documentation consultation required');
      console.log('💪 Code is self-documenting and bulletproof!');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}
```

## Azure DevOps Development

### 1. Create Project Structure from Template
```typescript
// Use official Azure DevOps MCP functions
await mcp__azure_devops__core_create_project({
  name: "My New Project",
  description: "Project description",
  processTemplate: "Agile"
});

// Create work item hierarchy
const epicId = await mcp__azure_devops__wit_create_work_item(
  projectName,
  "Epic", 
  {
    "System.Title": "Environment Setup",
    "System.Description": "Configure all environments"
  }
);

const featureId = await mcp__azure_devops__wit_add_child_work_item(
  epicId,
  projectName,
  "Feature",
  "Development Environment Setup",
  "Create and configure development environment"
);
```

### 2. Link Work Items to Pull Requests
```typescript
// Create pull request
const prId = await mcp__azure_devops__repo_create_pull_request({
  repositoryId: repoId,
  sourceRefName: "refs/heads/feature/my-feature",
  targetRefName: "refs/heads/main",
  title: "Add new feature",
  description: "Implements requirement XYZ"
});

// Link work item to PR
await mcp__azure_devops__wit_link_work_item_to_pull_request({
  workItemId: featureId,
  repositoryId: repoId,
  pullRequestId: prId
});
```

## TypeScript Development

### 1. Add New Interface
```typescript
// 1. Define in appropriate types file
interface NewDomainObject {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly properties: Record<string, unknown>;
}

// 2. Add type guard
function isNewDomainObject(obj: unknown): obj is NewDomainObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'createdAt' in obj &&
    typeof (obj as NewDomainObject).id === 'string'
  );
}

// 3. Add validation function
function validateNewDomainObject(obj: unknown): NewDomainObject {
  if (!isNewDomainObject(obj)) {
    throw new Error('Invalid NewDomainObject');
  }
  return obj;
}
```

### 2. Create New Service Class
```typescript
// 1. Define interface first
interface INewService {
  create(data: CreateRequest): Promise<string>;
  update(id: string, data: UpdateRequest): Promise<void>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<DomainObject>;
}

// 2. Implement with proper error handling
class NewService implements INewService {
  constructor(
    private readonly client: ApiClient,
    private readonly logger: Logger
  ) {}

  async create(data: CreateRequest): Promise<string> {
    try {
      this.logger.info('Creating new object', { data });
      const response = await this.client.post('/api/objects', data);
      return response.data.id;
    } catch (error) {
      this.logger.error('Failed to create object', { error, data });
      throw new ServiceError('Create failed', error);
    }
  }
}
```

### 3. Add Comprehensive Tests
```typescript
describe('NewService', () => {
  let service: NewService;
  let mockClient: jest.Mocked<ApiClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockClient = createMockApiClient();
    mockLogger = createMockLogger();
    service = new NewService(mockClient, mockLogger);
  });

  describe('create', () => {
    test('creates object successfully', async () => {
      // Arrange
      const createData = { name: 'Test Object' };
      const expectedId = 'test-id-123';
      mockClient.post.mockResolvedValue({ 
        data: { id: expectedId },
        status: 201 
      });

      // Act
      const result = await service.create(createData);

      // Assert
      expect(result).toBe(expectedId);
      expect(mockClient.post).toHaveBeenCalledWith('/api/objects', createData);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating new object', 
        { data: createData }
      );
    });

    test('handles errors gracefully', async () => {
      // Arrange
      const createData = { name: 'Test Object' };
      const error = new Error('Network error');
      mockClient.post.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(createData)).rejects.toThrow('Create failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create object',
        { error, data: createData }
      );
    });
  });
});
```

## Testing Tasks

### 1. Run Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests with real APIs
npm run test:integration

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### 2. Test Power Platform Integration
```bash
# Set up test environment
export AZURE_USE_INTERACTIVE_AUTH=true
export POWER_PLATFORM_ENVIRONMENT_URL=https://james-dev.crm11.dynamics.com/api/data/v9.2

# Run Power Platform tests only
npm test -- --testPathPattern=power-platform
```

### 3. Test Azure DevOps Integration
```bash
# Set up credentials
export AZURE_DEVOPS_ORG=your-organization
export AZURE_DEVOPS_PAT=your-pat-token

# Run Azure DevOps tests
npm test -- --testPathPattern=azure-devops
```

## Code Quality Tasks

### 1. Fix TypeScript Errors
```bash
# Check for type errors
npm run typecheck

# Fix common issues:
# - Add explicit return types
# - Remove 'any' types  
# - Add proper interface definitions
# - Use type guards for validation
```

### 2. Fix Linting Issues
```bash
# Check code style
npm run lint

# Auto-fix fixable issues
npm run lint:fix

# Common fixes:
# - Add missing semicolons
# - Fix indentation
# - Remove unused imports
# - Use const instead of let where appropriate
```

### 3. Pre-commit Checklist
```bash
# Run all quality checks
npm run typecheck
npm run lint
npm run test
npm run build

# Check git status
git status
git diff

# Commit with descriptive message
git add .
git commit -m "feat: add new feature with comprehensive tests"
```

## Debugging Tasks

### 1. Debug Power Platform API Calls
```typescript
// Enable detailed logging
const client = new SchemaAwarePowerPlatformClient({
  logLevel: 'debug',
  enableRequestLogging: true
});

// Check authentication
await client.testConnection(environmentUrl);

// Inspect metadata
const schema = await client.loadSchema(environmentUrl);
console.log('Available tables:', schema.tables);
```

### 2. Debug Azure DevOps MCP Calls
```typescript
// Test MCP connection
const projects = await mcp__azure_devops__core_list_projects();
console.log('Available projects:', projects);

// Check work item details
const workItem = await mcp__azure_devops__wit_get_work_item(123, projectName);
console.log('Work item fields:', workItem.fields);
```

### 3. Debug Template Processing
```typescript
// Load and validate template
const template = await loadTemplate('s-project-template.yaml');
const validation = await validateTemplate(template, parameters);

if (!validation.valid) {
  console.error('Template validation errors:', validation.errors);
}
```

## Deployment Tasks

### 1. Build for Production
```bash
# Clean previous build
rm -rf dist/

# Build TypeScript
npm run build

# Verify build
node dist/index.js --help
```

### 2. Create Release
```bash
# Update version
npm version patch|minor|major

# Create git tag
git push --tags

# Build and test
npm run build
npm test
```

These common tasks provide a practical reference for daily development activities in the Power Platform Orchestration Agent project.