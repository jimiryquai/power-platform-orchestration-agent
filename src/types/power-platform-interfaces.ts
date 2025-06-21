// Power Platform TypeScript Interfaces - ZERO TOLERANCE FOR 'any'
// Enterprise-grade type definitions for all Power Platform operations

// ============================================================================
// Core API Response Types
// ============================================================================

export interface PowerPlatformResponse<T> {
  '@odata.context': string;
  '@odata.etag'?: string;
  value?: T[];
  error?: PowerPlatformError;
}

export interface PowerPlatformError {
  code: string;
  message: string;
  innererror?: {
    message: string;
    type: string;
    stacktrace: string;
  };
}

export interface CreateResponse {
  '@odata.id': string;
  '@odata.etag': string;
  id: string;
}

export interface UpdateResponse {
  '@odata.etag': string;
}

export interface DeleteResponse {
  success: boolean;
}

// ============================================================================
// Table (Entity) Metadata Types
// ============================================================================

export interface TableMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata';
  SchemaName: string;
  LogicalName: string;
  EntitySetName: string;
  DisplayName: LocalizedLabel;
  DisplayCollectionName: LocalizedLabel;
  Description?: LocalizedLabel;
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  ObjectTypeCode?: number;
  IsCustomEntity: boolean;
  IsActivity?: boolean;
  IsActivityParty?: boolean;
  OwnershipType: OwnershipType;
  Attributes?: AttributeMetadata[];
  HasNotes?: boolean;
  HasActivities?: boolean;
  ChangeTrackingEnabled?: boolean;
}

export interface LocalizedLabel {
  '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel';
  Label: string;
  LanguageCode: number;
}

export enum OwnershipType {
  None = 'None',
  UserOwned = 'UserOwned',
  TeamOwned = 'TeamOwned',
  BusinessOwned = 'BusinessOwned',
  OrganizationOwned = 'OrganizationOwned',
  BusinessParented = 'BusinessParented'
}

// ============================================================================
// Attribute (Field) Metadata Types
// ============================================================================

export interface AttributeMetadata {
  '@odata.type': string;
  SchemaName: string;
  LogicalName: string;
  DisplayName: LocalizedLabel;
  Description?: LocalizedLabel;
  IsPrimaryId: boolean;
  IsPrimaryName: boolean;
  IsValidForCreate: boolean;
  IsValidForRead: boolean;
  IsValidForUpdate: boolean;
  RequiredLevel: RequiredLevel;
  AttributeType: AttributeTypeCode;
  IsCustomAttribute: boolean;
}

export interface StringAttributeMetadata extends AttributeMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata';
  MaxLength: number;
  Format?: StringFormat;
}

export interface LookupAttributeMetadata extends AttributeMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata';
  Targets: string[];
}

export interface PicklistAttributeMetadata extends AttributeMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata';
  OptionSet: OptionSetMetadata;
  DefaultFormValue?: number;
}

export interface OptionSetMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata';
  Options: OptionMetadata[];
  IsGlobal: boolean;
  OptionSetType: OptionSetType;
}

export interface OptionMetadata {
  Value: number;
  Label: LocalizedLabel;
  Description?: LocalizedLabel;
  Color?: string;
}

export enum RequiredLevel {
  None = 'None',
  SystemRequired = 'SystemRequired',
  ApplicationRequired = 'ApplicationRequired',
  Recommended = 'Recommended'
}

export enum AttributeTypeCode {
  Boolean = 'Boolean',
  Customer = 'Customer',
  DateTime = 'DateTime',
  Decimal = 'Decimal',
  Double = 'Double',
  Integer = 'Integer',
  Lookup = 'Lookup',
  Memo = 'Memo',
  Money = 'Money',
  Owner = 'Owner',
  PartyList = 'PartyList',
  Picklist = 'Picklist',
  State = 'State',
  Status = 'Status',
  String = 'String',
  Uniqueidentifier = 'Uniqueidentifier',
  Virtual = 'Virtual'
}

