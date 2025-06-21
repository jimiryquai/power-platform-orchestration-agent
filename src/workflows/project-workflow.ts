// Project Workflow - Defines workflow steps and execution patterns
// Provides structured workflow definitions for different project types

// Workflow types and interfaces

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: WorkflowStepType;
  readonly phase: WorkflowPhase;
  readonly dependencies: readonly string[];
  readonly parallel: boolean;
  readonly required: boolean;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly configuration: Record<string, unknown>;
}

export type WorkflowStepType = 
  | 'app_registration'
  | 'azure_project_creation'
  | 'work_item_creation'
  | 'repository_setup'
  | 'pipeline_creation'
  | 'environment_creation'
  | 'publisher_creation'
  | 'solution_creation'
  | 'component_deployment'
  | 'permission_assignment'
  | 'validation'
  | 'notification';

export type WorkflowPhase = 
  | 'initialization'
  | 'authentication'
  | 'azure_devops'
  | 'power_platform'
  | 'integration'
  | 'validation'
  | 'completion';

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly templateType: string;
  readonly phases: readonly WorkflowPhase[];
  readonly steps: readonly WorkflowStep[];
  readonly parallelGroups: readonly ParallelGroup[];
  readonly rollbackSteps: readonly RollbackStep[];
}

export interface ParallelGroup {
  readonly groupId: string;
  readonly stepIds: readonly string[];
  readonly maxConcurrency: number;
  readonly failFast: boolean;
}

export interface RollbackStep {
  readonly stepId: string;
  readonly rollbackActions: readonly string[];
  readonly condition: string;
}

// ============================================================================
// Workflow Execution Types
// ============================================================================

export interface WorkflowExecution {
  readonly executionId: string;
  readonly workflowId: string;
  readonly status: WorkflowExecutionStatus;
  readonly currentPhase: WorkflowPhase;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly steps: WorkflowStepExecution[];
  readonly variables: Record<string, unknown>;
  readonly errors: WorkflowError[];
}

export type WorkflowExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolling_back';

export interface WorkflowStepExecution {
  readonly stepId: string;
  readonly status: WorkflowStepStatus;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly attempt: number;
  readonly output?: unknown;
  readonly error?: string;
}

export type WorkflowStepStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying';

export interface WorkflowError {
  readonly stepId: string;
  readonly phase: WorkflowPhase;
  readonly error: string;
  readonly timestamp: Date;
  readonly recoverable: boolean;
}

// ============================================================================
// Standard Workflow Definitions
// ============================================================================

export class ProjectWorkflowDefinitions {
  
