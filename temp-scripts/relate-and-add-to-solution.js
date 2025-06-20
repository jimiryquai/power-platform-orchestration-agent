// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function relateTablesAndAddToSolution() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    
    // Step 1: Relationship already exists, skipping
    
    // Step 2: Add parent table to solution
    const parentResult = await client.addTableToSolution('jr_parenttable', 'JRTestSolution', environmentUrl);
    console.log('Parent table added to solution:', parentResult.success ? 'SUCCESS' : 'FAILED');
    if (!parentResult.success) {
      console.log('Error:', parentResult.error);
    }
    
    // Step 3: Add child table to solution  
    const childResult = await client.addTableToSolution('jr_childtable', 'JRTestSolution', environmentUrl);
    console.log('Child table added to solution:', childResult.success ? 'SUCCESS' : 'FAILED');
    if (!childResult.success) {
      console.log('Error:', childResult.error);
    }
    
    console.log('All operations completed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

relateTablesAndAddToSolution();