# API Contracts Specification

## Overview
Comprehensive API contract definitions for the Power Platform Orchestration Agent, covering all external integrations and internal service interfaces.

## Core API Architecture

### Request/Response Pattern
```typescript
interface ApiRequest<T = unknown> {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: T;
  readonly timeout?: number;
}

interface ApiResponse<T = unknown> {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly data: T;
  readonly requestId: string;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
```

### Error Response Contract
```typescript
interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly target?: string;
    readonly innererror?: {
      readonly code: string;
      readonly message: string;
      readonly stackTrace?: string;
    };
  };
  readonly timestamp: string;
  readonly requestId: string;
}
```

## Dataverse Web API Contracts

### Authentication Contracts
```typescript
interface TokenRequest {
  readonly grant_type: 'client_credentials' | 'authorization_code' | 'device_code';
  readonly client_id: string;
  readonly client_secret?: string;
  readonly scope: string;
  readonly resource?: string;
  readonly device_code?: string;
  readonly code?: string;
}

interface TokenResponse {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly scope: string;
  readonly resource: string;
}

interface DeviceCodeResponse {
  readonly device_code: string;
  readonly user_code: string;
  readonly verification_uri: string;
  readonly expires_in: number;
  readonly interval: number;
  readonly message: string;
}
```

### Entity Operations
```typescript
// Create Entity
interface CreateEntityRequest {
  readonly entityLogicalName: string;
  readonly data: Record<string, unknown>;
  readonly headers?: {
    readonly 'Prefer'?: 'return=representation';
    readonly 'MSCRM.SuppressDuplicateDetection'?: 'false';
  };
}

interface CreateEntityResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly id: string;
  readonly [field: string]: unknown;
}

// Update Entity
interface UpdateEntityRequest {
  readonly entityLogicalName: string;
  readonly entityId: string;
  readonly data: Record<string, unknown>;
  readonly headers?: {
    readonly 'If-Match'?: string;
    readonly 'MSCRM.SuppressDuplicateDetection'?: 'false';
  };
}

// Retrieve Entity
interface RetrieveEntityRequest {
  readonly entityLogicalName: string;
  readonly entityId: string;
  readonly select?: readonly string[];
  readonly expand?: readonly string[];
}

interface RetrieveEntityResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly id: string;
  readonly [field: string]: unknown;
}
```

### Metadata Operations
```typescript
// Create Table
interface CreateTableRequest {
  readonly entityMetadata: {
    readonly '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata';
    readonly SchemaName: string;
    readonly DisplayName: LocalizedLabel;
    readonly DisplayCollectionName: LocalizedLabel;
    readonly Description?: LocalizedLabel;
    readonly OwnershipType: 'UserOwned' | 'OrganizationOwned';
    readonly HasActivities: boolean;
    readonly HasNotes: boolean;
    readonly IsActivity: boolean;
    readonly PrimaryNameAttribute: string;
  };
}

interface LocalizedLabel {
  readonly LocalizedLabels: readonly Array<{
    readonly Label: string;
    readonly LanguageCode: number;
  }>;
}

// Create Attribute
interface CreateAttributeRequest {
  readonly entityLogicalName: string;
  readonly attributeMetadata: {
    readonly '@odata.type': string;
    readonly SchemaName: string;
    readonly DisplayName: LocalizedLabel;
    readonly RequiredLevel: {
      readonly Value: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
    };
    readonly MaxLength?: number;
    readonly MinValue?: number;
    readonly MaxValue?: number;
    readonly Precision?: number;
  };
}

// Create Relationship
interface CreateRelationshipRequest {
  readonly relationshipMetadata: {
    readonly '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata';
    readonly SchemaName: string;
    readonly ReferencedEntity: string;
    readonly ReferencingEntity: string;
    readonly ReferencedAttribute: string;
    readonly ReferencingAttribute: string;
    readonly Lookup: {
      readonly AttributeType: 'Lookup';
      readonly SchemaName: string;
    };
  };
}
```

### Solution Operations
```typescript
// Create Solution
interface CreateSolutionRequest {
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly description?: string;
  readonly version: string;
  readonly publisherid: string;
}

interface CreateSolutionResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly solutionid: string;
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly version: string;
}

// Add Solution Component
interface AddSolutionComponentRequest {
  readonly ComponentType: number;
  readonly ComponentId: string;
  readonly SolutionUniqueName: string;
  readonly AddRequiredComponents: boolean;
  readonly IncludedComponentSettingsValues?: string;
}
```

