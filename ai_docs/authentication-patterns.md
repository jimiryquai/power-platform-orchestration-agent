# Power Platform Authentication Patterns

## Overview
Proven authentication patterns for Power Platform integration, including both interactive and service principal flows.

## Interactive Authentication (Development)

### Setup for Testing
```bash
# Enable interactive authentication for development
export AZURE_USE_INTERACTIVE_AUTH=true
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
```

### Complete Interactive Authentication Flow
```typescript
async function authenticateInteractively(): Promise<void> {
  const client = new PowerPlatformClient();
  
  try {
    console.log('Connecting to Power Platform with interactive auth...');
    const connected = await client.connect();
    
    if (!connected) {
      throw new Error('Failed to connect to Power Platform');
    }
    
    console.log('✅ Interactive authentication successful');
    
    // List available environments
    const envResult = await client.listEnvironments();
    
    if (!envResult.success) {
      throw new Error('Failed to list environments: ' + envResult.error);
    }
    
    console.log('Available environments:');
    envResult.data.environments.forEach(env => {
      console.log(`- ${env.displayName} (${env.name})`);
      console.log(`  Type: ${env.type}, State: ${env.state}`);
      console.log(`  Has Dataverse: ${env.hasDataverse}`);
      if (env.webApiUrl) {
        console.log(`  Web API URL: ${env.webApiUrl}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}
```

### Environment Discovery Pattern
```typescript
async function findTargetEnvironment(
  client: PowerPlatformClient, 
  preferredName: string = 'James Dev'
): Promise<EnvironmentInfo> {
  const envResult = await client.listEnvironments();
  
  if (!envResult.success) {
    throw new Error('Failed to list environments: ' + envResult.error);
  }
  
  // Find preferred environment by name
  let targetEnv = envResult.data.environments.find(env => 
    env.displayName.toLowerCase().includes(preferredName.toLowerCase())
  );
  
  // Fallback to first Dataverse-enabled environment
  if (!targetEnv) {
    targetEnv = envResult.data.environments.find(env => env.hasDataverse);
  }
  
  if (!targetEnv) {
    throw new Error('No suitable environment found with Dataverse');
  }
  
  console.log(`🎯 Using environment: ${targetEnv.displayName}`);
  return targetEnv;
}
```

## Service Principal Authentication (Production)

### Configuration
```typescript
interface ServicePrincipalConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scope: string; // Usually "https://[environment].dynamics.com/.default"
}

const productionConfig: ServicePrincipalConfig = {
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  scope: "https://james-dev.crm11.dynamics.com/.default"
};
```

### Service Principal Authentication Flow
```typescript
import { ClientCredentialRequest, ConfidentialClientApplication } from '@azure/msal-node';

class ServicePrincipalAuthenticator {
  private msalClient: ConfidentialClientApplication;
  
  constructor(private config: ServicePrincipalConfig) {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`
      }
    });
  }
  
  async getAccessToken(): Promise<string> {
    try {
      const clientCredentialRequest: ClientCredentialRequest = {
        scopes: [this.config.scope]
      };
      
      const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire access token');
      }
      
      console.log('✅ Service principal authentication successful');
      return response.accessToken;
      
    } catch (error) {
      console.error('❌ Service principal authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
}
```

## Publisher and Solution Setup Patterns

### Automatic Publisher Discovery/Creation
```typescript
async function ensurePublisher(
  client: PowerPlatformClient, 
  environmentUrl: string,
  fallbackConfig?: PublisherConfig
): Promise<string> {
  console.log('Checking for existing publishers...');
  const publishersResult = await client.listPublishers(environmentUrl);
  
  let publisherUniqueName = 'Default';
  
  if (publishersResult.success && publishersResult.data.publishers) {
    // Look for custom publisher (not system, not Default)
    const customPublisher = publishersResult.data.publishers.find(p => 
      !p.isSystem && p.uniqueName !== 'Default'
    );
    
    if (customPublisher) {
      publisherUniqueName = customPublisher.uniqueName;
      console.log(`✅ Using existing publisher: ${publisherUniqueName}`);
      return publisherUniqueName;
    }
  }
  
  // Create new publisher if needed and config provided
  if (fallbackConfig) {
    console.log('Creating new publisher...');
    const publisherResult = await client.createPublisher(fallbackConfig, environmentUrl);
    
    if (publisherResult.success) {
      publisherUniqueName = fallbackConfig.uniquename;
      console.log(`✅ Created publisher: ${publisherUniqueName}`);
    } else {
      console.log('⚠️ Publisher creation failed, using Default');
    }
  }
  
  return publisherUniqueName;
}

interface PublisherConfig {
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly description: string;
  readonly customizationprefix: string;
}

const defaultPublisherConfig: PublisherConfig = {
  uniquename: 'jrtestpub',
  friendlyname: 'JR Test Publisher',
  description: 'Test publisher for demo',
  customizationprefix: 'jr'
};
```

### Solution Creation with Publisher
```typescript
async function createSolutionWithPublisher(
  client: PowerPlatformClient,
  environmentUrl: string,
  solutionConfig: SolutionConfig,
  publisherConfig?: PublisherConfig
): Promise<string> {
  // 1. Ensure publisher exists
  const publisherUniqueName = await ensurePublisher(client, environmentUrl, publisherConfig);
  
  // 2. Create solution with publisher
  const fullSolutionConfig = {
    ...solutionConfig,
    publisherUniqueName
  };
  
  console.log('Creating solution...');
  const solutionResult = await client.createSolution(fullSolutionConfig, environmentUrl);
  
  if (!solutionResult.success) {
    throw new Error(`Solution creation failed: ${solutionResult.error}`);
  }
  
  console.log(`✅ Solution created: ${solutionConfig.uniquename}`);
  return solutionResult.data.solutionId;
}

interface SolutionConfig {
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly description: string;
  readonly version: string;
}
```

## Table Metadata and Solution Management

### Wait for Table Availability Pattern
```typescript
async function waitForTableAvailability(
  client: PowerPlatformClient,
  tableLogicalNames: string[],
  environmentUrl: string,
  maxWaitTime: number = 10000
): Promise<TableMetadata[]> {
  console.log('Waiting for tables to be available...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const filter = tableLogicalNames.map(name => `LogicalName eq '${name}'`).join(' or ');
      const query = `EntityDefinitions?$filter=${filter}&$select=MetadataId,LogicalName`;
      
      const tablesMetadata = await client.executeDataverseRequest(
        'GET',
        query,
        null,
        environmentUrl
      );
      
      if (tablesMetadata.success && 
          tablesMetadata.data.value && 
          tablesMetadata.data.value.length === tableLogicalNames.length) {
        console.log(`✅ All ${tableLogicalNames.length} tables are available`);
        return tablesMetadata.data.value;
      }
      
    } catch (error) {
      console.log('⏳ Tables not ready yet, waiting...');
    }
    
    // Wait 2 seconds before retry
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Tables not available after ${maxWaitTime}ms wait`);
}

