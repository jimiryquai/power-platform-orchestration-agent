# Schema-Aware Client Specification

## Overview
Detailed specification for the ideal schema-aware Power Platform client that eliminates navigation property guesswork through automatic schema tracking and display name-based operations.

## Design Principles

### Core Philosophy
- **Display Name First**: All operations use human-readable display names
- **Zero Guesswork**: Navigation properties generated automatically
- **Self-Documenting**: Schema tracked internally for transparency
- **Type-Safe**: Full TypeScript support with strict typing

### Elimination of Manual Patterns
```typescript
// ELIMINATED: Manual navigation property derivation
const record = {
  jr_name: 'Child',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parentId})` // ❌ NEVER AGAIN
};

// PREFERRED: Automatic schema-aware operations
await client.createChildRecord('Child Table', 'Parent Table', 
  { jr_name: 'Child' }, parentId, environmentUrl); // ✅ ALWAYS
```

## Interface Specification

### Core Schema-Aware Client
```typescript
interface ISchemaAwarePowerPlatformClient {
  // Schema Management
  loadSchema(environmentUrl: string): Promise<DataverseSchema>;
  registerExistingTable(displayName: string): TableDefinition;
  getNavigationProperty(parentDisplayName: string, childDisplayName: string): string;
  generateNames(displayName: string): TableNames;
  
  // Table Operations (Display Name Based)
  createTable(displayName: string, environmentUrl: string): Promise<string>;
  addTableToSolution(tableDisplayName: string, solutionName: string, environmentUrl: string): Promise<void>;
  
  // Relationship Operations (Automatic Navigation Properties)
  createRelationship(
    parentDisplayName: string,
    childDisplayName: string, 
    environmentUrl: string
  ): Promise<RelationshipResult>;
  
  // Record Operations (Zero Guesswork)
  createChildRecord(
    childTableDisplayName: string,
    parentTableDisplayName: string,
    childData: Record<string, unknown>,
    parentId: string,
    environmentUrl: string
  ): Promise<string>;
  
  createMultipleChildRecords(
    childTableDisplayName: string,
    parentTableDisplayName: string,
    recordsWithParentIds: Array<{ data: Record<string, unknown>, parentId: string }>,
    environmentUrl: string
  ): Promise<CreateMultipleResult>;
  
  // Schema Introspection
  getSchema(): SchemaSnapshot;
  getTableDefinition(displayName: string): TableDefinition | undefined;
  getRelationshipDefinition(parentDisplayName: string, childDisplayName: string): RelationshipDefinition | undefined;
}
```

### Supporting Type Definitions
```typescript
interface TableNames {
  readonly logicalName: string;    // 'jr_ordertable'
  readonly schemaName: string;     // 'jr_OrderTable'  
  readonly displayName: string;    // 'Order Table'
}

interface TableDefinition extends TableNames {
  readonly publisherPrefix: string;
  readonly primaryKeyField: string;
  readonly primaryNameField: string;
}

interface RelationshipDefinition {
  readonly parentTable: TableDefinition;
  readonly childTable: TableDefinition;
  readonly navigationProperty: string;    // 'jr_OrderTable@odata.bind'
  readonly schemaName: string;           // 'jr_ordertable_jr_orderline'
  readonly lookupSchemaName: string;     // 'jr_OrderTable'
}

interface SchemaSnapshot {
  readonly tables: readonly TableDefinition[];
  readonly relationships: readonly RelationshipDefinition[];
  readonly publisherPrefix: string;
  readonly lastUpdated: Date;
}

interface CreateMultipleResult {
  readonly success: boolean;
  readonly results: readonly Array<{
    readonly success: boolean;
    readonly data?: { readonly id: string };
    readonly error?: string;
  }>;
  readonly totalRecords: number;
  readonly successfulRecords: number;
}

interface RelationshipResult {
  readonly success: boolean;
  readonly navigationProperty?: string;
  readonly error?: string;
}
```

## Implementation Strategy

### Phase 1: Name Generation Engine
```typescript
class NameGenerator {
  constructor(private readonly publisherPrefix: string = 'jr') {}
  
  generateTableNames(displayName: string): TableNames {
    // Logic: "Order Header" -> { logicalName: 'jr_orderheader', schemaName: 'jr_OrderHeader', displayName: 'Order Header' }
    const logicalName = this.publisherPrefix + '_' + displayName.toLowerCase().replace(/\s+/g, '');
    const schemaName = this.publisherPrefix + '_' + displayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return { logicalName, schemaName, displayName };
  }
  
