const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function getEnvironments() {
  const client = new PowerPlatformClient();
  
  try {
    console.log('Connecting to Power Platform...');
    const connected = await client.connect();
    if (!connected) {
      console.log('Connection failed, but continuing to list environments...');
    }
    
    console.log('Listing environments...');
    const envResult = await client.listEnvironments();
    console.log('Environments result:', JSON.stringify(envResult, null, 2));
    
    if (envResult.success && envResult.data.environments) {
      console.log('\nAvailable environments:');
      envResult.data.environments.forEach(env => {
        console.log(`- ${env.displayName} (${env.name})`);
        console.log(`  Type: ${env.type}, State: ${env.state}`);
        console.log(`  Has Dataverse: ${env.hasDataverse}`);
        if (env.webApiUrl) {
          console.log(`  Web API URL: ${env.webApiUrl}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

getEnvironments();