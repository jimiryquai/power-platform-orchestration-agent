// API Contracts - Enterprise-grade TypeScript definitions for all external integrations
// ZERO TOLERANCE FOR 'any' - Complete type safety for all API operations

// ============================================================================
// Core API Architecture Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest<T = unknown> {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: T;
  readonly timeout?: number;
}

export interface ApiResponse<T = unknown> {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly data: T;
  readonly requestId: string;
}

export interface ErrorResponse {
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

// ============================================================================
// Authentication Contract Types
// ============================================================================

export type GrantType = 'client_credentials' | 'authorization_code' | 'device_code';

export interface TokenRequest {
  readonly grant_type: GrantType;
  readonly client_id: string;
  readonly client_secret?: string;
  readonly scope: string;
  readonly resource?: string;
  readonly device_code?: string;
  readonly code?: string;
}

export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly scope: string;
  readonly resource: string;
}

export interface DeviceCodeResponse {
  readonly device_code: string;
  readonly user_code: string;
  readonly verification_uri: string;
  readonly expires_in: number;
  readonly interval: number;
  readonly message: string;
}

// ============================================================================
// Dataverse Web API Contract Types
// ============================================================================

export interface LocalizedLabel {
  readonly LocalizedLabels: ReadonlyArray<{
    readonly Label: string;
    readonly LanguageCode: number;
  }>;
}

export type RequiredLevel = 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
export type OwnershipType = 'UserOwned' | 'OrganizationOwned';

// Entity Operations
export interface CreateEntityRequest {
  readonly entityLogicalName: string;
  readonly data: Record<string, unknown>;
  readonly headers?: {
    readonly 'Prefer'?: 'return=representation';
    readonly 'MSCRM.SuppressDuplicateDetection'?: 'false';
  };
}

export interface CreateEntityResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly id: string;
  readonly [field: string]: unknown;
}

export interface UpdateEntityRequest {
  readonly entityLogicalName: string;
  readonly entityId: string;
  readonly data: Record<string, unknown>;
  readonly headers?: {
    readonly 'If-Match'?: string;
    readonly 'MSCRM.SuppressDuplicateDetection'?: 'false';
  };
}

export interface RetrieveEntityRequest {
  readonly entityLogicalName: string;
  readonly entityId: string;
  readonly select?: readonly string[];
  readonly expand?: readonly string[];
}

export interface RetrieveEntityResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly id: string;
  readonly [field: string]: unknown;
}

// Metadata Operations
export interface CreateTableRequest {
  readonly entityMetadata: {
    readonly '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata';
    readonly SchemaName: string;
    readonly DisplayName: LocalizedLabel;
    readonly DisplayCollectionName: LocalizedLabel;
    readonly Description?: LocalizedLabel;
    readonly OwnershipType: OwnershipType;
    readonly HasActivities: boolean;
    readonly HasNotes: boolean;
    readonly IsActivity: boolean;
    readonly PrimaryNameAttribute: string;
  };
}

export interface CreateAttributeRequest {
  readonly entityLogicalName: string;
  readonly attributeMetadata: {
    readonly '@odata.type': string;
    readonly SchemaName: string;
    readonly DisplayName: LocalizedLabel;
    readonly RequiredLevel: {
      readonly Value: RequiredLevel;
    };
    readonly MaxLength?: number;
    readonly MinValue?: number;
    readonly MaxValue?: number;
    readonly Precision?: number;
  };
}

export interface CreateRelationshipRequest {
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

// Solution Operations
export interface CreateSolutionRequest {
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly description?: string;
  readonly version: string;
  readonly publisherid: string;
}

export interface CreateSolutionResponse {
  readonly '@odata.context': string;
  readonly '@odata.etag': string;
  readonly solutionid: string;
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly version: string;
}

export interface AddSolutionComponentRequest {
  readonly ComponentType: number;
  readonly ComponentId: string;
  readonly SolutionUniqueName: string;
  readonly AddRequiredComponents: boolean;
  readonly IncludedComponentSettingsValues?: string;
}

// ============================================================================
// Azure DevOps REST API Contract Types
// ============================================================================

export type ProjectVisibility = 'private' | 'public';
export type ProjectState = 'wellFormed' | 'createPending' | 'deleting';

// Project Operations
export interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
  readonly visibility: ProjectVisibility;
  readonly capabilities: {
    readonly versioncontrol: {
      readonly sourceControlType: 'Git';
    };
    readonly processTemplate: {
      readonly templateTypeId: string;
    };
  };
}