export enum StringFormat {
  Email = 'Email',
  Text = 'Text',
  TextArea = 'TextArea',
  Url = 'Url',
  TickerSymbol = 'TickerSymbol',
  PhoneticGuide = 'PhoneticGuide',
  VersionNumber = 'VersionNumber',
  Phone = 'Phone'
}

export enum OptionSetType {
  Picklist = 'Picklist',
  State = 'State',
  Status = 'Status',
  Boolean = 'Boolean'
}

// ============================================================================
// Relationship Metadata Types
// ============================================================================

export interface RelationshipMetadata {
  '@odata.type': string;
  SchemaName: string;
  IsCustomRelationship: boolean;
  IsManaged: boolean;
  IsValidForAdvancedFind: boolean;
  RelationshipType: RelationshipType;
  SecurityTypes?: SecurityTypes;
}

export interface OneToManyRelationshipMetadata extends RelationshipMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata';
  ReferencedEntity: string;
  ReferencedAttribute: string;
  ReferencingEntity: string;
  ReferencingAttribute: string;
  CascadeConfiguration: CascadeConfiguration;
  AssociatedMenuConfiguration: AssociatedMenuConfiguration;
  Lookup: LookupAttributeMetadata;
}

export interface ManyToManyRelationshipMetadata extends RelationshipMetadata {
  '@odata.type': 'Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata';
  Entity1LogicalName: string;
  Entity2LogicalName: string;
  IntersectEntityName: string;
  Entity1AssociatedMenuConfiguration: AssociatedMenuConfiguration;
  Entity2AssociatedMenuConfiguration: AssociatedMenuConfiguration;
}

export interface CascadeConfiguration {
  Assign: CascadeType;
  Share: CascadeType;
  Unshare: CascadeType;
  Reparent: CascadeType;
  Delete: CascadeType;
  Merge: CascadeType;
}

export interface AssociatedMenuConfiguration {
  Behavior: AssociatedMenuBehavior;
  Group?: AssociatedMenuGroup;
  Label?: LocalizedLabel;
  Order?: number;
}

export enum RelationshipType {
  OneToManyRelationship = 'OneToManyRelationship',
  ManyToManyRelationship = 'ManyToManyRelationship'
}

export enum CascadeType {
  NoCascade = 'NoCascade',
  Cascade = 'Cascade',
  Active = 'Active',
  UserOwned = 'UserOwned',
  RemoveLink = 'RemoveLink',
  Restrict = 'Restrict'
}

export enum AssociatedMenuBehavior {
  UseCollectionName = 'UseCollectionName',
  UseLabel = 'UseLabel',
  DoNotDisplay = 'DoNotDisplay'
}

export enum AssociatedMenuGroup {
  Details = 'Details',
  Sales = 'Sales',
  Service = 'Service',
  Marketing = 'Marketing'
}

export enum SecurityTypes {
  None = 'None',
  Append = 'Append',
  ParentChild = 'ParentChild',
  Pointer = 'Pointer',
  Inheritance = 'Inheritance'
}

// ============================================================================
// Solution Management Types
// ============================================================================

export interface SolutionMetadata {
  solutionid: string;
  uniquename: string;
  friendlyname: string;
  version: string;
  publisherid: PublisherReference;
  description?: string;
  ismanaged: boolean;
  isvisible: boolean;
  installedon?: string;
  createdby?: string;
  createdon?: string;
  modifiedby?: string;
  modifiedon?: string;
}

export interface PublisherReference {
  publisherid: string;
  friendlyname?: string;
  uniquename?: string;
  customizationprefix?: string;
}

export interface SolutionComponent {
  solutioncomponentid?: string;
  solutionid: SolutionReference;
  componenttype: ComponentType;
  objectid: string;
  rootcomponentbehavior?: RootComponentBehavior;
}

export interface SolutionReference {
  solutionid?: string;
  uniquename?: string;
}

