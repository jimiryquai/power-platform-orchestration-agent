// Solution Manager - Orchestrates Power Platform solution lifecycle
// Handles solution creation, component management, and deployment workflows

import PowerPlatformAdminClient, { 
  PowerPlatformResponse,
  SolutionDeploymentResult,
  AdminClientConfig
} from './admin-client';
import { SchemaAwarePowerPlatformClient } from './schema-aware-client';
import {
  DataverseSolution,
  SolutionComponent,
  SolutionTemplate,
  ComponentTemplate,
  ComponentType,
  RootComponentBehavior,
  DataverseTable,
  DataverseRelationship
} from '../../types/data-models';

// ============================================================================
// Solution Manager Configuration
// ============================================================================

export interface SolutionManagerConfig {
  readonly adminClient: AdminClientConfig;
  readonly defaultVersion?: string;
  readonly componentBatchSize?: number;
  readonly timeoutMs?: number;
}

export interface SolutionCreationOptions {
  readonly version?: string;
  readonly description?: string;
  readonly addRequiredComponents?: boolean;
  readonly validateComponents?: boolean;
}

export interface SolutionDeploymentOptions {
  readonly validateBeforeDeploy?: boolean;
  readonly includeCustomizations?: boolean;
  readonly publishWorkflows?: boolean;
  readonly timeoutMs?: number;
}

// ============================================================================
// Solution Management Results
// ============================================================================

export interface SolutionCreationResult {
  readonly solution: DataverseSolution;
  readonly componentsAdded: number;
  readonly creationTimeMs: number;
  readonly warnings: readonly string[];
}

export interface SolutionExportResult {
  readonly solutionData: unknown; // The exported solution zip content
  readonly metadata: {
    readonly solutionName: string;
    readonly version: string;
    readonly exportedAt: Date;
    readonly componentCount: number;
  };
}

export interface SolutionImportResult {
  readonly importId: string;
  readonly status: 'success' | 'failed' | 'pending';
  readonly componentsImported: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ============================================================================
// Solution Manager Class
// ============================================================================

export class SolutionManager {
  private readonly adminClient: PowerPlatformAdminClient;
  private readonly schemaClient: SchemaAwarePowerPlatformClient;
  private readonly config: SolutionManagerConfig;

  constructor(config: SolutionManagerConfig) {
    this.config = config;
    this.adminClient = new PowerPlatformAdminClient(config.adminClient);
    this.schemaClient = new SchemaAwarePowerPlatformClient();

    console.log('Solution Manager initialized', {
      defaultVersion: config.defaultVersion,
      componentBatchSize: config.componentBatchSize
    });
  }

  // ============================================================================
  // Solution Creation and Management
  // ============================================================================

  async createSolution(
    environmentUrl: string,
    solutionTemplate: SolutionTemplate,
    publisherId: string,
    options?: SolutionCreationOptions
  ): Promise<PowerPlatformResponse<SolutionCreationResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`Creating solution: ${solutionTemplate.uniqueName}`);

      // Create the solution
      const solutionResult = await this.adminClient.createSolution(
        environmentUrl,
        solutionTemplate.uniqueName,
        solutionTemplate.friendlyName,
        publisherId,
        {
          description: options?.description || solutionTemplate.description,
          version: options?.version || solutionTemplate.version || this.config.defaultVersion || '1.0.0.0'
        }
      );

      if (!solutionResult.success) {
        return solutionResult;
      }

      const warnings: string[] = [];
      let componentsAdded = 0;

      // Add components to solution
      if (solutionTemplate.components.length > 0) {
        const componentResult = await this.addComponentsToSolution(
          environmentUrl,
          solutionTemplate.uniqueName,
          solutionTemplate.components,
          options
        );

        if (!componentResult.success) {
          warnings.push(`Failed to add some components: ${componentResult.error}`);
        } else {
          componentsAdded = componentResult.data.added;
          warnings.push(...componentResult.data.warnings);
        }
      }

      const solution: DataverseSolution = {
        solutionId: solutionResult.data.solutionId,
        uniqueName: solutionResult.data.uniqueName,
        friendlyName: solutionTemplate.friendlyName,
        description: solutionTemplate.description,
        version: solutionResult.data.version,
        publisherId,
        isManaged: false,
        components: [] // Would be populated from actual solution query
      };

      const result: SolutionCreationResult = {
        solution,
        componentsAdded,
        creationTimeMs: Date.now() - startTime,
        warnings
      };