  generateLookupSchemaName(parentDisplayName: string): string {
    // Logic: "Order Header" -> "jr_OrderHeader"
    return this.publisherPrefix + '_' + parentDisplayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
  
  generateNavigationProperty(parentDisplayName: string): string {
    // Logic: "Order Header" -> "jr_OrderHeader@odata.bind"
    const lookupSchemaName = this.generateLookupSchemaName(parentDisplayName);
    return `${lookupSchemaName}@odata.bind`;
  }
  
  generateODataReference(parentTableLogicalName: string, parentId: string): string {
    // Logic: 'jr_orderheader', 'guid' -> '/jr_orderheaders(guid)'
    return `/${parentTableLogicalName}s(${parentId})`;
  }
}
```

### Phase 2: Schema Registry
```typescript
class SchemaRegistry {
  private tables = new Map<string, TableDefinition>();           // Key: logicalName
  private relationships = new Map<string, RelationshipDefinition>(); // Key: parentLogical_childLogical
  
  registerTable(definition: TableDefinition): void {
    this.tables.set(definition.logicalName, definition);
  }
  
  registerRelationship(definition: RelationshipDefinition): void {
    const key = `${definition.parentTable.logicalName}_${definition.childTable.logicalName}`;
    this.relationships.set(key, definition);
  }
  
  findTableByDisplayName(displayName: string): TableDefinition | undefined {
    return Array.from(this.tables.values()).find(t => t.displayName === displayName);
  }
  
  findRelationship(parentDisplayName: string, childDisplayName: string): RelationshipDefinition | undefined {
    const parentTable = this.findTableByDisplayName(parentDisplayName);
    const childTable = this.findTableByDisplayName(childDisplayName);
    
    if (!parentTable || !childTable) return undefined;
    
    const key = `${parentTable.logicalName}_${childTable.logicalName}`;
    return this.relationships.get(key);
  }
  
  getNavigationProperty(parentDisplayName: string, childDisplayName: string): string {
    const relationship = this.findRelationship(parentDisplayName, childDisplayName);
    if (!relationship) {
      throw new Error(`No relationship found between ${parentDisplayName} and ${childDisplayName}`);
    }
    return relationship.navigationProperty;
  }
}
```

### Phase 3: Automatic Record Creation
```typescript
class AutomaticRecordCreator {
  constructor(
    private readonly baseClient: IPowerPlatformClient,
    private readonly schemaRegistry: SchemaRegistry,
    private readonly nameGenerator: NameGenerator
  ) {}
  
  async createChildRecord(
    childDisplayName: string,
    parentDisplayName: string,
    childData: Record<string, unknown>,
    parentId: string,
    environmentUrl: string
  ): Promise<string> {
    // 1. Get table definitions
    const childTable = this.schemaRegistry.findTableByDisplayName(childDisplayName);
    const parentTable = this.schemaRegistry.findTableByDisplayName(parentDisplayName);
    
    if (!childTable || !parentTable) {
      throw new Error(`Tables must be registered: ${childDisplayName}, ${parentDisplayName}`);
    }
    
    // 2. Get navigation property automatically
    const navigationProperty = this.schemaRegistry.getNavigationProperty(parentDisplayName, childDisplayName);
    const odataReference = this.nameGenerator.generateODataReference(parentTable.logicalName, parentId);
    
    // 3. Create record with automatic lookup
    const recordWithLookup = {
      ...childData,
      [navigationProperty]: odataReference
    };
    
    console.log(`🔗 Auto-generated lookup: ${navigationProperty} = ${odataReference}`);
    
    // 4. Execute creation
    const result = await this.baseClient.createRecord(
      childTable.logicalName, 
      recordWithLookup, 
      environmentUrl
    );
    
    if (!result.success) {
      throw new Error(`Failed to create child record: ${result.error}`);
    }
    
    return result.data.id;
  }
  
