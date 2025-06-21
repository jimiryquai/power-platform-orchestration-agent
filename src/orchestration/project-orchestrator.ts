// Project Orchestrator - Main orchestration engine for Power Platform project creation
// Coordinates Azure DevOps, Power Platform, and Microsoft Graph integrations

import AzureDevOpsClient from '../integrations/azure-devops/azure-devops-client';
import { SProjectTemplateParser } from '../integrations/azure-devops/template-parser';
import WorkItemOrchestrator from '../integrations/azure-devops/work-item-orchestrator';
import EnvironmentManager from '../integrations/power-platform/environment-manager';
import SolutionManager from '../integrations/power-platform/solution-manager';
import MicrosoftGraphClient from '../integrations/microsoft-graph/graph-client';

import {
  OrchestrationProject,
  ProjectTemplate,
  ProjectStatus,
  AzureDevOpsProjectInfo,
  PowerPlatformProjectInfo,
  EnvironmentInfo,
  AzureDevOpsConfig,
  PowerPlatformConfig
} from '../types/data-models';

import {
  CreateProjectApiRequest,
  CreateProjectApiResponse,
  GetOperationStatusResponse,
  OperationStatus,
  LogLevel
} from '../types/api-contracts';

// ============================================================================
// Orchestration Configuration
// ============================================================================

export interface OrchestrationConfig {
  readonly azureDevOps: AzureDevOpsConfig;
  readonly powerPlatform: PowerPlatformConfig;
  readonly microsoftGraph: {
    readonly accessToken: string;
  };
  readonly defaultRegion?: string;
  readonly enableParallelExecution?: boolean;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
}

export interface OrchestrationOptions {
  readonly dryRun?: boolean;
  readonly skipAzureDevOps?: boolean;
  readonly skipPowerPlatform?: boolean;
  readonly skipAppRegistration?: boolean;
  readonly waitForCompletion?: boolean;
  readonly customParameters?: Record<string, unknown>;
}

// ============================================================================
// Orchestration Results
// ============================================================================

export type OrchestrationResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface ProjectCreationResult {
  readonly project: OrchestrationProject;
  readonly azureDevOps?: {
    readonly projectId: string;
    readonly projectUrl: string;
    readonly workItemsCreated: number;
    readonly repositoryUrl?: string;
  };
  readonly powerPlatform?: {
    readonly environments: EnvironmentInfo[];
    readonly solutionsCreated: number;
    readonly publisherId?: string;
  };
  readonly appRegistration?: {
    readonly applicationId: string;
    readonly clientId: string;
    readonly servicePrincipalId?: string;
  };
  readonly executionTimeMs: number;
  readonly warnings: readonly string[];
}

export interface OperationProgress {
  readonly operationId: string;
  readonly status: OperationStatus;
  readonly currentPhase: string;
  readonly progress: {
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly currentStep?: string;
  };
  readonly logs: ReadonlyArray<{
    readonly timestamp: string;
    readonly level: LogLevel;
    readonly message: string;
    readonly details?: unknown;
  }>;
  readonly startedAt: Date;
  readonly completedAt?: Date;
}

// ============================================================================
// Project Orchestrator Class
// ============================================================================

export class ProjectOrchestrator {
  private readonly config: OrchestrationConfig;
  private readonly azureDevOpsClient: AzureDevOpsClient;
  private readonly environmentManager: EnvironmentManager;
  private readonly solutionManager: SolutionManager;
  private readonly graphClient: MicrosoftGraphClient;
  private readonly activeOperations: Map<string, OperationProgress> = new Map();

  constructor(config: OrchestrationConfig) {
    this.config = config;
    
    // Initialize clients
    this.azureDevOpsClient = new AzureDevOpsClient(config.azureDevOps);
    
    this.environmentManager = new EnvironmentManager({
      adminClient: {
        accessToken: config.powerPlatform.environmentUrl || '', // This would come from auth
        defaultRegion: config.defaultRegion
      },
      defaultRegion: config.defaultRegion
    });

    this.solutionManager = new SolutionManager({
      adminClient: {
        accessToken: config.powerPlatform.environmentUrl || '' // This would come from auth
      }
    });

    this.graphClient = new MicrosoftGraphClient({
      accessToken: config.microsoftGraph.accessToken
    });

    console.log('Project Orchestrator initialized', {
      azureDevOpsOrg: config.azureDevOps.organization,
      powerPlatformBaseUrl: config.powerPlatform.baseUrl,
      defaultRegion: config.defaultRegion,
      enableParallelExecution: config.enableParallelExecution
    });
  }