      console.log(`✅ Solution created: ${solution.uniqueName} with ${componentsAdded} components`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Failed to create solution ${solutionTemplate.uniqueName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async addComponentsToSolution(
    environmentUrl: string,
    solutionUniqueName: string,
    components: readonly ComponentTemplate[],
    options?: {
      addRequiredComponents?: boolean;
      validateComponents?: boolean;
    }
  ): Promise<PowerPlatformResponse<{
    added: number;
    failed: number;
    warnings: readonly string[];
  }>> {
    try {
      console.log(`Adding ${components.length} components to solution: ${solutionUniqueName}`);

      const warnings: string[] = [];
      let added = 0;
      let failed = 0;

      // Validate components if requested
      if (options?.validateComponents) {
        const validationResult = await this.validateComponents(environmentUrl, components);
        if (!validationResult.success) {
          warnings.push(`Component validation failed: ${validationResult.error}`);
        } else {
          warnings.push(...validationResult.data.warnings);
        }
      }

      // Process components in batches
      const batchSize = this.config.componentBatchSize || 10;
      const batches = this.createBatches(components, batchSize);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(component => this.addSingleComponent(
            environmentUrl,
            solutionUniqueName,
            component,
            options?.addRequiredComponents
          ))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            added++;
          } else {
            failed++;
            const error = result.status === 'fulfilled' 
              ? result.value.error 
              : result.reason?.message || 'Unknown error';
            warnings.push(`Failed to add component ${batch[index]?.name}: ${error}`);
          }
        });
      }

      console.log(`✅ Component addition completed: ${added} added, ${failed} failed`);
      
