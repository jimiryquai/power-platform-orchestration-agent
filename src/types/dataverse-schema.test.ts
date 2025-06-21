// Test the self-documenting Dataverse schema manager

import { DataverseSchemaManager } from './dataverse-schema';

// Create schema manager with our publisher prefix
const schema = new DataverseSchemaManager('jr');

// Register tables with their Display Names (as they would be created)
console.log('=== Registering Tables ===');
const parentTable = schema.registerTable('Parent Table');
const childTable = schema.registerTable('Child Table');

console.log('Parent Table:', parentTable);
console.log('Child Table:', childTable);

// Create the relationship
console.log('\n=== Creating Relationship ===');
const relationship = schema.createRelationship(
  parentTable.logicalName,
  childTable.logicalName
);

console.log('Relationship:', relationship);

// Test navigation property generation
console.log('\n=== Navigation Property Generation ===');
const navProp = schema.getNavigationProperty(
  childTable.logicalName,
  parentTable.logicalName
);
console.log('Navigation Property:', navProp);
console.log('Expected: jr_ParentTable@odata.bind');
console.log('Match:', navProp === 'jr_ParentTable@odata.bind');

// Test record creation with lookup
console.log('\n=== Record Creation with Lookup ===');
const childRecord = schema.createRecordWithLookup(
  { jr_name: 'Test Child' },
  childTable.logicalName,
  parentTable.logicalName,
  '12345678-1234-1234-1234-123456789012'
);

console.log('Child Record with Lookup:', childRecord);

// Test relationship metadata generation
console.log('\n=== Relationship Metadata ===');
const relationshipMetadata = schema.generateRelationshipMetadata(relationship.schemaName);
console.log('Relationship Metadata:', JSON.stringify(relationshipMetadata, null, 2));

// Test table metadata generation
console.log('\n=== Table Metadata ===');
const parentTableMetadata = schema.generateTableMetadata(parentTable.logicalName);
console.log('Parent Table Metadata:', JSON.stringify(parentTableMetadata, null, 2));

export { }; // Make this a module