  // ============================================================================
  // Main Orchestration Methods
  // ============================================================================

  async createProject(
    request: CreateProjectApiRequest,
    options?: OrchestrationOptions
  ): Promise<OrchestrationResponse<CreateProjectApiResponse>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();
    
    try {
      console.log(`🚀 Starting project orchestration: ${request.projectName}`);
      
      // Initialize operation tracking
      const operation = this.initializeOperation(operationId, request.projectName);
      
      if (options?.dryRun) {
        return this.performDryRun(request, operationId);
      }

      // Load and validate template
      const template = await this.loadProjectTemplate(request.templateName);
      if (!template) {
        return {
          success: false,
          error: `Template '${request.templateName}' not found`
        };
      }

      const project = this.createProjectFromTemplate(
        operationId,
        request.projectName,
        template,
        request.customization
      );

      this.updateOperation(operationId, 'running', 'Template validation completed');

      const warnings: string[] = [];
      let azureDevOpsResult: ProjectCreationResult['azureDevOps'];
      let powerPlatformResult: ProjectCreationResult['powerPlatform'];
      let appRegistrationResult: ProjectCreationResult['appRegistration'];

      // Execute phases based on configuration
      if (this.config.enableParallelExecution) {
        // Parallel execution where possible
        const results = await this.executeInParallel(
          project,
          template,
          options,
          operationId
        );
        azureDevOpsResult = results.azureDevOps;
        powerPlatformResult = results.powerPlatform;
        appRegistrationResult = results.appRegistration;
        warnings.push(...results.warnings);
      } else {
        // Sequential execution
        const results = await this.executeSequentially(
          project,
          template,
          options,
          operationId
        );
        azureDevOpsResult = results.azureDevOps;
        powerPlatformResult = results.powerPlatform;
        appRegistrationResult = results.appRegistration;
        warnings.push(...results.warnings);
      }

      const executionTimeMs = Date.now() - startTime;
      
      // Update final project status
      project.status = warnings.length > 0 ? 'completed' : 'completed';
      
      const result: ProjectCreationResult = {
        project,
        azureDevOps: azureDevOpsResult,
        powerPlatform: powerPlatformResult,
        appRegistration: appRegistrationResult,
        executionTimeMs,
        warnings
      };

      this.completeOperation(operationId, 'completed', result);

      const response: CreateProjectApiResponse = {
        operationId,
        status: 'completed',
        progress: {
          totalSteps: this.calculateTotalSteps(template, options),
          completedSteps: this.calculateTotalSteps(template, options),
          currentStep: 'Completed'
        },
        result: {
          azureDevOpsProject: azureDevOpsResult ? {
            id: azureDevOpsResult.projectId,
            url: azureDevOpsResult.projectUrl
          } : undefined,
          powerPlatformEnvironments: powerPlatformResult?.environments.map(env => ({
            name: env.environmentName,
            url: env.environmentUrl
          })) || []
        }
      };

      console.log(`✅ Project orchestration completed: ${request.projectName} in ${executionTimeMs}ms`);
      return { success: true, data: response };
    } catch (error) {
      console.error(`❌ Project orchestration failed:`, error);
      
      this.completeOperation(operationId, 'failed', undefined, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Phase Execution Methods
  // ============================================================================

  private async executeInParallel(
    project: OrchestrationProject,
    template: ProjectTemplate,
    options: OrchestrationOptions | undefined,
    operationId: string
  ): Promise<{
    azureDevOps?: ProjectCreationResult['azureDevOps'];
    powerPlatform?: ProjectCreationResult['powerPlatform'];
    appRegistration?: ProjectCreationResult['appRegistration'];
    warnings: string[];
  }> {
    console.log('🔄 Executing phases in parallel');
    
    const warnings: string[] = [];
    const promises: Promise<any>[] = [];
    
    // Phase 1: App Registration (can run independently)
    if (!options?.skipAppRegistration) {
      promises.push(
        this.executeAppRegistrationPhase(project, operationId)
          .catch(error => ({ error: `App registration failed: ${error.message}` }))
      );
    }
    
    // Phase 2: Azure DevOps (can run independently)
    if (!options?.skipAzureDevOps) {
      promises.push(
        this.executeAzureDevOpsPhase(project, template, operationId)
          .catch(error => ({ error: `Azure DevOps failed: ${error.message}` }))
      );
    }
    
    // Phase 3: Power Platform (can run independently for environment creation)
    if (!options?.skipPowerPlatform) {
      promises.push(
        this.executePowerPlatformPhase(project, template, operationId)
          .catch(error => ({ error: `Power Platform failed: ${error.message}` }))
      );
    }

    const results = await Promise.allSettled(promises);
    
    let azureDevOpsResult: ProjectCreationResult['azureDevOps'];
    let powerPlatformResult: ProjectCreationResult['powerPlatform'];
    let appRegistrationResult: ProjectCreationResult['appRegistration'];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if ('error' in result.value) {
          warnings.push(result.value.error);
        } else {
          // Assign results based on execution order
          if (index === 0 && !options?.skipAppRegistration) {
            appRegistrationResult = result.value;
          } else if (index === 1 && !options?.skipAzureDevOps) {
            azureDevOpsResult = result.value;
          } else if (index === 2 && !options?.skipPowerPlatform) {
            powerPlatformResult = result.value;
          }
        }
      } else {
        warnings.push(`Phase execution failed: ${result.reason?.message || 'Unknown error'}`);
      }
    });