  // Standard Project Workflow
  static readonly STANDARD_PROJECT_WORKFLOW: WorkflowDefinition = {
    id: 'standard-project-v1',
    name: 'Standard Project Workflow',
    description: 'Standard workflow for creating Power Platform projects with Azure DevOps integration',
    version: '1.0.0',
    templateType: 'standard-project',
    phases: [
      'initialization',
      'authentication',
      'azure_devops',
      'power_platform',
      'integration',
      'validation',
      'completion'
    ],
    steps: [
      // Initialization Phase
      {
        id: 'init-001',
        name: 'Validate Template',
        description: 'Validate project template and parameters',
        type: 'validation',
        phase: 'initialization',
        dependencies: [],
        parallel: false,
        required: true,
        timeoutMs: 30000,
        retryAttempts: 1,
        configuration: {
          validationType: 'template'
        }
      },
      {
        id: 'init-002',
        name: 'Initialize Workflow Variables',
        description: 'Set up workflow execution variables',
        type: 'validation',
        phase: 'initialization',
        dependencies: ['init-001'],
        parallel: false,
        required: true,
        timeoutMs: 10000,
        retryAttempts: 1,
        configuration: {
          variables: ['projectName', 'templateName', 'region']
        }
      },

      // Authentication Phase
      {
        id: 'auth-001',
        name: 'Create Azure AD Application',
        description: 'Create Azure Active Directory application registration',
        type: 'app_registration',
        phase: 'authentication',
        dependencies: ['init-002'],
        parallel: false,
        required: true,
        timeoutMs: 60000,
        retryAttempts: 3,
        configuration: {
          permissions: ['dynamics', 'power-platform'],
          createSecret: true
        }
      },

      // Azure DevOps Phase
      {
        id: 'ado-001',
        name: 'Create Azure DevOps Project',
        description: 'Create or configure Azure DevOps project',
        type: 'azure_project_creation',
        phase: 'azure_devops',
        dependencies: ['auth-001'],
        parallel: true,
        required: true,
        timeoutMs: 120000,
        retryAttempts: 2,
        configuration: {
          processTemplate: 'Agile',
          visibility: 'private'
        }
      },
      {
        id: 'ado-002',
        name: 'Create Work Items',
        description: 'Create work item hierarchy from template',
        type: 'work_item_creation',
        phase: 'azure_devops',
        dependencies: ['ado-001'],
        parallel: false,
        required: true,
        timeoutMs: 300000,
        retryAttempts: 2,
        configuration: {
          batchSize: 5,
          validateCreation: true
        }
      },
      {
        id: 'ado-003',
        name: 'Setup Repository',
        description: 'Initialize Git repository and branching policies',
        type: 'repository_setup',
        phase: 'azure_devops',
        dependencies: ['ado-001'],
        parallel: true,
        required: false,
        timeoutMs: 180000,
        retryAttempts: 2,
        configuration: {
          initializeWithReadme: true,
          branchPolicies: ['main']
        }
      },
      {
        id: 'ado-004',
        name: 'Create Build Pipelines',
        description: 'Set up CI/CD pipelines',
        type: 'pipeline_creation',
        phase: 'azure_devops',
        dependencies: ['ado-003'],
        parallel: false,
        required: false,
        timeoutMs: 120000,
        retryAttempts: 2,
        configuration: {
          pipelineTemplates: ['ci-power-platform']
        }
      },

      // Power Platform Phase
      {
        id: 'pp-001',
        name: 'Create Environments',
        description: 'Create Power Platform environments',
        type: 'environment_creation',
        phase: 'power_platform',
        dependencies: ['auth-001'],
        parallel: true,
        required: true,
        timeoutMs: 600000,
        retryAttempts: 2,
        configuration: {
          waitForProvisioning: true,
          maxConcurrent: 2
        }
      },
      {
        id: 'pp-002',
        name: 'Create Publisher',
        description: 'Create solution publisher',
        type: 'publisher_creation',
        phase: 'power_platform',
        dependencies: ['pp-001'],
        parallel: false,
        required: true,
        timeoutMs: 60000,
        retryAttempts: 3,
        configuration: {
          prefix: 'auto'
        }
      },
      {
        id: 'pp-003',
        name: 'Create Solutions',
        description: 'Create and configure solutions',
        type: 'solution_creation',
        phase: 'power_platform',
        dependencies: ['pp-002'],
        parallel: false,
        required: true,
        timeoutMs: 180000,
        retryAttempts: 2,
        configuration: {
          addRequiredComponents: true
        }
      },

      // Integration Phase
      {
        id: 'int-001',
        name: 'Configure Service Principal Permissions',
        description: 'Assign permissions to service principal',
        type: 'permission_assignment',
        phase: 'integration',
        dependencies: ['pp-001', 'auth-001'],
        parallel: false,
        required: true,
        timeoutMs: 120000,
        retryAttempts: 3,
        configuration: {
          permissions: ['system-administrator']
        }
      },

      // Validation Phase
      {
        id: 'val-001',
        name: 'Validate Project Setup',
        description: 'Validate complete project configuration',
        type: 'validation',
        phase: 'validation',
        dependencies: ['ado-002', 'pp-003', 'int-001'],
        parallel: false,
        required: true,
        timeoutMs: 120000,
        retryAttempts: 1,
        configuration: {
          checks: ['connectivity', 'permissions', 'components']
        }
      },

      // Completion Phase
      {
        id: 'comp-001',
        name: 'Send Completion Notification',
        description: 'Send project creation completion notification',
        type: 'notification',
        phase: 'completion',
        dependencies: ['val-001'],
        parallel: false,
        required: false,
        timeoutMs: 30000,
        retryAttempts: 2,
        configuration: {
          notificationTypes: ['email', 'teams']
        }
      }
    ],
    parallelGroups: [
      {
        groupId: 'initial-parallel',
        stepIds: ['ado-001', 'pp-001'],
        maxConcurrency: 2,
        failFast: true
      },
      {
        groupId: 'azure-devops-parallel',
        stepIds: ['ado-003', 'ado-002'],
        maxConcurrency: 2,
        failFast: false
      }
    ],
    rollbackSteps: [
      {
        stepId: 'auth-001',
        rollbackActions: ['delete-application'],
        condition: 'on-failure'
      },
      {
        stepId: 'pp-001',
        rollbackActions: ['delete-environments'],
        condition: 'on-failure'
      }
    ]
  };

