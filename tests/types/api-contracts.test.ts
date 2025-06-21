// API Contracts Tests - Validate type definitions and type guards
import {
  validateCreateEntityRequest,
  validateTokenResponse,
  validateEnvironmentResponse,
  validateCreateWorkItemRequest,
  validateOperationStatus,
  CreateEntityRequest,
  TokenResponse,
  Environment,
  CreateWorkItemRequest
} from '../../src/types/api-contracts';

describe('API Contract Type Guards', () => {
  describe('validateCreateEntityRequest', () => {
    test('should validate correct CreateEntityRequest', () => {
      const validRequest: CreateEntityRequest = {
        entityLogicalName: 'jr_testtable',
        data: {
          jr_name: 'Test Record'
        }
      };

      expect(validateCreateEntityRequest(validRequest)).toBe(true);
    });

    test('should reject invalid CreateEntityRequest', () => {
      const invalidRequest = {
        entityLogicalName: 123, // Should be string
        data: 'invalid'         // Should be object
      };

      expect(validateCreateEntityRequest(invalidRequest)).toBe(false);
    });

    test('should reject null/undefined', () => {
      expect(validateCreateEntityRequest(null)).toBe(false);
      expect(validateCreateEntityRequest(undefined)).toBe(false);
    });
  });

  describe('validateTokenResponse', () => {
    test('should validate correct TokenResponse', () => {
      const validResponse: TokenResponse = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiI...',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'https://service.dynamics.com/.default',
        resource: 'https://service.dynamics.com'
      };

      expect(validateTokenResponse(validResponse)).toBe(true);
    });

    test('should reject invalid token type', () => {
      const invalidResponse = {
        access_token: 'valid_token',
        token_type: 'Basic', // Should be 'Bearer'
        expires_in: 3600,
        scope: 'scope',
        resource: 'resource'
      };

      expect(validateTokenResponse(invalidResponse)).toBe(false);
    });

    test('should reject missing required fields', () => {
      const incompleteResponse = {
        access_token: 'valid_token'
        // Missing required fields
      };

      expect(validateTokenResponse(incompleteResponse)).toBe(false);
    });
  });

  describe('validateEnvironmentResponse', () => {
    test('should validate correct Environment', () => {
      const validEnvironment: Environment = {
        name: 'dev-env-001',
        id: '/providers/Microsoft.PowerPlatform/environments/dev-env-001',
        type: 'Microsoft.PowerPlatform/environments',
        location: 'unitedstates',
        displayName: 'Development Environment',
        properties: {
          displayName: 'Development Environment',
          environmentSku: 'Production',
          provisioningState: 'Succeeded',
          linkedEnvironmentMetadata: {
            instanceUrl: 'https://dev-env.crm.dynamics.com',
            uniqueName: 'dev-env'
          }
        }
      };

      expect(validateEnvironmentResponse(validEnvironment)).toBe(true);
    });

    test('should reject invalid Environment', () => {
      const invalidEnvironment = {
        name: 123, // Should be string
        // Missing required fields
      };

      expect(validateEnvironmentResponse(invalidEnvironment)).toBe(false);
    });
  });

  describe('validateCreateWorkItemRequest', () => {
    test('should validate correct CreateWorkItemRequest', () => {
      const validRequest: CreateWorkItemRequest = {
        fields: {
          'System.Title': 'Test Work Item',
          'System.WorkItemType': 'Task',
          'System.Description': 'Test description'
        }
      };

      expect(validateCreateWorkItemRequest(validRequest)).toBe(true);
    });

    test('should reject invalid CreateWorkItemRequest', () => {
      const invalidRequest = {
        fields: 'invalid' // Should be object
      };

      expect(validateCreateWorkItemRequest(invalidRequest)).toBe(false);
    });
  });

  describe('validateOperationStatus', () => {
    test('should validate correct operation statuses', () => {
      expect(validateOperationStatus('started')).toBe(true);
      expect(validateOperationStatus('running')).toBe(true);
      expect(validateOperationStatus('completed')).toBe(true);
      expect(validateOperationStatus('failed')).toBe(true);
    });

    test('should reject invalid operation statuses', () => {
      expect(validateOperationStatus('invalid')).toBe(false);
      expect(validateOperationStatus('')).toBe(false);
      expect(validateOperationStatus(123)).toBe(false);
    });
  });
});

describe('API Contract Interface Compliance', () => {
  test('CreateEntityRequest interface should have correct structure', () => {
    const request: CreateEntityRequest = {
      entityLogicalName: 'jr_testtable',
      data: {
        jr_name: 'Test',
        jr_number: 42,
        jr_enabled: true
      },
      headers: {
        'Prefer': 'return=representation',
        'MSCRM.SuppressDuplicateDetection': 'false'
      }
    };

    expect(typeof request.entityLogicalName).toBe('string');
    expect(typeof request.data).toBe('object');
    expect(request.headers).toBeDefined();
  });

  test('TokenResponse interface should have correct structure', () => {
    const response: TokenResponse = {
      access_token: 'token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'scope',
      resource: 'resource'
    };

    expect(response.token_type).toBe('Bearer');
    expect(typeof response.expires_in).toBe('number');
  });

  test('CreateWorkItemRequest interface should have correct structure', () => {
    const request: CreateWorkItemRequest = {
      fields: {
        'System.Title': 'Test',
        'System.WorkItemType': 'Task'
      },
      relations: [
        {
          rel: 'System.LinkTypes.Hierarchy-Forward',
          url: 'https://dev.azure.com/org/project/_apis/wit/workItems/123',
          attributes: {
            isLocked: false
          }
        }
      ]
    };

    expect(typeof request.fields).toBe('object');
    expect(Array.isArray(request.relations)).toBe(true);
  });
});