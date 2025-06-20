// Example: How the new schema-aware client eliminates guesswork
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');
const { SchemaAwarePowerPlatformClient } = require('./src/integrations/power-platform/schema-aware-client.ts');

async function demonstrateSchemaAwareUsage() {
  const baseClient = new PowerPlatformClient();
  const client = new SchemaAwarePowerPlatformClient(baseClient);
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';

  try {
    await baseClient.connect();

    // 1. Create tables with Display Names - no need to worry about logical names
    console.log('=== Creating Tables ===');
    const parentResult = await client.createTable('Parent Table', environmentUrl);
    const childResult = await client.createTable('Child Table', environmentUrl);

    // 2. Create relationship - navigation property automatically determined
    console.log('\n=== Creating Relationship ===');
    const relationshipResult = await client.createRelationship(
      'Parent Table',
      'Child Table', 
      environmentUrl
    );

    // 3. Check what navigation property was generated
    console.log('\n=== Generated Navigation Property ===');
    const navProp = client.getNavigationProperty('Child Table', 'Parent Table');
    console.log('Navigation Property:', navProp);

    // 4. Add tables to solution - using display names, not logical names
    console.log('\n=== Adding Tables to Solution ===');
    await client.addTableToSolution('Parent Table', 'JRTestSolution', environmentUrl);
    await client.addTableToSolution('Child Table', 'JRTestSolution', environmentUrl);

    // 5. Create parent records the normal way
    console.log('\n=== Creating Parent Records ===');
    const parentIds = [];
    for (let i = 1; i <= 3; i++) {
      const result = await baseClient.createRecord('jr_parenttables', 
        { jr_name: `Parent Record ${i}` }, environmentUrl);
      if (result.success) {
        parentIds.push(result.data.jr_parenttableid);
      }
    }

    // 6. Create child records with automatic lookup references - NO GUESSWORK!
    console.log('\n=== Creating Child Records with Automatic Lookups ===');
    const childRecordsData = [
      { data: { jr_name: 'Child Record 1' }, parentId: parentIds[0] },
      { data: { jr_name: 'Child Record 2' }, parentId: parentIds[0] },
      { data: { jr_name: 'Child Record 3' }, parentId: parentIds[1] }
    ];

    const childResults = await client.createMultipleChildRecords(
      'Child Table',
      'Parent Table',
      childRecordsData,
      environmentUrl
    );

    console.log('Child records created:', childResults.success ? 'SUCCESS' : 'FAILED');

    // 7. Show the schema that was automatically tracked
    console.log('\n=== Auto-Generated Schema ===');
    console.log(JSON.stringify(client.getSchema(), null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
demonstrateSchemaAwareUsage();