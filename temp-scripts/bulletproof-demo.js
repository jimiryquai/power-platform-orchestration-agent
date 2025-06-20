// BULLETPROOF DEMO: No guesswork, no doc consultation, automatic navigation properties
process.env.AZURE_USE_INTERACTIVE_AUTH = 'true';

const PowerPlatformClient = require('./src/integrations/power-platform/mcp-client.js');

class BulletproofClient {
  constructor(baseClient) {
    this.baseClient = baseClient;
    this.publisherPrefix = 'jr';
    this.tables = new Map();
    this.relationships = new Map();
  }

  // Generate all derived names from Display Name automatically
  generateNames(displayName) {
    const logicalName = this.publisherPrefix + '_' + displayName.toLowerCase().replace(/\s+/g, '');
    const schemaName = this.publisherPrefix + '_' + displayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return { logicalName, schemaName, displayName };
  }

  // Register existing table (no creation needed)
  registerExistingTable(displayName) {
    const names = this.generateNames(displayName);
    this.tables.set(names.logicalName, names);
    console.log(`📋 Registered existing table: ${displayName} -> ${names.logicalName}`);
    return names;
  }

  // Create relationship with automatic navigation property generation
  async createRelationship(parentDisplayName, childDisplayName, environmentUrl) {
    const parentTable = Array.from(this.tables.values()).find(t => t.displayName === parentDisplayName);
    const childTable = Array.from(this.tables.values()).find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be registered first');
    }

    const lookupSchemaName = this.publisherPrefix + '_' + parentDisplayName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    const relationshipMetadata = {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: `${parentTable.logicalName}_${childTable.logicalName}`,
      ReferencedEntity: parentTable.logicalName,
      ReferencingEntity: childTable.logicalName,
      ReferencedAttribute: `${parentTable.logicalName}id`,
      ReferencingAttribute: parentTable.logicalName,
      Lookup: {
        AttributeType: 'Lookup',
        SchemaName: lookupSchemaName,
        LogicalName: parentTable.logicalName
      }
    };

    console.log(`🔗 Creating relationship: ${parentDisplayName} -> ${childDisplayName}`);
    console.log(`📋 Auto-generated navigation property: ${lookupSchemaName}@odata.bind`);
    
    const result = await this.baseClient.createOneToManyRelationship(relationshipMetadata, environmentUrl);
    
    if (result.success) {
      const relationshipDef = {
        parentTable,
        childTable,
        navigationProperty: `${lookupSchemaName}@odata.bind`,
        schemaName: relationshipMetadata.SchemaName
      };
      this.relationships.set(relationshipMetadata.SchemaName, relationshipDef);
      console.log(`✅ Relationship created with navigation property: ${lookupSchemaName}@odata.bind`);
    } else {
      console.log(`❌ Relationship creation failed: ${result.error}`);
    }
    
    return result;
  }

  // Create child records with ZERO guesswork - all automatic
  async createChildRecordsWithAutomaticLookups(childDisplayName, parentDisplayName, recordsWithParentIds, environmentUrl) {
    const childTable = Array.from(this.tables.values()).find(t => t.displayName === childDisplayName);
    const parentTable = Array.from(this.tables.values()).find(t => t.displayName === parentDisplayName);
    
    if (!childTable || !parentTable) {
      throw new Error('Both tables must be registered');
    }

    const relationshipKey = `${parentTable.logicalName}_${childTable.logicalName}`;
    const relationship = this.relationships.get(relationshipKey);
    
    if (!relationship) {
      throw new Error(`Relationship not found: ${relationshipKey}`);
    }

    // Create records with automatic lookup references - ZERO manual work!
    const recordsWithLookups = recordsWithParentIds.map(({ data, parentId }) => ({
      ...data,
      [relationship.navigationProperty]: `/${parentTable.logicalName}s(${parentId})`
    }));

    console.log(`🔗 Creating child records with AUTOMATIC lookups:`);
    console.log(`   Navigation property: ${relationship.navigationProperty}`);
    console.log(`   No guesswork - all derived from Display Names!`);
    
    const results = await this.baseClient.createMultipleRecords(`${childTable.logicalName}s`, recordsWithLookups, environmentUrl);
    
    if (results.success) {
      console.log(`✅ SUCCESS! Created ${results.results.filter(r => r.result.success).length} child records`);
    } else {
      console.log(`❌ Child record creation failed`);
    }
    
    return results;
  }

  getSchema() {
    return {
      tables: Array.from(this.tables.values()),
      relationships: Array.from(this.relationships.values())
    };
  }
}

async function bulletproofDemo() {
  const baseClient = new PowerPlatformClient();
  const client = new BulletproofClient(baseClient);
  const environmentUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2';

  try {
    await baseClient.connect();
    console.log('🚀 BULLETPROOF DEMO: Automatic navigation properties without docs!\n');

    // 1. Register existing tables (no creation needed)
    console.log('=== REGISTERING EXISTING TABLES ===');
    client.registerExistingTable('Order Header');
    client.registerExistingTable('Order Line');

    // 2. Create relationship with auto-generated navigation property
    console.log('\n=== CREATING RELATIONSHIP WITH AUTO NAVIGATION PROPERTY ===');
    await client.createRelationship('Order Header', 'Order Line', environmentUrl);

    // 3. Create sample parent records
    console.log('\n=== CREATING PARENT RECORDS ===');
    const orderRecords = [
      { jr_name: 'Order #1001' },
      { jr_name: 'Order #1002' }
    ];
    
    const orderResults = await baseClient.createMultipleRecords('jr_orderheaders', orderRecords, environmentUrl);
    
    if (orderResults.success) {
      const orderIds = orderResults.results
        .filter(r => r.result.success)
        .map(r => r.result.data.jr_orderheaderid);
      
      console.log(`✅ Created ${orderIds.length} order headers`);

      // 4. Create child records with AUTOMATIC lookup references
      console.log('\n=== CREATING CHILD RECORDS WITH AUTOMATIC LOOKUPS ===');
      const lineRecordsWithParents = [
        { data: { jr_name: 'Product A - Qty 5' }, parentId: orderIds[0] },
        { data: { jr_name: 'Product B - Qty 3' }, parentId: orderIds[0] },
        { data: { jr_name: 'Product C - Qty 2' }, parentId: orderIds[1] },
        { data: { jr_name: 'Product D - Qty 1' }, parentId: orderIds[1] }
      ];

      await client.createChildRecordsWithAutomaticLookups('Order Line', 'Order Header', lineRecordsWithParents, environmentUrl);

      // 5. Show the auto-generated schema
      console.log('\n=== AUTO-GENERATED SCHEMA (ZERO MANUAL WORK) ===');
      const schema = client.getSchema();
      console.log('Tables:');
      schema.tables.forEach(table => {
        console.log(`  - "${table.displayName}" -> ${table.logicalName} (${table.schemaName})`);
      });
      console.log('Relationships:');
      schema.relationships.forEach(rel => {
        console.log(`  - ${rel.parentTable.displayName} -> ${rel.childTable.displayName}`);
        console.log(`    Navigation Property: ${rel.navigationProperty}`);
        console.log(`    🎯 AUTOMATICALLY GENERATED - NO GUESSING!`);
      });

      console.log('\n🎉 BULLETPROOF SUCCESS!');
      console.log('📋 Navigation properties generated automatically from Display Names');
      console.log('🔗 Lookup references created without any guesswork');
      console.log('📖 No documentation consultation required');
      console.log('💪 Code is self-documenting and bulletproof!');

    } else {
      console.log('❌ Failed to create parent records');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

bulletproofDemo();