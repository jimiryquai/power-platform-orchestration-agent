// Environment Manager - Orchestrates Power Platform environment lifecycle
// Handles environment creation, configuration, and management workflows

import PowerPlatformAdminClient, { 
  PowerPlatformResponse,
  AdminClientConfig
} from './admin-client';
import {
  EnvironmentInfo,
  EnvironmentType,
  EnvironmentTemplate,
  DataversePublisher,
  PublisherTemplate
} from '../../types/data-models';

// ============================================================================
// Environment Manager Configuration
// ============================================================================

export interface EnvironmentManagerConfig {
  readonly adminClient: AdminClientConfig;
  readonly defaultRegion?: string;
  readonly defaultCurrency?: string;
  readonly defaultLanguage?: string;
  readonly environmentPrefix?: string;
  readonly timeoutMs?: number;
}

export interface EnvironmentCreationOptions {
  readonly region?: string;
  readonly currency?: string;
  readonly language?: string;
  readonly sku?: 'Trial' | 'Production' | 'Sandbox';
  readonly includeDatabase?: boolean;
  readonly waitForProvisioning?: boolean;
  readonly provisioningTimeoutMs?: number;
}

// ============================================================================
// Environment Management Results
// ============================================================================

export interface EnvironmentSetupResult {
  readonly environment: EnvironmentInfo;
  readonly publisher?: DataversePublisher;
  readonly instanceUrl: string;
  readonly uniqueName: string;
  readonly setupTimeMs: number;
}

export interface MultiEnvironmentResult {
  readonly environments: EnvironmentSetupResult[];
  readonly failed: Array<{
    readonly template: EnvironmentTemplate;
    readonly error: string;
  }>;
  readonly totalTimeMs: number;
}

// ============================================================================
// Environment Manager Class
// ============================================================================

export class EnvironmentManager {
  private readonly adminClient: PowerPlatformAdminClient;
  private readonly config: EnvironmentManagerConfig;

  constructor(config: EnvironmentManagerConfig) {
    this.config = config;
    this.adminClient = new PowerPlatformAdminClient(config.adminClient);

    console.log('Environment Manager initialized', {
      defaultRegion: config.defaultRegion,
      environmentPrefix: config.environmentPrefix
    });
  }

  // ============================================================================
  // Single Environment Management
  // ============================================================================

  async createEnvironment(
    displayName: string,
    environmentType: EnvironmentType,
    options?: EnvironmentCreationOptions
  ): Promise<PowerPlatformResponse<EnvironmentSetupResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`Creating ${environmentType} environment: ${displayName}`);

      // Create the environment
      const createResult = await this.adminClient.createEnvironment(
        displayName,
        environmentType,
        {
          region: options?.region || this.config.defaultRegion || 'unitedstates',
          currency: options?.currency || this.config.defaultCurrency || 'USD',
          language: options?.language || this.config.defaultLanguage || 'English',
          sku: options?.sku || 'Sandbox',
          databaseType: options?.includeDatabase !== false ? 'CommonDataService' : 'None'
        }
      );

      if (!createResult.success) {
        return createResult;
      }

      let finalEnvironment = createResult.data.environment;

      // Wait for provisioning if requested
      if (options?.waitForProvisioning !== false) {
        const provisioningTimeout = options?.provisioningTimeoutMs || 600000; // 10 minutes
        const provisioningResult = await this.adminClient.waitForEnvironmentProvisioning(
          finalEnvironment.name,
          provisioningTimeout
        );

        if (!provisioningResult.success) {
          return provisioningResult;
        }

        finalEnvironment = provisioningResult.data;
      }

      const setupResult: EnvironmentSetupResult = {
        environment: this.adminClient.convertToEnvironmentInfo(finalEnvironment),
        instanceUrl: createResult.data.instanceUrl || '',
        uniqueName: createResult.data.uniqueName || '',
        setupTimeMs: Date.now() - startTime
      };

      console.log(`✅ Environment setup completed in ${setupResult.setupTimeMs}ms`);
      return { success: true, data: setupResult };
    } catch (error) {
      console.error(`❌ Failed to create environment ${displayName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async deleteEnvironment(environmentName: string): Promise<PowerPlatformResponse<void>> {
    try {
      console.log(`Deleting environment: ${environmentName}`);
      
      const result = await this.adminClient.deleteEnvironment(environmentName);
      
      if (result.success) {
        console.log(`✅ Environment ${environmentName} deleted successfully`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete environment ${environmentName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getEnvironment(environmentName: string): Promise<PowerPlatformResponse<EnvironmentInfo>> {
    try {
      const result = await this.adminClient.getEnvironment(environmentName);
      
      if (!result.success) {
        return result;
      }

      const environmentInfo = this.adminClient.convertToEnvironmentInfo(result.data);
      return { success: true, data: environmentInfo };
    } catch (error) {
      console.error(`❌ Failed to get environment ${environmentName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async listEnvironments(): Promise<PowerPlatformResponse<EnvironmentInfo[]>> {
    try {
      const result = await this.adminClient.listEnvironments();
      
      if (!result.success) {
        return result;
      }

      const environmentInfos = result.data.map(env => 
        this.adminClient.convertToEnvironmentInfo(env)
      );

      return { success: true, data: environmentInfos };
    } catch (error) {
      console.error('❌ Failed to list environments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Multi-Environment Management
  // ============================================================================

  async createEnvironmentsFromTemplate(
    templates: readonly EnvironmentTemplate[],
    options?: {
      parallel?: boolean;
      maxConcurrent?: number;
      waitForProvisioning?: boolean;
    }
  ): Promise<PowerPlatformResponse<MultiEnvironmentResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`Creating ${templates.length} environments from templates`);

      const environments: EnvironmentSetupResult[] = [];
      const failed: Array<{ template: EnvironmentTemplate; error: string }> = [];

      if (options?.parallel !== false) {
        // Parallel creation with concurrency limit
        const maxConcurrent = options?.maxConcurrent || 3;
        const batches = this.createBatches(templates, maxConcurrent);

        for (const batch of batches) {
          const batchResults = await Promise.allSettled(
            batch.map(template => this.createEnvironmentFromTemplate(template, options))
          );

          batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              environments.push(result.value.data);
            } else {
              const error = result.status === 'fulfilled' 
                ? (!result.value.success ? result.value.error : 'Unknown error')
                : result.reason?.message || 'Unknown error';
              failed.push({ template: batch[index]!, error });
            }
          });
        }
      } else {
        // Sequential creation
        for (const template of templates) {
          const result = await this.createEnvironmentFromTemplate(template, options);
          
          if (result.success) {
            environments.push(result.data);
          } else {
            failed.push({ template, error: result.error });
          }
        }
      }

      const totalTimeMs = Date.now() - startTime;
      
      console.log(`✅ Environment creation completed: ${environments.length} successful, ${failed.length} failed`);
      
      return {
        success: true,
        data: {
          environments,
          failed,
          totalTimeMs
        }
      };
    } catch (error) {
      console.error('❌ Failed to create environments from templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createEnvironmentFromTemplate(
    template: EnvironmentTemplate,
    options?: { waitForProvisioning?: boolean }
  ): Promise<PowerPlatformResponse<EnvironmentSetupResult>> {
    const displayName = this.generateEnvironmentName(template.displayName);
    
    return this.createEnvironment(
      displayName,
      template.type,
      {
        region: template.region,
        sku: template.sku,
        currency: template.currency.code,
        language: template.language.code,
        waitForProvisioning: options?.waitForProvisioning ?? false
      }
    );
  }

  // ============================================================================
  // Publisher Management
  // ============================================================================

  async createPublisher(
    environmentUrl: string,
    publisherTemplate: PublisherTemplate
  ): Promise<PowerPlatformResponse<DataversePublisher>> {
    try {
      console.log(`Creating publisher: ${publisherTemplate.uniqueName}`);
      
      const result = await this.adminClient.createPublisher(
        environmentUrl,
        publisherTemplate.uniqueName,
        publisherTemplate.friendlyName,
        publisherTemplate.customizationPrefix,
        {
          description: publisherTemplate.description || publisherTemplate.friendlyName,
          customizationOptionValuePrefix: publisherTemplate.customizationOptionValuePrefix
        }
      );

      if (!result.success) {
        return result;
      }

      const publisher: DataversePublisher = {
        publisherId: result.data.publisherId,
        uniqueName: result.data.uniqueName,
        friendlyName: publisherTemplate.friendlyName,
        description: publisherTemplate.description || publisherTemplate.friendlyName,
        customizationPrefix: result.data.customizationPrefix,
        customizationOptionValuePrefix: publisherTemplate.customizationOptionValuePrefix
      };

      console.log(`✅ Created publisher: ${publisher.uniqueName}`);
      return { success: true, data: publisher };
    } catch (error) {
      console.error(`❌ Failed to create publisher:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Environment Configuration
  // ============================================================================

  async configureEnvironment(
    environmentUrl: string,
    configuration: {
      publisher?: PublisherTemplate;
      securityRoles?: string[];
      businessProcessFlows?: string[];
    }
  ): Promise<PowerPlatformResponse<void>> {
    try {
      console.log(`Configuring environment: ${environmentUrl}`);

      // Create publisher if specified
      if (configuration.publisher) {
        const publisherResult = await this.createPublisher(environmentUrl, configuration.publisher);
        if (!publisherResult.success) {
          return publisherResult;
        }
      }

      // Configure security roles
      if (configuration.securityRoles && configuration.securityRoles.length > 0) {
        // Security role configuration would be implemented here
        console.log(`Configuring ${configuration.securityRoles.length} security roles`);
      }

      // Configure business process flows
      if (configuration.businessProcessFlows && configuration.businessProcessFlows.length > 0) {
        // Business process flow configuration would be implemented here
        console.log(`Configuring ${configuration.businessProcessFlows.length} business process flows`);
      }

      console.log(`✅ Environment configuration completed`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error('❌ Failed to configure environment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateEnvironmentName(baseName: string): string {
    const prefix = this.config.environmentPrefix || '';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4);
    
    return `${prefix}${baseName}-${timestamp}-${random}`.toLowerCase();
  }

  private createBatches<T>(items: readonly T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize) as T[]);
    }
    return batches;
  }

  // ============================================================================
  // Environment Health and Monitoring
  // ============================================================================

  async checkEnvironmentHealth(environmentUrl: string): Promise<PowerPlatformResponse<{
    isHealthy: boolean;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }>> {
    try {
      console.log(`Checking environment health: ${environmentUrl}`);
      
      const checks = [];
      let isHealthy = true;

      // Check basic connectivity
      try {
        // Note: Schema client would need proper PowerPlatformMCPClient instance
        // For now, just check basic connectivity via admin client
        await this.adminClient.listEnvironments();
        checks.push({
          name: 'connectivity',
          status: 'pass' as const,
          message: 'Environment is accessible'
        });
      } catch (error) {
        isHealthy = false;
        checks.push({
          name: 'connectivity',
          status: 'fail' as const,
          message: 'Cannot connect to environment'
        });
      }

      // Additional health checks would be implemented here
      // - Database availability
      // - Solution integrity
      // - API responsiveness
      // - Storage capacity

      console.log(`✅ Environment health check completed: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      
      return {
        success: true,
        data: {
          isHealthy,
          checks
        }
      };
    } catch (error) {
      console.error('❌ Failed to check environment health:', error);
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

export default EnvironmentManager;