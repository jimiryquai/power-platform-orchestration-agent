// Schema-aware Power Platform client that automatically handles navigation properties
import { DataverseSchemaManager, RelationshipDefinition, TableDefinition } from '../../types/dataverse-schema';
import { 
  EntityRecord
} from '../../types/power-platform-interfaces';
import { PowerPlatformMCPClient } from './power-platform-client';

// Custom response types that match our client
type PowerPlatformCreateResponse = 
  | { success: true; data: { id: string; message: string } }
  | { success: false; error: string };

type CreateTableResult = PowerPlatformCreateResponse & {
  tableDefinition: TableDefinition;
};

type CreateRelationshipResult = PowerPlatformCreateResponse & {
  relationshipDefinition: RelationshipDefinition;
};

interface ChildRecordData {
  data: EntityRecord;
  parentId: string;
}

interface SchemaInfo {
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
}

interface CreateChildRecordOptions {
  childDisplayName: string;
  parentDisplayName: string;
  recordData: EntityRecord;
  parentId: string;
  environmentUrl: string;
}

export class SchemaAwarePowerPlatformClient {
  private schema = new DataverseSchemaManager('jr');
  
  constructor(private baseClient: PowerPlatformMCPClient) {}

  // Create table and register it in schema
  async createTable(displayName: string, environmentUrl: string): Promise<CreateTableResult> {
    const tableDef = this.schema.registerTable(displayName);
    const tableMetadata = this.schema.generateTableMetadata(tableDef.logicalName);
    
    const result = await this.baseClient.createTable(tableMetadata, environmentUrl);
    
    // Table created successfully
    
    return { ...result, tableDefinition: tableDef };
  }

  // Create relationship and register it in schema
  async createRelationship(
    parentDisplayName: string,
    childDisplayName: string,
    environmentUrl: string,
    lookupDisplayName?: string
  ): Promise<CreateRelationshipResult> {
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
    
    // Relationship created successfully
    
    return { ...result, relationshipDefinition: relationshipDef };
  }

  // Create child record with automatic lookup reference
  async createChildRecord(options: CreateChildRecordOptions): Promise<PowerPlatformCreateResponse> {
    const { childDisplayName, parentDisplayName, recordData, parentId, environmentUrl } = options;
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

    // Creating child record with lookup
    
    return await this.baseClient.createRecord(
      `${childTable.logicalName}s`, // Pluralize for entity set
      recordWithLookup,
      environmentUrl
    );
  }

  // Create multiple child records with automatic lookup references
  async createMultipleChildRecords(
    childDisplayName: string,
    parentDisplayName: string,
    recordsData: ChildRecordData[],
    environmentUrl: string
  ): Promise<PowerPlatformCreateResponse[]> {
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

    // Creating multiple child records with lookups
    
    return await this.baseClient.createMultipleRecords(
      `${childTable.logicalName}s`, // Pluralize for entity set
      recordsWithLookups,
      environmentUrl
    );
  }

  // Add table to solution by display name
  async addTableToSolution(displayName: string, solutionName: string, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const table = this.schema.getRegisteredTables().find(t => t.displayName === displayName);
    if (!table) {
      throw new Error(`Table not registered: ${displayName}`);
    }

    return await this.baseClient.addTableToSolution(table.logicalName, solutionName, environmentUrl);
  }

  // Debug info
  getSchema(): SchemaInfo {
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