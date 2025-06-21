// Validation Module - Request/response validation and type guards
// Enterprise-grade validation with comprehensive error reporting

import {
  validateCreateEntityRequest,
  validateTokenResponse,
  validateEnvironmentResponse,
  validateCreateWorkItemRequest,
  validateOperationStatus
} from '../types/api-contracts';

import {
  isProjectTemplate,
  isTemplateMetadata,
  isDataverseTable,
  isWorkItem,
  isOrchestrationProject,
  isValidProjectStatus,
  isValidEnvironmentType,
  isValidWorkItemType,
  isValidAttributeType
} from '../types/data-models';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly value?: unknown;
}

// ============================================================================
// API Contract Validators
// ============================================================================

export class ApiContractValidator {
  static validateEntityRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!validateCreateEntityRequest(request)) {
      errors.push({
        field: 'request',
        code: 'INVALID_ENTITY_REQUEST',
        message: 'Request does not match CreateEntityRequest interface',
        value: request
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateTokenResponse(response: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!validateTokenResponse(response)) {
      errors.push({
        field: 'response',
        code: 'INVALID_TOKEN_RESPONSE',
        message: 'Response does not match TokenResponse interface',
        value: response
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateEnvironmentResponse(response: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!validateEnvironmentResponse(response)) {
      errors.push({
        field: 'response',
        code: 'INVALID_ENVIRONMENT_RESPONSE',
        message: 'Response does not match Environment interface',
        value: response
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateWorkItemRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!validateCreateWorkItemRequest(request)) {
      errors.push({
        field: 'request',
        code: 'INVALID_WORK_ITEM_REQUEST',
        message: 'Request does not match CreateWorkItemRequest interface',
        value: request
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateOperationStatus(status: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof status !== 'string' || !validateOperationStatus(status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_OPERATION_STATUS',
        message: 'Status must be one of: started, running, completed, failed',
        value: status
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Data Model Validators
// ============================================================================

export class DataModelValidator {
  static validateProjectTemplate(template: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isProjectTemplate(template)) {
      errors.push({
        field: 'template',
        code: 'INVALID_PROJECT_TEMPLATE',
        message: 'Object does not match ProjectTemplate interface',
        value: template
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDataverseTable(table: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isDataverseTable(table)) {
      errors.push({
        field: 'table',
        code: 'INVALID_DATAVERSE_TABLE',
        message: 'Object does not match DataverseTable interface',
        value: table
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateWorkItem(workItem: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isWorkItem(workItem)) {
      errors.push({
        field: 'workItem',
        code: 'INVALID_WORK_ITEM',
        message: 'Object does not match WorkItem interface',
        value: workItem
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateOrchestrationProject(project: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isOrchestrationProject(project)) {
      errors.push({
        field: 'project',
        code: 'INVALID_ORCHESTRATION_PROJECT',
        message: 'Object does not match OrchestrationProject interface',
        value: project
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateProjectStatus(status: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof status !== 'string' || !isValidProjectStatus(status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_PROJECT_STATUS',
        message: 'Status must be one of: pending, initializing, creating_azure_devops, creating_power_platform, configuring_integrations, completed, failed, cancelled',
        value: status
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateEnvironmentType(type: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof type !== 'string' || !isValidEnvironmentType(type)) {
      errors.push({
        field: 'type',
        code: 'INVALID_ENVIRONMENT_TYPE',
        message: 'Type must be one of: development, test, staging, production',
        value: type
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateWorkItemType(type: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof type !== 'string' || !isValidWorkItemType(type)) {
      errors.push({
        field: 'type',
        code: 'INVALID_WORK_ITEM_TYPE',
        message: 'Type must be one of: Epic, Feature, User Story, Task, Bug, Issue, Test Case',
        value: type
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateAttributeType(type: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof type !== 'string' || !isValidAttributeType(type)) {
      errors.push({
        field: 'type',
        code: 'INVALID_ATTRIBUTE_TYPE',
        message: 'Type must be a valid Dataverse attribute type',
        value: type
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Composite Validators
// ============================================================================

export class CompositeValidator {
  static validateTemplateWithParameters(
    template: unknown,
    parameters: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // First validate the template structure
    const templateResult = DataModelValidator.validateProjectTemplate(template);
    errors.push(...templateResult.errors);

    if (templateResult.isValid && isProjectTemplate(template)) {
      // Validate that all required parameters are provided
      template.parameters.forEach(param => {
        if (param.required && !(param.name in parameters)) {
          errors.push({
            field: `parameters.${param.name}`,
            code: 'MISSING_REQUIRED_PARAMETER',
            message: `Required parameter '${param.name}' is missing`,
            value: undefined
          });
        }

        // Validate parameter values if provided
        if (param.name in parameters) {
          const value = parameters[param.name];
          const paramResult = this.validateParameterValue(param, value);
          errors.push(...paramResult.errors);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateParameterValue(
    parameter: { type: string; allowedValues?: readonly unknown[] },
    value: unknown
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Type validation
    switch (parameter.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: 'value',
            code: 'INVALID_PARAMETER_TYPE',
            message: `Expected string, got ${typeof value}`,
            value
          });
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            field: 'value',
            code: 'INVALID_PARAMETER_TYPE',
            message: `Expected number, got ${typeof value}`,
            value
          });
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: 'value',
            code: 'INVALID_PARAMETER_TYPE',
            message: `Expected boolean, got ${typeof value}`,
            value
          });
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: 'value',
            code: 'INVALID_PARAMETER_TYPE',
            message: `Expected array, got ${typeof value}`,
            value
          });
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            field: 'value',
            code: 'INVALID_PARAMETER_TYPE',
            message: `Expected object, got ${typeof value}`,
            value
          });
        }
        break;
    }

    // Allowed values validation
    if (parameter.allowedValues && parameter.allowedValues.length > 0) {
      if (!parameter.allowedValues.includes(value)) {
        errors.push({
          field: 'value',
          code: 'INVALID_PARAMETER_VALUE',
          message: `Value must be one of: ${parameter.allowedValues.join(', ')}`,
          value
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Exported Validators
// ============================================================================

export {
  validateCreateEntityRequest,
  validateTokenResponse,
  validateEnvironmentResponse,
  validateCreateWorkItemRequest,
  validateOperationStatus,
  isProjectTemplate,
  isTemplateMetadata,
  isDataverseTable,
  isWorkItem,
  isOrchestrationProject,
  isValidProjectStatus,
  isValidEnvironmentType,
  isValidWorkItemType,
  isValidAttributeType
};