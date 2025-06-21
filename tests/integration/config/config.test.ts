import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration Module Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules before each test
    jest.resetModules();
    // Clear require cache
    jest.clearAllMocks();
    // Create a copy of original env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Environment Configuration', () => {
    it('should load configuration with all required environment variables', () => {
      // Arrange
      process.env.AZURE_DEVOPS_ORG = 'test-org';
      process.env.AZURE_DEVOPS_PAT = 'test-pat-token';
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.NODE_ENV = 'production';

      // Act & Assert - Should not throw
      expect(() => require('../../../src/config').default).not.toThrow();
    });

    it.skip('should throw error when required environment variables are missing in production', () => {
      // TODO: This test is challenging due to module caching and Jest's NODE_ENV handling
      // Will be easier to test after TypeScript migration with proper dependency injection
    });

    it('should not validate required variables in development mode', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_CLIENT_ID;

      // Act & Assert - Should not throw
      expect(() => require('../../../src/config').default).not.toThrow();
    });
  });

  describe('Configuration Structure', () => {
    beforeEach(() => {
      // Set up complete test environment
      process.env.AZURE_DEVOPS_ORG = 'test-org';
      process.env.AZURE_DEVOPS_PAT = 'test-pat-token';
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_SUBSCRIPTION_ID = 'test-subscription-id';
      process.env.PORT = '4000';
      process.env.LOG_LEVEL = 'debug';
    });

    it('should have correct app configuration', () => {
      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.app).toMatchObject({
        name: 'power-platform-orchestration-agent',
        version: '1.0.0',
        environment: 'test',
        port: 4000,
        logLevel: 'debug'
      });
    });

    it('should construct Azure DevOps base URL correctly', () => {
      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.azure.devops.organization).toBe('test-org');
      expect(config.azure.devops.personalAccessToken).toBe('test-pat-token');
      expect(config.azure.devops.baseUrl).toBe('https://dev.azure.com/test-org');
    });

    it('should have Azure authentication configuration', () => {
      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.azure.auth).toMatchObject({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'test-tenant-id',
        subscriptionId: 'test-subscription-id'
      });
    });

    it('should handle optional Power Platform configuration', () => {
      // Arrange
      process.env.POWER_PLATFORM_TENANT_ID = 'pp-tenant-id';
      process.env.POWER_PLATFORM_CLIENT_ID = 'pp-client-id';
      process.env.POWER_PLATFORM_CLIENT_SECRET = 'pp-client-secret';

      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.powerPlatform.auth).toMatchObject({
        tenantId: 'pp-tenant-id',
        clientId: 'pp-client-id',
        clientSecret: 'pp-client-secret'
      });
    });

    it('should have default values for optional configurations', () => {
      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.app.environment).toBe('test');
      expect(config.app.port).toBe(4000);
      expect(config.app.logLevel).toBe('debug');
    });

    it('should configure MCP server settings correctly', () => {
      // Arrange
      process.env.MCP_AZURE_DEVOPS_ENABLED = 'true';
      process.env.MCP_MICROSOFT_GRAPH_ENABLED = 'true';
      process.env.MCP_POWER_PLATFORM_ENABLED = 'false';

      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.mcp.azureDevOps.enabled).toBe(true);
      expect(config.mcp.azureDevOps.serverName).toBe('azure-devops');
      expect(config.mcp.microsoftGraph.enabled).toBe(true);
      expect(config.mcp.powerPlatform.enabled).toBe(false);
    });

    it('should handle template directory configuration', () => {
      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.templates.directory).toContain('templates');
      expect(config.templates.defaultTemplate).toBe('s-project');
    });
  });

  describe('Type Safety and Edge Cases', () => {
    it('should parse numeric environment variables correctly', () => {
      // Arrange
      process.env.PORT = '3001';

      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(typeof config.app.port).toBe('number');
      expect(config.app.port).toBe(3001);
    });

    it('should handle invalid numeric values with defaults', () => {
      // Arrange
      process.env.PORT = 'invalid';

      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.app.port).toBe(3000); // Should fall back to default
    });

    it('should handle boolean environment variables correctly', () => {
      // Arrange
      process.env.MCP_AZURE_DEVOPS_ENABLED = 'true';
      process.env.MCP_MICROSOFT_GRAPH_ENABLED = 'false';
      process.env.MCP_POWER_PLATFORM_ENABLED = 'TRUE'; // Test case insensitivity

      // Act
      const config = require('../../../src/config').default;

      // Assert
      expect(config.mcp.azureDevOps.enabled).toBe(true);
      expect(config.mcp.microsoftGraph.enabled).toBe(false);
      expect(config.mcp.powerPlatform.enabled).toBe(false); // Only lowercase 'true' should be true
    });
  });
});