// Power Platform Admin Client - Environment and solution management
// Wraps Power Platform Admin API with full TypeScript support

import {
  ApiClient,
  CreateEnvironmentRequest,
  CreateEnvironmentResponse,
  ListEnvironmentsResponse,
  Environment,
  CreateSolutionRequest,
  CreateSolutionResponse,
  AddSolutionComponentRequest
} from '../../types/api-contracts';
import { 
  EnvironmentInfo,
  EnvironmentType,
  EnvironmentStatus
} from '../../types/data-models';
import { createPowerPlatformAdminApiClient } from '../../api/client';

// ============================================================================
// Power Platform Admin Response Types
// ============================================================================

export type PowerPlatformResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface EnvironmentCreationResult {
  readonly environment: Environment;
  readonly instanceUrl?: string;
  readonly uniqueName?: string;
}

export interface SolutionDeploymentResult {
  readonly solutionId: string;
  readonly uniqueName: string;
  readonly version: string;
  readonly componentCount: number;
}

export interface PublisherCreationResult {
  readonly publisherId: string;
  readonly uniqueName: string;
  readonly customizationPrefix: string;
}

// ============================================================================
// Power Platform Admin Client Configuration
// ============================================================================

export interface AdminClientConfig {
  readonly accessToken: string;
  readonly defaultRegion?: string;
  readonly defaultCurrency?: string;
  readonly defaultLanguage?: string;
  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
}

// ============================================================================
// Power Platform Admin Client
// ============================================================================

export class PowerPlatformAdminClient {
  private readonly client: ApiClient;
  private readonly config: AdminClientConfig;

  constructor(config: AdminClientConfig) {
    this.config = config;
    this.client = createPowerPlatformAdminApiClient(config.accessToken);
    
    console.log('Power Platform Admin Client initialized', {
      defaultRegion: config.defaultRegion,
      defaultCurrency: config.defaultCurrency,
      defaultLanguage: config.defaultLanguage
    });
  }

  // ============================================================================
  // Environment Management
  // ============================================================================

