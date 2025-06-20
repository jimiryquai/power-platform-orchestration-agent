// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function createRelationshipAndSolution() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    console.log('Connecting to Power Platform...');
    await client.connect();
    
    console.log('Creating one-to-many relationship...');
    const relationshipConfig = {
      schemaName: 'jr_parenttable_jr_childtable',
      referencedEntity: 'jr_parenttable', // Parent
      referencingEntity: 'jr_childtable', // Child
      menuLabel: 'Child Tables',
      lookupField: {
        schemaName: 'jr_ParentTable',
        displayName: 'Parent Table',
        description: 'Reference to the parent table',
        required: false
      }
    };
    
    const relationshipResult = await client.createOneToManyRelationship(relationshipConfig, environmentUrl);
    console.log('Relationship created:', relationshipResult.success ? 'SUCCESS' : 'FAILED');
    if (!relationshipResult.success) {
      console.log('Relationship error:', relationshipResult.error);
    }
    
    console.log('Checking for existing publishers...');
    const publishersResult = await client.listPublishers(environmentUrl);
    let publisherUniqueName = 'Default';
    
    if (publishersResult.success && publishersResult.data.publishers) {
      const customPublisher = publishersResult.data.publishers.find(p => !p.isSystem && p.uniqueName !== 'Default');
      if (customPublisher) {
        publisherUniqueName = customPublisher.uniqueName;
        console.log('Using existing publisher:', publisherUniqueName);
      } else {
        console.log('Creating publisher...');
        const publisherConfig = {
          uniquename: 'jrtestpub',
          friendlyname: 'JR Test Publisher',
          description: 'Test publisher for demo',
          customizationprefix: 'jr'
        };
        
        const publisherResult = await client.createPublisher(publisherConfig, environmentUrl);
        if (publisherResult.success) {
          publisherUniqueName = 'jrtestpub';
          console.log('Publisher created successfully');
        } else {
          console.log('Publisher creation failed, using Default');
        }
      }
    }
    
    console.log('Creating solution...');
    const solutionConfig = {
      uniquename: 'JRTestSolution',
      friendlyname: 'JR Test Solution',
      description: 'Test solution for table relationship demo',
      version: '1.0.0.0',
      publisherUniqueName: publisherUniqueName
    };
    
    const solutionResult = await client.createSolution(solutionConfig, environmentUrl);
    console.log('Solution created:', solutionResult.success ? 'SUCCESS' : 'FAILED');
    if (!solutionResult.success) {
      console.log('Solution error:', solutionResult.error);
    }
    
    if (solutionResult.success) {
      console.log('Getting table metadata for solution addition...');
      
      // Get table metadata IDs
      const tablesMetadata = await client.executeDataverseRequest(
        'GET',
        "EntityDefinitions?$filter=LogicalName eq 'jr_parenttable' or LogicalName eq 'jr_childtable'&$select=MetadataId,LogicalName",
        null,
        environmentUrl
      );
      
      if (tablesMetadata.success && tablesMetadata.data.value && tablesMetadata.data.value.length > 0) {
        console.log('Adding tables to solution...');
        for (const table of tablesMetadata.data.value) {
          const componentResult = await client.addComponentToSolution(
            'JRTestSolution',
            {
              componentId: table.MetadataId,
              componentType: 1, // Entity
              addRequiredComponents: true
            },
            environmentUrl
          );
          console.log(`Added ${table.LogicalName} to solution:`, componentResult.success ? 'SUCCESS' : 'FAILED');
          if (!componentResult.success) {
            console.log(`Error adding ${table.LogicalName}:`, componentResult.error);
          }
        }
        
        console.log('All operations completed!');
        console.log('Summary:');
        console.log('- Tables: jr_parenttable, jr_childtable');
        console.log('- Relationship: jr_parenttable_jr_childtable');
        console.log('- Solution: JRTestSolution');
      } else {
        console.log('Could not find table metadata');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createRelationshipAndSolution();