// Schema-aware Power Platform client that automatically handles navigation properties
import { DataverseSchemaManager } from '../../types/dataverse-schema';

interface PowerPlatformClientBase {
  createTable(tableData: any, environmentUrl: string): Promise<any>;
  createOneToManyRelationship(relationshipData: any, environmentUrl: string): Promise<any>;
  createRecord(entityName: string, recordData: any, environmentUrl: string): Promise<any>;
  createMultipleRecords(entityName: string, records: any[], environmentUrl: string): Promise<any>;
  addTableToSolution(tableName: string, solutionName: string, environmentUrl: string): Promise<any>;
}

export class SchemaAwarePowerPlatformClient {
  private schema = new DataverseSchemaManager('jr');
  
  constructor(private baseClient: PowerPlatformClientBase) {}

  // Create table and register it in schema
  async createTable(displayName: string, environmentUrl: string) {
    const tableDef = this.schema.registerTable(displayName);
    const tableMetadata = this.schema.generateTableMetadata(tableDef.logicalName);
    
    const result = await this.baseClient.createTable(tableMetadata, environmentUrl);
    
    if (result.success) {
      console.log(`✅ Table created and registered: ${displayName} (${tableDef.logicalName})`);
    }
    
    return { ...result, tableDefinition: tableDef };
  }

  // Create relationship and register it in schema
  async createRelationship(
    parentDisplayName: string,
    childDisplayName: string,
    environmentUrl: string,
    lookupDisplayName?: string
  ) {
    // Get registered tables
    const parentTable = this.schema.getRegisteredTables().find(t => t.displayName === parentDisplayName);
    const childTable = this.schema.getRegisteredTables().find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be created before creating relationship');
    }

    const relationshipDef = this.schema.createRelationship(
      parentTable.logicalName,
      childTable.logicalName,
      lookupDisplayName
    );

    const relationshipMetadata = this.schema.generateRelationshipMetadata(relationshipDef.schemaName);
    
    const result = await this.baseClient.createOneToManyRelationship(relationshipMetadata, environmentUrl);
    
    if (result.success) {
      console.log(`✅ Relationship created: ${parentDisplayName} -> ${childDisplayName}`);
      console.log(`📋 Navigation property: ${this.schema.getNavigationProperty(childTable.logicalName, parentTable.logicalName)}`);
    }
    
    return { ...result, relationshipDefinition: relationshipDef };
  }

  // Create child record with automatic lookup reference
  async createChildRecord(
    childDisplayName: string,
    parentDisplayName: string,
    recordData: Record<string, any>,
    parentId: string,
    environmentUrl: string
  ) {
    const parentTable = this.schema.getRegisteredTables().find(t => t.displayName === parentDisplayName);
    const childTable = this.schema.getRegisteredTables().find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be registered before creating child records');
    }

    const recordWithLookup = this.schema.createRecordWithLookup(
      recordData,
      childTable.logicalName,
      parentTable.logicalName,
      parentId
    );

    console.log(`🔗 Creating child record with lookup:`, recordWithLookup);
    
    return await this.baseClient.createRecord(
      childTable.logicalName + 's', // Pluralize for entity set
      recordWithLookup,
      environmentUrl
    );
  }

  // Create multiple child records with automatic lookup references
  async createMultipleChildRecords(
    childDisplayName: string,
    parentDisplayName: string,
    recordsData: Array<{ data: Record<string, any>, parentId: string }>,
    environmentUrl: string
  ) {
    const parentTable = this.schema.getRegisteredTables().find(t => t.displayName === parentDisplayName);
    const childTable = this.schema.getRegisteredTables().find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be registered before creating child records');
    }

    const recordsWithLookups = recordsData.map(({ data, parentId }) => 
      this.schema.createRecordWithLookup(
        data,
        childTable.logicalName,
        parentTable.logicalName,
        parentId
      )
    );

    console.log(`🔗 Creating ${recordsWithLookups.length} child records with lookups`);
    
    return await this.baseClient.createMultipleRecords(
      childTable.logicalName + 's', // Pluralize for entity set
      recordsWithLookups,
      environmentUrl
    );
  }

  // Add table to solution by display name
  async addTableToSolution(displayName: string, solutionName: string, environmentUrl: string) {
    const table = this.schema.getRegisteredTables().find(t => t.displayName === displayName);
    if (!table) {
      throw new Error(`Table not registered: ${displayName}`);
    }

    return await this.baseClient.addTableToSolution(table.logicalName, solutionName, environmentUrl);
  }

  // Debug info
  getSchema() {
    return {
      tables: this.schema.getRegisteredTables(),
      relationships: this.schema.getRegisteredRelationships()
    };
  }

  // Get navigation property for debugging
  getNavigationProperty(childDisplayName: string, parentDisplayName: string): string {
    const parentTable = this.schema.getRegisteredTables().find(t => t.displayName === parentDisplayName);
    const childTable = this.schema.getRegisteredTables().find(t => t.displayName === childDisplayName);
    
    if (!parentTable || !childTable) {
      throw new Error('Both tables must be registered');
    }

    return this.schema.getNavigationProperty(childTable.logicalName, parentTable.logicalName);
  }
}

export default SchemaAwarePowerPlatformClient;