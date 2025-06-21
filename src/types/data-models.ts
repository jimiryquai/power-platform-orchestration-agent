// Data Models - Comprehensive domain model specification
// Enterprise-grade TypeScript interfaces for all business objects

// ============================================================================
// Core Orchestration Domain Models
// ============================================================================

export type ProjectStatus = 
  | 'pending'
  | 'initializing'
  | 'creating_azure_devops'
  | 'creating_power_platform'
  | 'configuring_integrations'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type EnvironmentType = 'development' | 'test' | 'staging' | 'production';
export type EnvironmentStatus = 'creating' | 'active' | 'suspended' | 'failed';

export interface OrchestrationProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly template: ProjectTemplate;
  readonly status: ProjectStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string;
  readonly azureDevOps?: AzureDevOpsProjectInfo;
  readonly powerPlatform?: PowerPlatformProjectInfo;
  readonly environments: readonly EnvironmentInfo[];
}

export interface AzureDevOpsProjectInfo {
  readonly projectId: string;
  readonly projectUrl: string;
  readonly organizationUrl: string;
  readonly repositoryId?: string;
  readonly repositoryUrl?: string;
}

export interface PowerPlatformProjectInfo {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly publisherId: string;
  readonly publisherPrefix: string;
}

export interface EnvironmentInfo {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly environmentUrl: string;
  readonly environmentType: EnvironmentType;
  readonly region: string;
  readonly status: EnvironmentStatus;
}

// ============================================================================
// Dataverse Schema Domain Models
// ============================================================================

export type AttributeType = 
  | 'String'
  | 'Memo'
  | 'Integer' 
  | 'BigInt'
  | 'Decimal'
  | 'Double'
  | 'Money'
  | 'Boolean'
  | 'DateTime'
  | 'Lookup'
  | 'Customer'
  | 'Owner'
  | 'Picklist'
  | 'State'
  | 'Status'
  | 'Uniqueidentifier'
  | 'Image'
  | 'File'
  | 'MultiSelectPicklist';

export type RequiredLevel = 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
export type TableType = 'Standard' | 'Activity' | 'Virtual';
export type OwnershipType = 'UserOwned' | 'OrganizationOwned';
export type RelationshipType = 'OneToMany' | 'ManyToOne' | 'ManyToMany';
export type CascadeType = 'NoCascade' | 'Cascade' | 'Active' | 'UserOwned' | 'RemoveLink' | 'Restrict';

export interface DataverseTable {
  readonly logicalName: string;
  readonly schemaName: string;
  readonly displayName: string;
  readonly displayCollectionName: string;
  readonly description?: string;
  readonly ownershipType: OwnershipType;
  readonly tableType: TableType;
  readonly primaryNameAttribute: string;
  readonly hasActivities: boolean;
  readonly hasNotes: boolean;
  readonly isActivity: boolean;
  readonly isCustomizable: boolean;
  readonly attributes: readonly DataverseAttribute[];
  readonly relationships: readonly DataverseRelationship[];
}

export interface DataverseAttribute {
  readonly logicalName: string;
  readonly schemaName: string;
  readonly displayName: string;
  readonly description?: string;
  readonly attributeType: AttributeType;
  readonly requiredLevel: RequiredLevel;
  readonly isCustomizable: boolean;
  readonly isPrimaryId: boolean;
  readonly isPrimaryName: boolean;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly precision?: number;
  readonly format?: string;
  readonly optionSet?: readonly OptionSetValue[];
}

export interface OptionSetValue {
  readonly value: number;
  readonly label: string;
  readonly color?: string;
  readonly description?: string;
}

export interface DataverseRelationship {
  readonly schemaName: string;
  readonly relationshipType: RelationshipType;
  readonly referencedEntity: string;
  readonly referencingEntity: string;
  readonly referencedAttribute: string;
  readonly referencingAttribute: string;
  readonly lookupSchemaName?: string; // For navigation properties
  readonly cascadeConfiguration?: CascadeConfiguration;
}

export interface CascadeConfiguration {
  readonly assign: CascadeType;
  readonly delete: CascadeType;
  readonly merge: CascadeType;
  readonly reparent: CascadeType;
  readonly share: CascadeType;
  readonly unshare: CascadeType;
}

