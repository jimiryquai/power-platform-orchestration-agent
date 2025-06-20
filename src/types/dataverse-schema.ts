// Self-documenting Dataverse schema management
// Automatically tracks Display Names and generates correct navigation properties

interface TableDefinition {
  logicalName: string;
  displayName: string;
  schemaName: string; // Auto-generated from displayName
  publisherPrefix: string;
}

interface RelationshipDefinition {
  schemaName: string;
  parentTable: TableDefinition;
  childTable: TableDefinition;
  lookupField: {
    logicalName: string;
    schemaName: string; // This becomes the navigation property base
    displayName: string;
  };
}

class DataverseSchemaManager {
  private tables = new Map<string, TableDefinition>();
  private relationships = new Map<string, RelationshipDefinition>();
  
  constructor(private publisherPrefix: string = 'jr') {}

  // Auto-generate SchemaName from Display Name
  private generateSchemaName(displayName: string): string {
    // "Parent Table" -> "jr_ParentTable"
    return this.publisherPrefix + '_' + displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // Auto-generate logical name from Display Name  
  private generateLogicalName(displayName: string): string {
    // "Parent Table" -> "jr_parenttable"
    return this.publisherPrefix + '_' + displayName
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  // Register a table and auto-generate names
  registerTable(displayName: string): TableDefinition {
    const logicalName = this.generateLogicalName(displayName);
    const schemaName = this.generateSchemaName(displayName);
    
    const table: TableDefinition = {
      logicalName,
      displayName,
      schemaName,
      publisherPrefix: this.publisherPrefix
    };
    
    this.tables.set(logicalName, table);
    return table;
  }

  // Create relationship and auto-generate lookup field names
  createRelationship(
    parentTableLogicalName: string,
    childTableLogicalName: string,
    lookupDisplayName?: string
  ): RelationshipDefinition {
    const parentTable = this.tables.get(parentTableLogicalName);
    const childTable = this.tables.get(childTableLogicalName);
    
    if (!parentTable || !childTable) {
      throw new Error('Tables must be registered before creating relationships');
    }

    // Default lookup display name to parent table display name
    const lookupName = lookupDisplayName || parentTable.displayName;
    
    const relationship: RelationshipDefinition = {
      schemaName: `${parentTable.logicalName}_${childTable.logicalName}`,
      parentTable,
      childTable,
      lookupField: {
        logicalName: parentTable.logicalName,
        schemaName: this.generateSchemaName(lookupName),
        displayName: lookupName
      }
    };

    this.relationships.set(relationship.schemaName, relationship);
    return relationship;
  }

  // Get the correct navigation property for a lookup field
  getNavigationProperty(childTableLogicalName: string, parentTableLogicalName: string): string {
    const relationshipKey = `${parentTableLogicalName}_${childTableLogicalName}`;
    const relationship = this.relationships.get(relationshipKey);
    
    if (!relationship) {
      throw new Error(`Relationship not found: ${relationshipKey}. Register the relationship first.`);
    }

    return `${relationship.lookupField.schemaName}@odata.bind`;
  }

  // Create a record with lookup reference - type safe and auto-generated
  createRecordWithLookup<T extends Record<string, any>>(
    baseRecord: T,
    childTableLogicalName: string,
    parentTableLogicalName: string,
    parentId: string
  ): T & Record<string, string> {
    const navProp = this.getNavigationProperty(childTableLogicalName, parentTableLogicalName);
    const parentTable = this.tables.get(parentTableLogicalName);
    
    if (!parentTable) {
      throw new Error(`Parent table not registered: ${parentTableLogicalName}`);
    }

    return {
      ...baseRecord,
      [navProp]: `/${parentTable.logicalName}s(${parentId})`
    };
  }

  // Generate the complete relationship metadata for Dataverse API
  generateRelationshipMetadata(relationshipSchemaName: string) {
    const relationship = this.relationships.get(relationshipSchemaName);
    if (!relationship) {
      throw new Error(`Relationship not found: ${relationshipSchemaName}`);
    }

    return {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: relationship.schemaName,
      ReferencedEntity: relationship.parentTable.logicalName,
      ReferencingEntity: relationship.childTable.logicalName,
      ReferencedAttribute: `${relationship.parentTable.logicalName}id`,
      ReferencingAttribute: relationship.lookupField.logicalName,
      Lookup: {
        AttributeType: 'Lookup',
        SchemaName: relationship.lookupField.schemaName,
        LogicalName: relationship.lookupField.logicalName
      }
    };
  }

  // Generate table metadata for Dataverse API
  generateTableMetadata(logicalName: string) {
    const table = this.tables.get(logicalName);
    if (!table) {
      throw new Error(`Table not found: ${logicalName}`);
    }

    return {
      LogicalName: table.logicalName,
      SchemaName: table.schemaName,
      DisplayName: {
        UserLocalizedLabel: {
          Label: table.displayName,
          LanguageCode: 1033
        }
      },
      PrimaryNameAttribute: `${this.publisherPrefix}_name`,
      HasNotes: false,
      HasActivities: false,
      Attributes: [
        {
          LogicalName: `${this.publisherPrefix}_name`,
          SchemaName: `${this.publisherPrefix}_Name`,
          AttributeType: 'String',
          DisplayName: {
            UserLocalizedLabel: {
              Label: 'Name',
              LanguageCode: 1033
            }
          },
          RequiredLevel: {
            Value: 'ApplicationRequired'
          },
          MaxLength: 100
        }
      ]
    };
  }

  // Debug info
  getRegisteredTables(): TableDefinition[] {
    return Array.from(this.tables.values());
  }

  getRegisteredRelationships(): RelationshipDefinition[] {
    return Array.from(this.relationships.values());
  }
}

export { DataverseSchemaManager };
export type { TableDefinition, RelationshipDefinition };