## Azure DevOps REST API Contracts

### Project Operations
```typescript
// Create Project
interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
  readonly visibility: 'private' | 'public';
  readonly capabilities: {
    readonly versioncontrol: {
      readonly sourceControlType: 'Git';
    };
    readonly processTemplate: {
      readonly templateTypeId: string;
    };
  };
}

interface CreateProjectResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly state: 'wellFormed' | 'createPending' | 'deleting';
  readonly revision: number;
  readonly visibility: 'private' | 'public';
  readonly lastUpdateTime: string;
}
```

### Work Item Operations
```typescript
// Create Work Item
interface CreateWorkItemRequest {
  readonly fields: Record<string, unknown>;
  readonly relations?: readonly WorkItemRelation[];
}

interface CreateWorkItemResponse {
  readonly id: number;
  readonly rev: number;
  readonly fields: Record<string, unknown>;
  readonly relations?: readonly WorkItemRelation[];
  readonly url: string;
}

// Update Work Item
interface UpdateWorkItemRequest {
  readonly operations: readonly Array<{
    readonly op: 'add' | 'replace' | 'remove';
    readonly path: string;
    readonly value?: unknown;
  }>;
}

// Work Item Relations
interface WorkItemRelation {
  readonly rel: string;
  readonly url: string;
  readonly attributes?: Record<string, unknown>;
}
```

### Repository Operations
```typescript
// Create Repository
interface CreateRepositoryRequest {
  readonly name: string;
  readonly project: {
    readonly id: string;
  };
}

interface CreateRepositoryResponse {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly project: {
    readonly id: string;
    readonly name: string;
  };
  readonly defaultBranch: string;
  readonly remoteUrl: string;
}

// Create Pull Request
interface CreatePullRequestRequest {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly description?: string;
  readonly isDraft?: boolean;
  readonly reviewers?: readonly Array<{
    readonly id: string;
  }>;
}
```

## Power Platform Admin API Contracts

### Environment Operations
```typescript
// Create Environment
interface CreateEnvironmentRequest {
  readonly displayName: string;
  readonly location: string;
  readonly environmentSku: 'Trial' | 'Production' | 'Sandbox';
  readonly databaseType: 'CommonDataService' | 'None';
  readonly currency?: {
    readonly code: string;
  };
  readonly language?: {
    readonly name: string;
  };
}

interface CreateEnvironmentResponse {
  readonly name: string;
  readonly id: string;
  readonly displayName: string;
  readonly location: string;
  readonly type: string;
  readonly properties: {
    readonly displayName: string;
    readonly createdTime: string;
    readonly environmentSku: string;
    readonly linkedEnvironmentMetadata?: {
      readonly instanceUrl: string;
      readonly uniqueName: string;
      readonly version: string;
    };
  };
}

// List Environments
interface ListEnvironmentsResponse {
  readonly value: readonly Environment[];
  readonly nextLink?: string;
}

interface Environment {
  readonly name: string;
  readonly id: string;
  readonly type: string;
  readonly location: string;
  readonly displayName: string;
  readonly properties: {
    readonly displayName: string;
    readonly environmentSku: string;
    readonly provisioningState: string;
    readonly linkedEnvironmentMetadata?: {
      readonly instanceUrl: string;
      readonly uniqueName: string;
    };
  };
}
```

## Microsoft Graph API Contracts

### Application Registration
```typescript
// Create Application
interface CreateApplicationRequest {
  readonly displayName: string;
  readonly signInAudience: 'AzureADMyOrg' | 'AzureADMultipleOrgs' | 'AzureADandPersonalMicrosoftAccount';
  readonly requiredResourceAccess?: readonly Array<{
    readonly resourceAppId: string;
    readonly resourceAccess: readonly Array<{
      readonly id: string;
      readonly type: 'Scope' | 'Role';
    }>;
  }>;
}

interface CreateApplicationResponse {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly signInAudience: string;
  readonly createdDateTime: string;
}

// Create Service Principal
interface CreateServicePrincipalRequest {
  readonly appId: string;
}

interface CreateServicePrincipalResponse {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly servicePrincipalType: string;
}
```

