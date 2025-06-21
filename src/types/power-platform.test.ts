// Test our Power Platform types and utilities

import {
  createOneToManyRelationship,
  createRecordWithLookup,
  getNavigationPropertyName
} from './power-platform';

// Test navigation property name generation
console.log('Testing navigation property generation:');
console.log('jr_parenttable ->', getNavigationPropertyName('jr_parenttable')); // Should be "jr_ParentTable"
console.log('jr_customfield ->', getNavigationPropertyName('jr_customfield')); // Should be "jr_CustomField"
console.log('Expected: jr_ParentTable and jr_CustomField');

// Test record creation with lookup

const childRecordWithLookup = createRecordWithLookup(
  { jr_name: 'Test Child' },
  'jr_parenttable',
  'jr_parenttables',
  '12345678-1234-1234-1234-123456789012'
);

console.log('\nChild record with lookup:', childRecordWithLookup);
// Should output: { jr_name: 'Test Child', 'jr_ParentTable@odata.bind': '/jr_parenttables(12345678-1234-1234-1234-123456789012)' }

// Test relationship definition creation
const relationshipDef = createOneToManyRelationship({
  parentTable: 'jr_parenttable',
  childTable: 'jr_childtable',
  schemaName: 'jr_parenttable_jr_childtable',
  lookupFieldName: 'jr_parenttable'
});

console.log('\nRelationship definition:', JSON.stringify(relationshipDef, null, 2));
// The Lookup.SchemaName should be "jr_ParentTable" which becomes the navigation property

export { };  // Make this a module