  // Enterprise Project Workflow
  static readonly ENTERPRISE_PROJECT_WORKFLOW: WorkflowDefinition = {
    id: 'enterprise-project-v1',
    name: 'Enterprise Project Workflow',
    description: 'Enterprise workflow with additional security and compliance steps',
    version: '1.0.0',
    templateType: 'enterprise-project',
    phases: [
      'initialization',
      'authentication',
      'azure_devops',
      'power_platform',
      'integration',
      'validation',
      'completion'
    ],
    steps: [
      // All standard steps plus additional enterprise steps
      ...ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW.steps,
      
      // Additional security steps
      {
        id: 'sec-001',
        name: 'Security Review',
        description: 'Perform security and compliance review',
        type: 'validation',
        phase: 'validation',
        dependencies: ['val-001'],
        parallel: false,
        required: true,
        timeoutMs: 300000,
        retryAttempts: 1,
        configuration: {
          checks: ['security-policies', 'data-classification', 'access-controls']
        }
      },
      {
        id: 'sec-002',
        name: 'Compliance Validation',
        description: 'Validate compliance with enterprise policies',
        type: 'validation',
        phase: 'validation',
        dependencies: ['sec-001'],
        parallel: false,
        required: true,
        timeoutMs: 180000,
        retryAttempts: 1,
        configuration: {
          policies: ['gdpr', 'sox', 'hipaa']
        }
      }
    ],
    parallelGroups: ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW.parallelGroups,
    rollbackSteps: ProjectWorkflowDefinitions.STANDARD_PROJECT_WORKFLOW.rollbackSteps
  };

  // Quick Start Workflow (minimal setup)
  static readonly QUICKSTART_WORKFLOW: WorkflowDefinition = {
    id: 'quickstart-v1',
    name: 'Quick Start Workflow',
    description: 'Minimal workflow for rapid project setup',
    version: '1.0.0',
    templateType: 'quickstart',
    phases: [
      'initialization',
      'authentication',
      'power_platform',
      'completion'
    ],
    steps: [
      {
        id: 'qs-001',
        name: 'Quick Template Validation',
        description: 'Basic template validation',
        type: 'validation',
        phase: 'initialization',
        dependencies: [],
        parallel: false,
        required: true,
        timeoutMs: 15000,
        retryAttempts: 1,
        configuration: {
          validationType: 'basic'
        }
      },
      {
        id: 'qs-002',
        name: 'Create Service Principal',
        description: 'Create basic service principal',
        type: 'app_registration',
        phase: 'authentication',
        dependencies: ['qs-001'],
        parallel: false,
        required: true,
        timeoutMs: 30000,
        retryAttempts: 2,
        configuration: {
          permissions: ['dynamics'],
          createSecret: true
        }
      },
      {
        id: 'qs-003',
        name: 'Create Single Environment',
        description: 'Create development environment',
        type: 'environment_creation',
        phase: 'power_platform',
        dependencies: ['qs-002'],
        parallel: false,
        required: true,
        timeoutMs: 300000,
        retryAttempts: 2,
        configuration: {
          environmentType: 'development',
          waitForProvisioning: false
        }
      }
    ],
    parallelGroups: [],
    rollbackSteps: [
      {
        stepId: 'qs-002',
        rollbackActions: ['delete-application'],
        condition: 'on-failure'
      }
    ]
  };

  // Get workflow by template type
  static getWorkflowForTemplate(templateType: string): WorkflowDefinition | null {
    switch (templateType) {
      case 'standard-project':
        return this.STANDARD_PROJECT_WORKFLOW;
      case 'enterprise-project':
        return this.ENTERPRISE_PROJECT_WORKFLOW;
      case 'quickstart':
        return this.QUICKSTART_WORKFLOW;
      default:
        return null;
    }
  }

  // Get all available workflows
  static getAllWorkflows(): WorkflowDefinition[] {
    return [
      this.STANDARD_PROJECT_WORKFLOW,
      this.ENTERPRISE_PROJECT_WORKFLOW,
      this.QUICKSTART_WORKFLOW
    ];
  }

  // Validate workflow definition
  static validateWorkflow(workflow: WorkflowDefinition): string[] {
    const errors: string[] = [];

    // Check for duplicate step IDs
    const stepIds = workflow.steps.map(s => s.id);
    const duplicateIds = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate step IDs found: ${duplicateIds.join(', ')}`);
    }

    // Validate dependencies
    workflow.steps.forEach(step => {
      step.dependencies.forEach(depId => {
        if (!stepIds.includes(depId)) {
          errors.push(`Step ${step.id} has invalid dependency: ${depId}`);
        }
      });
    });

    // Validate parallel groups
    workflow.parallelGroups.forEach(group => {
      group.stepIds.forEach(stepId => {
        if (!stepIds.includes(stepId)) {
          errors.push(`Parallel group ${group.groupId} references invalid step: ${stepId}`);
        }
      });
    });

    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow.steps)) {
      errors.push('Circular dependencies detected in workflow');
    }

    return errors;
  }

  private static hasCircularDependencies(steps: readonly WorkflowStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true; // Circular dependency found
      }

      if (visited.has(stepId)) {
        return false; // Already processed
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    return steps.some(step => hasCycle(step.id));
  }
}

export default ProjectWorkflowDefinitions;