export enum ComponentType {
  Entity = 1,
  Attribute = 2,
  Relationship = 3,
  AttributePicklistValue = 4,
  AttributeLookupValue = 5,
  ViewAttribute = 6,
  LocalizedLabel = 7,
  RelationshipExtraCondition = 8,
  OptionSet = 9,
  EntityRelationship = 10,
  EntityRelationshipRole = 11,
  EntityRelationshipRelationships = 12,
  ManagedProperty = 13,
  Form = 24,
  Organization = 25,
  SavedQuery = 26,
  Workflow = 29,
  Report = 31,
  ReportEntity = 32,
  ReportCategory = 33,
  ReportVisibility = 34,
  Attachment = 35,
  EmailTemplate = 36,
  ContractTemplate = 37,
  KBArticleTemplate = 38,
  MailMergeTemplate = 39,
  DuplicateRule = 44,
  DuplicateRuleCondition = 45,
  EntityMap = 46,
  AttributeMap = 47,
  RibbonCommand = 48,
  RibbonContextGroup = 49,
  RibbonCustomization = 50,
  RibbonRule = 52,
  RibbonTabToCommandMap = 53,
  RibbonDiff = 55,
  SavedQueryVisualization = 59,
  SystemForm = 60,
  WebResource = 61,
  SiteMap = 62,
  ConnectionRole = 63,
  HierarchyRule = 65,
  CustomControl = 66,
  CustomControlDefaultConfig = 68,
  EntityDataProvider = 78,
  CanvasApp = 300,
  Connector = 371,
  EnvironmentVariableDefinition = 380,
  EnvironmentVariableValue = 381,
  ProcessTrigger = 382,
  RoutingRule = 8181,
  RoutingRuleItem = 8199,
  SimilarityRule = 165,
  MobileOfflineProfile = 161,
  MobileOfflineProfileItem = 162,
  ConvertRule = 154,
  ConvertRuleItem = 155,
  PluginAssembly = 91,
  SDKMessageProcessingStep = 92,
  SDKMessageProcessingStepImage = 93,
  ServiceEndpoint = 95
}

export enum RootComponentBehavior {
  IncludeSubcomponents = 0,
  DoNotIncludeSubcomponents = 1,
  IncludeAsShellOnly = 2
}

// ============================================================================
// Environment and Organization Types
// ============================================================================

export interface EnvironmentMetadata {
  id: string;
  type: EnvironmentType;
  location: string;
  displayName: string;
  properties: EnvironmentProperties;
}

export interface EnvironmentProperties {
  azureRegion: string;
  schemaType: SchemaType;
  linkedEnvironmentMetadata?: LinkedEnvironmentMetadata;
  environmentSku: EnvironmentSku;
  databaseType: DatabaseType;
  tenantId: string;
  organizationId: string;
  version: string;
  url: string;
  apiUrl: string;
}

export interface LinkedEnvironmentMetadata {
  type: string;
  resourceId: string;
  friendlyName: string;
  uniqueName: string;
  domainName: string;
  version: string;
  instanceUrl: string;
  instanceApiUrl: string;
  baseLanguage: number;
  instanceState: InstanceState;
  createdTime: string;
}

export enum EnvironmentType {
  Production = 'Production',
  Sandbox = 'Sandbox',
  Trial = 'Trial',
  Developer = 'Developer',
  Default = 'Default'
}

export enum SchemaType {
  Standard = 'Standard',
  PowerPlatform = 'PowerPlatform'
}

export enum EnvironmentSku {
  Production = 'Production',
  Sandbox = 'Sandbox',
  Trial = 'Trial',
  Developer = 'Developer',
  Default = 'Default'
}

export enum DatabaseType {
  CommonDataService = 'CommonDataService',
  None = 'None'
}

export enum InstanceState {
  Ready = 'Ready',
  Disabled = 'Disabled',
  Provisioning = 'Provisioning',
  ProvisioningFailed = 'ProvisioningFailed'
}