export interface CreateProjectResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly state: ProjectState;
  readonly revision: number;
  readonly visibility: ProjectVisibility;
  readonly lastUpdateTime: string;
}

// Work Item Operations
export interface WorkItemRelation {
  readonly rel: string;
  readonly url: string;
  readonly attributes?: Record<string, unknown>;
}

export interface CreateWorkItemRequest {
  readonly fields: Record<string, unknown>;
  readonly relations?: readonly WorkItemRelation[];
}

export interface CreateWorkItemResponse {
  readonly id: number;
  readonly rev: number;
  readonly fields: Record<string, unknown>;
  readonly relations?: readonly WorkItemRelation[];
  readonly url: string;
}

export interface UpdateWorkItemRequest {
  readonly operations: ReadonlyArray<{
    readonly op: 'add' | 'replace' | 'remove';
    readonly path: string;
    readonly value?: unknown;
  }>;
}

// Repository Operations
export interface CreateRepositoryRequest {
  readonly name: string;
  readonly project: {
    readonly id: string;
  };
}

export interface CreateRepositoryResponse {
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

export interface CreatePullRequestRequest {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly description?: string;
  readonly isDraft?: boolean;
  readonly reviewers?: ReadonlyArray<{
    readonly id: string;
  }>;
}

// ============================================================================
// Power Platform Admin API Contract Types
// ============================================================================

export type EnvironmentSku = 'Trial' | 'Production' | 'Sandbox';
export type DatabaseType = 'CommonDataService' | 'None';

// Environment Operations
export interface CreateEnvironmentRequest {
  readonly displayName: string;
  readonly location: string;
  readonly environmentSku: EnvironmentSku;
  readonly databaseType: DatabaseType;
  readonly currency?: {
    readonly code: string;
  };
  readonly language?: {
    readonly name: string;
  };
}

export interface CreateEnvironmentResponse {
  readonly name: string;
  readonly id: string;
  readonly displayName: string;
  readonly location: string;
  readonly type: string;
  readonly properties: {
    readonly displayName: string;
    readonly createdTime: string;
    readonly environmentSku: string;
    readonly provisioningState: 'Succeeded' | 'Failed' | 'Accepted' | 'Running' | 'Ready' | 'NotSpecified';
    readonly linkedEnvironmentMetadata?: {
      readonly instanceUrl: string;
      readonly uniqueName: string;
      readonly version: string;
    };
  };
}

export interface ListEnvironmentsResponse {
  readonly value: readonly Environment[];
  readonly nextLink?: string;
}

export interface Environment {
  readonly name: string;
  readonly id: string;
  readonly type: string;
  readonly location: string;
  readonly displayName: string;
  readonly properties: {
    readonly displayName: string;
    readonly environmentSku: string;
    readonly provisioningState: 'Succeeded' | 'Failed' | 'Accepted' | 'Running' | 'Ready' | 'NotSpecified';
    readonly linkedEnvironmentMetadata?: {
      readonly instanceUrl: string;
      readonly uniqueName: string;
      readonly version?: string;
    };
  };
}

// ============================================================================
// Microsoft Graph API Contract Types
// ============================================================================

export type SignInAudience = 'AzureADMyOrg' | 'AzureADMultipleOrgs' | 'AzureADandPersonalMicrosoftAccount';
export type ResourceAccessType = 'Scope' | 'Role';

// Application Registration
export interface CreateApplicationRequest {
  readonly displayName: string;
  readonly signInAudience: SignInAudience;
  readonly requiredResourceAccess?: ReadonlyArray<{
    readonly resourceAppId: string;
    readonly resourceAccess: ReadonlyArray<{
      readonly id: string;
      readonly type: ResourceAccessType;
    }>;
  }>;
}

export interface CreateApplicationResponse {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly signInAudience: string;
  readonly createdDateTime: string;
}

export interface CreateServicePrincipalRequest {
  readonly appId: string;
}

export interface CreateServicePrincipalResponse {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly servicePrincipalType: string;
}

// ============================================================================
// Internal API Contract Types
// ============================================================================

export type OperationStatus = 'started' | 'running' | 'completed' | 'failed';
export type LogLevel = 'info' | 'warn' | 'error';

// Orchestration API
export interface CreateProjectApiRequest {
  readonly templateName: string;
  readonly projectName: string;
  readonly description?: string;
  readonly customization?: Record<string, unknown>;
}

export interface CreateProjectApiResponse {
  readonly operationId: string;
  readonly status: OperationStatus;
  readonly progress: {
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly currentStep?: string;
  };
  readonly result?: {
    readonly azureDevOpsProject?: {
      readonly id: string;
      readonly url: string;
    };
    readonly powerPlatformEnvironments: ReadonlyArray<{
      readonly name: string;
      readonly url: string;
    }>;
  };
  readonly error?: ErrorResponse;
}

export interface GetOperationStatusResponse {
  readonly operationId: string;
  readonly status: OperationStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly progress: {
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly currentStep?: string;
  };
  readonly logs: ReadonlyArray<{
    readonly timestamp: string;
    readonly level: LogLevel;
    readonly message: string;
    readonly details?: unknown;
  }>;
}

// Template API
export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'choice';

export interface TemplateParameter {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly type: ParameterType;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly allowedValues?: readonly unknown[];
}

export interface ListTemplatesResponse {
  readonly templates: ReadonlyArray<{
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly version: string;
    readonly tags: readonly string[];
    readonly parameters: readonly TemplateParameter[];
  }>;
}

export interface ValidateTemplateRequest {
  readonly templateName: string;
  readonly parameters: Record<string, unknown>;
}

export interface ValidateTemplateResponse {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<{
    readonly parameter: string;
    readonly message: string;
    readonly code: string;
  }>;
}

// ============================================================================
// Batch Operation Contract Types
// ============================================================================

// Dataverse Batch
export interface DataverseBatchRequest {
  readonly requests: ReadonlyArray<{
    readonly id: string;
    readonly method: HttpMethod;
    readonly url: string;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
  }>;
}

export interface DataverseBatchResponse {
  readonly responses: ReadonlyArray<{
    readonly id: string;
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body?: unknown;
  }>;
}

// ============================================================================
// Schema-Aware Client Contract Types
// ============================================================================

// Navigation Property Resolution
export interface NavigationPropertyRequest {
  readonly parentTableDisplayName: string;
  readonly childTableDisplayName: string;
}

export interface NavigationPropertyResponse {
  readonly navigationProperty: string;
  readonly collectionName: string;
  readonly lookupFieldLogicalName: string;
  readonly relationshipSchemaName: string;
}

// Child Record Creation
export interface CreateChildRecordRequest {
  readonly childTableDisplayName: string;
  readonly parentTableDisplayName: string;
  readonly childData: Record<string, unknown>;
  readonly parentId: string;
  readonly environmentUrl: string;
}

export interface CreateChildRecordResponse {
  readonly childId: string;
  readonly parentRelationship: {
    readonly navigationProperty: string;
    readonly relationshipName: string;
  };
}

// ============================================================================
// Generic API Client Interface
// ============================================================================

export interface ApiClient {
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

// ============================================================================
// Type Guards and Validation Functions
// ============================================================================

export function validateCreateEntityRequest(req: unknown): req is CreateEntityRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'entityLogicalName' in req &&
    'data' in req &&
    typeof (req as CreateEntityRequest).entityLogicalName === 'string' &&
    typeof (req as CreateEntityRequest).data === 'object'
  );
}

export function validateTokenResponse(res: unknown): res is TokenResponse {
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

export function validateEnvironmentResponse(res: unknown): res is Environment {
  return (
    typeof res === 'object' &&
    res !== null &&
    'name' in res &&
    'id' in res &&
    'displayName' in res &&
    'properties' in res &&
    typeof (res as Environment).name === 'string' &&
    typeof (res as Environment).id === 'string'
  );
}

export function validateCreateWorkItemRequest(req: unknown): req is CreateWorkItemRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'fields' in req &&
    typeof (req as CreateWorkItemRequest).fields === 'object'
  );
}

export function validateOperationStatus(status: string): status is OperationStatus {
  return ['started', 'running', 'completed', 'failed'].includes(status);
}