// Solution Component Models
export type ComponentType = 
  | 'Entity'
  | 'Attribute' 
  | 'Relationship'
  | 'OptionSet'
  | 'EntityKey'
  | 'Role'
  | 'BusinessProcess'
  | 'Workflow'
  | 'WebResource';

export type RootComponentBehavior = 'IncludeSubcomponents' | 'DoNotIncludeSubcomponents' | 'IncludeAsShellOnly';

export interface DataverseSolution {
  readonly solutionId: string;
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly description?: string;
  readonly version: string;
  readonly publisherId: string;
  readonly isManaged: boolean;
  readonly components: readonly SolutionComponent[];
}

export interface SolutionComponent {
  readonly componentType: ComponentType;
  readonly componentId: string;
  readonly componentName: string;
  readonly rootComponentBehavior: RootComponentBehavior;
}

export interface DataversePublisher {
  readonly publisherId: string;
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly description?: string;
  readonly customizationPrefix: string;
  readonly customizationOptionValuePrefix: number;
}

// ============================================================================
// Azure DevOps Domain Models
// ============================================================================

export type ProjectState = 'wellFormed' | 'createPending' | 'deleting' | 'new' | 'unchanged';
export type ProjectVisibility = 'private' | 'public';
export type WorkItemType = 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug' | 'Issue' | 'Test Case';
export type BuildDefinitionType = 'xaml' | 'build' | 'designerJson';
export type DefinitionQueueStatus = 'enabled' | 'paused' | 'disabled';
export type BuildStatus = 'none' | 'inProgress' | 'completed' | 'cancelling' | 'postponed' | 'notStarted';
export type BuildResult = 'none' | 'succeeded' | 'partiallySucceeded' | 'failed' | 'canceled';

export interface AzureDevOpsProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly state: ProjectState;
  readonly revision: number;
  readonly visibility: ProjectVisibility;
  readonly lastUpdateTime: Date;
  readonly capabilities: ProjectCapabilities;
}

export interface ProjectCapabilities {
  readonly versionControl: {
    readonly sourceControlType: 'Git' | 'Tfvc';
  };
  readonly processTemplate: {
    readonly templateTypeId: string;
    readonly templateName: string;
  };
}

export interface WorkItem {
  readonly id: number;
  readonly rev: number;
  readonly fields: WorkItemFields;
  readonly relations?: readonly WorkItemRelation[];
  readonly url: string;
  readonly commentVersionRef?: CommentVersionRef;
}

export interface WorkItemFields {
  readonly 'System.Id': number;
  readonly 'System.Rev': number;
  readonly 'System.AreaPath': string;
  readonly 'System.IterationPath': string;
  readonly 'System.WorkItemType': WorkItemType;
  readonly 'System.State': string;
  readonly 'System.Reason': string;
  readonly 'System.AssignedTo'?: string;
  readonly 'System.CreatedDate': Date;
  readonly 'System.CreatedBy': string;
  readonly 'System.ChangedDate': Date;
  readonly 'System.ChangedBy': string;
  readonly 'System.CommentCount': number;
  readonly 'System.Title': string;
  readonly 'System.BoardColumn'?: string;
  readonly 'System.BoardColumnDone'?: boolean;
  readonly 'Microsoft.VSTS.Common.StateChangeDate'?: Date;
  readonly 'Microsoft.VSTS.Common.ActivatedDate'?: Date;
  readonly 'Microsoft.VSTS.Common.ActivatedBy'?: string;
  readonly 'Microsoft.VSTS.Common.ResolvedDate'?: Date;
  readonly 'Microsoft.VSTS.Common.ResolvedBy'?: string;
  readonly 'Microsoft.VSTS.Common.ClosedDate'?: Date;
  readonly 'Microsoft.VSTS.Common.ClosedBy'?: string;
  readonly 'Microsoft.VSTS.Common.Priority'?: number;
  readonly 'Microsoft.VSTS.Common.Severity'?: string;
  readonly 'Microsoft.VSTS.Scheduling.Effort'?: number;
  readonly 'Microsoft.VSTS.Scheduling.OriginalEstimate'?: number;
  readonly 'Microsoft.VSTS.Scheduling.RemainingWork'?: number;
  readonly 'Microsoft.VSTS.Scheduling.CompletedWork'?: number;
  readonly 'System.Description'?: string;
  readonly 'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
  readonly [customField: string]: unknown;
}

