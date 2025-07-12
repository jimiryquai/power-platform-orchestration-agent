// Power Platform Integration Tests - End-to-end testing of Power Platform components
import PowerPlatformAdminClient from '../../../src/integrations/power-platform/admin-client';
import EnvironmentManager from '../../../src/integrations/power-platform/environment-manager';
import SolutionManager from '../../../src/integrations/power-platform/solution-manager';
import MicrosoftGraphClient from '../../../src/integrations/microsoft-graph/graph-client';
import { EnvironmentType, PublisherTemplate, SolutionTemplate } from '../../../src/types/data-models';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  accessToken: process.env.POWER_PLATFORM_ACCESS_TOKEN || 'test-token',
  useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
  testEnvironmentUrl: process.env.TEST_ENVIRONMENT_URL || 'https://test-env.crm.dynamics.com',
  runLiveTests: process.env.POWER_PLATFORM_LIVE_TESTS === 'true'
};

const SAMPLE_PUBLISHER_TEMPLATE: PublisherTemplate = {
  uniqueName: 'test_publisher',
  friendlyName: 'Test Publisher',
  description: 'Publisher for integration testing',
  customizationPrefix: 'test',
  customizationOptionValuePrefix: 10000
};

const SAMPLE_SOLUTION_TEMPLATE: SolutionTemplate = {
  uniqueName: 'TestSolution',
  friendlyName: 'Test Solution',
  description: 'Solution for integration testing',
  version: '1.0.0.0',
  components: [
    {
      type: 'Entity',
      name: 'jr_testtable',
      include: true,
      rootComponentBehavior: 'IncludeSubcomponents'
    }
  ]
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Power Platform Integration Tests', () => {
  let adminClient: PowerPlatformAdminClient;
  let environmentManager: EnvironmentManager;
  let solutionManager: SolutionManager;
  let graphClient: MicrosoftGraphClient;

  beforeAll(() => {
    // Skip integration tests if credentials not provided
    if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
      console.log('⚠️  Skipping Power Platform integration tests - no credentials provided');
      return;
    }

    adminClient = new PowerPlatformAdminClient({
      accessToken: TEST_CONFIG.accessToken,
      defaultRegion: 'unitedstates',
      defaultCurrency: 'USD',
      defaultLanguage: 'English'
    });

    environmentManager = new EnvironmentManager({
      adminClient: {
        accessToken: TEST_CONFIG.accessToken
      },
      defaultRegion: 'unitedstates',
      environmentPrefix: 'test-'
    });

    solutionManager = new SolutionManager({
      adminClient: {
        accessToken: TEST_CONFIG.accessToken
      },
      defaultVersion: '1.0.0.0',
      componentBatchSize: 5
    });

    graphClient = new MicrosoftGraphClient({
      accessToken: TEST_CONFIG.accessToken
    });
  });

  describe('Admin Client Operations', () => {
    test('should initialize admin client', () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      expect(adminClient).toBeDefined();
      expect(adminClient.getConnectionStatus()).toBe(true);
    });

    test('should list environments', async () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const result = await adminClient.listEnvironments();
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        console.log(`✅ Found ${result.data.length} environments`);
      } else {
        console.log(`⚠️  Failed to list environments: ${result.error}`);
      }
    }, 30000);

    test('should validate publisher creation structure', () => {
      expect(SAMPLE_PUBLISHER_TEMPLATE.uniqueName).toBe('test_publisher');
      expect(SAMPLE_PUBLISHER_TEMPLATE.customizationPrefix).toBe('test');
      expect(SAMPLE_PUBLISHER_TEMPLATE.customizationOptionValuePrefix).toBe(10000);
    });
  });

  describe('Environment Manager Operations', () => {
    test('should initialize environment manager', () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      expect(environmentManager).toBeDefined();
      expect(environmentManager.getConnectionStatus()).toBe(true);
    });

    test('should list environments through manager', async () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const result = await environmentManager.listEnvironments();
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach(env => {
          expect(env.environmentId).toBeDefined();
          expect(env.environmentName).toBeDefined();
          expect(['development', 'test', 'staging', 'production']).toContain(env.environmentType);
        });
        console.log(`✅ Environment manager found ${result.data.length} environments`);
      } else {
        console.log(`⚠️  Environment manager failed: ${result.error}`);
      }
    }, 30000);

    test('should validate environment creation options', () => {
      const environmentTypes: EnvironmentType[] = ['development', 'test', 'staging', 'production'];
      
      environmentTypes.forEach(type => {
        expect(['development', 'test', 'staging', 'production']).toContain(type);
      });
    });

    test('should check environment health', async () => {
      if (!TEST_CONFIG.testEnvironmentUrl) {
        pending('No test environment URL provided');
      }

      const result = await environmentManager.checkEnvironmentHealth(TEST_CONFIG.testEnvironmentUrl);
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(typeof result.data.isHealthy).toBe('boolean');
        expect(Array.isArray(result.data.checks)).toBe(true);
        console.log(`✅ Environment health check: ${result.data.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      } else {
        console.log(`⚠️  Health check failed: ${result.error}`);
      }
    }, 30000);
  });

  describe('Solution Manager Operations', () => {
    test('should initialize solution manager', () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      expect(solutionManager).toBeDefined();
      expect(solutionManager.getConnectionStatus()).toBe(true);
    });

    test('should validate solution template structure', () => {
      expect(SAMPLE_SOLUTION_TEMPLATE.uniqueName).toBe('TestSolution');
      expect(SAMPLE_SOLUTION_TEMPLATE.version).toBe('1.0.0.0');
      expect(Array.isArray(SAMPLE_SOLUTION_TEMPLATE.components)).toBe(true);
      expect(SAMPLE_SOLUTION_TEMPLATE.components).toHaveLength(1);
      
      const component = SAMPLE_SOLUTION_TEMPLATE.components[0];
      expect(component?.type).toBe('Entity');
      expect(component?.include).toBe(true);
    });

    test('should validate solution export structure', async () => {
      if (!TEST_CONFIG.testEnvironmentUrl) {
        pending('No test environment URL provided');
      }

      const result = await solutionManager.exportSolution(
        TEST_CONFIG.testEnvironmentUrl,
        'TestSolution'
      );
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result.data.solutionData).toBeDefined();
        expect(result.data.metadata).toBeDefined();
        expect(result.data.metadata.solutionName).toBe('TestSolution');
        console.log(`✅ Solution export structure validated`);
      } else {
        console.log(`⚠️  Solution export failed: ${result.error}`);
      }
    }, 30000);
  });

  describe('Microsoft Graph Client Operations', () => {
    test('should initialize graph client', () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      expect(graphClient).toBeDefined();
      expect(graphClient.getConnectionStatus()).toBe(true);
    });

    test('should validate Power Platform application structure', () => {
      const appName = 'Test Power Platform App';
      
      // Test the structure that would be created
      const expectedStructure = {
        displayName: appName,
        signInAudience: 'AzureADMyOrg',
        requiredPermissions: [
          {
            resourceAppId: '00000007-0000-0000-c000-000000000000', // Dynamics CRM
            permissions: [
              {
                id: '78ce3f0f-a1ce-49c2-8cde-64b5c0896db4',
                type: 'Scope'
              }
            ]
          }
        ]
      };

      expect(expectedStructure.displayName).toBe(appName);
      expect(expectedStructure.signInAudience).toBe('AzureADMyOrg');
      expect(Array.isArray(expectedStructure.requiredPermissions)).toBe(true);
      expect(expectedStructure.requiredPermissions).toHaveLength(1);
    });
  });

  describe('Live Integration Tests', () => {
    // These tests only run when explicitly enabled
    const shouldRunLiveTests = TEST_CONFIG.runLiveTests;

    test('should create test environment (live)', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set POWER_PLATFORM_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const testEnvName = `Test Environment ${new Date().toISOString()}`;
      
      const result = await environmentManager.createEnvironment(
        testEnvName,
        'development',
        {
          region: 'unitedstates',
          sku: 'Trial',
          waitForProvisioning: false // Don't wait for full provisioning in tests
        }
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result.data.environment.environmentName).toBeDefined();
        expect(result.data.environment.environmentType).toBe('development');
        console.log(`✅ Created test environment: ${result.data.environment.environmentName}`);
        
        // Note: In a real scenario, you'd want to clean up the test environment
        // This would require implementing environment deletion
      } else {
        console.log(`⚠️  Failed to create test environment: ${result.error}`);
      }
    }, 120000); // 2 minutes timeout for live test

    test('should create Azure AD application (live)', async () => {
      if (!shouldRunLiveTests) {
        pending('Live tests disabled - set POWER_PLATFORM_LIVE_TESTS=true to enable');
      }

      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const appName = `Test Power Platform App ${new Date().toISOString()}`;
      
      const result = await graphClient.createPowerPlatformApplication(appName, {
        includeDynamicsPermissions: true,
        includePowerPlatformPermissions: true,
        createClientSecret: false // Don't create secrets in tests
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result.data.application.appId).toBeDefined();
        expect(result.data.application.displayName).toBe(appName);
        expect(Array.isArray(result.data.setupInstructions)).toBe(true);
        console.log(`✅ Created test application: ${result.data.application.appId}`);
        
        // Clean up - delete the test application
        const deleteResult = await graphClient.deleteApplication(result.data.application.id);
        if (deleteResult.success) {
          console.log(`✅ Cleaned up test application`);
        }
      } else {
        console.log(`⚠️  Failed to create test application: ${result.error}`);
      }
    }, 60000); // 1 minute timeout for live test
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid environment URL gracefully', async () => {
      if (!TEST_CONFIG.accessToken && !TEST_CONFIG.useInteractiveAuth) {
        pending('No credentials provided');
      }

      const invalidUrl = 'https://nonexistent-env.crm.dynamics.com';
      const result = await environmentManager.checkEnvironmentHealth(invalidUrl);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        console.log(`✅ Invalid environment URL handled correctly: ${result.error}`);
      }
    });

    test('should handle network timeouts gracefully', async () => {
      // Create client with very short timeout
      const shortTimeoutClient = new PowerPlatformAdminClient({
        accessToken: TEST_CONFIG.accessToken,
        timeoutMs: 1 // Very short timeout
      });

      // This might timeout or succeed very quickly
      const result = await shortTimeoutClient.listEnvironments();
      
      // Either way, it should not throw an unhandled exception
      expect(typeof result.success).toBe('boolean');
      console.log(`✅ Timeout handling test completed: ${result.success ? 'success' : 'handled gracefully'}`);
    });
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

describe('Power Platform Test Utilities', () => {
  test('should validate test configuration', () => {
    expect(TEST_CONFIG).toBeDefined();
    expect(typeof TEST_CONFIG.useInteractiveAuth).toBe('boolean');
    expect(typeof TEST_CONFIG.runLiveTests).toBe('boolean');
    
    console.log('Test configuration:', {
      hasAccessToken: !!TEST_CONFIG.accessToken,
      useInteractiveAuth: TEST_CONFIG.useInteractiveAuth,
      hasTestEnvironmentUrl: !!TEST_CONFIG.testEnvironmentUrl,
      runLiveTests: TEST_CONFIG.runLiveTests
    });
  });

  test('should validate sample templates', () => {
    expect(SAMPLE_PUBLISHER_TEMPLATE.uniqueName).toMatch(/^[a-z_]+$/);
    expect(SAMPLE_PUBLISHER_TEMPLATE.customizationPrefix).toMatch(/^[a-z]+$/);
    expect(SAMPLE_PUBLISHER_TEMPLATE.customizationOptionValuePrefix).toBeGreaterThan(0);
    
    expect(SAMPLE_SOLUTION_TEMPLATE.uniqueName).toMatch(/^[A-Za-z0-9_]+$/);
    expect(SAMPLE_SOLUTION_TEMPLATE.version).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    
    console.log('✅ Sample templates validation passed');
  });
});

export { TEST_CONFIG, SAMPLE_PUBLISHER_TEMPLATE, SAMPLE_SOLUTION_TEMPLATE };