  async listEnvironments(): Promise<PowerPlatformResponse<Environment[]>> {
    try {
      console.log('Listing Power Platform environments...');
      
      const response = await this.client.get<ListEnvironmentsResponse>('/environments');
      
      if (response.status !== 200) {
        return { 
          success: false, 
          error: `Failed to list environments: ${response.statusText}` 
        };
      }

      console.log(`✅ Found ${response.data.value.length} environments`);
      return { success: true, data: [...response.data.value] };
    } catch (error) {
      console.error('❌ Failed to list environments:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async getEnvironment(environmentName: string): Promise<PowerPlatformResponse<Environment>> {
    try {
      console.log(`Getting environment: ${environmentName}`);
      
      const response = await this.client.get<Environment>(`/environments/${environmentName}`);
      
      if (response.status !== 200) {
        return { 
          success: false, 
          error: `Environment ${environmentName} not found` 
        };
      }

      console.log(`✅ Retrieved environment: ${response.data.displayName}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Failed to get environment ${environmentName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async createEnvironment(
    displayName: string,
    environmentType: EnvironmentType,
    options?: {
      region?: string;
      currency?: string;
      language?: string;
      sku?: 'Trial' | 'Production' | 'Sandbox';
      databaseType?: 'CommonDataService' | 'None';
    }
  ): Promise<PowerPlatformResponse<EnvironmentCreationResult>> {
    try {
      console.log(`Creating ${environmentType} environment: ${displayName}`);
      
      const request: CreateEnvironmentRequest = {
        displayName,
        location: options?.region || this.config.defaultRegion || 'unitedstates',
        environmentSku: options?.sku || this.mapEnvironmentTypeToSku(environmentType),
        databaseType: options?.databaseType || 'CommonDataService',
        ...(options?.currency && { currency: { code: options.currency } }),
        ...(options?.language && { language: { name: options.language } })
      };

      const response = await this.client.post<CreateEnvironmentRequest, CreateEnvironmentResponse>(
        '/environments',
        request
      );

      if (response.status !== 201 && response.status !== 202) {
        return { 
          success: false, 
          error: `Failed to create environment: ${response.statusText}` 
        };
      }

      const result: EnvironmentCreationResult = {
        environment: {
          name: response.data.name,
          id: response.data.id,
          type: response.data.type,
          location: response.data.location,
          displayName: response.data.displayName,
          properties: {
            displayName: response.data.properties.displayName,
            environmentSku: response.data.properties.environmentSku,
            provisioningState: response.data.properties.provisioningState,
            linkedEnvironmentMetadata: response.data.properties.linkedEnvironmentMetadata
          }
        },
        instanceUrl: response.data.properties.linkedEnvironmentMetadata?.instanceUrl,
        uniqueName: response.data.properties.linkedEnvironmentMetadata?.uniqueName
      };

      console.log(`✅ Created environment: ${result.environment.displayName}`);
      return { success: true, data: result };
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
      
      const response = await this.client.delete(`/environments/${environmentName}`);
      
      if (response.status !== 200 && response.status !== 202) {
        return { 
          success: false, 
          error: `Failed to delete environment: ${response.statusText}` 
        };
      }

      console.log(`✅ Deleted environment: ${environmentName}`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error(`❌ Failed to delete environment ${environmentName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async waitForEnvironmentProvisioning(
    environmentName: string,
    timeoutMs: number = 600000 // 10 minutes
  ): Promise<PowerPlatformResponse<Environment>> {
    console.log(`Waiting for environment provisioning: ${environmentName}`);
    
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    while (Date.now() - startTime < timeoutMs) {
      const envResult = await this.getEnvironment(environmentName);
      
      if (!envResult.success) {
        return envResult;
      }

      const provisioningState = envResult.data.properties.provisioningState;
      console.log(`Environment ${environmentName} provisioning state: ${provisioningState}`);

      if (provisioningState === 'Succeeded') {
        console.log(`✅ Environment ${environmentName} provisioned successfully`);
        return envResult;
      }

      if (provisioningState === 'Failed') {
        return { 
          success: false, 
          error: `Environment ${environmentName} provisioning failed` 
        };
      }

      // Wait before next poll
      await this.delay(pollInterval);
    }

    return { 
      success: false, 
      error: `Timeout waiting for environment ${environmentName} provisioning` 
    };
  }

  // ============================================================================
  // Solution Management
  // ============================================================================

  async createSolution(
    environmentUrl: string,
    solutionName: string,
    friendlyName: string,
    publisherId: string,
    options?: {
      description?: string;
      version?: string;
    }
  ): Promise<PowerPlatformResponse<SolutionDeploymentResult>> {
    try {
      console.log(`Creating solution: ${solutionName} in ${environmentUrl}`);
      
      const request: CreateSolutionRequest = {
        uniquename: solutionName,
        friendlyname: friendlyName,
        version: options?.version || '1.0.0.0',
        publisherid: publisherId,
        ...(options?.description && { description: options.description })
      };

      // Use Dataverse API directly for solution creation
      const dataverseClient = this.createDataverseClient(environmentUrl);
      const response = await dataverseClient.post<CreateSolutionRequest, CreateSolutionResponse>(
        '/solutions',
        request
      );

      if (response.status !== 201) {
        return { 
          success: false, 
          error: `Failed to create solution: ${response.statusText}` 
        };
      }

      const result: SolutionDeploymentResult = {
        solutionId: response.data.solutionid,
        uniqueName: response.data.uniquename,
        version: response.data.version,
        componentCount: 0
      };

      console.log(`✅ Created solution: ${result.uniqueName}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Failed to create solution ${solutionName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async addSolutionComponent(
    environmentUrl: string,
    solutionUniqueName: string,
    componentType: number,
    componentId: string,
    options?: {
      addRequiredComponents?: boolean;
      includedComponentSettingsValues?: string;
    }
  ): Promise<PowerPlatformResponse<void>> {
    try {
      console.log(`Adding component to solution: ${solutionUniqueName}`);
      
      const request: AddSolutionComponentRequest = {
        ComponentType: componentType,
        ComponentId: componentId,
        SolutionUniqueName: solutionUniqueName,
        AddRequiredComponents: options?.addRequiredComponents ?? true,
        ...(options?.includedComponentSettingsValues && {
          IncludedComponentSettingsValues: options.includedComponentSettingsValues
        })
      };

      const dataverseClient = this.createDataverseClient(environmentUrl);
      const response = await dataverseClient.post<AddSolutionComponentRequest, unknown>(
        '/AddSolutionComponent',
        request
      );

      if (response.status !== 200) {
        return { 
          success: false, 
          error: `Failed to add solution component: ${response.statusText}` 
        };
      }

      console.log(`✅ Added component to solution: ${solutionUniqueName}`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error(`❌ Failed to add solution component:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // ============================================================================
  // Publisher Management
  // ============================================================================

  async createPublisher(
    environmentUrl: string,
    uniqueName: string,
    friendlyName: string,
    customizationPrefix: string,
    options?: {
      description?: string;
      customizationOptionValuePrefix?: number;
    }
  ): Promise<PowerPlatformResponse<PublisherCreationResult>> {
    try {
      console.log(`Creating publisher: ${uniqueName} in ${environmentUrl}`);
      
      const publisherData = {
        uniquename: uniqueName,
        friendlyname: friendlyName,
        description: options?.description,
        customizationprefix: customizationPrefix,
        customizationoptionvalueprefix: options?.customizationOptionValuePrefix || 10000
      };

      const dataverseClient = this.createDataverseClient(environmentUrl);
      const response = await dataverseClient.post<typeof publisherData, any>(
        '/publishers',
        publisherData
      );

      if (response.status !== 201) {
        return { 
          success: false, 
          error: `Failed to create publisher: ${response.statusText}` 
        };
      }

      const result: PublisherCreationResult = {
        publisherId: response.data.publisherid,
        uniqueName: response.data.uniquename,
        customizationPrefix: response.data.customizationprefix
      };

      console.log(`✅ Created publisher: ${result.uniqueName}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Failed to create publisher ${uniqueName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapEnvironmentTypeToSku(environmentType: EnvironmentType): 'Trial' | 'Production' | 'Sandbox' {
    switch (environmentType) {
      case 'development':
        return 'Sandbox';
      case 'test':
        return 'Sandbox';
      case 'staging':
        return 'Production';
      case 'production':
        return 'Production';
      default:
        return 'Sandbox';
    }
  }

  private createDataverseClient(environmentUrl: string): ApiClient {
    // Create a Dataverse client for the specific environment
    // For now, using admin client - in production this should use environment-specific endpoint
    console.log(`Creating Dataverse client for environment: ${environmentUrl}`);
    return createPowerPlatformAdminApiClient(this.config.accessToken);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Environment Information Helpers
  // ============================================================================

  convertToEnvironmentInfo(environment: Environment): EnvironmentInfo {
    return {
      environmentId: environment.id,
      environmentName: environment.name,
      environmentUrl: environment.properties.linkedEnvironmentMetadata?.instanceUrl || '',
      environmentType: this.mapSkuToEnvironmentType(environment.properties.environmentSku),
      region: environment.location,
      status: this.mapProvisioningStateToStatus(environment.properties.provisioningState)
    };
  }

  private mapSkuToEnvironmentType(sku: string): EnvironmentType {
    switch (sku.toLowerCase()) {
      case 'trial':
      case 'sandbox':
        return 'development';
      case 'production':
        return 'production';
      default:
        return 'development';
    }
  }

  private mapProvisioningStateToStatus(state: string): EnvironmentStatus {
    switch (state.toLowerCase()) {
      case 'succeeded':
        return 'active';
      case 'creating':
      case 'provisioning':
        return 'creating';
      case 'failed':
        return 'failed';
      case 'suspended':
        return 'suspended';
      default:
        return 'creating';
    }
  }

  // ============================================================================
  // Connection Status
  // ============================================================================

  getConnectionStatus(): boolean {
    return !!this.config.accessToken;
  }
}

export default PowerPlatformAdminClient;