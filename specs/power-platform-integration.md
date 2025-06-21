# Power Platform Integration Specification

## Overview
Comprehensive specification for Power Platform Dataverse integration using direct REST API calls and the schema-aware client architecture.

## Architecture

### Integration Pattern
```
Claude Desktop → SchemaAwarePowerPlatformClient → Dataverse Web API
```

### Authentication
- **Primary**: Service Principal (OAuth 2.0) with client credentials flow
- **Development**: Interactive authentication with device code flow
- **Scope**: `https://[environment].dynamics.com/.default`
- **Token Management**: Automatic refresh with 60-minute cache

## Schema-Aware Client Architecture

### Core Principle
**NEVER manually derive navigation properties**. The schema-aware client automatically handles all lookup relationships based on display names.

```typescript
// OLD WAY (error-prone)
const child = { 
  jr_name: 'Child', 
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentId})` // Had to guess!
};

// NEW WAY (automated)
await client.createChildRecord('Child Table', 'Parent Table', 
  { jr_name: 'Child' }, parentId, environmentUrl);
```

### SchemaAwarePowerPlatformClient Interface
```typescript
interface SchemaAwarePowerPlatformClient {
  // Automatic lookup handling
  createChildRecord(
    childTableDisplayName: string,
    parentTableDisplayName: string,
    childData: Record<string, any>,
    parentId: string,
    environmentUrl: string
  ): Promise<string>;
  
  // Schema management
  loadSchema(environmentUrl: string): Promise<DataverseSchema>;
  getNavigationProperty(
    parentTableDisplayName: string,
    childTableDisplayName: string
  ): string;
  
  // Standard operations
  createRecord(logicalName: string, data: Record<string, any>, environmentUrl: string): Promise<string>;
  updateRecord(logicalName: string, id: string, data: Record<string, any>, environmentUrl: string): Promise<void>;
  deleteRecord(logicalName: string, id: string, environmentUrl: string): Promise<void>;
  getRecord(logicalName: string, id: string, environmentUrl: string): Promise<any>;
}
```

## Environment Management

### Environment Operations
| Operation | REST Endpoint | Purpose |
|-----------|---------------|---------|
| List Environments | `GET https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments` | Discover available environments |
| Create Environment | `POST https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments` | Provision new environment |
| Get Environment | `GET https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments/{environmentId}` | Environment details |

### Environment Configuration
```typescript
interface EnvironmentConfig {
  displayName: string;
  location: string; // "northeurope", "eastus", etc.
  environmentSku: "Trial" | "Production" | "Sandbox";
  currency: {
    code: string; // "GBP", "USD", etc.
    name: string;
    symbol: string;
  };
  language: {
    code: string; // "en-US", "en-GB", etc.
    name: string;
  };
}
```

## Solution Management

### Solution Operations
| Operation | REST Endpoint | Purpose |
|-----------|---------------|---------|
| Create Solution | `POST [environment]/api/data/v9.2/solutions` | Create solution container |
| Add Component | `POST [environment]/api/data/v9.2/AddSolutionComponent` | Add table/component to solution |
| Export Solution | `POST [environment]/api/data/v9.2/ExportSolution` | Generate solution package |
| Import Solution | `POST [environment]/api/data/v9.2/ImportSolution` | Deploy solution package |

### Solution Structure
```typescript
interface SolutionCreate {
  uniquename: string; // "CompanyPrefix_SolutionName"
  friendlyname: string; // "Human Readable Name"
  description?: string;
  version: string; // "1.0.0.0"
  publisherid: string; // Publisher GUID
}

