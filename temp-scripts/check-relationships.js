// Set environment variable for interactive auth
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function checkRelationships() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';
  
  try {
    await client.connect();
    
    // Get relationship information
    const relationshipResult = await client.executeDataverseRequest(
      'GET',
      "RelationshipDefinitions?$filter=contains(SchemaName,'jr_')",
      null,
      environmentUrl
    );
    
    if (relationshipResult.success) {
      console.log('Relationships found:');
      relationshipResult.data.value.forEach(rel => {
        console.log(`- ${rel.SchemaName} (${rel.RelationshipType})`);
        if (rel.RelationshipType === 'OneToManyRelationship') {
          console.log(`  Referenced Entity: ${rel.ReferencedEntity}`);
          console.log(`  Referencing Entity: ${rel.ReferencingEntity}`);
          console.log(`  Referenced Attribute: ${rel.ReferencedAttribute}`);
          console.log(`  Referencing Attribute: ${rel.ReferencingAttribute}`);
          if (rel.Lookup) {
            console.log(`  Lookup Field: ${rel.Lookup.AttributeLogicalName}`);
          }
        }
      });
    } else {
      console.log('Failed to get relationships:', relationshipResult.error);
    }
    
    // Also get the navigation properties for the child table
    const navPropResult = await client.executeDataverseRequest(
      'GET',
      "EntityDefinitions(LogicalName='jr_childtable')?$expand=OneToManyRelationships,ManyToOneRelationships",
      null,
      environmentUrl
    );
    
    if (navPropResult.success) {
      console.log('\nChild table navigation properties:');
      console.log('Many-to-One relationships:');
      if (navPropResult.data.ManyToOneRelationships) {
        navPropResult.data.ManyToOneRelationships.forEach(rel => {
          console.log(`- ${rel.SchemaName}: ${rel.ReferencingAttribute} -> ${rel.ReferencedEntity}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRelationships();