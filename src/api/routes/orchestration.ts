// Orchestration API Routes - HTTP endpoints for project orchestration
// Provides REST API interface for the orchestration engine

import { Router, Request, Response } from 'express';
import ProjectOrchestrator, { OrchestrationConfig } from '../../orchestration/project-orchestrator';
import { 
  CreateProjectApiRequest,
  ValidateTemplateRequest,
  ListTemplatesResponse
} from '../../types/api-contracts';
import { 
  ValidationResult
} from '../../validation';

// ============================================================================
// Router Configuration
// ============================================================================

export interface OrchestrationRouterConfig {
  readonly orchestrationConfig: OrchestrationConfig;
  readonly enableValidation?: boolean;
  readonly enableCors?: boolean;
  readonly rateLimit?: {
    readonly windowMs: number;
    readonly max: number;
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

interface ApiRequest<T = unknown> extends Request {
  body: T;
}

interface ApiResponse extends Response {
  json(body: any): this;
}

interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: string;
  readonly requestId: string;
}

// ============================================================================
// Orchestration Router
// ============================================================================

export function createOrchestrationRouter(config: OrchestrationRouterConfig): Router {
  const router = Router();
  const orchestrator = new ProjectOrchestrator(config.orchestrationConfig);

  // Add CORS middleware if enabled
  if (config.enableCors) {
    router.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      next();
    });
  }

  // Add request logging middleware
  router.use((req, _res, next) => {
    const requestId = generateRequestId();
    req.headers['x-request-id'] = requestId;
    console.log(`[${requestId}] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // ============================================================================
  // Template Management Endpoints
  // ============================================================================

  // GET /api/orchestration/templates
  router.get('/templates', async (_req: Request, res: ApiResponse) => {
    try {
      console.log('Listing available project templates');
      
      // In a real implementation, this would query a template repository
      const templates: ListTemplatesResponse = {
        templates: [
          {
            name: 'standard-project',
            displayName: 'Standard Project',
            description: 'Standard Power Platform project with Azure DevOps integration',
            version: '1.0.0',
            tags: ['standard', 'azure-devops', 'power-platform'],
            parameters: [
              {
                name: 'projectName',
                displayName: 'Project Name',
                description: 'Name of the project to create',
                type: 'string',
                required: true
              },
              {
                name: 'region',
                displayName: 'Azure Region',
                description: 'Azure region for resource deployment',
                type: 'choice',
                required: false,
                defaultValue: 'unitedstates',
                allowedValues: ['unitedstates', 'europe', 'asia']
              }
            ]
          },
          {
            name: 'enterprise-project',
            displayName: 'Enterprise Project',
            description: 'Enterprise-grade project template with advanced features',
            version: '2.0.0',
            tags: ['enterprise', 'advanced', 'multi-environment'],
            parameters: [
              {
                name: 'projectName',
                displayName: 'Project Name',
                description: 'Name of the enterprise project',
                type: 'string',
                required: true
              },
              {
                name: 'environmentCount',
                displayName: 'Environment Count',
                description: 'Number of environments to create',
                type: 'number',
                required: false,
                defaultValue: 3
              }
            ]
          }
        ]
      };

      res.status(200).json(templates);
    } catch (error) {
      console.error('Failed to list templates:', error);
      handleError(res, error, 'TEMPLATE_LIST_ERROR', 'Failed to list templates');
    }
  });

  // GET /api/orchestration/templates/:templateName
  router.get('/templates/:templateName', async (req: Request, res: ApiResponse) => {
    try {
      const { templateName } = req.params;
      console.log(`Getting template details: ${templateName}`);
      
      // In a real implementation, this would load template details from repository
      if (templateName === 'standard-project' || templateName === 'enterprise-project') {
        const template = {
          name: templateName,
          displayName: templateName === 'standard-project' ? 'Standard Project' : 'Enterprise Project',
          description: 'Template description would be loaded from repository',
          version: '1.0.0',
          schema: {
            // Template schema would be defined here
          }
        };
        
        res.status(200).json(template);
      } else {
        res.status(404).json(createErrorResponse(
          'TEMPLATE_NOT_FOUND',
          `Template '${templateName}' not found`,
          req.headers['x-request-id'] as string
        ));
      }
    } catch (error) {
      console.error(`Failed to get template ${req.params.templateName}:`, error);
      handleError(res, error, 'TEMPLATE_GET_ERROR', 'Failed to get template details');
    }
  });

  // POST /api/orchestration/templates/:templateName/validate
  router.post('/templates/:templateName/validate', async (req: ApiRequest<ValidateTemplateRequest>, res: ApiResponse): Promise<void> => {
    try {
      const { templateName } = req.params;
      console.log(`Validating template parameters: ${templateName}`);

      if (config.enableValidation) {
        const validationResult = validateTemplateValidationRequest(req.body);
        if (!validationResult.isValid) {
          res.status(400).json(createValidationErrorResponse(
            validationResult.errors,
            (req.headers['x-request-id'] as string) || 'unknown'
          ));
          return;
        }
      }

      // Validate template and parameters
      const result = await validateTemplateWithParameters(templateName || '', req.body.parameters || {});
      
      res.status(200).json(result);
    } catch (error) {
      console.error(`Failed to validate template ${req.params.templateName}:`, error);
      handleError(res, error, 'TEMPLATE_VALIDATION_ERROR', 'Failed to validate template');
    }
  });

  // ============================================================================
  // Project Creation Endpoints
  // ============================================================================

  // POST /api/orchestration/projects
  router.post('/projects', async (req: ApiRequest<CreateProjectApiRequest>, res: ApiResponse): Promise<void> => {
    try {
      console.log(`Creating project: ${req.body.projectName}`);

      if (config.enableValidation) {
        const validationResult = validateCreateProjectRequest(req.body);
        if (!validationResult.isValid) {
          res.status(400).json(createValidationErrorResponse(
            validationResult.errors,
            (req.headers['x-request-id'] as string) || 'unknown'
          ));
          return;
        }
      }

      // Extract options from query parameters
      const options = {
        dryRun: req.query.dryRun === 'true',
        skipAzureDevOps: req.query.skipAzureDevOps === 'true',
        skipPowerPlatform: req.query.skipPowerPlatform === 'true',
        skipAppRegistration: req.query.skipAppRegistration === 'true'
      };

      const result = await orchestrator.createProject(req.body, options);

      if (result.success) {
        res.status(202).json(result.data); // 202 Accepted for async operation
      } else {
        res.status(400).json(createErrorResponse(
          'PROJECT_CREATION_ERROR',
          result.error,
          req.headers['x-request-id'] as string
        ));
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      handleError(res, error, 'PROJECT_CREATION_ERROR', 'Failed to create project');
    }
  });

  // GET /api/orchestration/operations/:operationId
  router.get('/operations/:operationId', async (req: Request, res: ApiResponse) => {
    try {
      const { operationId } = req.params;
      console.log(`Getting operation status: ${operationId}`);

      const result = await orchestrator.getOperationStatus(operationId);

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(404).json(createErrorResponse(
          'OPERATION_NOT_FOUND',
          result.error,
          req.headers['x-request-id'] as string
        ));
      }
    } catch (error) {
      console.error(`Failed to get operation status ${req.params.operationId || 'unknown'}:`, error);
      handleError(res, error, 'OPERATION_STATUS_ERROR', 'Failed to get operation status');
    }
  });

  // ============================================================================
  // Health and Status Endpoints
  // ============================================================================

  // GET /api/orchestration/health
  router.get('/health', (_req: Request, res: ApiResponse) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          azureDevOps: 'unknown', // Would check actual connectivity
          powerPlatform: 'unknown',
          microsoftGraph: 'unknown'
        },
        uptime: process.uptime()
      };

      res.status(200).json(health);
    } catch (error) {
      handleError(res, error, 'HEALTH_CHECK_ERROR', 'Health check failed');
    }
  });

  // GET /api/orchestration/status
  router.get('/status', (_req: Request, res: ApiResponse) => {
    try {
      const status = {
        service: 'Power Platform Orchestration Agent',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        features: {
          azureDevOpsIntegration: true,
          powerPlatformIntegration: true,
          microsoftGraphIntegration: true,
          parallelExecution: config.orchestrationConfig.enableParallelExecution,
          validation: config.enableValidation
        }
      };

      res.status(200).json(status);
    } catch (error) {
      handleError(res, error, 'STATUS_ERROR', 'Status check failed');
    }
  });

  return router;
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateCreateProjectRequest(request: unknown): ValidationResult {
  const errors: any[] = [];

  if (!request || typeof request !== 'object') {
    errors.push({ field: 'request', code: 'INVALID_REQUEST', message: 'Request body is required' });
    return { isValid: false, errors };
  }

  const req = request as any;

  if (!req.projectName || typeof req.projectName !== 'string') {
    errors.push({ field: 'projectName', code: 'REQUIRED_FIELD', message: 'Project name is required' });
  }

  if (!req.templateName || typeof req.templateName !== 'string') {
    errors.push({ field: 'templateName', code: 'REQUIRED_FIELD', message: 'Template name is required' });
  }

  if (req.customization && typeof req.customization !== 'object') {
    errors.push({ field: 'customization', code: 'INVALID_TYPE', message: 'Customization must be an object' });
  }

  return { isValid: errors.length === 0, errors };
}

function validateTemplateValidationRequest(request: unknown): ValidationResult {
  const errors: any[] = [];

  if (!request || typeof request !== 'object') {
    errors.push({ field: 'request', code: 'INVALID_REQUEST', message: 'Request body is required' });
    return { isValid: false, errors };
  }

  const req = request as any;

  if (!req.templateName || typeof req.templateName !== 'string') {
    errors.push({ field: 'templateName', code: 'REQUIRED_FIELD', message: 'Template name is required' });
  }

  if (!req.parameters || typeof req.parameters !== 'object') {
    errors.push({ field: 'parameters', code: 'REQUIRED_FIELD', message: 'Parameters object is required' });
  }

  return { isValid: errors.length === 0, errors };
}

async function validateTemplateWithParameters(
  templateName: string,
  parameters: Record<string, unknown>
): Promise<any> {
  // In a real implementation, this would load the template and validate parameters
  const mockValidation = {
    valid: true,
    errors: [] as any[]
  };

  // Basic validation for known templates
  if (templateName === 'standard-project' || templateName === 'enterprise-project') {
    if (!parameters.projectName) {
      mockValidation.valid = false;
      mockValidation.errors.push({
        parameter: 'projectName',
        message: 'Project name is required',
        code: 'REQUIRED_PARAMETER'
      });
    }
  }

  return mockValidation;
}

// ============================================================================
// Error Handling
// ============================================================================

function handleError(
  res: ApiResponse,
  error: unknown,
  code: string,
  defaultMessage: string
): void {
  const statusCode = getErrorStatusCode(error);
  const message = error instanceof Error ? error.message : defaultMessage;
  
  const errorResponse = createErrorResponse(
    code,
    message,
    res.getHeader('x-request-id') as string || 'unknown'
  );

  res.status(statusCode).json(errorResponse);
}

function getErrorStatusCode(error: unknown): number {
  if (error instanceof Error) {
    // Map specific error types to status codes
    if (error.message.includes('not found')) return 404;
    if (error.message.includes('unauthorized')) return 401;
    if (error.message.includes('forbidden')) return 403;
    if (error.message.includes('validation')) return 400;
    if (error.message.includes('timeout')) return 408;
  }
  
  return 500; // Internal Server Error
}

function createErrorResponse(
  code: string,
  message: string,
  requestId: string
): ErrorResponse {
  return {
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString(),
    requestId
  };
}

function createValidationErrorResponse(
  validationErrors: readonly any[],
  requestId: string
): ErrorResponse {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: validationErrors
    },
    timestamp: new Date().toISOString(),
    requestId
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default createOrchestrationRouter;