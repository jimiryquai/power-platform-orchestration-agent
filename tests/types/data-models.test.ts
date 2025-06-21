// Data Models Tests - Validate domain model interfaces and type guards
import {
  isProjectTemplate,
  isDataverseTable,
  isWorkItem,
  isOrchestrationProject,
  isValidProjectStatus,
  isValidEnvironmentType,
  isValidWorkItemType,
  isValidAttributeType,
  ProjectTemplate,
  DataverseTable,
  WorkItem,
  OrchestrationProject,
  ProjectStatus,
  EnvironmentType,
  WorkItemType,
  AttributeType
} from '../../src/types/data-models';

describe('Data Model Type Guards', () => {
  describe('isProjectTemplate', () => {
    test('should validate correct ProjectTemplate', () => {
      const validTemplate: ProjectTemplate = {
        metadata: {
          name: 'test-template',
          displayName: 'Test Template',
          description: 'A test template',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['test', 'template'],
          category: 'standard',
          estimatedDuration: '2 weeks',
          complexity: 'simple'
        },
        azureDevOps: {
          project: {
            processTemplate: 'Agile',
            visibility: 'private',
            capabilities: {
              versionControl: {
                sourceControlType: 'Git'
              },
              processTemplate: {
                templateTypeId: 'adcc42ab-9882-485e-a3ed-7678f01f66bc',
                templateName: 'Agile'
              }
            }
          },
          workItems: [],
          repositories: [],
          pipelines: [],
          iterations: []
        },
        powerPlatform: {
          publisher: {
            uniqueName: 'test_publisher',
            friendlyName: 'Test Publisher',
            customizationPrefix: 'test',
            customizationOptionValuePrefix: 10000
          },
          solutions: [],
          environments: []
        },
        parameters: []
      };

      expect(isProjectTemplate(validTemplate)).toBe(true);
    });

    test('should reject invalid ProjectTemplate', () => {
      const invalidTemplate = {
        metadata: 'invalid', // Should be object
        // Missing required fields
      };

      expect(isProjectTemplate(invalidTemplate)).toBe(false);
    });
  });

  describe('isDataverseTable', () => {
    test('should validate correct DataverseTable', () => {
      const validTable: DataverseTable = {
        logicalName: 'jr_testtable',
        schemaName: 'jr_TestTable',
        displayName: 'Test Table',
        displayCollectionName: 'Test Tables',
        description: 'A test table',
        ownershipType: 'UserOwned',
        tableType: 'Standard',
        primaryNameAttribute: 'jr_name',
        hasActivities: false,
        hasNotes: false,
        isActivity: false,
        isCustomizable: true,
        attributes: [
          {
            logicalName: 'jr_name',
            schemaName: 'jr_Name',
            displayName: 'Name',
            attributeType: 'String',
            requiredLevel: 'SystemRequired',
            isCustomizable: true,
            isPrimaryId: false,
            isPrimaryName: true,
            maxLength: 100
          }
        ],
        relationships: []
      };

      expect(isDataverseTable(validTable)).toBe(true);
    });

    test('should reject invalid DataverseTable', () => {
      const invalidTable = {
        logicalName: 123, // Should be string
        attributes: 'invalid' // Should be array
      };

      expect(isDataverseTable(invalidTable)).toBe(false);
    });
  });

  describe('isWorkItem', () => {
    test('should validate correct WorkItem', () => {
      const validWorkItem: WorkItem = {
        id: 123,
        rev: 1,
        fields: {
          'System.Id': 123,
          'System.Rev': 1,
          'System.AreaPath': 'Test Project',
          'System.IterationPath': 'Test Project\\Sprint 1',
          'System.WorkItemType': 'Task',
          'System.State': 'New',
          'System.Reason': 'New',
          'System.CreatedDate': new Date(),
          'System.CreatedBy': 'Test User',
          'System.ChangedDate': new Date(),
          'System.ChangedBy': 'Test User',
          'System.CommentCount': 0,
          'System.Title': 'Test Task'
        },
        url: 'https://dev.azure.com/_apis/wit/workItems/123'
      };

      expect(isWorkItem(validWorkItem)).toBe(true);
    });

    test('should reject invalid WorkItem', () => {
      const invalidWorkItem = {
        id: 'invalid', // Should be number
        fields: 'invalid' // Should be object
      };

      expect(isWorkItem(invalidWorkItem)).toBe(false);
    });
  });

  describe('isOrchestrationProject', () => {
    test('should validate correct OrchestrationProject', () => {
      // Create a valid template first
      const validTemplate: ProjectTemplate = {
        metadata: {
          name: 'test-template',
          displayName: 'Test Template',
          description: 'A test template',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['test'],
          category: 'standard',
          estimatedDuration: '2 weeks',
          complexity: 'simple'
        },
        azureDevOps: {
          project: {
            processTemplate: 'Agile',
            visibility: 'private',
            capabilities: {
              versionControl: { sourceControlType: 'Git' },
              processTemplate: { templateTypeId: 'test', templateName: 'Agile' }
            }
          },
          workItems: [],
          repositories: [],
          pipelines: [],
          iterations: []
        },
        powerPlatform: {
          publisher: {
            uniqueName: 'test',
            friendlyName: 'Test',
            customizationPrefix: 'test',
            customizationOptionValuePrefix: 10000
          },
          solutions: [],
          environments: []
        },
        parameters: []
      };

      const validProject: OrchestrationProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'A test project',
        template: validTemplate,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Test User',
        environments: []
      };

      expect(isOrchestrationProject(validProject)).toBe(true);
    });

    test('should reject invalid OrchestrationProject', () => {
      const invalidProject = {
        id: 123, // Should be string
        template: 'invalid' // Should be ProjectTemplate
      };

      expect(isOrchestrationProject(invalidProject)).toBe(false);
    });
  });

  describe('Enum Validators', () => {
    test('isValidProjectStatus should validate project statuses', () => {
      const validStatuses: ProjectStatus[] = [
        'pending',
        'initializing',
        'creating_azure_devops',
        'creating_power_platform',
        'configuring_integrations',
        'completed',
        'failed',
        'cancelled'
      ];

      validStatuses.forEach(status => {
        expect(isValidProjectStatus(status)).toBe(true);
      });

      expect(isValidProjectStatus('invalid')).toBe(false);
    });

    test('isValidEnvironmentType should validate environment types', () => {
      const validTypes: EnvironmentType[] = [
        'development',
        'test',
        'staging',
        'production'
      ];

      validTypes.forEach(type => {
        expect(isValidEnvironmentType(type)).toBe(true);
      });

      expect(isValidEnvironmentType('invalid')).toBe(false);
    });

    test('isValidWorkItemType should validate work item types', () => {
      const validTypes: WorkItemType[] = [
        'Epic',
        'Feature',
        'User Story',
        'Task',
        'Bug',
        'Issue',
        'Test Case'
      ];

      validTypes.forEach(type => {
        expect(isValidWorkItemType(type)).toBe(true);
      });

      expect(isValidWorkItemType('Invalid Type')).toBe(false);
    });

    test('isValidAttributeType should validate attribute types', () => {
      const validTypes: AttributeType[] = [
        'String',
        'Memo',
        'Integer',
        'BigInt',
        'Decimal',
        'Double',
        'Money',
        'Boolean',
        'DateTime',
        'Lookup',
        'Customer',
        'Owner',
        'Picklist',
        'State',
        'Status',
        'Uniqueidentifier',
        'Image',
        'File',
        'MultiSelectPicklist'
      ];

      validTypes.forEach(type => {
        expect(isValidAttributeType(type)).toBe(true);
      });

      expect(isValidAttributeType('InvalidType')).toBe(false);
    });
  });
});

describe('Data Model Interface Compliance', () => {
  test('ProjectTemplate should have all required properties', () => {
    const template: ProjectTemplate = {
      metadata: {
        name: 'test',
        displayName: 'Test',
        description: 'Test template',
        version: '1.0.0',
        author: 'Test Author',
        tags: ['test'],
        category: 'standard',
        estimatedDuration: '1 week',
        complexity: 'simple'
      },
      azureDevOps: {
        project: {
          processTemplate: 'Agile',
          visibility: 'private',
          capabilities: {
            versionControl: { sourceControlType: 'Git' },
            processTemplate: { templateTypeId: 'test', templateName: 'Agile' }
          }
        },
        workItems: [],
        repositories: [],
        pipelines: [],
        iterations: []
      },
      powerPlatform: {
        publisher: {
          uniqueName: 'test',
          friendlyName: 'Test',
          customizationPrefix: 'test',
          customizationOptionValuePrefix: 10000
        },
        solutions: [],
        environments: []
      },
      parameters: []
    };

    expect(template.metadata.name).toBe('test');
    expect(template.azureDevOps.workItems).toHaveLength(0);
    expect(template.powerPlatform.solutions).toHaveLength(0);
    expect(template.parameters).toHaveLength(0);
  });

  test('DataverseTable should have all required properties', () => {
    const table: DataverseTable = {
      logicalName: 'jr_testtable',
      schemaName: 'jr_TestTable',
      displayName: 'Test Table',
      displayCollectionName: 'Test Tables',
      ownershipType: 'UserOwned',
      tableType: 'Standard',
      primaryNameAttribute: 'jr_name',
      hasActivities: false,
      hasNotes: false,
      isActivity: false,
      isCustomizable: true,
      attributes: [],
      relationships: []
    };

    expect(table.logicalName).toBe('jr_testtable');
    expect(table.ownershipType).toBe('UserOwned');
    expect(table.tableType).toBe('Standard');
    expect(Array.isArray(table.attributes)).toBe(true);
    expect(Array.isArray(table.relationships)).toBe(true);
  });
});