export type RelationType = 
  | 'System.LinkTypes.Hierarchy-Forward'
  | 'System.LinkTypes.Hierarchy-Reverse'
  | 'System.LinkTypes.Related'
  | 'System.LinkTypes.Duplicate'
  | 'System.LinkTypes.Dependency-Forward'
  | 'System.LinkTypes.Dependency-Reverse'
  | 'ArtifactLink'
  | 'Hyperlink';

export interface WorkItemRelation {
  readonly rel: RelationType;
  readonly url: string;
  readonly attributes?: Record<string, unknown>;
}

export interface CommentVersionRef {
  readonly commentId: number;
  readonly version: number;
  readonly url: string;
}

// Repository and Build Models
export interface Repository {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly project: ProjectReference;
  readonly defaultBranch: string;
  readonly size: number;
  readonly remoteUrl: string;
  readonly sshUrl: string;
  readonly webUrl: string;
  readonly isDisabled: boolean;
}

export interface ProjectReference {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly url: string;
  readonly state: ProjectState;
  readonly revision: number;
  readonly visibility: ProjectVisibility;
}

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
  readonly repository: Repository;
  readonly process: BuildProcess;
  readonly queue: AgentPoolQueue;
}

export interface BuildProcess {
  readonly type: 'designer' | 'yamlFilename';
  readonly yamlFilename?: string;
  readonly phases?: readonly BuildPhase[];
}

export interface BuildPhase {
  readonly name: string;
  readonly refName: string;
  readonly condition: string;
  readonly target: {
    readonly type: 'agent';
    readonly agentSpecification?: Record<string, unknown>;
  };
  readonly jobAuthorizationScope: 'projectCollection' | 'project';
  readonly steps: readonly BuildStep[];
}

export interface BuildStep {
  readonly displayName: string;
  readonly task: {
    readonly id: string;
    readonly versionSpec: string;
    readonly definitionType: string;
  };
  readonly inputs: Record<string, string>;
  readonly condition: string;
  readonly enabled: boolean;
}

export interface AgentPoolQueue {
  readonly id: number;
  readonly name: string;
  readonly pool: {
    readonly id: number;
    readonly name: string;
    readonly isHosted: boolean;
  };
}

// ============================================================================
// Template System Domain Models
// ============================================================================

export type TemplateCategory = 'standard' | 'custom' | 'enterprise' | 'demo';
export type TemplateComplexity = 'simple' | 'moderate' | 'complex' | 'advanced';
export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'choice';

export interface ProjectTemplate {
  readonly metadata: TemplateMetadata;
  readonly azureDevOps: AzureDevOpsTemplate;
  readonly powerPlatform: PowerPlatformTemplate;
  readonly dataModel?: DataModelTemplate;
  readonly parameters: readonly TemplateParameter[];
}

export interface TemplateMetadata {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly category: TemplateCategory;
  readonly estimatedDuration: string;
  readonly complexity: TemplateComplexity;
}

export interface TemplateParameter {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly type: ParameterType;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly allowedValues?: readonly unknown[];
  readonly validation?: ParameterValidation;
}

export interface ParameterValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly minValue?: number;
  readonly maxValue?: number;
}

// Azure DevOps Template Models
export interface AzureDevOpsTemplate {
  readonly project: ProjectTemplateConfig;
  readonly workItems: readonly WorkItemTemplate[];
  readonly repositories: readonly RepositoryTemplate[];
  readonly pipelines: readonly PipelineTemplate[];
  readonly iterations: readonly IterationTemplate[];
}

export interface ProjectTemplateConfig {
  readonly processTemplate: string;
  readonly visibility: ProjectVisibility;
  readonly capabilities: ProjectCapabilities;
}

export interface WorkItemTemplate {
  readonly type: WorkItemType;
  readonly title: string;
  readonly description?: string;
  readonly areaPath?: string;
  readonly iterationPath?: string;
  readonly priority?: number;
  readonly effort?: number;
  readonly fields: Record<string, unknown>;
  readonly parentWorkItem?: string; // Reference to parent template
  readonly childWorkItems: readonly string[]; // References to child templates
}

