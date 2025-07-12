// Microsoft Graph Client - Azure AD application registration and management
// Automates app registration for Power Platform service principals

import {
  ApiClient,
  CreateApplicationRequest,
  CreateApplicationResponse,
  CreateServicePrincipalRequest,
  CreateServicePrincipalResponse,
  SignInAudience,
  ResourceAccessType
} from '../../types/api-contracts';
import { createMicrosoftGraphApiClient } from '../../api/client';

// ============================================================================
// Graph Client Configuration
// ============================================================================

export interface GraphClientConfig {
  readonly accessToken: string;
  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
}

export interface AppRegistrationOptions {
  readonly signInAudience?: SignInAudience;
  readonly requiredPermissions?: readonly AppPermission[];
  readonly redirectUris?: readonly string[];
  readonly createServicePrincipal?: boolean;
}

export interface AppPermission {
  readonly resourceAppId: string; // e.g., "00000003-0000-0ff1-ce00-000000000000" for Dynamics
  readonly permissions: ReadonlyArray<{
    readonly id: string; // Permission UUID
    readonly type: ResourceAccessType;
  }>;
}

// ============================================================================
// Graph Response Types
// ============================================================================

export type GraphResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface ApplicationDetails {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly signInAudience: string;
  readonly createdDateTime: string;
  readonly servicePrincipal?: ServicePrincipalDetails;
}

export interface ServicePrincipalDetails {
  readonly id: string;
  readonly appId: string;
  readonly displayName: string;
  readonly servicePrincipalType: string;
}

export interface AppRegistrationResult {
  readonly application: ApplicationDetails;
  readonly clientSecret?: ClientSecretResult;
  readonly setupInstructions: readonly string[];
}

export interface ClientSecretResult {
  readonly secretId: string;
  readonly secretValue: string;
  readonly expiresAt: Date;
  readonly displayName: string;
}

// ============================================================================
// Microsoft Graph Client
// ============================================================================

export class MicrosoftGraphClient {
  private readonly client: ApiClient;
  private readonly config: GraphClientConfig;

  constructor(config: GraphClientConfig) {
    this.config = config;
    this.client = createMicrosoftGraphApiClient(config.accessToken);
    
    console.log('Microsoft Graph Client initialized');
  }

  // ============================================================================
  // Application Registration
  // ============================================================================

