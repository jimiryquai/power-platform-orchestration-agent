// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function populateTablesWithData() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    
    // Step 1: Create parent records
    const parentRecords = [
      { jr_name: 'Parent Record 1' },
      { jr_name: 'Parent Record 2' },
      { jr_name: 'Parent Record 3' }
    ];
    
    console.log('Creating parent records...');
    const parentResults = await client.createMultipleRecords('jr_parenttables', parentRecords, environmentUrl);
    console.log('Parent records created:', parentResults.success ? 'SUCCESS' : 'FAILED');
    
    if (!parentResults.success) {
      console.log('Error:', parentResults);
      return;
    }
    
    // Get parent IDs
    const parentIds = parentResults.results
      .filter(r => r.result.success)
      .map(r => r.result.data.jr_parenttableid);
    
    console.log('Created parent IDs:', parentIds);
    
    // Step 2: Create child records with lookup references
    // In Dataverse, lookup fields use the _<fieldname>_value format for direct assignment
    // OR we can use the navigation property which should match the lookup field name
    
    // Try multiple approaches to find the working one
    const approaches = [
      // Approach 1: Try with the exact lookup field name from schema
      () => [
        { 
          jr_name: 'Child Record 1',
          'jr_ParentTable@odata.bind': `/jr_parenttables(${parentIds[0]})`
        }
      ],
      // Approach 2: Try with schema name (capitalized)
      () => [
        { 
          jr_name: 'Child Record 2',
          'jr_ParentTableRef@odata.bind': `/jr_parenttables(${parentIds[0]})`
        }
      ]
    ];
    
    // Try each approach
    for (let i = 0; i < approaches.length; i++) {
      const testRecords = approaches[i]();
      console.log(`Trying approach ${i + 1}:`, JSON.stringify(testRecords[0], null, 2));
      
      const testResult = await client.createMultipleRecords('jr_childtables', testRecords, environmentUrl);
      if (testResult.success) {
        console.log(`SUCCESS with approach ${i + 1}! Using this for remaining records.`);
        
        // Use the working approach for the rest
        if (i === 0) {
          const childRecords = [
            { 
              jr_name: 'Child Record 1',
              'jr_ParentTable@odata.bind': `/jr_parenttables(${parentIds[0]})`
            },
            { 
              jr_name: 'Child Record 2', 
              'jr_ParentTable@odata.bind': `/jr_parenttables(${parentIds[0]})`
            },
            { 
              jr_name: 'Child Record 3',
              'jr_ParentTable@odata.bind': `/jr_parenttables(${parentIds[1]})`
            }
          ];
          const finalResult = await client.createMultipleRecords('jr_childtables', childRecords.slice(1), environmentUrl);
          console.log('Final child records created:', finalResult.success ? 'SUCCESS' : 'FAILED');
        } else if (i === 1) {
          const childRecords = [
            { 
              jr_name: 'Child Record 1',
              'jr_ParentTableRef@odata.bind': `/jr_parenttables(${parentIds[0]})`
            },
            { 
              jr_name: 'Child Record 3',
              'jr_ParentTableRef@odata.bind': `/jr_parenttables(${parentIds[1]})`
            }
          ];
          const finalResult = await client.createMultipleRecords('jr_childtables', childRecords, environmentUrl);
          console.log('Final child records created:', finalResult.success ? 'SUCCESS' : 'FAILED');
        }
        return;
      } else {
        console.log(`Approach ${i + 1} failed:`, testResult.results[0]?.result?.error || 'Unknown error');
      }
    }
    
    console.log('All approaches failed. The lookup reference issue persists.');
    
    console.log('Creating child records...');
    const childResults = await client.createMultipleRecords('jr_childtables', childRecords, environmentUrl);
    console.log('Child records created:', childResults.success ? 'SUCCESS' : 'FAILED');
    
    if (!childResults.success) {
      console.log('Error:', childResults);
    }
    
    console.log('Data population completed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

populateTablesWithData();