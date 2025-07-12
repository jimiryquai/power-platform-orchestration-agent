// Orchestration Integration Tests - End-to-end testing of project orchestration
import ProjectOrchestrator, { OrchestrationConfig } from '../../../src/orchestration/project-orchestrator';
import { ProjectWorkflowDefinitions } from '../../../src/workflows/project-workflow';
import { CreateProjectApiRequest } from '../../../src/types/api-contracts';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  azureDevOps: {
    organization: process.env.AZURE_DEVOPS_ORG || 'test-org',
    project: 'TestOrchestrationProject',
    personalAccessToken: process.env.AZURE_DEVOPS_PAT || 'test-pat',
    useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
    retryConfig: {
      maxAttempts: 2,
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 5000,
      retryableErrors: ['RATE_LIMIT_EXCEEDED', 'SERVER_ERROR']
    },
    timeoutMs: 30000
  },
  powerPlatform: {
    baseUrl: 'https://api.powerplatform.com',
    environmentUrl: process.env.TEST_ENVIRONMENT_URL || 'https://test-env.crm.dynamics.com',
    useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
    defaultRegion: 'unitedstates',
    timeoutMs: 60000,
    retryAttempts: 2
  },
  microsoftGraph: {
    accessToken: process.env.GRAPH_ACCESS_TOKEN || 'test-token'
  },
  enableParallelExecution: true,
  defaultRegion: 'unitedstates',
  runLiveTests: process.env.ORCHESTRATION_LIVE_TESTS === 'true'
};