interface SolutionComponent {
  ComponentType: number; // Entity = 1, Attribute = 2, Relationship = 10
  SchemaName: string;
  RootComponentBehavior: number; // 0 = Include Subcomponents, 1 = Do not include subcomponents
}
```

## Data Model Implementation

### Table Creation
```typescript
interface TableMetadata {
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata";
  SchemaName: string; // "jr_ProjectTable"
  DisplayName: {
    LocalizedLabels: [{ Label: string; LanguageCode: number }];
  };
  DisplayCollectionName: {
    LocalizedLabels: [{ Label: string; LanguageCode: number }];
  };
  Description?: {
    LocalizedLabels: [{ Label: string; LanguageCode: number }];
  };
  OwnershipType: "UserOwned" | "OrganizationOwned";
  TableType: "Standard" | "Activity" | "Virtual";
  HasActivities: boolean;
  HasNotes: boolean;
  IsActivity: boolean;
  PrimaryNameAttribute: string; // "jr_name"
}
```

### Field Creation
```typescript
interface FieldMetadata {
  "@odata.type": string; // "Microsoft.Dynamics.CRM.StringAttributeMetadata"
  SchemaName: string; // "jr_ProjectName"
  DisplayName: {
    LocalizedLabels: [{ Label: string; LanguageCode: number }];
  };
  RequiredLevel: {
    Value: "None" | "SystemRequired" | "ApplicationRequired" | "Recommended";
  };
  // Type-specific properties
  MaxLength?: number; // For string fields
  MinValue?: number; // For number fields
  MaxValue?: number; // For number fields
  Precision?: number; // For decimal/money fields
}
```

### Relationship Creation
```typescript
interface RelationshipMetadata {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata";
  SchemaName: string; // "jr_parenttable_jr_childtable"
  ReferencedEntity: string; // "jr_parenttable"
  ReferencingEntity: string; // "jr_childtable"
  ReferencedAttribute: string; // "jr_parenttableid"
  ReferencingAttribute: string; // "jr_parenttable"
  Lookup: {
    AttributeType: "Lookup";
    SchemaName: string; // "jr_ParentTable" - CRITICAL for navigation properties
  };
}
```

## Critical Navigation Property Pattern

### The Schema.Name Rule
**NEVER FORGET**: Navigation properties use the `Lookup.SchemaName` from relationship definition:

```typescript
// Relationship definition
const relationshipData = {
  "SchemaName": "jr_parenttable_jr_childtable",
  "ReferencedEntity": "jr_parenttable",
  "ReferencingEntity": "jr_childtable", 
  "ReferencedAttribute": "jr_parenttableid",
  "ReferencingAttribute": "jr_parenttable", // Logical name of lookup field
  "Lookup": {
    "SchemaName": "jr_ParentTable" // THIS becomes the navigation property base
  }
};

// Resulting navigation property
const navigationProperty = "jr_ParentTable@odata.bind";
const value = `/jr_parenttables(${parentGuid})`;

// Usage in record creation
const childRecord = {
  jr_name: 'Child Record',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentGuid})`
};
```

### Schema-Aware Automation
```typescript
class SchemaRegistry {
  private relationships: Map<string, RelationshipInfo> = new Map();
  
  getNavigationProperty(parentDisplay: string, childDisplay: string): string {
    const key = `${parentDisplay}->${childDisplay}`;
    const relationship = this.relationships.get(key);
    if (!relationship) {
      throw new Error(`No relationship found between ${parentDisplay} and ${childDisplay}`);
    }
    return `${relationship.lookupSchemaName}@odata.bind`;
  }
  
  buildLookupValue(parentLogicalName: string, parentId: string): string {
    return `/${parentLogicalName}s(${parentId})`;
  }
}
```

## Template Integration

### Data Model Templates
```yaml
dataModelTemplates:
  projectManagement:
    tables:
      - displayName: "Project"
        schemaName: "jr_Project"
        primaryNameField: "jr_name"
        fields:
          - displayName: "Project Name"
            schemaName: "jr_name"
            type: "string"
            required: true
          - displayName: "Start Date"
            schemaName: "jr_startdate"
            type: "datetime"
            
      - displayName: "Task"
        schemaName: "jr_Task"
        primaryNameField: "jr_name"
        relationships:
          - parentTable: "Project"
            relationshipName: "jr_project_jr_task"
            lookupSchemaName: "jr_Project"
```