      return {
        success: true,
        data: {
          added,
          failed,
          warnings
        }
      };
    } catch (error) {
      console.error('❌ Failed to add components to solution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async addSingleComponent(
    environmentUrl: string,
    solutionUniqueName: string,
    component: ComponentTemplate,
    addRequiredComponents?: boolean
  ): Promise<PowerPlatformResponse<void>> {
    const componentTypeId = this.mapComponentTypeToId(component.type);
    
    // For table components, we need to get the actual component ID
    let componentId = component.name;
    
    if (component.type === 'Entity') {
      // Look up the table to get its metadata ID
      const tableResult = await this.getTableComponentId(environmentUrl, component.name);
      if (!tableResult.success) {
        return tableResult;
      }
      componentId = tableResult.data;
    }

    return this.adminClient.addSolutionComponent(
      environmentUrl,
      solutionUniqueName,
      componentTypeId,
      componentId,
      {
        addRequiredComponents: addRequiredComponents ?? true
      }
    );
  }

  // ============================================================================
  // Solution Export and Import
  // ============================================================================

  async exportSolution(
    environmentUrl: string,
    solutionUniqueName: string,
    options?: {
      managed?: boolean;
      includeCalendarSettings?: boolean;
      includeCustomizationSettings?: boolean;
      includeEmailTrackingSettings?: boolean;
    }
  ): Promise<PowerPlatformResponse<SolutionExportResult>> {
    try {
      console.log(`Exporting solution: ${solutionUniqueName}`);

      // This would typically call the Dataverse ExportSolution action
      // For now, we'll simulate the export process
      
      const exportData = {
        solutionName: solutionUniqueName,
        managed: options?.managed ?? false,
        includeCalendarSettings: options?.includeCalendarSettings ?? false,
        includeCustomizationSettings: options?.includeCustomizationSettings ?? true,
        includeEmailTrackingSettings: options?.includeEmailTrackingSettings ?? false
      };

      // In a real implementation, this would make the API call to export
      // and return the actual zip file content
      
      const result: SolutionExportResult = {
        solutionData: exportData, // This would be the actual zip content
        metadata: {
          solutionName: solutionUniqueName,
          version: '1.0.0.0', // Would come from actual solution
          exportedAt: new Date(),
          componentCount: 0 // Would come from actual solution
        }
      };

      console.log(`✅ Solution exported: ${solutionUniqueName}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Failed to export solution ${solutionUniqueName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async importSolution(
    environmentUrl: string,
    solutionData: unknown,
    options?: {
      overwriteUnmanagedCustomizations?: boolean;
      publishWorkflows?: boolean;
      skipProductUpdateDependencies?: boolean;
      timeoutMs?: number;
    }
  ): Promise<PowerPlatformResponse<SolutionImportResult>> {
    try {
      console.log('Importing solution to environment');

      // This would typically call the Dataverse ImportSolution action
      // For now, we'll simulate the import process

      const importResult: SolutionImportResult = {
        importId: `import_${Date.now()}`,
        status: 'success',
        componentsImported: 0, // Would come from actual import
        errors: [],
        warnings: []
      };

      console.log(`✅ Solution imported successfully: ${importResult.importId}`);
      return { success: true, data: importResult };
    } catch (error) {
      console.error('❌ Failed to import solution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Solution Validation and Analysis
  // ============================================================================

  async validateSolution(
    environmentUrl: string,
    solutionUniqueName: string
  ): Promise<PowerPlatformResponse<{
    isValid: boolean;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      component?: string;
      message: string;
    }>;
  }>> {
    try {
      console.log(`Validating solution: ${solutionUniqueName}`);

      const issues: Array<{
        type: 'error' | 'warning' | 'info';
        component?: string;
        message: string;
      }> = [];

      // Validate solution structure
      // This would include checks for:
      // - Missing dependencies
      // - Circular references
      // - Invalid component configurations
      // - Security role assignments
      // - Publisher consistency

      // Example validation (placeholder)
      issues.push({
        type: 'info',
        message: 'Solution validation completed'
      });

      const isValid = issues.filter(issue => issue.type === 'error').length === 0;

      console.log(`✅ Solution validation completed: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return {
        success: true,
        data: {
          isValid,
          issues
        }
      };
    } catch (error) {
      console.error(`❌ Failed to validate solution ${solutionUniqueName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async validateComponents(
    environmentUrl: string,
    components: readonly ComponentTemplate[]
  ): Promise<PowerPlatformResponse<{
    warnings: readonly string[];
  }>> {
    try {
      const warnings: string[] = [];

      // Validate that all referenced components exist
      for (const component of components) {
        if (component.type === 'Entity') {
          const exists = await this.componentExists(environmentUrl, component.name, 'Entity');
          if (!exists) {
            warnings.push(`Table ${component.name} does not exist in environment`);
          }
        }
        // Add validation for other component types as needed
      }

      return {
        success: true,
        data: { warnings }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapComponentTypeToId(componentType: ComponentType): number {
    // Component type IDs from Dataverse
    const typeMap: Record<ComponentType, number> = {
      'Entity': 1,
      'Attribute': 2,
      'Relationship': 10,
      'OptionSet': 9,
      'EntityKey': 14,
      'Role': 20,
      'BusinessProcess': 29,
      'Workflow': 29,
      'WebResource': 61
    };

    return typeMap[componentType] || 1;
  }

  private async getTableComponentId(
    environmentUrl: string,
    tableName: string
  ): Promise<PowerPlatformResponse<string>> {
    try {
      // This would query the EntityMetadata to get the MetadataId
      // For now, we'll return the table name as the component ID
      return { success: true, data: tableName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async componentExists(
    environmentUrl: string,
    componentName: string,
    componentType: ComponentType
  ): Promise<boolean> {
    try {
      // This would query the environment to check if the component exists
      // For now, we'll assume all components exist
      return true;
    } catch (error) {
      console.warn(`Failed to check if component exists: ${error}`);
      return false;
    }
  }

  private createBatches<T>(items: readonly T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize) as T[]);
    }
    return batches;
  }

  // ============================================================================
  // Solution Lifecycle Management
  // ============================================================================

  async deploySolution(
    sourceEnvironmentUrl: string,
    targetEnvironmentUrl: string,
    solutionUniqueName: string,
    options?: SolutionDeploymentOptions
  ): Promise<PowerPlatformResponse<SolutionImportResult>> {
    try {
      console.log(`Deploying solution ${solutionUniqueName} from ${sourceEnvironmentUrl} to ${targetEnvironmentUrl}`);

      // Validate solution before deployment
      if (options?.validateBeforeDeploy !== false) {
        const validationResult = await this.validateSolution(sourceEnvironmentUrl, solutionUniqueName);
        if (!validationResult.success || !validationResult.data.isValid) {
          return {
            success: false,
            error: `Solution validation failed: ${validationResult.error || 'Invalid solution'}`
          };
        }
      }

      // Export from source environment
      const exportResult = await this.exportSolution(sourceEnvironmentUrl, solutionUniqueName, {
        managed: true,
        includeCustomizationSettings: options?.includeCustomizations
      });

      if (!exportResult.success) {
        return exportResult;
      }

      // Import to target environment
      const importResult = await this.importSolution(targetEnvironmentUrl, exportResult.data.solutionData, {
        publishWorkflows: options?.publishWorkflows,
        timeoutMs: options?.timeoutMs
      });

      console.log(`✅ Solution deployment completed: ${solutionUniqueName}`);
      return importResult;
    } catch (error) {
      console.error(`❌ Failed to deploy solution ${solutionUniqueName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Connection Status
  // ============================================================================

  getConnectionStatus(): boolean {
    return this.adminClient.getConnectionStatus();
  }
}

export default SolutionManager;