/**
 * Jest test setup file
 * Runs before all tests to configure the testing environment
 */

import { config } from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise .env
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Extend Jest matchers with custom Power Platform matchers
expect.extend({
  toBeValidAzureDevOpsProject(received: any) {
    const pass = received?.id && received?.name && received?.url;
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid Azure DevOps project with id, name, and url`,
      pass
    };
  },

  toHaveEnvironmentProvisioned(received: any, environmentType: string) {
    const environment = received?.environments?.find((env: any) => env.type === environmentType);
    const pass = environment && environment.provisioningState === 'Succeeded';
    return {
      message: () => `expected ${environmentType} environment to be provisioned with state 'Succeeded'`,
      pass
    };
  },

  toBeValidPowerPlatformEnvironment(received: any) {
    const pass = received?.id && 
                 received?.displayName && 
                 received?.environmentSku && 
                 received?.provisioningState;
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid Power Platform environment`,
      pass
    };
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAzureDevOpsProject(): R;
      toHaveEnvironmentProvisioned(environmentType: string): R;
      toBeValidPowerPlatformEnvironment(): R;
    }
  }
}

// Global test configuration
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.AZURE_DEVOPS_ORG = process.env.AZURE_DEVOPS_ORG || 'test-org';
process.env.AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT || 'test-pat';

export {};