### Deployment Strategy
```typescript
async function deployDataModel(
  template: DataModelTemplate,
  environmentUrl: string
): Promise<void> {
  // 1. Create publisher
  const publisherId = await createPublisher(template.publisher);
  
  // 2. Create solution
  const solutionId = await createSolution(template.solution, publisherId);
  
  // 3. Create tables
  const tableIds: Record<string, string> = {};
  for (const table of template.tables) {
    tableIds[table.displayName] = await createTable(table);
    await addTableToSolution(tableIds[table.displayName], solutionId);
  }
  
  // 4. Create relationships
  for (const relationship of template.relationships) {
    await createRelationship(relationship, tableIds);
  }
}
```

## Error Handling

### Common Error Patterns
| Error | HTTP Code | Cause | Solution |
|-------|-----------|-------|----------|
| Invalid Schema Name | 400 | Duplicate/invalid name | Generate unique name |
| Navigation Property Not Found | 400 | Wrong lookup field reference | Use schema-aware client |
| Insufficient Privileges | 403 | Missing permissions | Check service principal roles |
| Entity Not Found | 404 | Wrong logical name | Verify table exists |
| Metadata Lock | 423 | Concurrent metadata changes | Retry with backoff |

### Retry Strategy
```typescript
interface DataverseRetryConfig {
  maxAttempts: 5;
  baseDelayMs: 1000;
  maxDelayMs: 30000;
  retryableErrors: [400, 429, 500, 502, 503, 504];
}

async function withDataverseRetry<T>(
  operation: () => Promise<T>,
  config: DataverseRetryConfig
): Promise<T> {
  // Implement exponential backoff with jitter
  // Special handling for 429 (rate limiting)
  // Metadata operation retries for 423 (locked)
}
```

## Performance Optimization

### Batch Operations
```typescript
interface BatchRequest {
  requests: Array<{
    id: string;
    method: 'POST' | 'PATCH' | 'DELETE';
    url: string;
    body?: any;
    headers?: Record<string, string>;
  }>;
}

// Execute multiple operations in single HTTP request
async function executeBatch(
  requests: BatchRequest,
  environmentUrl: string
): Promise<BatchResponse> {
  // Use $batch endpoint for efficiency
  // Handle partial failures gracefully
}
```

### Caching Strategy
- Schema metadata cached for 24 hours
- Access tokens cached for 50 minutes
- Environment URLs cached for session
- Relationship mappings cached permanently

## Testing Strategy

### Test Environment
- **URL**: `https://james-dev.crm11.dynamics.com/api/data/v9.2`
- **Authentication**: Interactive auth for manual testing
- **Service Principal**: For automated testing
- **Data Isolation**: Unique prefixes for test entities

### Integration Tests
```typescript
describe('Power Platform Integration', () => {
  test('creates complete data model from template', async () => {
    // Deploy full project management template
    // Verify all tables and relationships created
    // Test child record creation with automatic lookups
  });
  
  test('handles schema-aware navigation properties', async () => {
    // Create parent and child tables
    // Verify navigation property resolution
    // Test child record creation without manual property derivation
  });
});
```

## Security Considerations

### Service Principal Configuration
```
Required Power Platform Permissions:
- Environment Maker (for environment access)
- System Administrator (for metadata operations)
- Power Platform Administrator (for environment creation)
```

### Data Protection
- All API calls use HTTPS with certificate validation
- Service principal credentials stored in Azure Key Vault
- Access tokens never logged or persisted beyond cache duration
- Audit logging for all metadata operations

## Implementation Checklist

### Phase 1: Core Integration
- [ ] Service principal authentication
- [ ] Environment discovery and creation
- [ ] Basic table and field creation
- [ ] Schema-aware client foundation

### Phase 2: Advanced Features
- [ ] Relationship creation and navigation property automation
- [ ] Solution management and component addition
- [ ] Batch operations for performance
- [ ] Template-driven deployment

### Phase 3: Enterprise Features
- [ ] Cross-environment synchronization
- [ ] Advanced security role management
- [ ] Comprehensive monitoring and alerting
- [ ] Performance optimization and caching

This specification ensures robust, enterprise-grade Power Platform integration with automated navigation property handling and comprehensive error recovery.