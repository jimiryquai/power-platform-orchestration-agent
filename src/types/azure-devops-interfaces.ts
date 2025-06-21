// Azure DevOps TypeScript Interfaces - ZERO TOLERANCE FOR 'any'
// Enterprise-grade type definitions for all Azure DevOps operations

// ============================================================================
// Core Work Item Types
// ============================================================================

export type WorkItemType = 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug';

export type WorkItemState = 
  | 'New' 
  | 'Active' 
  | 'Resolved' 
  | 'Closed' 
  | 'Removed'
  | 'To Do'
  | 'Doing' 
  | 'Done';

export type RelationshipType = 
  | 'parent' 
  | 'child' 
  | 'related' 
  | 'duplicate' 
  | 'duplicate-of'
  | 'successor'
  | 'predecessor'
  | 'tested-by'
  | 'tests';

export interface WorkItemFields {
  'System.Id'?: number;
  'System.Title': string;
  'System.WorkItemType': WorkItemType;
  'System.State'?: WorkItemState;
  'System.AssignedTo'?: string;
  'System.AreaPath'?: string;
  'System.IterationPath'?: string;
  'System.Description'?: string;
  'Microsoft.VSTS.Common.Priority'?: number;
  'Microsoft.VSTS.Scheduling.Effort'?: number;
  'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
  'System.Tags'?: string;
  [customField: string]: string | number | boolean | undefined;
}

export interface WorkItemCreate {
  workItemType: WorkItemType;
  fields: WorkItemFields;
}

export interface WorkItemUpdate {
  id: number;
  fields: Partial<WorkItemFields>;
}

export interface WorkItem {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly relations?: WorkItemRelation[];
  readonly url: string;
  readonly _links?: WorkItemLinks;
}

export interface WorkItemRelation {
  readonly rel: string;
  readonly url: string;
  readonly attributes?: Record<string, string>;
}

export interface WorkItemLinks {
  readonly self: LinkReference;
  readonly workItemUpdates: LinkReference;
  readonly workItemRevisions: LinkReference;
  readonly workItemComments: LinkReference;
  readonly html: LinkReference;
  readonly workItemType: LinkReference;
  readonly fields: LinkReference;
}

export interface LinkReference {
  readonly href: string;
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface WorkItemBatch {
  epics: WorkItemCreate[];
  features: WorkItemCreate[];
  userStories: WorkItemCreate[];
  tasks: WorkItemCreate[];
  bugs: WorkItemCreate[];
}

export interface WorkItemBatchResult {
  created: WorkItem[];
  failed: WorkItemError[];
  relationships: WorkItemRelationship[];
}

export interface WorkItemError {
  readonly workItem: WorkItemCreate;
  readonly error: string;
  readonly statusCode?: number;
}

export interface WorkItemRelationship {
  sourceId: number;
  targetId: number;
  relationshipType: RelationshipType;
  comment?: string;
}

// ============================================================================
// Project Management Types
// ============================================================================

export interface AzureDevOpsProject {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly url: string;
  readonly state: ProjectState;
  readonly visibility: ProjectVisibility;
  readonly lastUpdateTime: string;
  readonly capabilities?: ProjectCapabilities;
}

export type ProjectState = 'wellFormed' | 'createPending' | 'deleting' | 'new' | 'unchanged';
export type ProjectVisibility = 'private' | 'public';

export interface ProjectCapabilities {
  versioncontrol?: {
    sourceControlType: 'Git' | 'Tfvc';
  };
  processTemplate?: {
    templateTypeId: string;
    templateName: string;
  };
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  visibility: ProjectVisibility;
  capabilities: {
    versioncontrol: {
      sourceControlType: 'Git';
    };
    processTemplate: {
      templateTypeId: string; // Agile, Scrum, CMMI
    };
  };
}

// ============================================================================
// Repository Types
// ============================================================================

export interface Repository {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly project: ProjectReference;
  readonly size: number;
  readonly remoteUrl: string;
  readonly sshUrl: string;
  readonly webUrl: string;
  readonly defaultBranch?: string;
}

export interface ProjectReference {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly state: ProjectState;
  readonly visibility: ProjectVisibility;
}

export interface Branch {
  readonly name: string;
  readonly objectId: string;
  readonly creator: IdentityReference;
  readonly url: string;
  readonly isBaseVersion: boolean;
}

export interface IdentityReference {
  readonly displayName: string;
  readonly url: string;
  readonly id: string;
  readonly uniqueName: string;
  readonly imageUrl?: string;
}

// ============================================================================
// Pull Request Types
// ============================================================================

export interface PullRequest {
  readonly pullRequestId: number;
  readonly title: string;
  readonly description?: string;
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly status: PullRequestStatus;
  readonly createdBy: IdentityReference;
  readonly creationDate: string;
  readonly repository: Repository;
  readonly url: string;
}

export type PullRequestStatus = 
  | 'notSet'
  | 'active' 
  | 'abandoned' 
  | 'completed';

export interface PullRequestCreateRequest {
  sourceRefName: string;
  targetRefName: string;
  title: string;
  description?: string;
  isDraft?: boolean;
}

// ============================================================================
// Build and Pipeline Types
// ============================================================================

export interface BuildDefinition {
  readonly id: number;
  readonly name: string;
  readonly url: string;
  readonly uri: string;
  readonly path: string;
  readonly type: BuildDefinitionType;
  readonly queueStatus: DefinitionQueueStatus;
  readonly revision: number;
  readonly project: ProjectReference;
}

export type BuildDefinitionType = 'xaml' | 'build';
export type DefinitionQueueStatus = 'enabled' | 'paused' | 'disabled';

export interface Build {
  readonly id: number;
  readonly buildNumber: string;
  readonly status: BuildStatus;
  readonly result?: BuildResult;
  readonly queueTime: string;
  readonly startTime?: string;
  readonly finishTime?: string;
  readonly url: string;
  readonly definition: BuildDefinitionReference;
  readonly project: ProjectReference;
  readonly sourceBranch: string;
  readonly sourceVersion: string;
}

export type BuildStatus = 
  | 'none'
  | 'inProgress' 
  | 'completed' 
  | 'cancelling' 
  | 'postponed' 
  | 'notStarted';

export type BuildResult = 
  | 'none'
  | 'succeeded' 
  | 'partiallySucceeded' 
  | 'failed' 
  | 'canceled';

export interface BuildDefinitionReference {
  readonly id: number;
  readonly name: string;
  readonly url: string;
  readonly uri: string;
  readonly path: string;
  readonly type: BuildDefinitionType;
  readonly queueStatus: DefinitionQueueStatus;
  readonly revision: number;
  readonly project: ProjectReference;
}

// ============================================================================
// Team Management Types
// ============================================================================

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly description?: string;
  readonly identityUrl: string;
  readonly projectId: string;
  readonly projectName: string;
}

