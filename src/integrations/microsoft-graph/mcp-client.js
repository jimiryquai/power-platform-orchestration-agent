const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

class MicrosoftGraphMCPClient {
  constructor() {
    this.clientId = config.azure.auth.clientId;
    this.clientSecret = config.azure.auth.clientSecret;
    this.tenantId = config.azure.auth.tenantId;
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.useInteractiveAuth = process.env.AZURE_USE_INTERACTIVE_AUTH === 'true';
    
    logger.info('Microsoft Graph MCP Client initialized', { 
      useInteractiveAuth: this.useInteractiveAuth 
    });
  }

  async connect() {
    try {
      logger.info('Testing Microsoft Graph connection...', { 
        useInteractiveAuth: this.useInteractiveAuth 
      });
      
      // Skip credential validation for interactive auth
      if (!this.useInteractiveAuth && (!this.clientId || !this.clientSecret || !this.tenantId)) {
        throw new Error('Microsoft Graph credentials not configured');
      }
      
      // Get access token and test the connection
      const tokenResult = await this.getAccessToken();
      if (!tokenResult.success) {
        throw new Error(`Authentication failed: ${tokenResult.error}`);
      }
      
      // Test the connection with a simple API call
      const testResult = await this.executeRequest('GET', 'me');
      if (!testResult.success && testResult.status !== 403) {
        // 403 is expected if the service principal doesn't have user permissions
        // We just want to verify the token works
        throw new Error(`Connection test failed: ${testResult.error}`);
      }
      
      this.isConnected = true;
      logger.info('Microsoft Graph connection validated successfully');
      return true;
    } catch (error) {
      logger.error('Microsoft Graph connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return { success: true, token: this.accessToken };
      }

      // Use interactive auth if enabled
      if (this.useInteractiveAuth) {
        return await this.getInteractiveToken();
      }

      // Fall back to service principal auth
      const tokenData = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default'
      };

      const response = await axios.post(this.authUrl, new URLSearchParams(tokenData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
      
      logger.info('Microsoft Graph access token obtained successfully');
      return { success: true, token: this.accessToken };
    } catch (error) {
      logger.error('Failed to obtain Microsoft Graph access token:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error_description || error.message 
      };
    }
  }

  async getInteractiveToken() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      logger.info('Using Azure CLI for interactive authentication...');
      
      // Use PowerShell to call Azure CLI (works better in WSL)
      const command = process.platform === 'win32' 
        ? `az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv`
        : `powershell.exe -Command "az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv"`;
      
      const { stdout } = await execAsync(command);
      
      this.accessToken = stdout.trim();
      // Azure CLI tokens typically expire in 1 hour, set conservative expiry
      this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
      
      logger.info('Interactive authentication successful');
      return { success: true, token: this.accessToken };
    } catch (error) {
      logger.error('Interactive authentication failed:', error.message);
      return {
        success: false,
        error: `Interactive auth failed: ${error.message}. Run 'az login' first.`
      };
    }
  }

  async getHeaders() {
    const tokenResult = await this.getAccessToken();
    if (!tokenResult.success) {
      throw new Error(`Authentication failed: ${tokenResult.error}`);
    }

    return {
      'Authorization': `Bearer ${tokenResult.token}`,
      'Content-Type': 'application/json'
    };
  }

  async executeRequest(method, endpoint, data = null) {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      const headers = await this.getHeaders();
      
      const options = {
        method,
        url,
        headers
      };

      if (data) {
        options.data = data;
      }

      const response = await axios(options);
      return { success: true, data: response.data };
    } catch (error) {
      const errorDetails = {
        endpoint,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      };
      
      logger.error('Microsoft Graph API error:', errorDetails);
      
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }

  // Application Registration Operations
  async createAppRegistration(appData) {
    logger.info('Creating Azure app registration:', appData.displayName);
    
    // Define the required API permissions
    const requiredResourceAccess = [
      {
        // Microsoft Graph API
        resourceAppId: '00000003-0000-0000-c000-000000000000',
        resourceAccess: [
          {
            // User.Read permission
            id: 'e1fe6dd8-ba31-4d61-89e7-88639da4683d',
            type: 'Scope'
          }
        ]
      },
      {
        // Dynamics CRM API
        resourceAppId: '00000007-0000-0000-c000-000000000000',
        resourceAccess: [
          {
            // user_impersonation permission
            id: '78ce3f0f-a1ce-49c2-8cde-64b5c0896db4',
            type: 'Scope'
          }
        ]
      }
    ];

    const appRegistrationPayload = {
      displayName: appData.displayName,
      description: appData.description || '',
      signInAudience: 'AzureADMyOrg',
      requiredResourceAccess: requiredResourceAccess,
      web: {
        redirectUris: appData.redirectUris || [],
        implicitGrantSettings: {
          enableAccessTokenIssuance: false,
          enableIdTokenIssuance: false
        }
      },
      publicClient: {
        redirectUris: []
      }
    };

    logger.info('About to send app registration request:', JSON.stringify(appRegistrationPayload, null, 2));
    const result = await this.executeRequest('POST', 'applications', appRegistrationPayload);
    
    if (!result.success) {
      logger.error('Failed to create app registration:', result);
    } else {
      logger.info('App registration created successfully:', result.data);
      
      // Create a service principal for the application
      if (appData.createServicePrincipal !== false) {
        const spResult = await this.createServicePrincipal(result.data.appId);
        if (spResult.success) {
          result.data.servicePrincipal = spResult.data;
          
          // Create client secret
          const secretResult = await this.addClientSecret(result.data.id, appData.displayName);
          if (secretResult.success) {
            result.data.clientSecret = secretResult.clientSecret;
            
            // Save credentials to .env file
            const credentialsSaved = await this.saveAppCredentials(
              appData.displayName,
              result.data.appId,
              secretResult.clientSecret
            );
            
            result.data.credentialsSaved = credentialsSaved.success;
            if (credentialsSaved.success) {
              logger.info('App registration credentials saved to .env file');
            } else {
              logger.warn('Failed to save credentials to .env file:', credentialsSaved.error);
            }
          } else {
            logger.error('Failed to create client secret:', secretResult.error);
          }
          
          // Grant admin consent for the required permissions
          if (appData.grantAdminConsent !== false) {
            const consentResult = await this.grantAdminConsent(spResult.data.id, result.data.requiredResourceAccess);
            if (consentResult.success) {
              result.data.adminConsentGranted = true;
              logger.info('Admin consent granted successfully');
            } else {
              logger.warn('Failed to grant admin consent:', consentResult.error);
              result.data.adminConsentGranted = false;
              result.data.adminConsentError = consentResult.error;
            }
          }
        }
      }
    }
    
    return result;
  }

  async createServicePrincipal(appId) {
    logger.info('Creating service principal for app:', appId);
    
    const servicePrincipalPayload = {
      appId: appId
    };

    const result = await this.executeRequest('POST', 'servicePrincipals', servicePrincipalPayload);
    
    if (!result.success) {
      logger.error('Failed to create service principal:', result);
    } else {
      logger.info('Service principal created successfully:', result.data);
    }
    
    return result;
  }

  async getAppRegistration(appId) {
    return await this.executeRequest('GET', `applications/${appId}`);
  }

  async listAppRegistrations(filter = null) {
    let endpoint = 'applications';
    if (filter) {
      endpoint += `?$filter=${encodeURIComponent(filter)}`;
    }
    return await this.executeRequest('GET', endpoint);
  }

  async updateAppRegistration(appId, updates) {
    return await this.executeRequest('PATCH', `applications/${appId}`, updates);
  }

  async deleteAppRegistration(appId) {
    return await this.executeRequest('DELETE', `applications/${appId}`);
  }

  // Service Principal Operations
  async getServicePrincipal(servicePrincipalId) {
    return await this.executeRequest('GET', `servicePrincipals/${servicePrincipalId}`);
  }

  async listServicePrincipals(filter = null) {
    let endpoint = 'servicePrincipals';
    if (filter) {
      endpoint += `?$filter=${encodeURIComponent(filter)}`;
    }
    return await this.executeRequest('GET', endpoint);
  }

  // Client Secret Operations
  async addClientSecret(appId, secretData) {
    logger.info('Adding client secret to app:', appId);
    
    const secretPayload = {
      passwordCredential: {
        displayName: secretData.displayName || 'Auto-generated secret',
        endDateTime: secretData.endDateTime || new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString() // 1 year from now
      }
    };

    const result = await this.executeRequest('POST', `applications/${appId}/addPassword`, secretPayload);
    
    if (!result.success) {
      logger.error('Failed to add client secret:', result);
      return result;
    } else {
      logger.info('Client secret added successfully');
      // Extract the actual secret value from the response
      const clientSecret = result.data.secretText;
      
      return {
        success: true,
        clientSecret: clientSecret,
        keyId: result.data.keyId,
        displayName: result.data.displayName,
        endDateTime: result.data.endDateTime
      };
    }
  }

  async removeClientSecret(appId, keyId) {
    const removePayload = {
      keyId: keyId
    };

    return await this.executeRequest('POST', `applications/${appId}/removePassword`, removePayload);
  }

  // Admin Consent Operations
  async grantAdminConsent(servicePrincipalId, requiredResourceAccess) {
    logger.info('Granting admin consent for service principal:', servicePrincipalId);
    
    const results = [];
    
    for (const resource of requiredResourceAccess) {
      // Find the service principal for the resource (Microsoft Graph, Dynamics CRM, etc.)
      const resourceSpResult = await this.findServicePrincipalByAppId(resource.resourceAppId);
      
      if (!resourceSpResult.success) {
        logger.warn(`Could not find service principal for resource: ${resource.resourceAppId}`);
        continue;
      }
      
      const resourceServicePrincipal = resourceSpResult.data;
      
      // Grant consent for each permission
      for (const permission of resource.resourceAccess) {
        const grantResult = await this.grantOAuth2PermissionGrant(
          servicePrincipalId,
          resourceServicePrincipal.id,
          permission.id,
          permission.type
        );
        
        results.push({
          resourceAppId: resource.resourceAppId,
          permissionId: permission.id,
          permissionType: permission.type,
          success: grantResult.success,
          error: grantResult.error
        });
      }
    }
    
    const allSuccessful = results.every(r => r.success);
    
    return {
      success: allSuccessful,
      results: results,
      error: allSuccessful ? null : 'Some permissions failed to be granted'
    };
  }

  async findServicePrincipalByAppId(appId) {
    const filter = `appId eq '${appId}'`;
    const result = await this.executeRequest('GET', `servicePrincipals?$filter=${encodeURIComponent(filter)}`);
    
    if (result.success && result.data.value && result.data.value.length > 0) {
      return {
        success: true,
        data: result.data.value[0]
      };
    } else {
      return {
        success: false,
        error: `Service principal not found for app ID: ${appId}`
      };
    }
  }

  async grantOAuth2PermissionGrant(clientServicePrincipalId, resourceServicePrincipalId, scope, permissionType) {
    try {
      if (permissionType === 'Scope') {
        // For delegated permissions (Scope), create an oAuth2PermissionGrant
        const grantPayload = {
          clientId: clientServicePrincipalId,
          consentType: 'AllPrincipals', // Admin consent for all users
          resourceId: resourceServicePrincipalId,
          scope: await this.getScopeValueFromId(resourceServicePrincipalId, scope)
        };

        const result = await this.executeRequest('POST', 'oauth2PermissionGrants', grantPayload);
        
        if (result.success) {
          logger.info(`OAuth2 permission grant created for scope: ${scope}`);
        }
        
        return result;
      } else if (permissionType === 'Role') {
        // For application permissions (Role), create an appRoleAssignment
        const assignmentPayload = {
          principalId: clientServicePrincipalId,
          resourceId: resourceServicePrincipalId,
          appRoleId: scope // For app roles, the scope is actually the role ID
        };

        const result = await this.executeRequest('POST', `servicePrincipals/${clientServicePrincipalId}/appRoleAssignments`, assignmentPayload);
        
        if (result.success) {
          logger.info(`App role assignment created for role: ${scope}`);
        }
        
        return result;
      } else {
        return {
          success: false,
          error: `Unknown permission type: ${permissionType}`
        };
      }
    } catch (error) {
      logger.error('Failed to grant permission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getScopeValueFromId(resourceServicePrincipalId, scopeId) {
    // Get the service principal details to find the scope value
    const spResult = await this.executeRequest('GET', `servicePrincipals/${resourceServicePrincipalId}`);
    
    if (spResult.success && spResult.data.oauth2PermissionScopes) {
      const scope = spResult.data.oauth2PermissionScopes.find(s => s.id === scopeId);
      return scope ? scope.value : scopeId; // Fallback to ID if value not found
    }
    
    // Fallback mapping for common Microsoft Graph scopes
    const commonScopes = {
      'e1fe6dd8-ba31-4d61-89e7-88639da4683d': 'User.Read'
    };
    
    return commonScopes[scopeId] || scopeId;
  }

  async disconnect() {
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('Disconnected from Microsoft Graph');
  }

  // =====================================
  // CREDENTIAL MANAGEMENT
  // =====================================

  /**
   * Save app registration credentials to .env file
   */
  async saveAppCredentials(appName, appId, clientSecret) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Create environment variables
      const envVars = {
        [`${appName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_CLIENT_ID`]: appId,
        [`${appName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_CLIENT_SECRET`]: clientSecret,
        [`${appName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TENANT_ID`]: this.tenantId
      };

      // Set in current process
      Object.entries(envVars).forEach(([key, value]) => {
        process.env[key] = value;
        logger.info(`Set environment variable: ${key}`);
      });

      // Read existing .env file
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        logger.info('No existing .env file found, creating new one');
      }

      // Add new variables to .env content
      const newLines = Object.entries(envVars).map(([key, value]) => {
        // Check if variable already exists
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
          // Update existing
          envContent = envContent.replace(regex, `${key}=${value}`);
          return null;
        } else {
          // Add new
          return `${key}=${value}`;
        }
      }).filter(line => line !== null);

      if (newLines.length > 0) {
        envContent += '\n\n# App Registration Credentials\n';
        envContent += newLines.join('\n');
        envContent += '\n';
      }

      // Write updated .env file
      await fs.writeFile(envPath, envContent);
      
      logger.info('App registration credentials saved to .env file:', {
        appName,
        appId,
        variablesCreated: Object.keys(envVars)
      });

      return {
        success: true,
        envVars: Object.keys(envVars),
        appId,
        clientSecret
      };

    } catch (error) {
      logger.error('Failed to save app credentials:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================================
  // AZURE DEVOPS SERVICE CONNECTION OPERATIONS
  // =====================================

  /**
   * Create Azure DevOps Service Connection for Power Platform deployment
   */
  async createAzureDevOpsServiceConnection(servicePrincipalId, appRegistrationId, projectName, azureDevOpsConfig) {
    logger.info('Creating Azure DevOps Service Connection for Power Platform deployment');
    
    try {
      const serviceConnectionData = {
        data: {},
        name: `PowerPlatform-${projectName}`,
        type: 'powerplatform-spn',
        url: `https://service.powerapps.com/`,
        authorization: {
          parameters: {
            tenantId: this.tenantId,
            applicationId: servicePrincipalId,
            clientSecret: azureDevOpsConfig.clientSecret
          },
          scheme: 'None'
        },
        isShared: false,
        isReady: true,
        serviceEndpointProjectReferences: [
          {
            projectReference: {
              id: azureDevOpsConfig.projectId,
              name: projectName
            },
            name: `PowerPlatform-${projectName}`,
            description: `Service connection for Power Platform deployment in ${projectName}`
          }
        ]
      };

      // Use Azure DevOps REST API directly
      const devOpsToken = await this.getAzureDevOpsToken(azureDevOpsConfig);
      if (!devOpsToken.success) {
        throw new Error(`Failed to get Azure DevOps token: ${devOpsToken.error}`);
      }

      const response = await this.executeAzureDevOpsRequest(
        'POST',
        `${azureDevOpsConfig.organization}/${azureDevOpsConfig.projectId}/_apis/serviceendpoint/endpoints?api-version=7.0`,
        serviceConnectionData,
        devOpsToken.token
      );

      if (!response.success) {
        throw new Error(`Service connection creation failed: ${response.error}`);
      }

      logger.info('Azure DevOps Service Connection created successfully:', {
        connectionId: response.data.id,
        connectionName: response.data.name
      });

      return {
        success: true,
        serviceConnection: {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type,
          url: response.data.url
        }
      };

    } catch (error) {
      logger.error('Failed to create Azure DevOps Service Connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Azure DevOps access token using the same credentials
   */
  async getAzureDevOpsToken(azureDevOpsConfig) {
    try {
      // Use the PAT token directly if provided
      if (azureDevOpsConfig.personalAccessToken) {
        return { 
          success: true, 
          token: azureDevOpsConfig.personalAccessToken 
        };
      }

      // If using interactive auth, try to get Azure DevOps token
      if (this.useInteractiveAuth) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        try {
          const command = process.platform === 'win32' 
            ? `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv`
            : `powershell.exe -Command "az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv"`;
          
          const { stdout } = await execAsync(command);
          return { success: true, token: stdout.trim() };
        } catch (cliError) {
          logger.warn('Azure CLI token for DevOps failed, falling back to PAT token');
        }
      }

      throw new Error('No valid Azure DevOps authentication method available');
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute Azure DevOps REST API request
   */
  async executeAzureDevOpsRequest(method, endpoint, data = null, token) {
    try {
      const url = endpoint.startsWith('https://') ? endpoint : `https://dev.azure.com/${endpoint}`;
      
      const headers = {
        'Authorization': token.startsWith('Bearer ') ? token : `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
        'Content-Type': 'application/json'
      };
      
      const options = {
        method,
        url,
        headers
      };

      if (data) {
        options.data = data;
      }

      const response = await axios(options);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Azure DevOps API error:', {
        endpoint,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }
}

module.exports = MicrosoftGraphMCPClient;