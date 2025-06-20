// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function checkTableSchema() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    
    // Get child table schema to see the lookup field
    const schemaResult = await client.executeDataverseRequest(
      'GET',
      "EntityDefinitions(LogicalName='jr_childtable')?$expand=Attributes($select=LogicalName,SchemaName,AttributeType,DisplayName)",
      null,
      environmentUrl
    );
    
    if (schemaResult.success) {
      console.log('Child table attributes:');
      schemaResult.data.Attributes.forEach(attr => {
        console.log(`- ${attr.LogicalName} (${attr.SchemaName}) - Type: ${attr.AttributeType}`);
        if (attr.AttributeType === 'Lookup') {
          console.log(`  ** LOOKUP FIELD: ${attr.LogicalName} **`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTableSchema();