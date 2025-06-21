# TypeScript Migration Plan

## Overview
Comprehensive migration strategy from JavaScript to TypeScript with enterprise-grade type safety and zero tolerance for `any` types.

## Migration Status

### ✅ Completed Components
- [x] Core configuration (`src/config/index.ts`, `src/config/types.ts`)
- [x] Logger utility (`src/utils/logger.ts`) 
- [x] Schema-aware Power Platform client (`src/integrations/power-platform/schema-aware-client.ts`)
- [x] Type definitions (`src/types/`)
- [x] Test infrastructure (`tests/setup.ts`)

### 🚧 In Progress Components
- [ ] Complete migration of remaining JavaScript files
- [ ] Comprehensive interface definitions
- [ ] API contract types

### 📋 Pending Components
- [ ] Legacy JavaScript file cleanup
- [ ] Complete type coverage validation
- [ ] Production build optimization

## Type Safety Standards

### Zero Tolerance Rules
```typescript
// BANNED - Using 'any' type
function badExample(data: any): any {
  return data.someProperty;
}

// MANDATORY - Explicit typing
interface UserData {
  id: string;
  name: string;
  email?: string;
}

function goodExample(data: UserData): string {
  return data.name;
}
```

### Required Type Annotations
```typescript
// MANDATORY - All function parameters typed
async function createEnvironment(
  name: string,
  region: string,
  config: EnvironmentConfig
): Promise<EnvironmentResult> {
  // Implementation
}

// MANDATORY - All variables with complex types
const environmentConfig: EnvironmentConfig = {
  displayName: name,
  location: region,
  environmentSku: 'Sandbox'
};

// MANDATORY - Union types over enums
type BuildStatus = 'pending' | 'running' | 'succeeded' | 'failed';
```

## Domain-Specific Type Definitions

### Power Platform Types
```typescript
// Core Dataverse entities
interface DataverseEntity {
  readonly id: string;
  readonly createdOn: Date;
  readonly modifiedOn: Date;
  readonly '@odata.etag': string;
}

interface DataverseTable extends DataverseEntity {
  readonly logicalName: string;
  readonly displayName: string;
  readonly schemaName: string;
  readonly primaryNameAttribute: string;
}

interface DataverseField {
  readonly attributeType: AttributeType;
  readonly schemaName: string;
  readonly displayName: string;
  readonly logicalName: string;
  readonly requiredLevel: RequiredLevel;
  readonly maxLength?: number;
}

type AttributeType = 
  | 'String' 
  | 'Integer' 
  | 'DateTime' 
  | 'Boolean' 
  | 'Lookup' 
  | 'Picklist' 
  | 'Money' 
  | 'Decimal';

type RequiredLevel = 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
```

### Azure DevOps Types
```typescript
interface WorkItem {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly relations?: WorkItemRelation[];
  readonly url: string;
}

interface WorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.WorkItemType': WorkItemType;
  'System.State': string;
  'System.AssignedTo'?: string;
  'System.AreaPath': string;
  'System.IterationPath': string;
  'System.Description'?: string;
  'Microsoft.VSTS.Common.Priority'?: number;
  'Microsoft.VSTS.Scheduling.Effort'?: number;
  [customField: string]: unknown;
}

type WorkItemType = 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug';

interface WorkItemRelation {
  readonly rel: RelationType;
  readonly url: string;
  readonly attributes?: Record<string, unknown>;
}

type RelationType = 
  | 'System.LinkTypes.Hierarchy-Forward'
  | 'System.LinkTypes.Hierarchy-Reverse'
  | 'System.LinkTypes.Related'
  | 'System.LinkTypes.Duplicate';
```

### Configuration Types
```typescript
interface ApplicationConfig {
  readonly azure: AzureConfig;
  readonly powerPlatform: PowerPlatformConfig;
  readonly logging: LoggingConfig;
  readonly environment: Environment;
}

interface AzureConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tenantId: string;
  readonly devOpsOrganization: string;
  readonly devOpsPat?: string;
}

interface PowerPlatformConfig {
  readonly environmentUrl: string;
  readonly useInteractiveAuth: boolean;
  readonly defaultRegion: string;
}

type Environment = 'development' | 'staging' | 'production';
```

## Error Handling Types

### Type-Safe Error System
```typescript
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  
  protected constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class DataverseError extends AppError {
  readonly code = 'DATAVERSE_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly operation: string,
    cause?: Error
  ) {
    super(message, cause);
  }
}

class AzureDevOpsError extends AppError {
  readonly code = 'AZURE_DEVOPS_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly workItemId?: number,
    cause?: Error
  ) {
    super(message, cause);
  }
}

// Result type for operations that can fail
type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

## API Response Types

### Dataverse API Responses
```typescript
interface DataverseResponse<T = unknown> {
  readonly '@odata.context': string;
  readonly '@odata.etag'?: string;
  readonly value?: T[];
}

interface DataverseCreateResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly id: string;
}

interface DataverseBatchResponse {
  readonly responses: Array<{
    readonly id: string;
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body?: unknown;
  }>;
}
```

### Azure DevOps API Responses
```typescript
interface AzureDevOpsResponse<T = unknown> {
  readonly count: number;
  readonly value: T[];
}

interface WorkItemCreateResponse {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly url: string;
}

interface ProjectCreateResponse {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly state: 'wellFormed' | 'createPending' | 'deleting';
}
```

## Template System Types

### Template Definitions
```typescript
interface ProjectTemplate {
  readonly metadata: TemplateMetadata;
  readonly azureDevOps: AzureDevOpsTemplate;
  readonly powerPlatform: PowerPlatformTemplate;
  readonly dataModel?: DataModelTemplate;
}