  async createApplication(
    displayName: string,
    options?: AppRegistrationOptions
  ): Promise<GraphResponse<ApplicationDetails>> {
    try {
      console.log(`Creating Azure AD application: ${displayName}`);
      
      const request: CreateApplicationRequest = {
        displayName,
        signInAudience: options?.signInAudience || 'AzureADMyOrg',
        ...(options?.requiredPermissions && {
          requiredResourceAccess: options.requiredPermissions.map(perm => ({
            resourceAppId: perm.resourceAppId,
            resourceAccess: perm.permissions
          }))
        })
      };

      const response = await this.client.post<CreateApplicationRequest, CreateApplicationResponse>(
        '/applications',
        request
      );

      if (response.status !== 201) {
        return { 
          success: false, 
          error: `Failed to create application: ${response.statusText}` 
        };
      }

      let servicePrincipal: ServicePrincipalDetails | undefined;

      // Create service principal if requested
      if (options?.createServicePrincipal !== false) {
        const spResult = await this.createServicePrincipal(response.data.appId);
        if (spResult.success) {
          servicePrincipal = spResult.data;
        } else {
          console.warn(`Failed to create service principal: ${spResult.error}`);
        }
      }

      const applicationDetails: ApplicationDetails = {
        id: response.data.id,
        appId: response.data.appId,
        displayName: response.data.displayName,
        signInAudience: response.data.signInAudience,
        createdDateTime: response.data.createdDateTime,
        ...(servicePrincipal && { servicePrincipal })
      };

      console.log(`✅ Created Azure AD application: ${applicationDetails.appId}`);
      return { success: true, data: applicationDetails };
    } catch (error) {
      console.error(`❌ Failed to create application ${displayName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async createServicePrincipal(appId: string): Promise<GraphResponse<ServicePrincipalDetails>> {
    try {
      console.log(`Creating service principal for app: ${appId}`);
      
      const request: CreateServicePrincipalRequest = { appId };

      const response = await this.client.post<CreateServicePrincipalRequest, CreateServicePrincipalResponse>(
        '/servicePrincipals',
        request
      );

      if (response.status !== 201) {
        return { 
          success: false, 
          error: `Failed to create service principal: ${response.statusText}` 
        };
      }

      const servicePrincipal: ServicePrincipalDetails = {
        id: response.data.id,
        appId: response.data.appId,
        displayName: response.data.displayName,
        servicePrincipalType: response.data.servicePrincipalType
      };

      console.log(`✅ Created service principal: ${servicePrincipal.id}`);
      return { success: true, data: servicePrincipal };
    } catch (error) {
      console.error(`❌ Failed to create service principal for ${appId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Client Secret Management
  // ============================================================================

  async createClientSecret(
    applicationId: string,
    displayName: string,
    durationMonths: number = 24
  ): Promise<GraphResponse<ClientSecretResult>> {
    try {
      console.log(`Creating client secret for application: ${applicationId}`);
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      const secretRequest = {
        passwordCredential: {
          displayName,
          endDateTime: expiresAt.toISOString()
        }
      };

      const response = await this.client.post<typeof secretRequest, any>(
        `/applications/${applicationId}/addPassword`,
        secretRequest
      );

      if (response.status !== 200) {
        return { 
          success: false, 
          error: `Failed to create client secret: ${response.statusText}` 
        };
      }

      const clientSecret: ClientSecretResult = {
        secretId: response.data.keyId,
        secretValue: response.data.secretText,
        expiresAt,
        displayName
      };

      console.log(`✅ Created client secret: ${clientSecret.secretId}`);
      return { success: true, data: clientSecret };
    } catch (error) {
      console.error(`❌ Failed to create client secret:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Power Platform App Registration
  // ============================================================================

  async createPowerPlatformApplication(
    displayName: string,
    options?: {
      includeDynamicsPermissions?: boolean;
      includePowerPlatformPermissions?: boolean;
      createClientSecret?: boolean;
      secretDisplayName?: string;
    }
  ): Promise<GraphResponse<AppRegistrationResult>> {
    try {
      console.log(`Creating Power Platform application: ${displayName}`);
      
      const permissions: AppPermission[] = [];

      // Add Dynamics 365 permissions
      if (options?.includeDynamicsPermissions !== false) {
        permissions.push({
          resourceAppId: '00000007-0000-0000-c000-000000000000', // Dynamics CRM
          permissions: [
            {
              id: '78ce3f0f-a1ce-49c2-8cde-64b5c0896db4', // user_impersonation
              type: 'Scope'
            }
          ]
        });
      }

      // Add Power Platform permissions
      if (options?.includePowerPlatformPermissions !== false) {
        permissions.push({
          resourceAppId: '475226c6-020e-4fb2-8a90-7a972cbfc1d4', // PowerApps Service
          permissions: [
            {
              id: '4ae1bf56-f562-4747-b7bc-2fa0874ed46f', // User
              type: 'Scope'
            }
          ]
        });
      }

      // Create the application
      const appResult = await this.createApplication(displayName, {
        signInAudience: 'AzureADMyOrg',
        requiredPermissions: permissions,
        createServicePrincipal: true
      });

      if (!appResult.success) {
        return appResult;
      }

      let clientSecret: ClientSecretResult | undefined;

      // Create client secret if requested
      if (options?.createClientSecret !== false) {
        const secretName = options?.secretDisplayName || `${displayName} Secret`;
        const secretResult = await this.createClientSecret(
          appResult.data.id,
          secretName
        );

        if (secretResult.success) {
          clientSecret = secretResult.data;
        } else {
          console.warn(`Failed to create client secret: ${secretResult.error}`);
        }
      }

      const setupInstructions = this.generateSetupInstructions(
        appResult.data,
        clientSecret
      );

      const result: AppRegistrationResult = {
        application: appResult.data,
        ...(clientSecret && { clientSecret }),
        setupInstructions
      };

      console.log(`✅ Power Platform application created: ${appResult.data.appId}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Failed to create Power Platform application:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Application Management
  // ============================================================================

  async getApplication(applicationId: string): Promise<GraphResponse<ApplicationDetails>> {
    try {
      console.log(`Getting application: ${applicationId}`);
      
      const response = await this.client.get<any>(`/applications/${applicationId}`);

      if (response.status !== 200) {
        return { 
          success: false, 
          error: `Application ${applicationId} not found` 
        };
      }

      const applicationDetails: ApplicationDetails = {
        id: response.data.id,
        appId: response.data.appId,
        displayName: response.data.displayName,
        signInAudience: response.data.signInAudience,
        createdDateTime: response.data.createdDateTime
      };

      console.log(`✅ Retrieved application: ${applicationDetails.displayName}`);
      return { success: true, data: applicationDetails };
    } catch (error) {
      console.error(`❌ Failed to get application ${applicationId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async deleteApplication(applicationId: string): Promise<GraphResponse<void>> {
    try {
      console.log(`Deleting application: ${applicationId}`);
      
      const response = await this.client.delete(`/applications/${applicationId}`);

      if (response.status !== 204) {
        return { 
          success: false, 
          error: `Failed to delete application: ${response.statusText}` 
        };
      }

      console.log(`✅ Deleted application: ${applicationId}`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error(`❌ Failed to delete application ${applicationId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  async grantAdminConsent(
    servicePrincipalId: string,
    _resourceAppId: string
  ): Promise<GraphResponse<void>> {
    try {
      console.log(`Granting admin consent for service principal: ${servicePrincipalId}`);
      
      // This would typically require elevated permissions
      // and would call the /servicePrincipals/{id}/appRoleAssignments endpoint
      
      console.log(`✅ Admin consent granted (simulated)`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error(`❌ Failed to grant admin consent:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateSetupInstructions(
    application: ApplicationDetails,
    clientSecret?: ClientSecretResult
  ): readonly string[] {
    const instructions: string[] = [
      `Application created: ${application.displayName}`,
      `Application ID: ${application.appId}`,
      `Object ID: ${application.id}`
    ];

    if (application.servicePrincipal) {
      instructions.push(`Service Principal ID: ${application.servicePrincipal.id}`);
    }

    if (clientSecret) {
      instructions.push(
        `Client Secret Created: ${clientSecret.displayName}`,
        `Secret Value: ${clientSecret.secretValue}`,
        `Secret Expires: ${clientSecret.expiresAt.toISOString()}`,
        '⚠️  Save the secret value now - it cannot be retrieved later!'
      );
    }

    instructions.push(
      '',
      'Next Steps:',
      '1. Grant admin consent for the required permissions',
      '2. Configure the application in your Power Platform environments',
      '3. Test the connection using the Application ID and Secret'
    );

    return instructions;
  }

  // ============================================================================
  // Connection Status
  // ============================================================================

  getConnectionStatus(): boolean {
    return !!this.config.accessToken;
  }
}

export default MicrosoftGraphClient;