// ============================================================================
// Data Operation Types
// ============================================================================

export interface EntityRecord {
  [key: string]: EntityFieldValue;
}

export type EntityFieldValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | null 
  | EntityReference 
  | OptionSetValue 
  | Money 
  | EntityCollection;

export interface EntityReference {
  '@odata.type': 'Microsoft.Dynamics.CRM.EntityReference';
  id: string;
  logicalname: string;
  name?: string;
}

export interface OptionSetValue {
  Value: number;
  Label?: string;
}

export interface Money {
  '@odata.type': 'Microsoft.Dynamics.CRM.Money';
  Value: number;
}

export interface EntityCollection {
  '@odata.type': 'Microsoft.Dynamics.CRM.EntityCollection';
  value: EntityRecord[];
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryOptions {
  select?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  expand?: ExpandOption[];
  count?: boolean;
  includeAnnotations?: string;
}

export interface ExpandOption {
  property: string;
  select?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
}

export interface QueryResponse<T> {
  '@odata.context': string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: T[];
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface BatchRequest {
  batchId: string;
  changesets: Changeset[];
  queries?: BatchQuery[];
}

export interface Changeset {
  changesetId: string;
  operations: BatchOperation[];
}

export interface BatchOperation {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: EntityRecord;
}

export interface BatchQuery {
  id: string;
  method: 'GET';
  url: string;
  headers?: Record<string, string>;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  PUT = 'PUT'
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthenticationContext {
  authority: string;
  clientId: string;
  clientSecret?: string;
  resource: string;
  username?: string;
  password?: string;
  token?: AccessToken;
}

export interface AccessToken {
  tokenType: string;
  expiresIn: number;
  expiresOn: Date;
  resource: string;
  accessToken: string;
  refreshToken?: string;
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

export interface IPowerPlatformClient {
  // Table operations
  createTable(tableData: TableMetadata, environmentUrl: string): Promise<CreateResponse>;
  getTable(logicalName: string, environmentUrl: string): Promise<TableMetadata>;
  updateTable(logicalName: string, updates: DeepPartial<TableMetadata>, environmentUrl: string): Promise<UpdateResponse>;
  deleteTable(logicalName: string, environmentUrl: string): Promise<DeleteResponse>;
  
  // Relationship operations
  createOneToManyRelationship(relationshipData: OneToManyRelationshipMetadata, environmentUrl: string): Promise<CreateResponse>;
  createManyToManyRelationship(relationshipData: ManyToManyRelationshipMetadata, environmentUrl: string): Promise<CreateResponse>;
  getRelationship(schemaName: string, environmentUrl: string): Promise<RelationshipMetadata>;
  deleteRelationship(schemaName: string, environmentUrl: string): Promise<DeleteResponse>;
  
  // Solution operations
  createSolution(solutionData: Partial<SolutionMetadata>, environmentUrl: string): Promise<CreateResponse>;
  getSolution(uniqueName: string, environmentUrl: string): Promise<SolutionMetadata>;
  addSolutionComponent(component: SolutionComponent, environmentUrl: string): Promise<CreateResponse>;
  removeSolutionComponent(componentId: string, environmentUrl: string): Promise<DeleteResponse>;
  
  // Data operations
  createRecord(entitySetName: string, data: EntityRecord, environmentUrl: string): Promise<CreateResponse>;
  getRecord(entitySetName: string, id: string, options: QueryOptions, environmentUrl: string): Promise<EntityRecord>;
  updateRecord(entitySetName: string, id: string, data: EntityRecord, environmentUrl: string): Promise<UpdateResponse>;
  deleteRecord(entitySetName: string, id: string, environmentUrl: string): Promise<DeleteResponse>;
  query<T extends EntityRecord>(entitySetName: string, options: QueryOptions, environmentUrl: string): Promise<QueryResponse<T>>;
  
  // Batch operations
  executeBatch(batch: BatchRequest, environmentUrl: string): Promise<PowerPlatformResponse<unknown>>;
}