interface TemplateMetadata {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: readonly string[];
}

interface AzureDevOpsTemplate {
  readonly project: ProjectConfig;
  readonly workItems: WorkItemTemplate[];
  readonly repositories: RepositoryConfig[];
  readonly pipelines: PipelineConfig[];
}

interface PowerPlatformTemplate {
  readonly environments: EnvironmentTemplate[];
  readonly solutions: SolutionTemplate[];
  readonly publisher: PublisherConfig;
}

interface DataModelTemplate {
  readonly tables: TableTemplate[];
  readonly relationships: RelationshipTemplate[];
  readonly securityRoles: SecurityRoleTemplate[];
}
```

## Migration Implementation Strategy

### Phase 1: Core Infrastructure (Current)
```typescript
// Migrate foundational modules first
const coreModules = [
  'src/config/',           // ✅ Complete
  'src/types/',           // ✅ Complete  
  'src/utils/logger.ts',  // ✅ Complete
  'tests/setup.ts'        // ✅ Complete
] as const;
```

### Phase 2: Integration Layer
```typescript
// Migrate service integrations
const integrationModules = [
  'src/integrations/power-platform/',     // 🚧 Schema-aware client complete, bulletproof patterns extracted
  'src/integrations/azure-devops/',       // 📋 Pending - MCP client needs TypeScript migration
  'src/integrations/microsoft-graph/'     // 📋 Pending - needs new implementation
] as const;
```

### Phase 3: Business Logic
```typescript
// Migrate orchestration and API layers
const businessModules = [
  'src/workflows/',    // 📋 Pending
  'src/api/',         // 📋 Pending
  'src/templates/'    // 📋 Pending
] as const;
```

### Phase 4: Cleanup
```typescript
// Remove legacy JavaScript files
const legacyFiles = [
  'src/legacy-js/',
  '**/*.js.bak'
  // temp-scripts/ - ✅ REMOVED: Valuable patterns extracted to specs and ai_docs
] as const;
```

## Code Generation Patterns

### Interface Generation
```typescript
// Generate interfaces from API schemas
interface GeneratedDataverseEntity {
  // Auto-generated from metadata API
  readonly [logicalName: string]: unknown;
}

// Template for manual interface creation
interface ManualEntityInterface extends DataverseEntity {
  readonly jr_name: string;
  readonly jr_description?: string;
  readonly jr_startdate?: Date;
  readonly '_jr_parenttable_value'?: string; // Lookup value
  readonly jr_ParentTable?: DataverseEntity; // Navigation property
}
```

### Type Guards
```typescript
function isDataverseEntity(obj: unknown): obj is DataverseEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdOn' in obj &&
    'modifiedOn' in obj &&
    '@odata.etag' in obj
  );
}

function isWorkItem(obj: unknown): obj is WorkItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'fields' in obj &&
    typeof (obj as WorkItem).id === 'number'
  );
}
```

## Testing Strategy

### Type Testing
```typescript
// Compile-time type checking
import { expectType } from 'tsd';

expectType<string>(workItem.fields['System.Title']);
expectType<number>(workItem.id);
expectType<WorkItemType>(workItem.fields['System.WorkItemType']);

// Runtime type validation
describe('Type Guards', () => {
  test('identifies Dataverse entities correctly', () => {
    const entity = {
      id: 'test-id',
      createdOn: new Date(),
      modifiedOn: new Date(),
      '@odata.etag': 'W/"123456"'
    };
    
    expect(isDataverseEntity(entity)).toBe(true);
    expect(isDataverseEntity({ id: 'test' })).toBe(false);
  });
});
```

### Integration Type Testing
```typescript
// Verify API responses match expected types
describe('API Response Types', () => {
  test('Dataverse create response has correct shape', async () => {
    const response = await client.createRecord(entityData);
    
    expectType<DataverseCreateResponse>(response);
    expect(response).toHaveProperty('@odata.context');
    expect(response).toHaveProperty('id');
  });
});
```

## ESLint Configuration for Type Safety

### Strict TypeScript Rules
```json
{
  "extends": ["@typescript-eslint/recommended-requiring-type-checking"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-readonly-parameter-types": "warn"
  }
}
```

## Implementation Checklist

### Current Status
- [x] TypeScript configuration with strict mode
- [x] Core type definitions for domain objects
- [x] Error handling type system
- [x] Configuration type safety
- [x] Test infrastructure with TypeScript
- [x] Schema-aware Power Platform patterns extracted and documented
- [x] Bulletproof navigation property generation patterns specified
- [x] Authentication patterns documented for both interactive and service principal flows
- [x] temp-scripts/ cleanup completed with valuable patterns preserved

### Next Steps
- [ ] Implement schema-aware client specification in TypeScript
- [ ] Complete Azure DevOps integration types based on working MCP patterns
- [ ] Complete Microsoft Graph integration types for app registration automation
- [ ] Template system type definitions
- [ ] API contract type validation
- [ ] Legacy JavaScript file removal

### Quality Gates
- [ ] Zero `any` types in production code
- [ ] 100% explicit function return types
- [ ] All API responses properly typed
- [ ] Comprehensive type guard coverage
- [ ] Complete type-based testing
- [ ] Schema-aware client fully implemented with automatic navigation property generation
- [ ] All Power Platform integration patterns follow bulletproof approach

This migration plan ensures enterprise-grade type safety while maintaining development velocity and code quality standards.