// ============================================================================
// Template Processing Types
// ============================================================================

export interface TemplateWorkItem {
  name: string;
  description?: string;
  workItemType: WorkItemType;
  priority?: number;
  effort?: number;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  acceptanceCriteria?: string;
  children?: TemplateWorkItem[];
  parent?: string; // Reference to parent work item name
}

export interface TemplateProcessingResult {
  created: WorkItem[];
  failed: TemplateWorkItemError[];
  relationships: WorkItemRelationship[];
  totalProcessed: number;
  processingTimeMs: number;
}

export interface TemplateWorkItemError {
  templateItem: TemplateWorkItem;
  error: string;
  phase: 'creation' | 'relationship';
}

// ============================================================================
// MCP Response Types
// ============================================================================

export type AzureDevOpsResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface AzureDevOpsListResponse<T> {
  readonly count: number;
  readonly value: T[];
}

export interface WorkItemCreateResponse {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly url: string;
}

export interface WorkItemUpdateResponse {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly url: string;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export abstract class AzureDevOpsError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isRetryable: boolean;
  
  protected constructor(
    message: string,
    public override readonly cause?: Error,
    public readonly operation?: string
  ) {
    super(message, { cause });
    this.name = this.constructor.name;
  }
}

export class WorkItemCreationError extends AzureDevOpsError {
  readonly code = 'WORK_ITEM_CREATION_ERROR';
  readonly statusCode = 400;
  readonly isRetryable = false;
  
  constructor(
    message: string,
    public readonly workItemData: WorkItemCreate,
    cause?: Error,
    operation?: string
  ) {
    super(message, cause, operation);
  }
}

export class ProjectNotFoundError extends AzureDevOpsError {
  readonly code = 'PROJECT_NOT_FOUND';
  readonly statusCode = 404;
  readonly isRetryable = false;
  
  constructor(
    public readonly projectName: string,
    cause?: Error,
    operation?: string
  ) {
    super(`Project '${projectName}' not found`, cause, operation);
  }
}

export class RateLimitError extends AzureDevOpsError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly isRetryable = true;
  
  constructor(
    public readonly retryAfterSeconds?: number,
    cause?: Error,
    operation?: string
  ) {
    super('Rate limit exceeded', cause, operation);
  }
}

export class AuthenticationError extends AzureDevOpsError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
  readonly isRetryable = false;
  
  constructor(
    cause?: Error,
    operation?: string
  ) {
    super('Authentication failed', cause, operation);
  }
}

// ============================================================================
// Retry and Configuration Types
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export interface AzureDevOpsConfig {
  organization: string;
  project?: string;
  personalAccessToken?: string;
  useInteractiveAuth?: boolean;
  retryConfig: RetryConfig;
  timeoutMs: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> 
  & {
    [K in Keys]-?:
      Required<Pick<T, K>> 
      & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// ============================================================================
// Client Interface Types
// ============================================================================

export interface IAzureDevOpsClient {
  // Project operations
  listProjects(): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<AzureDevOpsProject>>>;
  getProject(projectName: string): Promise<AzureDevOpsResponse<AzureDevOpsProject>>;
  
  // Work item operations
  createWorkItem(project: string, workItem: WorkItemCreate): Promise<AzureDevOpsResponse<WorkItemCreateResponse>>;
  updateWorkItem(id: number, updates: Partial<WorkItemFields>): Promise<AzureDevOpsResponse<WorkItemUpdateResponse>>;
  getWorkItem(id: number, project: string, expand?: string): Promise<AzureDevOpsResponse<WorkItem>>;
  linkWorkItems(relationships: WorkItemRelationship[]): Promise<AzureDevOpsResponse<void>>;
  
  // Batch operations
  createWorkItemBatch(project: string, batch: WorkItemBatch): Promise<AzureDevOpsResponse<WorkItemBatchResult>>;
  updateWorkItemsBatch(updates: WorkItemUpdate[]): Promise<AzureDevOpsResponse<WorkItem[]>>;
  
  // Repository operations
  listRepositories(project: string): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<Repository>>>;
  createPullRequest(repositoryId: string, pullRequest: PullRequestCreateRequest): Promise<AzureDevOpsResponse<PullRequest>>;
  
  // Build operations
  getBuildDefinitions(project: string): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<BuildDefinition>>>;
  runBuild(project: string, definitionId: number, sourceBranch?: string): Promise<AzureDevOpsResponse<Build>>;
  getBuildStatus(project: string, buildId: number): Promise<AzureDevOpsResponse<Build>>;
  
  // Team operations
  listTeams(project: string): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<Team>>>;
}