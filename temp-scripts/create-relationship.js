process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

async function createRelationshipCorrectly() {
  const client = new PowerPlatformClient();
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';

  try {
    await client.connect();
    console.log('🚀 Creating relationship with correct format');
    
    const relationshipConfig = {
      schemaName: 'jr_productcategory_jr_productitem',
      referencedEntity: 'jr_productcategory',
      referencingEntity: 'jr_productitem',
      referencedAttribute: 'jr_productcategoryid',
      lookupField: {
        schemaName: 'jr_ProductCategory',
        displayName: 'Product Category',
        required: false
      }
    };
    
    console.log('📋 Creating relationship:', relationshipConfig.schemaName);
    const result = await client.createOneToManyRelationship(relationshipConfig, environmentUrl);
    
    if (result.success) {
      console.log('✅ Relationship created successfully');
      
      // Now test the lookup field
      const childRecord = {
        jr_name: 'Product with Category Lookup',
        'jr_ProductCategory@odata.bind': '/jr_productcategories(436a8627-174e-f011-877a-6045bdcfd3f1)'
      };
      
      console.log('🔗 Creating child record with lookup:', childRecord);
      const childResult = await client.createRecord('jr_productitems', childRecord, environmentUrl);
      
      console.log('Child record created:', childResult.success ? 'SUCCESS' : 'FAILED');
      if (!childResult.success) {
        console.log('Error:', childResult.error);
      }
      
    } else {
      console.log('❌ Relationship creation failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createRelationshipCorrectly();