interface TableMetadata {
  readonly MetadataId: string;
  readonly LogicalName: string;
}
```

### Bulk Add Tables to Solution
```typescript
async function addTablesToSolution(
  client: PowerPlatformClient,
  tableLogicalNames: string[],
  solutionUniqueName: string,
  environmentUrl: string
): Promise<void> {
  // 1. Wait for tables to be available
  const tablesMetadata = await waitForTableAvailability(client, tableLogicalNames, environmentUrl);
  
  // 2. Add each table to solution
  console.log(`Adding ${tablesMetadata.length} tables to solution...`);
  
  for (const table of tablesMetadata) {
    try {
      const componentResult = await client.addComponentToSolution(
        solutionUniqueName,
        {
          componentId: table.MetadataId,
          componentType: 1, // Entity component type
          addRequiredComponents: true
        },
        environmentUrl
      );
      
      if (componentResult.success) {
        console.log(`✅ Added ${table.LogicalName} to solution`);
      } else {
        console.log(`❌ Failed to add ${table.LogicalName}: ${componentResult.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error adding ${table.LogicalName}:`, error.message);
    }
  }
  
  console.log('✅ Bulk table addition completed');
}
```

## Complete Integration Example

### End-to-End Setup with Authentication
```typescript
async function completeProjectSetup(): Promise<void> {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    // 1. Authenticate
    await client.connect();
    console.log('✅ Authentication successful');
    
    // 2. Create tables
    const parentResult = await client.createTable({
      logicalName: 'jr_parenttable',
      displayName: 'Parent Table',
      pluralDisplayName: 'Parent Tables',
      description: 'Test parent table'
    }, environmentUrl);
    
    const childResult = await client.createTable({
      logicalName: 'jr_childtable', 
      displayName: 'Child Table',
      pluralDisplayName: 'Child Tables',
      description: 'Test child table'
    }, environmentUrl);
    
    if (!parentResult.success || !childResult.success) {
      throw new Error('Table creation failed');
    }
    
    // 3. Create relationship
    const relationshipResult = await client.createOneToManyRelationship({
      schemaName: 'jr_parenttable_jr_childtable',
      referencedEntity: 'jr_parenttable',
      referencingEntity: 'jr_childtable',
      menuLabel: 'Child Tables',
      lookupField: {
        schemaName: 'jr_ParentTable',
        displayName: 'Parent Table',
        description: 'Reference to parent table',
        required: false
      }
    }, environmentUrl);
    
    if (!relationshipResult.success) {
      throw new Error('Relationship creation failed');
    }
    
    // 4. Create solution
    const solutionId = await createSolutionWithPublisher(
      client,
      environmentUrl,
      {
        uniquename: 'JRTestSolution',
        friendlyname: 'JR Test Solution', 
        description: 'Complete integration test solution',
        version: '1.0.0.0'
      },
      defaultPublisherConfig
    );
    
    // 5. Add tables to solution
    await addTablesToSolution(
      client,
      ['jr_parenttable', 'jr_childtable'],
      'JRTestSolution',
      environmentUrl
    );
    
    console.log('🎉 Complete project setup successful!');
    
  } catch (error) {
    console.error('💥 Project setup failed:', error.message);
    throw error;
  }
}
```

## Error Handling Patterns

### Authentication Error Recovery
```typescript
async function authenticateWithRetry(
  client: PowerPlatformClient,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.connect();
      console.log('✅ Authentication successful');
      return;
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Authentication attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Authentication failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

These authentication patterns provide robust, production-ready flows for both development and production scenarios with comprehensive error handling and retry logic.