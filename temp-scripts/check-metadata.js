// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function checkMetadata() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    
    // Get OData metadata for child table to see navigation properties
    const metadataResult = await client.executeDataverseRequest(
      'GET',
      '$metadata',
      null,
      environmentUrl
    );
    
    if (metadataResult.success) {
      // Extract just the child table entity type definition
      const metadata = metadataResult.data;
      console.log('Searching for jr_childtable navigation properties...');
      
      // Look for EntityType jr_childtable and its NavigationProperty elements
      const childTableMatch = metadata.match(/<EntityType[^>]+Name="jr_childtable"[^>]*>[\s\S]*?<\/EntityType>/);
      if (childTableMatch) {
        console.log('Found jr_childtable EntityType definition:');
        const navProps = childTableMatch[0].match(/<NavigationProperty[^>]*>/g);
        if (navProps) {
          navProps.forEach(prop => {
            console.log(prop);
          });
        } else {
          console.log('No NavigationProperty elements found');
        }
      } else {
        console.log('jr_childtable EntityType not found in metadata');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMetadata();