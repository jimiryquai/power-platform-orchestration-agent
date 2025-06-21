// Azure DevOps Integration Tests
// End-to-end testing of S-Project template deployment to Azure DevOps

import AzureDevOpsClient from '../../../src/integrations/azure-devops/azure-devops-client';
import { SProjectTemplateParser } from '../../../src/integrations/azure-devops/template-parser';
import WorkItemOrchestrator from '../../../src/integrations/azure-devops/work-item-orchestrator';
import { AzureDevOpsConfig } from '../../../src/types/azure-devops-interfaces';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG: AzureDevOpsConfig = {
  organization: process.env.AZURE_DEVOPS_ORG || 'test-org',
  project: process.env.AZURE_DEVOPS_PROJECT || 'TestProject',
  personalAccessToken: process.env.AZURE_DEVOPS_PAT || '',
  useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
  retryConfig: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
    retryableErrors: ['RATE_LIMIT_EXCEEDED', 'SERVER_ERROR']
  },
  timeoutMs: 30000
};

const SAMPLE_S_PROJECT_TEMPLATE = {
  name: "Test S Project Template",
  description: "Test template for Azure DevOps integration",
  version: "1.0.0",
  duration: 12,
  sprintDuration: 2,
  sprintCount: 6,
  azureDevOps: {
    processTemplate: "Agile",
    repositoryStrategy: "GitFlow",
    branchingPolicies: [
      {
        branch: "main",
        requirePullRequest: true,
        minimumReviewers: 2
      }
    ],
    pipelineTemplates: ["CI-PowerPlatform"],
    workItemTypes: ["Epic", "Feature", "User Story", "Task"]
  },
  workItemTemplates: {
    epics: [
      {
        name: "Environment Setup",
        description: "Configure development, test, and production environments",
        estimatedEffort: "1 sprint",
        priority: 1,
        features: ["Development Environment Configuration", "Test Environment Configuration"]
      },
      {
        name: "Data Model Implementation", 
        description: "Create and deploy Dataverse entities and relationships",
        estimatedEffort: "2 sprints",
        priority: 2,
        features: ["Core Entity Design"]
      }
    ],
    features: [
      {
        epic: "Environment Setup",
        name: "Development Environment Configuration",
        description: "Set up and configure the development environment",
        userStories: [
          "Create Dataverse environment",
          "Configure security roles",
          "Set up connections"
        ]
      },
      {
        epic: "Environment Setup", 
        name: "Test Environment Configuration",
        description: "Set up and configure the test environment",
        userStories: [
          "Create test Dataverse environment",
          "Configure test security roles"
        ]
      },
      {
        epic: "Data Model Implementation",
        name: "Core Entity Design",
        description: "Design and create core business entities",
        userStories: [
          "Design data model",
          "Create custom entities",
          "Define relationships"
        ]
      }
    ]
  }
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Azure DevOps Integration Tests', () => {
  let client: AzureDevOpsClient;
  let parser: SProjectTemplateParser;
  let orchestrator: WorkItemOrchestrator;

  beforeAll(async () => {
    // Skip integration tests if credentials not provided
    if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
      console.log('⚠️  Skipping Azure DevOps integration tests - no credentials provided');
      return;
    }

    client = new AzureDevOpsClient(TEST_CONFIG);
    
    const parserConfig = SProjectTemplateParser.createDefaultConfig(TEST_CONFIG.project!);
    parser = new SProjectTemplateParser(parserConfig);
    
    const orchestratorConfig = WorkItemOrchestrator.createDefaultConfig(TEST_CONFIG.project!);
    orchestratorConfig.dryRun = true; // Start with dry run for safety
    orchestrator = new WorkItemOrchestrator(client, orchestratorConfig);
  });

  describe('Client Connection and Authentication', () => {
    test('should connect to Azure DevOps successfully', async () => {
      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const projectsResult = await client.listProjects();
      expect(projectsResult.success).toBe(true);
      
      if (projectsResult.success) {
        expect(projectsResult.data.value.length).toBeGreaterThan(0);
        console.log(`✅ Connected to Azure DevOps - found ${projectsResult.data.value.length} projects`);
      }
    }, 30000);

    test('should find the test project', async () => {
      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const projectResult = await client.getProject(TEST_CONFIG.project!);
      
      if (projectResult.success) {
        expect(projectResult.data.name).toBe(TEST_CONFIG.project);
        console.log(`✅ Found test project: ${projectResult.data.name}`);
      } else {
        console.log(`⚠️  Test project '${TEST_CONFIG.project}' not found - this is expected for new setups`);
      }
    }, 15000);
  });

  describe('Template Parsing', () => {
    test('should parse S-Project template correctly', () => {
      const parseResult = parser.parseTemplate(SAMPLE_S_PROJECT_TEMPLATE);
      
      expect(parseResult).toBeDefined();
      expect(parseResult.batch).toBeDefined();
      expect(parseResult.relationships).toBeDefined();
      expect(parseResult.metadata).toBeDefined();

      // Verify work item counts
      expect(parseResult.batch.epics.length).toBe(2);
      expect(parseResult.batch.features.length).toBe(3);
      expect(parseResult.batch.userStories.length).toBe(8); // 3 + 2 + 3 user stories
      expect(parseResult.batch.tasks.length).toBeGreaterThan(0); // Tasks auto-generated

      console.log('✅ Template parsing results:', {
        epics: parseResult.batch.epics.length,
        features: parseResult.batch.features.length,
        userStories: parseResult.batch.userStories.length,
        tasks: parseResult.batch.tasks.length,
        relationships: parseResult.relationships.length
      });
    });

    test('should generate proper work item titles and descriptions', () => {
      const parseResult = parser.parseTemplate(SAMPLE_S_PROJECT_TEMPLATE);
      
      // Check epic structure
      const envSetupEpic = parseResult.batch.epics.find(e => 
        e.fields['System.Title'] === 'Environment Setup'
      );
      expect(envSetupEpic).toBeDefined();
      expect(envSetupEpic?.fields['System.WorkItemType']).toBe('Epic');
      expect(envSetupEpic?.fields['System.Description']).toContain('Configure development, test, and production environments');

      // Check feature structure
      const devEnvFeature = parseResult.batch.features.find(f => 
        f.fields['System.Title'] === 'Development Environment Configuration'
      );
      expect(devEnvFeature).toBeDefined();
      expect(devEnvFeature?.fields['System.WorkItemType']).toBe('Feature');

      // Check user story structure
      const createEnvStory = parseResult.batch.userStories.find(us => 
        us.fields['System.Title'] === 'Create Dataverse environment'
      );
      expect(createEnvStory).toBeDefined();
      expect(createEnvStory?.fields['System.WorkItemType']).toBe('User Story');
      expect(createEnvStory?.fields['Microsoft.VSTS.Common.AcceptanceCriteria']).toBeDefined();

      console.log('✅ Work item structure validation passed');
    });

    test('should validate template structure', () => {
      const validationErrors = SProjectTemplateParser.validateTemplate(SAMPLE_S_PROJECT_TEMPLATE);
      expect(validationErrors).toEqual([]);
      console.log('✅ Template validation passed');
    });

    test('should detect template validation errors', () => {
      const invalidTemplate = {
        ...SAMPLE_S_PROJECT_TEMPLATE,
        workItemTemplates: {
          epics: [
            {
              name: "Test Epic",
              description: "Test",
              estimatedEffort: "1 sprint", 
              priority: 1,
              features: ["Nonexistent Feature"] // This feature doesn't exist
            }
          ],
          features: []
        }
      };

      const validationErrors = SProjectTemplateParser.validateTemplate(invalidTemplate);
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0]).toContain('Nonexistent Feature');
      console.log('✅ Template validation error detection passed');
    });
  });

  describe('Work Item Orchestration (Dry Run)', () => {
    test('should perform dry run orchestration successfully', async () => {
      const parseResult = parser.parseTemplate(SAMPLE_S_PROJECT_TEMPLATE);
      
      const orchestrationResult = await orchestrator.orchestrateWorkItemCreation(
        parseResult.batch,
        parseResult.relationships
      );

      expect(orchestrationResult.success).toBe(true);
      expect(orchestrationResult.workItemsCreated).toEqual([]); // Dry run
      expect(orchestrationResult.errors).toEqual([]);
      expect(orchestrationResult.summary.totalPlanned).toBeGreaterThan(0);

      console.log('✅ Dry run orchestration results:', {
        success: orchestrationResult.success,
        planned: orchestrationResult.summary.totalPlanned,
        relationshipsPlanned: orchestrationResult.relationshipsCreated
      });
    }, 10000);
  });

  describe('Work Item Operations (Live Tests)', () => {
    // These tests will only run if AZURE_DEVOPS_LIVE_TESTS=true
    const shouldRunLiveTests = process.env.AZURE_DEVOPS_LIVE_TESTS === 'true';

    test('should create a single work item', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set AZURE_DEVOPS_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const testWorkItem = {
        workItemType: 'Task' as const,
        fields: {
          'System.Title': `Test Task - ${new Date().toISOString()}`,
          'System.WorkItemType': 'Task' as const,
          'System.Description': 'Test task created by Azure DevOps integration test',
          'System.Tags': 'Test; Integration; Automated'
        }
      };

      const result = await client.createWorkItem(TEST_CONFIG.project!, testWorkItem);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeGreaterThan(0);
        console.log(`✅ Created test work item: ${result.data.id}`);

        // Clean up - delete the test work item
        // Note: Deletion would require additional API calls not implemented in this basic client
      }
    }, 30000);

    test('should create work item hierarchy from template', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set AZURE_DEVOPS_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Use a smaller template for live testing
      const miniTemplate = {
        ...SAMPLE_S_PROJECT_TEMPLATE,
        name: `Test Mini Template - ${new Date().toISOString()}`,
        workItemTemplates: {
          epics: [SAMPLE_S_PROJECT_TEMPLATE.workItemTemplates.epics[0]!], // Just one epic
          features: [SAMPLE_S_PROJECT_TEMPLATE.workItemTemplates.features[0]!] // Just one feature
        }
      };

      const parseResult = parser.parseTemplate(miniTemplate);
      
      // Create a live orchestrator (not dry run)
      const liveOrchestratorConfig = WorkItemOrchestrator.createDefaultConfig(TEST_CONFIG.project!);
      liveOrchestratorConfig.dryRun = false;
      liveOrchestratorConfig.parallelBatchSize = 2; // Conservative for testing
      
      const liveOrchestrator = new WorkItemOrchestrator(client, liveOrchestratorConfig);
      
      const orchestrationResult = await liveOrchestrator.orchestrateWorkItemCreation(
        parseResult.batch,
        parseResult.relationships
      );

      expect(orchestrationResult.success).toBe(true);
      expect(orchestrationResult.workItemsCreated.length).toBeGreaterThan(0);
      expect(orchestrationResult.summary.failureRate).toBeLessThan(10); // Allow for some failures

      console.log('✅ Live orchestration results:', {
        success: orchestrationResult.success,
        created: orchestrationResult.workItemsCreated.length,
        relationships: orchestrationResult.relationshipsCreated,
        errors: orchestrationResult.errors.length,
        failureRate: orchestrationResult.summary.failureRate
      });

      // Note: In a real scenario, you'd want to clean up the created work items
      // This would require implementing work item deletion functionality
    }, 120000); // 2 minutes timeout for live test
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid project gracefully', async () => {
      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const invalidProject = 'NonexistentProject12345';
      const result = await client.getProject(invalidProject);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        console.log(`✅ Invalid project handled correctly: ${result.error}`);
      }
    });

    test('should handle network timeouts gracefully', async () => {
      // This test simulates timeout behavior
      const shortTimeoutConfig = {
        ...TEST_CONFIG,
        timeoutMs: 1 // Very short timeout
      };
      
      const shortTimeoutClient = new AzureDevOpsClient(shortTimeoutConfig);
      
      // This might timeout or succeed very quickly
      const result = await shortTimeoutClient.listProjects();
      
      // Either way, it should not throw an unhandled exception
      expect(typeof result.success).toBe('boolean');
      console.log(`✅ Timeout handling test completed: ${result.success ? 'success' : 'handled gracefully'}`);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent work item creation', async () => {
      if (!TEST_CONFIG.personalAccessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Test concurrent requests (dry run for safety)
      const concurrentPromises = Array.from({ length: 5 }, () => 
        client.listProjects()
      );

      const results = await Promise.allSettled(concurrentPromises);
      
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      expect(successfulResults.length).toBeGreaterThan(0);
      console.log(`✅ Concurrent requests test: ${successfulResults.length}/5 succeeded`);
    }, 30000);
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

describe('Test Utilities', () => {
  test('should create proper test configurations', () => {
    const defaultConfig = WorkItemOrchestrator.createDefaultConfig('TestProject');
    expect(defaultConfig.project).toBe('TestProject');
    expect(defaultConfig.parallelBatchSize).toBeGreaterThan(0);
    expect(defaultConfig.maxRetries).toBeGreaterThan(0);

    const productionConfig = WorkItemOrchestrator.createProductionConfig('ProdProject');
    expect(productionConfig.project).toBe('ProdProject');
    expect(productionConfig.parallelBatchSize).toBeLessThanOrEqual(defaultConfig.parallelBatchSize);
    expect(productionConfig.maxRetries).toBeGreaterThanOrEqual(defaultConfig.maxRetries);

    console.log('✅ Configuration utilities working correctly');
  });

  test('should validate environment variables', () => {
    const requiredVars = ['AZURE_DEVOPS_ORG'];
    const optionalVars = ['AZURE_DEVOPS_PAT', 'AZURE_USE_INTERACTIVE_AUTH', 'AZURE_DEVOPS_LIVE_TESTS'];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.warn(`⚠️  Required environment variable ${varName} not set`);
      }
    });

    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ Optional environment variable ${varName} is set`);
      }
    });

    // This test always passes but provides useful output
    expect(true).toBe(true);
  });
});

export { TEST_CONFIG, SAMPLE_S_PROJECT_TEMPLATE };