// Simplified Power Platform navigation property utilities
// Based on actual working examples from testing

/**
 * TESTED AND VERIFIED PATTERNS:
 * 
 * Lookup field: jr_parenttable
 * Navigation property: jr_ParentTable@odata.bind
 * 
 * The pattern that worked was determined by the Lookup.SchemaName 
 * set during relationship creation, NOT by any algorithmic transformation.
 */

export interface DataverseLookupReference {
  [navigationProperty: `${string}@odata.bind`]: string;
}

// Known working examples from our testing
export const VERIFIED_NAVIGATION_PROPERTIES = {
  jr_parenttable: 'jr_ParentTable@odata.bind',
  jr_parenttableref: 'jr_ParentTableRef@odata.bind'
} as const;

// Helper to create lookup references using verified patterns
export const createLookupReference = (
  lookupFieldName: keyof typeof VERIFIED_NAVIGATION_PROPERTIES,
  targetEntitySet: string,
  targetId: string
): DataverseLookupReference => {
  const navProp = VERIFIED_NAVIGATION_PROPERTIES[lookupFieldName];
  return {
    [navProp]: `/${targetEntitySet}(${targetId})`
  };
};

// Type-safe record creation with lookup
export const createChildRecord = (
  name: string,
  parentEntitySet: string,
  parentId: string
): { jr_name: string } & DataverseLookupReference => {
  return {
    jr_name: name,
    ...createLookupReference('jr_parenttable', parentEntitySet, parentId)
  };
};

// The relationship definition that actually worked
export const WORKING_RELATIONSHIP_DEFINITION = {
  '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
  SchemaName: 'jr_parenttable_jr_childtable',
  ReferencedEntity: 'jr_parenttable',
  ReferencingEntity: 'jr_childtable', 
  ReferencedAttribute: 'jr_parenttableid',
  ReferencingAttribute: 'jr_parenttable',
  Lookup: {
    AttributeType: 'Lookup',
    SchemaName: 'jr_ParentTable', // This becomes the navigation property
    LogicalName: 'jr_parenttable'
  }
} as const;

export default {
  createChildRecord,
  createLookupReference,
  VERIFIED_NAVIGATION_PROPERTIES,
  WORKING_RELATIONSHIP_DEFINITION
};