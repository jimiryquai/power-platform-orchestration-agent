# Power Platform Quick Reference

## CRITICAL: Lookup Navigation Properties
- **ALWAYS** use SchemaName format: `jr_ParentTable@odata.bind`
- **NEVER** use logical name: `jr_parenttable@odata.bind` ❌
- Check relationship SchemaName if unsure

## Common Patterns

### 1. Create Parent-Child Records
```javascript
// 1. Create parent
const parent = await client.createRecord('jr_parenttables', { jr_name: 'Parent' }, envUrl);

// 2. Create child with lookup
const child = {
  jr_name: 'Child',
  'jr_ParentTable@odata.bind': `/jr_parenttables(${parent.data.jr_parenttableid})`
};
await client.createRecord('jr_childtables', child, envUrl);
```

### 2. Add Tables to Solution
```javascript
await client.addTableToSolution('jr_parenttable', 'SolutionUniqueName', envUrl);
await client.addTableToSolution('jr_childtable', 'SolutionUniqueName', envUrl);
```

### 3. Create Relationship
```javascript
const relationship = {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "jr_parenttable_jr_childtable",
  "ReferencedEntity": "jr_parenttable",
  "ReferencingEntity": "jr_childtable",
  "ReferencedAttribute": "jr_parenttableid",
  "ReferencingAttribute": "jr_parenttable",
  "Lookup": {
    "AttributeType": "Lookup", 
    "SchemaName": "jr_ParentTable"  // This becomes the navigation property
  }
};
```

## Test Environment
- URL: `https://james-dev.crm11.dynamics.com/api/data/v9.2`
- Auth: Interactive via Azure CLI
- Set: `process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';`

## Debugging Navigation Properties
If lookup fails, check relationship definition:
```javascript
const relationshipResult = await client.executeDataverseRequest(
  'GET',
  "EntityDefinitions(LogicalName='jr_childtable')?$expand=ManyToOneRelationships",
  null,
  environmentUrl
);
```

## Working Functions (src/integrations/power-platform/mcp-client.js)
- `createTable()` - Creates table with proper primary field
- `createOneToManyRelationship()` - Creates relationship with lookup
- `addTableToSolution()` - Adds table to solution by unique name
- `createMultipleRecords()` - Bulk record creation with lookups