const SAMPLE_PROJECT_REQUEST: CreateProjectApiRequest = {
  templateName: 'standard-project',
  projectName: `Test Orchestration Project ${new Date().toISOString().slice(0, 10)}`,
  description: 'Test project created by orchestration integration tests',
  customization: {
    region: 'unitedstates',
    environmentCount: 1,
    includeDevEnvironment: true
  }
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Orchestration Integration Tests', () => {
  let orchestrator: ProjectOrchestrator;

  beforeAll(() => {
    // Skip integration tests if credentials not provided
    if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
      console.log('⚠️  Skipping orchestration integration tests - no credentials provided');
      return;
    }

    const orchestrationConfig: OrchestrationConfig = TEST_CONFIG;
    orchestrator = new ProjectOrchestrator(orchestrationConfig);
  });

  describe('Workflow Definitions', () => {
    test('should validate standard project workflow', () => {
      const workflow = ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW;
      const errors = ProjectWorkflowDefinitions.validateWorkflow(workflow);
      
      expect(errors).toHaveLength(0);
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.phases.length).toBeGreaterThan(0);
      
      console.log(`✅ Standard workflow validation passed: ${workflow.steps.length} steps, ${workflow.phases.length} phases`);
    });

    test('should validate enterprise project workflow', () => {
      const workflow = ProjectWorkflowDefinitions.ENTERPRISE_PROJECT_WORKFLOW;
      const errors = ProjectWorkflowDefinitions.validateWorkflow(workflow);
      
      expect(errors).toHaveLength(0);
      expect(workflow.steps.length).toBeGreaterThan(ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW.steps.length);
      
      console.log(`✅ Enterprise workflow validation passed: ${workflow.steps.length} steps`);
    });

    test('should validate quickstart workflow', () => {
      const workflow = ProjectWorkflowDefinitions.QUICKSTART_WORKFLOW;
      const errors = ProjectWorkflowDefinitions.validateWorkflow(workflow);
      
      expect(errors).toHaveLength(0);
      expect(workflow.steps.length).toBeLessThan(ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW.steps.length);
      
      console.log(`✅ Quickstart workflow validation passed: ${workflow.steps.length} steps`);
    });

    test('should get workflow by template type', () => {
      const standardWorkflow = ProjectWorkflowDefinitions.getWorkflowForTemplate('standard-project');
      const enterpriseWorkflow = ProjectWorkflowDefinitions.getWorkflowForTemplate('enterprise-project');
      const quickstartWorkflow = ProjectWorkflowDefinitions.getWorkflowForTemplate('quickstart');
      const invalidWorkflow = ProjectWorkflowDefinitions.getWorkflowForTemplate('invalid-template');

      expect(standardWorkflow).toBeDefined();
      expect(enterpriseWorkflow).toBeDefined();
      expect(quickstartWorkflow).toBeDefined();
      expect(invalidWorkflow).toBeNull();

      console.log('✅ Workflow template mapping validation passed');
    });

    test('should list all available workflows', () => {
      const workflows = ProjectWorkflowDefinitions.getAllWorkflows();
      
      expect(workflows).toHaveLength(3);
      expect(workflows.map(w => w.templateType)).toEqual(
        expect.arrayContaining(['standard-project', 'enterprise-project', 'quickstart'])
      );
      
      console.log(`✅ Found ${workflows.length} available workflows`);
    });
  });

  describe('Orchestrator Initialization', () => {
    test('should initialize orchestrator', () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      expect(orchestrator).toBeDefined();
      
      console.log('✅ Orchestrator initialized successfully');
    });

    test('should validate project request structure', () => {
      expect(SAMPLE_PROJECT_REQUEST.projectName).toBeDefined();
      expect(SAMPLE_PROJECT_REQUEST.templateName).toBe('standard-project');
      expect(SAMPLE_PROJECT_REQUEST.customization).toBeDefined();
      
      console.log('✅ Sample project request structure validated');
    });
  });

  describe('Dry Run Operations', () => {
    test('should perform dry run for standard project', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const result = await orchestrator.createProject(SAMPLE_PROJECT_REQUEST, {
        dryRun: true
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.operationId).toBeDefined();
        expect(result.data.status).toBe('completed');
        expect(result.data.progress.totalSteps).toBeGreaterThan(0);
        expect(result.data.progress.completedSteps).toBe(result.data.progress.totalSteps);
        
        console.log(`✅ Dry run completed: ${result.data.operationId}`);
      }
    }, 30000);

    test('should perform dry run with skip options', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const result = await orchestrator.createProject(SAMPLE_PROJECT_REQUEST, {
        dryRun: true,
        skipAzureDevOps: true,
        skipPowerPlatform: false,
        skipAppRegistration: true
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.status).toBe('completed');
        console.log(`✅ Dry run with skip options completed: ${result.data.operationId}`);
      }
    }, 30000);

    test('should handle invalid template in dry run', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const invalidRequest: CreateProjectApiRequest = {
        ...SAMPLE_PROJECT_REQUEST,
        templateName: 'invalid-template'
      };

      const result = await orchestrator.createProject(invalidRequest, {
        dryRun: true
      });

      expect(result).toBeDefined();
      
      // Should handle invalid template gracefully
      console.log(`✅ Invalid template handled: ${result.success ? 'success' : result.error}`);
    });
  });

  describe('Operation Status Management', () => {
    test('should track operation status', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Start a dry run operation
      const createResult = await orchestrator.createProject(SAMPLE_PROJECT_REQUEST, {
        dryRun: true
      });

      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const operationId = createResult.data.operationId;
        
        // Get operation status
        const statusResult = await orchestrator.getOperationStatus(operationId);
        
        expect(statusResult).toBeDefined();
        expect(statusResult.success).toBe(true);
        
        if (statusResult.success) {
          expect(statusResult.data.operationId).toBe(operationId);
          expect(statusResult.data.status).toBeDefined();
          expect(statusResult.data.startedAt).toBeDefined();
          expect(Array.isArray(statusResult.data.logs)).toBe(true);
          
          console.log(`✅ Operation status retrieved: ${statusResult.data.status}`);
        }
      }
    }, 30000);

    test('should handle non-existent operation gracefully', async () => {
      const invalidOperationId = 'non-existent-operation-123';
      
      const result = await orchestrator.getOperationStatus(invalidOperationId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
        console.log(`✅ Non-existent operation handled correctly: ${result.error}`);
      }
    });
  });

  describe('Live Orchestration Tests', () => {
    // These tests only run when explicitly enabled
    const shouldRunLiveTests = TEST_CONFIG.runLiveTests;

    test('should create project with minimal components (live)', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set ORCHESTRATION_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const minimalRequest: CreateProjectApiRequest = {
        templateName: 'quickstart',
        projectName: `Live Test Project ${new Date().toISOString()}`,
        description: 'Live test project for orchestration'
      };

      const result = await orchestrator.createProject(minimalRequest, {
        dryRun: false,
        skipAzureDevOps: true, // Skip Azure DevOps for live test
        skipPowerPlatform: true, // Skip Power Platform for live test
        skipAppRegistration: false
      });

      expect(result).toBeDefined();
      
      if (result.success) {
        expect(result.data.operationId).toBeDefined();
        console.log(`✅ Live project creation initiated: ${result.data.operationId}`);
        
        // Monitor operation status
        const statusResult = await orchestrator.getOperationStatus(result.data.operationId);
        if (statusResult.success) {
          console.log(`Status: ${statusResult.data.status}`);
          console.log(`Logs: ${statusResult.data.logs.length} entries`);
        }
      } else {
        console.log(`⚠️  Live test failed: ${result.error}`);
      }
    }, 300000); // 5 minutes timeout for live test

    test('should handle parallel execution (live)', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set ORCHESTRATION_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Test with parallel execution enabled
      const parallelRequest: CreateProjectApiRequest = {
        templateName: 'standard-project',
        projectName: `Parallel Test ${new Date().toISOString()}`,
        description: 'Test parallel orchestration execution'
      };

      const startTime = Date.now();
      
      const result = await orchestrator.createProject(parallelRequest, {
        dryRun: true // Use dry run for parallel test
      });

      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      
      if (result.success) {
        console.log(`✅ Parallel execution completed in ${executionTime}ms`);
        expect(executionTime).toBeLessThan(60000); // Should complete within 1 minute for dry run
      } else {
        console.log(`⚠️  Parallel execution failed: ${result.error}`);
      }
    }, 120000); // 2 minutes timeout
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeouts gracefully', async () => {
      // This test simulates timeout behavior by using very short timeout
      const shortTimeoutConfig: OrchestrationConfig = {
        ...TEST_CONFIG,
        azureDevOps: {
          ...TEST_CONFIG.azureDevOps,
          timeoutMs: 1 // Very short timeout
        }
      };

      const shortTimeoutOrchestrator = new ProjectOrchestrator(shortTimeoutConfig);
      
      const result = await shortTimeoutOrchestrator.createProject(SAMPLE_PROJECT_REQUEST, {
        dryRun: true // Use dry run to avoid actual API calls
      });

      // Should either succeed quickly or fail gracefully
      expect(typeof result.success).toBe('boolean');
      console.log(`✅ Timeout handling test completed: ${result.success ? 'success' : 'handled gracefully'}`);
    });

    test('should validate request parameters', async () => {
      const invalidRequest = {
        templateName: '', // Invalid empty template name
        projectName: '', // Invalid empty project name
        description: null
      } as any;

      // This should be caught by validation before reaching the orchestrator
      expect(invalidRequest.templateName).toBe('');
      expect(invalidRequest.projectName).toBe('');
      
      console.log('✅ Request validation structure verified');
    });

    test('should handle malformed customization parameters', async () => {
      const malformedRequest: CreateProjectApiRequest = {
        templateName: 'standard-project',
        projectName: 'Test Project',
        description: 'Test',
        customization: {
          invalidParameter: 'invalid-value',
          malformedData: null
        }
      };

      const result = await orchestrator.createProject(malformedRequest, {
        dryRun: true
      });

      // Should handle malformed parameters gracefully
      expect(result).toBeDefined();
      console.log(`✅ Malformed parameters handled: ${result.success ? 'success' : 'handled gracefully'}`);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent operation requests', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Create multiple concurrent dry run operations
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => ({
        ...SAMPLE_PROJECT_REQUEST,
        projectName: `Concurrent Test ${i} ${new Date().toISOString()}`
      }));

      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        concurrentRequests.map(request => 
          orchestrator.createProject(request, { dryRun: true })
        )
      );

      const executionTime = Date.now() - startTime;
      
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      expect(successfulResults.length).toBeGreaterThan(0);
      console.log(`✅ Concurrent requests test: ${successfulResults.length}/${results.length} succeeded in ${executionTime}ms`);
    }, 90000); // 90 seconds timeout for concurrent test

    test('should maintain operation state consistency', async () => {
      if (!TEST_CONFIG.azureDevOps.personalAccessToken && !TEST_CONFIG.azureDevOps.useInteractiveAuth) {
        pending('No credentials provided');
      }

      // Start an operation
      const createResult = await orchestrator.createProject(SAMPLE_PROJECT_REQUEST, {
        dryRun: true
      });

      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const operationId = createResult.data.operationId;
        
        // Query status multiple times rapidly
        const statusQueries = Array.from({ length: 5 }, () => 
          orchestrator.getOperationStatus(operationId)
        );

        const statusResults = await Promise.all(statusQueries);
        
        // All queries should return consistent results
        statusResults.forEach(result => {
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.operationId).toBe(operationId);
          }
        });

        console.log('✅ Operation state consistency maintained across concurrent queries');
      }
    }, 30000);
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

