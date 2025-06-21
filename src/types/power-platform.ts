// Power Platform / Dataverse TypeScript Interfaces

export interface DataverseEnvironment {
  url: string;
  displayName: string;
  environmentId: string;
}

export interface DataverseTableDefinition {
  LogicalName: string;
  SchemaName: string;
  DisplayName: {
    UserLocalizedLabel: {
      Label: string;
      LanguageCode: number;
    };
  };
  PrimaryNameAttribute: string;
  HasNotes?: boolean;
  HasActivities?: boolean;
  Attributes?: DataverseAttributeDefinition[];
}

export interface DataverseAttributeDefinition {
  LogicalName: string;
  SchemaName: string;
  AttributeType: 'String' | 'Integer' | 'Lookup' | 'DateTime' | 'Boolean' | 'Decimal' | 'Uniqueidentifier';
  DisplayName: {
    UserLocalizedLabel: {
      Label: string;
      LanguageCode: number;
    };
  };
  RequiredLevel?: {
    Value: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
  };
  MaxLength?: number;
}

export interface DataverseLookupFieldDefinition {
  AttributeType: 'Lookup';
  SchemaName: string; // This becomes the navigation property for @odata.bind
  LogicalName: string; // The actual field name in the entity
}

export interface DataverseOneToManyRelationshipDefinition {
  '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata';
  SchemaName: string; // e.g., "jr_parenttable_jr_childtable"
  ReferencedEntity: string; // Parent table logical name
  ReferencingEntity: string; // Child table logical name  
  ReferencedAttribute: string; // Parent primary key field
  ReferencingAttribute: string; // Child lookup field logical name
  Lookup: DataverseLookupFieldDefinition;
}

export interface DataverseRecordReference {
  '@odata.id': string; // "/jr_parenttables(guid)"
}

export interface DataverseRecordWithLookup {
  [key: string]: string | number | boolean | null;
  // Lookup fields use navigation property syntax:
  // "jr_ParentTable@odata.bind": "/jr_parenttables(guid)"
  [navigationProperty: `${string}@odata.bind`]: string;
}

export interface DataverseSolutionComponent {
  ComponentId: string; // GUID of the component
  ComponentType: number; // 1 = Entity/Table
  SolutionUniqueName: string; // NOT SolutionId
  AddRequiredComponents?: boolean;
  DoNotIncludeSubcomponents?: boolean;
}

export interface DataverseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface DataverseBulkOperationResult<T = unknown> {
  success: boolean;
  results: Array<{
    index: number;
    data: unknown;
    result: DataverseApiResponse<T>;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// Helper type for creating records with lookup relationships
export type DataverseRecordCreate<T extends Record<string, unknown>> = T & {
  [K in keyof T as K extends string 
    ? T[K] extends string 
      ? K extends `${string}@odata.bind` 
        ? K 
        : never
      : never 
    : never
  ]?: string;
};

// Example usage types
export interface ParentTableRecord {
  jr_name: string;
  jr_parenttableid?: string; // Auto-generated
}

export interface ChildTableRecord {
  jr_name: string;
  jr_childtableid?: string; // Auto-generated
  
  // Lookup to parent - use SchemaName from relationship definition
  'jr_ParentTable@odata.bind'?: string; // "/jr_parenttables(guid)"
}

// Utility type to ensure navigation property naming follows Dataverse conventions
export type NavigationProperty<TSchemaName extends string> = `${TSchemaName}@odata.bind`;

// Utility to generate correct navigation property name from lookup field logical name
export const getNavigationPropertyName = (lookupFieldLogicalName: string): string => {
  // Convert "jr_parenttable" -> "jr_ParentTable"
  const parts = lookupFieldLogicalName.split('_');
  if (parts.length < 2) {
    // No underscore, just capitalize first letter
    const firstPart = parts[0];
    if (firstPart === undefined || firstPart === '') return '';
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }
  
  // Keep prefix lowercase, capitalize and concatenate the rest: "jr_parenttable" -> "jr_ParentTable"
  const prefix = parts[0];
  if (prefix === undefined || prefix === '') return '';
  return `${prefix}_${parts.slice(1)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
};

// Utility to create navigation property for record creation
export const createNavigationProperty = (lookupFieldLogicalName: string): string => {
  const navPropName = getNavigationPropertyName(lookupFieldLogicalName);
  return `${navPropName}@odata.bind`;
};

// Helper to create a record with lookup reference
export const createRecordWithLookup = <T extends Record<string, unknown>>(
  baseRecord: T,
  lookupFieldName: string,
  targetEntitySet: string,
  targetId: string
): T & Record<string, string> => {
  const navProp = createNavigationProperty(lookupFieldName);
  return {
    ...baseRecord,
    [navProp]: `/${targetEntitySet}(${targetId})`
  };
};

// Type-safe relationship creation
export interface CreateRelationshipRequest {
  parentTable: string; // logical name
  childTable: string; // logical name
  schemaName: string; // becomes navigation property base
  lookupFieldName: string; // logical name for the lookup field
}

export const createOneToManyRelationship = (
  request: CreateRelationshipRequest
): DataverseOneToManyRelationshipDefinition => {
  // Extract the lookup SchemaName from the relationship SchemaName
  // For "jr_parenttable_jr_childtable" -> "jr_ParentTable"
  const lookupSchemaName = request.lookupFieldName
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
    SchemaName: request.schemaName,
    ReferencedEntity: request.parentTable,
    ReferencingEntity: request.childTable,
    ReferencedAttribute: `${request.parentTable}id`,
    ReferencingAttribute: request.lookupFieldName,
    Lookup: {
      AttributeType: 'Lookup',
      SchemaName: lookupSchemaName, // This becomes the navigation property
      LogicalName: request.lookupFieldName
    }
  };
};