export interface RepositoryTemplate {
  readonly name: string;
  readonly importFromUrl?: string;
  readonly initializeWithReadme: boolean;
  readonly gitIgnoreTemplate?: string;
  readonly licenseType?: string;
}

export interface PipelineTemplate {
  readonly name: string;
  readonly yamlPath: string;
  readonly repository: string;
  readonly branch: string;
  readonly variables: Record<string, string>;
}

export interface IterationTemplate {
  readonly name: string;
  readonly startDate: string; // ISO date string or relative (+7 days)
  readonly finishDate: string;
  readonly path?: string;
}

// Power Platform Template Models
export interface PowerPlatformTemplate {
  readonly publisher: PublisherTemplate;
  readonly solutions: readonly SolutionTemplate[];
  readonly environments: readonly EnvironmentTemplate[];
  readonly dataModel?: DataModelTemplate;
}

export interface PublisherTemplate {
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly description?: string;
  readonly customizationPrefix: string;
  readonly customizationOptionValuePrefix: number;
}

export interface SolutionTemplate {
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly description?: string;
  readonly version: string;
  readonly components: readonly ComponentTemplate[];
}

export interface ComponentTemplate {
  readonly type: ComponentType;
  readonly name: string;
  readonly include: boolean;
  readonly rootComponentBehavior: RootComponentBehavior;
}

export interface EnvironmentTemplate {
  readonly displayName: string;
  readonly type: EnvironmentType;
  readonly region: string;
  readonly sku: 'Trial' | 'Production' | 'Sandbox';
  readonly currency: CurrencyTemplate;
  readonly language: LanguageTemplate;
}

export interface CurrencyTemplate {
  readonly code: string;
  readonly name: string;
  readonly symbol: string;
}

export interface LanguageTemplate {
  readonly code: string;
  readonly name: string;
}

export interface DataModelTemplate {
  readonly tables: readonly TableTemplate[];
  readonly relationships: readonly RelationshipTemplate[];
  readonly securityRoles: readonly SecurityRoleTemplate[];
  readonly businessProcessFlows: readonly BusinessProcessFlowTemplate[];
}

export interface TableTemplate {
  readonly schemaName: string;
  readonly displayName: string;
  readonly displayCollectionName: string;
  readonly description?: string;
  readonly ownershipType: OwnershipType;
  readonly hasActivities: boolean;
  readonly hasNotes: boolean;
  readonly primaryNameAttribute: string;
  readonly attributes: readonly AttributeTemplate[];
}

export interface AttributeTemplate {
  readonly schemaName: string;
  readonly displayName: string;
  readonly description?: string;
  readonly attributeType: AttributeType;
  readonly requiredLevel: RequiredLevel;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly precision?: number;
  readonly defaultValue?: unknown;
  readonly optionSet?: readonly OptionSetTemplate[];
}

export interface OptionSetTemplate {
  readonly value: number;
  readonly label: string;
  readonly color?: string;
  readonly description?: string;
}

export interface RelationshipTemplate {
  readonly schemaName: string;
  readonly relationshipType: RelationshipType;
  readonly referencedTable: string; // Reference to table template
  readonly referencingTable: string; // Reference to table template
  readonly lookupSchemaName: string;
  readonly cascadeConfiguration?: CascadeConfiguration;
}

export interface SecurityRoleTemplate {
  readonly name: string;
  readonly description?: string;
  readonly privileges: readonly PrivilegeTemplate[];
}

export interface PrivilegeTemplate {
  readonly name: string;
  readonly depth: 'None' | 'User' | 'BusinessUnit' | 'ParentChildBusinessUnit' | 'Organization';
  readonly accessRight: 'None' | 'Read' | 'Write' | 'Append' | 'AppendTo' | 'Create' | 'Delete' | 'Share' | 'Assign';
}

export interface BusinessProcessFlowTemplate {
  readonly name: string;
  readonly description?: string;
  readonly primaryTable: string;
  readonly stages: readonly StageTemplate[];
}

export interface StageTemplate {
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly StepTemplate[];
}

export interface StepTemplate {
  readonly name: string;
  readonly attribute: string;
  readonly required: boolean;
}