  async createMultipleChildRecords(
    childDisplayName: string,
    parentDisplayName: string,
    recordsWithParentIds: Array<{ data: Record<string, unknown>, parentId: string }>,
    environmentUrl: string
  ): Promise<CreateMultipleResult> {
    const childTable = this.schemaRegistry.findTableByDisplayName(childDisplayName);
    const parentTable = this.schemaRegistry.findTableByDisplayName(parentDisplayName);
    const navigationProperty = this.schemaRegistry.getNavigationProperty(parentDisplayName, childDisplayName);
    
    // Transform all records with automatic lookups
    const recordsWithLookups = recordsWithParentIds.map(({ data, parentId }) => ({
      ...data,
      [navigationProperty]: this.nameGenerator.generateODataReference(parentTable.logicalName, parentId)
    }));
    
    console.log(`🔗 Batch creating ${recordsWithLookups.length} records with automatic navigation property: ${navigationProperty}`);
    
    return await this.baseClient.createMultipleRecords(
      `${childTable.logicalName}s`,
      recordsWithLookups,
      environmentUrl
    );
  }
}
```

## Usage Examples

### Basic Table Registration and Relationship Creation
```typescript
const client = new SchemaAwarePowerPlatformClient();

// 1. Register existing tables
client.registerExistingTable('Order Header');
client.registerExistingTable('Order Line');

// 2. Create relationship (navigation property auto-generated)
await client.createRelationship('Order Header', 'Order Line', environmentUrl);

// 3. Navigation property is now available automatically
const navProp = client.getNavigationProperty('Order Header', 'Order Line');
console.log(navProp); // Output: "jr_OrderHeader@odata.bind"
```

### Automatic Child Record Creation
```typescript
// Create parent records first
const orderData = [
  { jr_name: 'Order #1001', jr_total: 100.00 },
  { jr_name: 'Order #1002', jr_total: 250.50 }
];

const orderResults = await baseClient.createMultipleRecords('jr_orderheaders', orderData, environmentUrl);
const orderIds = orderResults.results.map(r => r.data.id);

// Create child records with automatic lookups - ZERO guesswork!
const lineItems = [
  { data: { jr_name: 'Product A', jr_quantity: 5 }, parentId: orderIds[0] },
  { data: { jr_name: 'Product B', jr_quantity: 3 }, parentId: orderIds[0] },
  { data: { jr_name: 'Product C', jr_quantity: 2 }, parentId: orderIds[1] }
];

const lineResults = await client.createMultipleChildRecords(
  'Order Line',    // Child table display name
  'Order Header',  // Parent table display name
  lineItems,       // Data with parent IDs
  environmentUrl
);

// Result: All lookup references created automatically using correct navigation properties
```

### Schema Introspection
```typescript
// Get complete schema snapshot
const schema = client.getSchema();

console.log('Tables:');
schema.tables.forEach(table => {
  console.log(`  - "${table.displayName}" -> ${table.logicalName} (${table.schemaName})`);
});

console.log('Relationships:');
schema.relationships.forEach(rel => {
  console.log(`  - ${rel.parentTable.displayName} -> ${rel.childTable.displayName}`);
  console.log(`    Navigation Property: ${rel.navigationProperty}`);
  console.log(`    🎯 AUTOMATICALLY GENERATED!`);
});
```

## Error Handling Strategy

### Schema Validation Errors
```typescript
class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly displayName: string,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

// Usage
if (!this.schemaRegistry.findTableByDisplayName(displayName)) {
  throw new SchemaValidationError(
    `Table not found in schema registry: ${displayName}`,
    displayName,
    'createChildRecord'
  );
}
```

### Navigation Property Errors
```typescript
class NavigationPropertyError extends Error {
  constructor(
    message: string,
    public readonly parentDisplayName: string,
    public readonly childDisplayName: string
  ) {
    super(message);
    this.name = 'NavigationPropertyError';
  }
}

// Usage
try {
  const navProp = this.getNavigationProperty(parentDisplayName, childDisplayName);
} catch (error) {
  throw new NavigationPropertyError(
    `Unable to determine navigation property between ${parentDisplayName} and ${childDisplayName}`,
    parentDisplayName,
    childDisplayName
  );
}
```

## Testing Strategy

### Unit Tests for Name Generation
```typescript
describe('NameGenerator', () => {
  const generator = new NameGenerator('jr');
  
  test('generates correct table names from display name', () => {
    const result = generator.generateTableNames('Order Header');
    
    expect(result.logicalName).toBe('jr_orderheader');
    expect(result.schemaName).toBe('jr_OrderHeader');
    expect(result.displayName).toBe('Order Header');
  });
  
  test('generates correct navigation property', () => {
    const navProp = generator.generateNavigationProperty('Order Header');
    expect(navProp).toBe('jr_OrderHeader@odata.bind');
  });
});
```

### Integration Tests with Real Schema
```typescript
describe('SchemaAwarePowerPlatformClient Integration', () => {
  let client: SchemaAwarePowerPlatformClient;
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  beforeEach(async () => {
    client = new SchemaAwarePowerPlatformClient();
    await client.loadSchema(environmentUrl);
  });
  
  test('creates child records with automatic navigation properties', async () => {
    // Register tables
    client.registerExistingTable('Test Parent');
    client.registerExistingTable('Test Child');
    
    // Create relationship
    await client.createRelationship('Test Parent', 'Test Child', environmentUrl);
    
    // Create parent
    const parentId = await baseClient.createRecord('jr_testparents', 
      { jr_name: 'Parent 1' }, environmentUrl);
    
    // Create child with automatic lookup
    const childId = await client.createChildRecord(
      'Test Child',
      'Test Parent', 
      { jr_name: 'Child 1' },
      parentId,
      environmentUrl
    );
    
    expect(childId).toBeDefined();
    
    // Verify lookup was created correctly
    const childRecord = await baseClient.getRecord('jr_testchilds', childId, environmentUrl);
    expect(childRecord.jr_testparent).toBe(parentId);
  });
});
```

This specification provides the complete blueprint for implementing a schema-aware client that eliminates navigation property guesswork while maintaining type safety and developer productivity.