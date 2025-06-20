process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function quickTest() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    console.log('✅ Connected');
    
    // Just create some child records without lookups to test the tables work
    const result = await client.createMultipleRecords('jr_productitems', [
      { jr_name: 'Test Product 1' },
      { jr_name: 'Test Product 2' }
    ], environmentUrl);
    
    console.log('Child records created:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();