// ============================================================================
// Configuration Domain Models
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface ApplicationConfig {
  readonly environment: Environment;
  readonly azure: AzureConfig;
  readonly powerPlatform: PowerPlatformConfig;
  readonly azureDevOps: AzureDevOpsConfig;
  readonly logging: LoggingConfig;
  readonly storage: StorageConfig;
  readonly monitoring: MonitoringConfig;
}

export interface AzureConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authority: string;
  readonly scopes: readonly string[];
}

export interface PowerPlatformConfig {
  readonly baseUrl: string;
  readonly environmentUrl?: string;
  readonly useInteractiveAuth: boolean;
  readonly defaultRegion: string;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
}

export interface AzureDevOpsConfig {
  readonly organization: string;
  readonly baseUrl?: string;
  readonly personalAccessToken?: string;
  readonly pat?: string;
  readonly apiVersion?: string;
  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
  readonly useInteractiveAuth?: boolean;
  readonly retryConfig?: {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly backoffMultiplier: number;
    readonly maxDelayMs: number;
    readonly retryableErrors: readonly string[];
  };
}

export interface LoggingConfig {
  readonly level: LogLevel;
  readonly format: 'json' | 'simple';
  readonly outputs: readonly LogOutput[];
  readonly enableMetrics: boolean;
}

export interface LogOutput {
  readonly type: 'console' | 'file' | 'http';
  readonly config: Record<string, unknown>;
}

export interface StorageConfig {
  readonly type: 'filesystem' | 'azure-blob' | 's3';
  readonly connectionString?: string;
  readonly containerName?: string;
  readonly basePath: string;
}

export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly applicationInsights?: {
    readonly connectionString: string;
    readonly enableLiveMetrics: boolean;
  };
  readonly customMetrics: readonly MetricConfig[];
}

export interface MetricConfig {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram';
  readonly description: string;
  readonly labels: readonly string[];
}

// ============================================================================
// Validation and Type Guard Functions
// ============================================================================

export function isProjectTemplate(obj: unknown): obj is ProjectTemplate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'metadata' in obj &&
    'azureDevOps' in obj &&
    'powerPlatform' in obj &&
    'parameters' in obj &&
    isTemplateMetadata((obj as ProjectTemplate).metadata) &&
    Array.isArray((obj as ProjectTemplate).parameters)
  );
}

export function isTemplateMetadata(obj: unknown): obj is TemplateMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'displayName' in obj &&
    'description' in obj &&
    'version' in obj &&
    typeof (obj as TemplateMetadata).name === 'string'
  );
}

export function isDataverseTable(obj: unknown): obj is DataverseTable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'logicalName' in obj &&
    'schemaName' in obj &&
    'displayName' in obj &&
    'attributes' in obj &&
    typeof (obj as DataverseTable).logicalName === 'string' &&
    Array.isArray((obj as DataverseTable).attributes)
  );
}

export function isWorkItem(obj: unknown): obj is WorkItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'rev' in obj &&
    'fields' in obj &&
    typeof (obj as WorkItem).id === 'number' &&
    typeof (obj as WorkItem).fields === 'object'
  );
}

export function isOrchestrationProject(obj: unknown): obj is OrchestrationProject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'template' in obj &&
    'status' in obj &&
    typeof (obj as OrchestrationProject).id === 'string' &&
    isProjectTemplate((obj as OrchestrationProject).template)
  );
}

export function isValidProjectStatus(status: string): status is ProjectStatus {
  return [
    'pending',
    'initializing', 
    'creating_azure_devops',
    'creating_power_platform',
    'configuring_integrations',
    'completed',
    'failed',
    'cancelled'
  ].includes(status);
}

export function isValidEnvironmentType(type: string): type is EnvironmentType {
  return ['development', 'test', 'staging', 'production'].includes(type);
}

export function isValidWorkItemType(type: string): type is WorkItemType {
  return ['Epic', 'Feature', 'User Story', 'Task', 'Bug', 'Issue', 'Test Case'].includes(type);
}

export function isValidAttributeType(type: string): type is AttributeType {
  return [
    'String', 'Memo', 'Integer', 'BigInt', 'Decimal', 'Double', 'Money',
    'Boolean', 'DateTime', 'Lookup', 'Customer', 'Owner', 'Picklist',
    'State', 'Status', 'Uniqueidentifier', 'Image', 'File', 'MultiSelectPicklist'
  ].includes(type);
}