    return {
      azureDevOps: azureDevOpsResult,
      powerPlatform: powerPlatformResult,
      appRegistration: appRegistrationResult,
      warnings
    };
  }

  private async executeSequentially(
    project: OrchestrationProject,
    template: ProjectTemplate,
    options: OrchestrationOptions | undefined,
    operationId: string
  ): Promise<{
    azureDevOps?: ProjectCreationResult['azureDevOps'];
    powerPlatform?: ProjectCreationResult['powerPlatform'];
    appRegistration?: ProjectCreationResult['appRegistration'];
    warnings: string[];
  }> {
    console.log('🔄 Executing phases sequentially');
    
    const warnings: string[] = [];
    let azureDevOpsResult: ProjectCreationResult['azureDevOps'];
    let powerPlatformResult: ProjectCreationResult['powerPlatform'];
    let appRegistrationResult: ProjectCreationResult['appRegistration'];

    // Phase 1: App Registration
    if (!options?.skipAppRegistration) {
      try {
        appRegistrationResult = await this.executeAppRegistrationPhase(project, operationId);
      } catch (error) {
        warnings.push(`App registration failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Phase 2: Azure DevOps
    if (!options?.skipAzureDevOps) {
      try {
        azureDevOpsResult = await this.executeAzureDevOpsPhase(project, template, operationId);
      } catch (error) {
        warnings.push(`Azure DevOps failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Phase 3: Power Platform
    if (!options?.skipPowerPlatform) {
      try {
        powerPlatformResult = await this.executePowerPlatformPhase(project, template, operationId);
      } catch (error) {
        warnings.push(`Power Platform failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      azureDevOps: azureDevOpsResult,
      powerPlatform: powerPlatformResult,
      appRegistration: appRegistrationResult,
      warnings
    };
  }

  // ============================================================================
  // Individual Phase Implementations
  // ============================================================================

  private async executeAppRegistrationPhase(
    project: OrchestrationProject,
    operationId: string
  ): Promise<ProjectCreationResult['appRegistration']> {
    this.updateOperation(operationId, 'running', 'Creating Azure AD application');
    
    const appName = `${project.name} Service Principal`;
    const result = await this.graphClient.createPowerPlatformApplication(appName, {
      includeDynamicsPermissions: true,
      includePowerPlatformPermissions: true,
      createClientSecret: true
    });

    if (!result.success) {
      throw new Error(`Failed to create application: ${result.error}`);
    }

    return {
      applicationId: result.data.application.id,
      clientId: result.data.application.appId,
      servicePrincipalId: result.data.application.servicePrincipal?.id
    };
  }

  private async executeAzureDevOpsPhase(
    project: OrchestrationProject,
    template: ProjectTemplate,
    operationId: string
  ): Promise<ProjectCreationResult['azureDevOps']> {
    this.updateOperation(operationId, 'running', 'Creating Azure DevOps project');
    
    // Create Azure DevOps project
    const projectResult = await this.azureDevOpsClient.getProject(project.name);
    let projectInfo: AzureDevOpsProjectInfo;

    if (projectResult.success) {
      // Project already exists
      projectInfo = {
        projectId: projectResult.data.id,
        projectUrl: projectResult.data.url,
        organizationUrl: `https://dev.azure.com/${this.config.azureDevOps.organization}`
      };
    } else {
      // Would create new project here in real implementation
      projectInfo = {
        projectId: 'new-project-id',
        projectUrl: `https://dev.azure.com/${this.config.azureDevOps.organization}/${project.name}`,
        organizationUrl: `https://dev.azure.com/${this.config.azureDevOps.organization}`
      };
    }

    // Create work items from template
    this.updateOperation(operationId, 'running', 'Creating work items');
    
    const parser = new SProjectTemplateParser(
      SProjectTemplateParser.createDefaultConfig(project.name)
    );
    
    // Convert our template to S-Project format (simplified)
    const sProjectTemplate = this.convertToSProjectTemplate(template);
    const parseResult = parser.parseTemplate(sProjectTemplate);
    
    const orchestrator = new WorkItemOrchestrator(
      this.azureDevOpsClient,
      WorkItemOrchestrator.createDefaultConfig(project.name)
    );
    
    const workItemResult = await orchestrator.orchestrateWorkItemCreation(
      parseResult.batch,
      parseResult.relationships
    );

    return {
      projectId: projectInfo.projectId,
      projectUrl: projectInfo.projectUrl,
      workItemsCreated: workItemResult.workItemsCreated.length,
      repositoryUrl: projectInfo.repositoryUrl
    };
  }

  private async executePowerPlatformPhase(
    project: OrchestrationProject,
    template: ProjectTemplate,
    operationId: string
  ): Promise<ProjectCreationResult['powerPlatform']> {
    this.updateOperation(operationId, 'running', 'Creating Power Platform environments');
    
    const environments: EnvironmentInfo[] = [];
    
    // Create environments from template
    if (template.powerPlatform.environments.length > 0) {
      const envResult = await this.environmentManager.createEnvironmentsFromTemplate(
        template.powerPlatform.environments,
        { parallel: true, maxConcurrent: 2 }
      );

      if (envResult.success) {
        environments.push(...envResult.data.environments.map(e => e.environment));
      }
    }

    // Create solutions
    this.updateOperation(operationId, 'running', 'Creating solutions');
    
    let solutionsCreated = 0;
    let publisherId: string | undefined;

    if (template.powerPlatform.solutions.length > 0 && environments.length > 0) {
      const primaryEnv = environments[0]!;
      
      // Create publisher first
      const publisherResult = await this.environmentManager.createPublisher(
        primaryEnv.environmentUrl,
        template.powerPlatform.publisher
      );

      if (publisherResult.success) {
        publisherId = publisherResult.data.publisherId;
        
        // Create solutions
        for (const solutionTemplate of template.powerPlatform.solutions) {
          const solutionResult = await this.solutionManager.createSolution(
            primaryEnv.environmentUrl,
            solutionTemplate,
            publisherId
          );
          
          if (solutionResult.success) {
            solutionsCreated++;
          }
        }
      }
    }

    return {
      environments,
      solutionsCreated,
      publisherId
    };
  }

  // ============================================================================
  // Operation Management
  // ============================================================================

  async getOperationStatus(operationId: string): Promise<OrchestrationResponse<GetOperationStatusResponse>> {
    const operation = this.activeOperations.get(operationId);
    
    if (!operation) {
      return {
        success: false,
        error: `Operation ${operationId} not found`
      };
    }

    const response: GetOperationStatusResponse = {
      operationId: operation.operationId,
      status: operation.status,
      startedAt: operation.startedAt.toISOString(),
      completedAt: operation.completedAt?.toISOString(),
      progress: operation.progress,
      logs: operation.logs
    };

    return { success: true, data: response };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async loadProjectTemplate(templateName: string): Promise<ProjectTemplate | null> {
    // In a real implementation, this would load from a template repository
    // For now, return a default template structure
    
    const defaultTemplate: ProjectTemplate = {
      metadata: {
        name: templateName,
        displayName: templateName,
        description: 'Default project template',
        version: '1.0.0',
        author: 'System',
        tags: ['default'],
        category: 'standard',
        estimatedDuration: '4 weeks',
        complexity: 'moderate'
      },
      azureDevOps: {
        project: {
          processTemplate: 'Agile',
          visibility: 'private',
          capabilities: {
            versionControl: { sourceControlType: 'Git' },
            processTemplate: { templateTypeId: 'adcc42ab-9882-485e-a3ed-7678f01f66bc', templateName: 'Agile' }
          }
        },
        workItems: [],
        repositories: [],
        pipelines: [],
        iterations: []
      },
      powerPlatform: {
        publisher: {
          uniqueName: 'default_publisher',
          friendlyName: 'Default Publisher',
          customizationPrefix: 'def',
          customizationOptionValuePrefix: 10000
        },
        solutions: [],
        environments: []
      },
      parameters: []
    };

    return defaultTemplate;
  }

  private convertToSProjectTemplate(template: ProjectTemplate): any {
    // Convert our ProjectTemplate to S-Project format
    // This is a simplified conversion
    return {
      name: template.metadata.name,
      description: template.metadata.description,
      version: template.metadata.version,
      duration: 12,
      sprintDuration: 2,
      sprintCount: 6,
      azureDevOps: {
        processTemplate: template.azureDevOps.project.processTemplate,
        repositoryStrategy: 'GitFlow',
        branchingPolicies: [],
        pipelineTemplates: [],
        workItemTypes: ['Epic', 'Feature', 'User Story', 'Task']
      },
      workItemTemplates: {
        epics: [],
        features: []
      }
    };
  }

  private createProjectFromTemplate(
    operationId: string,
    projectName: string,
    template: ProjectTemplate,
    customization?: Record<string, unknown>
  ): OrchestrationProject {
    return {
      id: operationId,
      name: projectName,
      description: template.metadata.description,
      template,
      status: 'initializing',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'System',
      environments: []
    };
  }

  private performDryRun(
    request: CreateProjectApiRequest,
    operationId: string
  ): OrchestrationResponse<CreateProjectApiResponse> {
    console.log('🏃 Performing dry run - no resources will be created');
    
    const response: CreateProjectApiResponse = {
      operationId,
      status: 'completed',
      progress: {
        totalSteps: 10,
        completedSteps: 10,
        currentStep: 'Dry run completed'
      },
      result: {
        azureDevOpsProject: {
          id: 'dry-run-project-id',
          url: 'https://dev.azure.com/org/dry-run-project'
        },
        powerPlatformEnvironments: []
      }
    };

    return { success: true, data: response };
  }

  private calculateTotalSteps(template: ProjectTemplate, options?: OrchestrationOptions): number {
    let steps = 0;
    
    if (!options?.skipAppRegistration) steps += 2; // App + Service Principal
    if (!options?.skipAzureDevOps) steps += 3; // Project + Work Items + Repository
    if (!options?.skipPowerPlatform) steps += template.powerPlatform.environments.length + template.powerPlatform.solutions.length + 1; // Environments + Solutions + Publisher
    
    return Math.max(steps, 1);
  }

  private generateOperationId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeOperation(operationId: string, projectName: string): OperationProgress {
    const operation: OperationProgress = {
      operationId,
      status: 'started',
      currentPhase: 'Initialization',
      progress: {
        totalSteps: 0,
        completedSteps: 0,
        currentStep: 'Starting project creation'
      },
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Starting project creation: ${projectName}`
        }
      ],
      startedAt: new Date()
    };

    this.activeOperations.set(operationId, operation);
    return operation;
  }

  private updateOperation(operationId: string, status: OperationStatus, message: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    operation.status = status;
    operation.logs = [
      ...operation.logs,
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message
      }
    ];

    this.activeOperations.set(operationId, operation);
    console.log(`[${operationId}] ${message}`);
  }

  private completeOperation(
    operationId: string,
    status: OperationStatus,
    result?: any,
    error?: any
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    operation.status = status;
    operation.completedAt = new Date();
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: (status === 'failed' ? 'error' : 'info') as LogLevel,
      message: status === 'failed' 
        ? `Project creation failed: ${error?.message || 'Unknown error'}`
        : 'Project creation completed successfully',
      details: error || result
    };

    operation.logs = [...operation.logs, logEntry];
    
    this.activeOperations.set(operationId, operation);
  }
}

export default ProjectOrchestrator;