## Internal API Contracts

### Orchestration API
```typescript
// Create Project
interface CreateProjectApiRequest {
  readonly templateName: string;
  readonly projectName: string;
  readonly description?: string;
  readonly customization?: Record<string, unknown>;
}

interface CreateProjectApiResponse {
  readonly operationId: string;
  readonly status: 'started' | 'running' | 'completed' | 'failed';
  readonly progress: {
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly currentStep?: string;
  };
  readonly result?: {
    readonly azureDevOpsProject: {
      readonly id: string;
      readonly url: string;
    };
    readonly powerPlatformEnvironments: readonly Array<{
      readonly name: string;
      readonly url: string;
    }>;
  };
  readonly error?: ErrorResponse;
}

// Get Operation Status
interface GetOperationStatusResponse {
  readonly operationId: string;
  readonly status: 'started' | 'running' | 'completed' | 'failed';
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly progress: {
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly currentStep?: string;
  };
  readonly logs: readonly Array<{
    readonly timestamp: string;
    readonly level: 'info' | 'warn' | 'error';
    readonly message: string;
    readonly details?: unknown;
  }>;
}
```

### Template API
```typescript
// List Templates
interface ListTemplatesResponse {
  readonly templates: readonly Array<{
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly version: string;
    readonly tags: readonly string[];
    readonly parameters: readonly TemplateParameter[];
  }>;
}

interface TemplateParameter {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly allowedValues?: readonly unknown[];
}

// Validate Template
interface ValidateTemplateRequest {
  readonly templateName: string;
  readonly parameters: Record<string, unknown>;
}

interface ValidateTemplateResponse {
  readonly valid: boolean;
  readonly errors: readonly Array<{
    readonly parameter: string;
    readonly message: string;
    readonly code: string;
  }>;
}
```

## Batch Operation Contracts

### Dataverse Batch
```typescript
interface DataverseBatchRequest {
  readonly requests: readonly Array<{
    readonly id: string;
    readonly method: HttpMethod;
    readonly url: string;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
  }>;
}

interface DataverseBatchResponse {
  readonly responses: readonly Array<{
    readonly id: string;
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body?: unknown;
  }>;
}
```

## Schema-Aware Client Contracts

### Navigation Property Resolution
```typescript
interface NavigationPropertyRequest {
  readonly parentTableDisplayName: string;
  readonly childTableDisplayName: string;
}

interface NavigationPropertyResponse {
  readonly navigationProperty: string;
  readonly collectionName: string;
  readonly lookupFieldLogicalName: string;
  readonly relationshipSchemaName: string;
}

// Child Record Creation
interface CreateChildRecordRequest {
  readonly childTableDisplayName: string;
  readonly parentTableDisplayName: string;
  readonly childData: Record<string, unknown>;
  readonly parentId: string;
  readonly environmentUrl: string;
}

interface CreateChildRecordResponse {
  readonly childId: string;
  readonly parentRelationship: {
    readonly navigationProperty: string;
    readonly relationshipName: string;
  };
}
```

## Validation and Type Guards

### Request Validation
```typescript
function validateCreateEntityRequest(req: unknown): req is CreateEntityRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'entityLogicalName' in req &&
    'data' in req &&
    typeof (req as CreateEntityRequest).entityLogicalName === 'string' &&
    typeof (req as CreateEntityRequest).data === 'object'
  );
}

function validateTokenResponse(res: unknown): res is TokenResponse {
  return (
    typeof res === 'object' &&
    res !== null &&
    'access_token' in res &&
    'token_type' in res &&
    'expires_in' in res &&
    typeof (res as TokenResponse).access_token === 'string' &&
    (res as TokenResponse).token_type === 'Bearer'
  );
}
```

## API Client Interface

### Generic API Client
```typescript
interface ApiClient {
  request<TRequest, TResponse>(
    request: ApiRequest<TRequest>
  ): Promise<ApiResponse<TResponse>>;
  
  get<TResponse>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>>;
  
  post<TRequest, TResponse>(
    url: string,
    body: TRequest,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>>;
  
  patch<TRequest, TResponse>(
    url: string,
    body: TRequest,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>>;
  
  delete<TResponse>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>>;
}
```

This specification provides complete type safety for all external API integrations and internal service contracts, ensuring robust error handling and clear interface boundaries throughout the application.