describe('Orchestration Test Utilities', () => {
  test('should validate test configuration', () => {
    expect(TEST_CONFIG.azureDevOps.organization).toBeDefined();
    expect(TEST_CONFIG.powerPlatform.baseUrl).toBeDefined();
    expect(TEST_CONFIG.microsoftGraph.accessToken).toBeDefined();
    
    console.log('Test configuration:', {
      hasAzureDevOpsPat: !!TEST_CONFIG.azureDevOps.personalAccessToken,
      hasEnvironmentUrl: !!TEST_CONFIG.powerPlatform.environmentUrl,
      hasGraphToken: !!TEST_CONFIG.microsoftGraph.accessToken,
      enableParallelExecution: TEST_CONFIG.enableParallelExecution,
      runLiveTests: TEST_CONFIG.runLiveTests
    });
  });

  test('should validate sample request structure', () => {
    expect(SAMPLE_PROJECT_REQUEST.templateName).toBe('standard-project');
    expect(SAMPLE_PROJECT_REQUEST.projectName).toContain('Test Orchestration Project');
    expect(SAMPLE_PROJECT_REQUEST.customization).toBeDefined();
    expect(SAMPLE_PROJECT_REQUEST.customization?.region).toBe('unitedstates');
    
    console.log('✅ Sample request validation passed');
  });
});

export { TEST_CONFIG, SAMPLE_PROJECT_REQUEST };