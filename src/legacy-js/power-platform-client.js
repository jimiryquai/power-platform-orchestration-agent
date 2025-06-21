const axios = require('axios');
const config = require('../../config/index.js.bak');
const logger = require('../../utils/logger.js.bak');

class PowerPlatformMCPClient {
  constructor() {
    this.clientId = config.azure.auth.clientId;
    this.clientSecret = config.azure.auth.clientSecret;
    this.tenantId = config.azure.auth.tenantId;
    this.adminBaseUrl = 'https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform';
    this.authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.useInteractiveAuth = process.env.AZURE_USE_INTERACTIVE_AUTH === 'true';
    
    logger.info('Power Platform MCP Client initialized', {
      useInteractiveAuth: this.useInteractiveAuth
    });
  }

  async connect() {
    try {
      logger.info('Testing Power Platform connection...', {
        useInteractiveAuth: this.useInteractiveAuth
      });
      
      // Skip credential validation for interactive auth
      if (!this.useInteractiveAuth && (!this.clientId || !this.clientSecret || !this.tenantId)) {
        throw new Error('Power Platform credentials not configured');
      }
      
      // Get access token and test the connection
      const tokenResult = await this.getAccessToken();
      if (!tokenResult.success) {
        throw new Error(`Authentication failed: ${tokenResult.error}`);
      }
      
      // Test the connection with a simple API call (list environments)
      const testResult = await this.executeRequest('GET', 'environments?api-version=2020-10-01');
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }
      
      this.isConnected = true;
      logger.info('Power Platform connection validated successfully');
      return true;
    } catch (error) {
      logger.error('Power Platform connection failed:', error);
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
        scope: 'https://service.powerapps.com/.default'
      };

      const response = await axios.post(this.authUrl, new URLSearchParams(tokenData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
      
      logger.info('Power Platform access token obtained successfully');
      return { success: true, token: this.accessToken };
    } catch (error) {
      logger.error('Failed to obtain Power Platform access token:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error_description || error.message 
      };
    }
  }

  async getInteractiveToken(forDataverse = false, environmentUrl = null) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      let scope = 'https://service.powerapps.com';
      
      if (forDataverse) {
        if (environmentUrl) {
          // Extract the base URL for environment-specific scope
          const url = new URL(environmentUrl);
          scope = `${url.protocol}//${url.hostname}`;
        } else {
          scope = 'https://globaldisco.crm.dynamics.com';
        }
      }
      
      logger.info(`Using Azure CLI for authentication (scope: ${scope})...`);
      
      // Use PowerShell to call Azure CLI with appropriate scope
      const command = process.platform === 'win32' 
        ? `az account get-access-token --resource ${scope} --query accessToken -o tsv`
        : `powershell.exe -Command "az account get-access-token --resource ${scope} --query accessToken -o tsv"`;
      
      const { stdout } = await execAsync(command);
      
      const token = stdout.trim();
      
      if (forDataverse) {
        this.dataverseToken = token;
        this.dataverseTokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
        logger.info('Interactive Dataverse authentication successful');
        return { success: true, token: token };
      } else {
        this.accessToken = token;
        this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
        logger.info('Interactive Power Platform authentication successful');
        return { success: true, token: token };
      }
    } catch (error) {
      logger.error(`Interactive authentication failed (${forDataverse ? 'Dataverse' : 'Power Platform'}):`, error.message);
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

  async executeRequest(method, endpoint, data = null, useDataverseApi = false) {
    try {
      const baseUrl = useDataverseApi ? 'https://api.crm.dynamics.com/api/data/v9.2' : this.adminBaseUrl;
      const url = `${baseUrl}/${endpoint}`;
      const headers = await this.getHeaders();
      
      // Add OData headers for Dataverse API calls
      if (useDataverseApi) {
        headers['OData-MaxVersion'] = '4.0';
        headers['OData-Version'] = '4.0';
        headers['Accept'] = 'application/json';
        if (method === 'POST') {
          headers['Prefer'] = 'return=representation';
        }
      }
      
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
      
      logger.error('Power Platform API error:', errorDetails);
      
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }

  // Capacity and Tenant Information
  async getTenantCapacity() {
    logger.info('Getting tenant capacity information');
    
    const result = await this.executeRequest('GET', 'environments?$expand=properties/capacity&api-version=2020-10-01');
    
    if (result.success) {
      // Calculate total capacity usage
      const environments = result.data.value || [];
      const capacityInfo = {
        totalEnvironments: environments.length,
        sandboxCount: environments.filter(e => e.properties?.environmentSku === 'Sandbox').length,
        productionCount: environments.filter(e => e.properties?.environmentSku === 'Production').length,
        trialCount: environments.filter(e => e.properties?.environmentSku === 'Trial').length,
        developerCount: environments.filter(e => e.properties?.environmentSku === 'Developer').length
      };
      
      result.data.capacityInfo = capacityInfo;
      logger.info('Tenant capacity info:', capacityInfo);
    }
    
    return result;
  }

  // Environment Operations
  async createEnvironment(environmentData) {
    logger.info('Creating Power Platform environment:', environmentData.displayName);
    
    // First check capacity
    const capacityResult = await this.getTenantCapacity();
    if (capacityResult.success) {
      logger.info('Current tenant usage:', capacityResult.data.capacityInfo);
    }
    
    // Use correct API payload structure based on Azure REST API docs
    const environmentPayload = {
      properties: {
        displayName: environmentData.displayName,
        description: environmentData.description || '',
        environmentSku: environmentData.type || 'Sandbox', // Sandbox, Production, Trial
        azureRegion: environmentData.location || 'northeurope'
      }
    };

    // Add Dataverse database if requested
    if (environmentData.dataverse) {
      environmentPayload.properties.linkedAppType = 'CommonDataService';
      environmentPayload.properties.databaseType = 'CommonDataService2';
    }

    logger.info('About to send environment creation request:', JSON.stringify(environmentPayload, null, 2));
    
    // Use POST method for creation
    const result = await this.executeRequest(
      'POST', 
      `environments?api-version=2020-10-01`, 
      environmentPayload
    );
    
    if (!result.success) {
      logger.error('Failed to create environment:', result);
      
      // Provide helpful error messages
      if (result.status === 403) {
        result.error = 'Insufficient permissions. Ensure you have Power Platform Administrator role.';
      } else if (result.status === 429) {
        result.error = 'Rate limited. Too many requests.';
      } else if (result.details?.error?.message?.includes('quota') || result.details?.error?.message?.includes('capacity')) {
        result.error = 'Tenant capacity exceeded. You may have reached your environment limit.';
      }
    } else {
      logger.info('Environment created successfully:', result.data);
    }
    
    return result;
  }

  async listEnvironments() {
    logger.info('Listing Power Platform environments');
    
    const result = await this.executeRequest('GET', 'environments?api-version=2020-10-01');
    
    if (result.success) {
      logger.info(`Found ${result.data.value?.length || 0} environments`);
      
      // Transform the response to a more usable format
      if (result.data.value) {
        result.data.environments = result.data.value.map(env => ({
          name: env.name,
          id: env.id,
          displayName: env.properties?.displayName,
          location: env.location,
          type: env.properties?.environmentSku,
          state: env.properties?.provisioningState,
          azureRegion: env.properties?.azureRegion,
          hasDataverse: env.properties?.linkedAppType === 'CommonDataService' || 
                        env.properties?.databaseType === 'CommonDataService2' ||
                        env.properties?.environmentSku === 'Default', // Default environments often have Dataverse
          createdTime: env.properties?.createdTime,
          createdBy: env.properties?.createdBy?.displayName,
          linkedAppType: env.properties?.linkedAppType,
          databaseType: env.properties?.databaseType
        }));
      }
    }
    
    return result;
  }

  async getEnvironment(environmentName) {
    logger.info('Getting Power Platform environment:', environmentName);
    
    const result = await this.executeRequest('GET', `environments/${environmentName}?api-version=2020-10-01&$expand=properties/linkedEnvironmentMetadata`);
    
    if (result.success && result.data) {
      // Transform to consistent format
      const env = result.data;
      result.data.environment = {
        name: env.name,
        id: env.id,
        displayName: env.properties?.displayName,
        location: env.location,
        type: env.properties?.environmentSku,
        state: env.properties?.provisioningState,
        azureRegion: env.properties?.azureRegion,
        hasDataverse: env.properties?.linkedAppType === 'CommonDataService' || env.properties?.databaseType === 'CommonDataService2',
        createdTime: env.properties?.createdTime,
        createdBy: env.properties?.createdBy?.displayName,
        // Extract Dataverse URL from metadata
        dataverseUrl: env.properties?.linkedEnvironmentMetadata?.instanceUrl,
        webApiUrl: env.properties?.linkedEnvironmentMetadata?.instanceUrl ? 
          `${env.properties.linkedEnvironmentMetadata.instanceUrl}/api/data/v9.2` : null
      };
    }
    
    return result;
  }

  async deleteEnvironment(environmentName) {
    logger.info('Deleting Power Platform environment:', environmentName);
    
    const result = await this.executeRequest('DELETE', `environments/${environmentName}?api-version=2020-10-01`);
    
    if (!result.success) {
      logger.error('Failed to delete environment:', result);
    } else {
      logger.info('Environment deletion initiated successfully');
    }
    
    return result;
  }

  async waitForEnvironmentCreation(environmentName, timeoutMs = 300000) {
    logger.info(`Waiting for environment creation: ${environmentName}`);
    
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getEnvironment(environmentName);
      
      if (result.success && result.data.environment) {
        const state = result.data.environment.state;
        logger.info(`Environment state: ${state}`);
        
        if (state === 'Succeeded') {
          logger.info('Environment created successfully');
          return { success: true, environment: result.data.environment };
        } else if (state === 'Failed') {
          logger.error('Environment creation failed');
          return { success: false, error: 'Environment creation failed' };
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    return { success: false, error: 'Timeout waiting for environment creation' };
  }

  // Environment Settings Operations
  async updateEnvironmentSettings(environmentName, settings) {
    logger.info('Updating environment settings:', environmentName);
    
    const settingsPayload = {
      properties: settings
    };
    
    const result = await this.executeRequest(
      'PATCH', 
      `environments/${environmentName}?api-version=2020-10-01`, 
      settingsPayload
    );
    
    return result;
  }

  // Security Operations
  async addEnvironmentAdmin(environmentName, userPrincipalName) {
    logger.info(`Adding admin ${userPrincipalName} to environment ${environmentName}`);
    
    const adminPayload = {
      properties: {
        roleDefinition: {
          id: '/providers/Microsoft.BusinessAppPlatform/roles/EnvironmentAdmin'
        },
        principal: {
          email: userPrincipalName,
          id: userPrincipalName,
          type: 'User'
        }
      }
    };
    
    const result = await this.executeRequest(
      'PUT', 
      `environments/${environmentName}/roleAssignments/${userPrincipalName}?api-version=2020-10-01`, 
      adminPayload
    );
    
    return result;
  }

  // Publisher Operations
  async createPublisher(publisherData, environmentUrl) {
    logger.info('Creating Power Platform publisher:', publisherData.uniquename);
    
    const publisherPayload = {
      uniquename: publisherData.uniquename, // e.g., "contoso"
      friendlyname: publisherData.friendlyname, // e.g., "Contoso Ltd"
      description: publisherData.description || '',
      customizationprefix: publisherData.customizationprefix, // e.g., "con" (3-8 chars)
      customizationoptionvalueprefix: publisherData.customizationoptionvalueprefix || 10000 // Default starting number for option values
    };

    logger.info('About to send publisher creation request:', JSON.stringify(publisherPayload, null, 2));
    
    // Use Dataverse Web API to create publisher
    const result = await this.executeDataverseRequest(
      'POST', 
      'publishers', 
      publisherPayload,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error('Failed to create publisher:', result);
    } else {
      logger.info('Publisher created successfully:', result.data);
    }
    
    return result;
  }

  async listPublishers(environmentUrl) {
    logger.info('Listing Power Platform publishers');
    
    const result = await this.executeDataverseRequest(
      'GET', 
      'publishers?$select=publisherid,uniquename,friendlyname,description,customizationprefix,isreadonly,createdon',
      null,
      environmentUrl
    );
    
    if (result.success) {
      logger.info(`Found ${result.data.value?.length || 0} publishers`);
      
      // Transform the response to a more usable format
      if (result.data.value) {
        result.data.publishers = result.data.value.map(pub => ({
          id: pub.publisherid,
          uniqueName: pub.uniquename,
          friendlyName: pub.friendlyname,
          description: pub.description,
          customizationPrefix: pub.customizationprefix,
          isReadOnly: pub.isreadonly,
          createdOn: pub.createdon,
          isSystem: pub.isreadonly || pub.uniquename === 'Default' || pub.uniquename === 'MicrosoftCorporation'
        }));
      }
    }
    
    return result;
  }

  async getPublisher(publisherUniqueName, environmentUrl) {
    logger.info('Getting Power Platform publisher:', publisherUniqueName);
    
    const result = await this.executeDataverseRequest(
      'GET', 
      `publishers?$filter=uniquename eq '${publisherUniqueName}'&$select=publisherid,uniquename,friendlyname,description,customizationprefix,isreadonly,createdon`,
      null,
      environmentUrl
    );
    
    if (result.success && result.data.value && result.data.value.length > 0) {
      const pub = result.data.value[0];
      result.data.publisher = {
        id: pub.publisherid,
        uniqueName: pub.uniquename,
        friendlyName: pub.friendlyname,
        description: pub.description,
        customizationPrefix: pub.customizationprefix,
        isReadOnly: pub.isreadonly,
        createdOn: pub.createdon
      };
    } else {
      result.success = false;
      result.error = 'Publisher not found';
    }
    
    return result;
  }

  async deletePublisher(publisherId, environmentUrl) {
    logger.info('Deleting Power Platform publisher:', publisherId);
    
    const result = await this.executeDataverseRequest(
      'DELETE', 
      `publishers(${publisherId})`,
      null,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error('Failed to delete publisher:', result);
    } else {
      logger.info('Publisher deleted successfully');
    }
    
    return result;
  }

  // Helper method for Dataverse API calls with environment-specific URLs
  async executeDataverseRequest(method, endpoint, data = null, environmentUrl = null) {
    try {
      // If no environment URL provided, use default CRM URL
      const baseUrl = environmentUrl || 'https://api.crm.dynamics.com/api/data/v9.2';
      const url = `${baseUrl}/${endpoint}`;
      
      // Get Dataverse-specific token
      const headers = await this.getDataverseHeaders(baseUrl);
      
      // Add OData headers for Dataverse API calls
      headers['OData-MaxVersion'] = '4.0';
      headers['OData-Version'] = '4.0';
      headers['Accept'] = 'application/json';
      if (method === 'POST') {
        headers['Prefer'] = 'return=representation';
      }
      
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
      
      logger.error('Dataverse API error:', errorDetails);
      
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }

  async getDataverseHeaders(environmentUrl = null) {
    // Check if we have a valid Dataverse token
    if (this.dataverseToken && this.dataverseTokenExpiry && Date.now() < this.dataverseTokenExpiry) {
      return {
        'Authorization': `Bearer ${this.dataverseToken}`,
        'Content-Type': 'application/json'
      };
    }

    // Get new Dataverse token with environment-specific scope
    const tokenResult = await this.getDataverseToken(environmentUrl);
    if (!tokenResult.success) {
      throw new Error(`Dataverse authentication failed: ${tokenResult.error}`);
    }

    return {
      'Authorization': `Bearer ${tokenResult.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getDataverseToken(environmentUrl = null) {
    try {
      // Use interactive auth if enabled
      if (this.useInteractiveAuth) {
        return await this.getInteractiveToken(true, environmentUrl); // true = forDataverse, pass environmentUrl
      }

      // Fall back to service principal auth with Dataverse scope
      let scope = 'https://globaldisco.crm.dynamics.com/.default';
      
      if (environmentUrl) {
        const url = new URL(environmentUrl);
        scope = `${url.protocol}//${url.hostname}/.default`;
      }
      
      const tokenData = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: scope
      };

      const response = await axios.post(this.authUrl, new URLSearchParams(tokenData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.dataverseToken = response.data.access_token;
      this.dataverseTokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
      
      logger.info('Dataverse access token obtained successfully');
      return { success: true, token: this.dataverseToken };
    } catch (error) {
      logger.error('Failed to obtain Dataverse access token:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error_description || error.message 
      };
    }
  }

  // Helper to get environment Dataverse URL
  async getEnvironmentDataverseUrl(environmentName) {
    const envResult = await this.getEnvironment(environmentName);
    
    if (envResult.success && envResult.data.environment) {
      const env = envResult.data.environment;
      // Construct Dataverse URL from environment properties
      if (env.hasDataverse) {
        // Extract environment URL from properties or construct it
        const environmentUrl = `https://${environmentName}.crm.dynamics.com/api/data/v9.2`;
        return { success: true, url: environmentUrl };
      } else {
        return { success: false, error: 'Environment does not have Dataverse enabled' };
      }
    }
    
    return { success: false, error: 'Environment not found' };
  }

  // Solution Operations
  async createSolution(solutionData, environmentUrl) {
    logger.info('Creating Power Platform solution:', solutionData.uniquename);
    
    // First get the publisher to validate it exists
    const publisherResult = await this.getPublisher(solutionData.publisherUniqueName, environmentUrl);
    if (!publisherResult.success) {
      return {
        success: false,
        error: `Publisher '${solutionData.publisherUniqueName}' not found`
      };
    }
    
    const publisher = publisherResult.data.publisher;
    
    const solutionPayload = {
      uniquename: solutionData.uniquename, // e.g., "MyCustomSolution"
      friendlyname: solutionData.friendlyname, // e.g., "My Custom Solution"
      description: solutionData.description || '',
      version: solutionData.version || '1.0.0.0',
      'publisherid@odata.bind': `/publishers(${publisher.id})`, // OData reference to publisher
      ismanaged: false // Unmanaged solution for development
    };

    logger.info('About to send solution creation request:', JSON.stringify(solutionPayload, null, 2));
    
    const result = await this.executeDataverseRequest(
      'POST', 
      'solutions', 
      solutionPayload,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error('Failed to create solution:', result);
    } else {
      logger.info('Solution created successfully:', result.data);
    }
    
    return result;
  }

  async listSolutions(environmentUrl) {
    logger.info('Listing Power Platform solutions');
    
    const result = await this.executeDataverseRequest(
      'GET', 
      'solutions?$select=solutionid,uniquename,friendlyname,description,version,ismanaged,createdon,publisherid&$expand=publisherid($select=friendlyname,uniquename,customizationprefix)&$filter=isvisible eq true&$orderby=createdon desc',
      null,
      environmentUrl
    );
    
    if (result.success) {
      logger.info(`Found ${result.data.value?.length || 0} solutions`);
      
      // Transform the response to a more usable format
      if (result.data.value) {
        result.data.solutions = result.data.value.map(sol => ({
          id: sol.solutionid,
          uniqueName: sol.uniquename,
          friendlyName: sol.friendlyname,
          description: sol.description,
          version: sol.version,
          isManaged: sol.ismanaged,
          createdOn: sol.createdon,
          publisher: {
            id: sol.publisherid,
            friendlyName: sol['publisherid@OData.Community.Display.V1.FormattedValue'] || sol.publisherid?.friendlyname,
            uniqueName: sol.publisherid?.uniquename,
            prefix: sol.publisherid?.customizationprefix
          }
        }));
      }
    }
    
    return result;
  }

  async getSolution(solutionUniqueName, environmentUrl) {
    logger.info('Getting Power Platform solution:', solutionUniqueName);
    
    const result = await this.executeDataverseRequest(
      'GET', 
      `solutions?$filter=uniquename eq '${solutionUniqueName}'&$select=solutionid,uniquename,friendlyname,description,version,ismanaged,createdon,publisherid&$expand=publisherid($select=friendlyname,uniquename,customizationprefix)`,
      null,
      environmentUrl
    );
    
    if (result.success && result.data.value && result.data.value.length > 0) {
      const sol = result.data.value[0];
      result.data.solution = {
        id: sol.solutionid,
        uniqueName: sol.uniquename,
        friendlyName: sol.friendlyname,
        description: sol.description,
        version: sol.version,
        isManaged: sol.ismanaged,
        createdOn: sol.createdon,
        publisher: {
          id: sol.publisherid,
          friendlyName: sol['publisherid@OData.Community.Display.V1.FormattedValue'] || sol.publisherid?.friendlyname,
          uniqueName: sol.publisherid?.uniquename,
          prefix: sol.publisherid?.customizationprefix
        }
      };
    } else {
      result.success = false;
      result.error = 'Solution not found';
    }
    
    return result;
  }

  async deleteSolution(solutionId, environmentUrl) {
    logger.info('Deleting Power Platform solution:', solutionId);
    
    const result = await this.executeDataverseRequest(
      'DELETE', 
      `solutions(${solutionId})`,
      null,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error('Failed to delete solution:', result);
    } else {
      logger.info('Solution deleted successfully');
    }
    
    return result;
  }

  async updateSolution(solutionId, updates, environmentUrl) {
    logger.info('Updating Power Platform solution:', solutionId);
    
    const result = await this.executeDataverseRequest(
      'PATCH', 
      `solutions(${solutionId})`,
      updates,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error('Failed to update solution:', result);
    } else {
      logger.info('Solution updated successfully');
    }
    
    return result;
  }

  // Solution Component Operations
  async addComponentToSolution(solutionUniqueName, componentData, environmentUrl) {
    logger.info(`Adding component to solution: ${solutionUniqueName}`);
    
    // Get solution first
    const solutionResult = await this.getSolution(solutionUniqueName, environmentUrl);
    if (!solutionResult.success) {
      return {
        success: false,
        error: `Solution '${solutionUniqueName}' not found`
      };
    }
    
    const componentPayload = {
      ComponentId: componentData.componentId,
      ComponentType: componentData.componentType,
      SolutionUniqueName: solutionUniqueName,
      AddRequiredComponents: componentData.addRequiredComponents || false,
      DoNotIncludeSubcomponents: componentData.doNotIncludeSubcomponents || false
    };
    
    // Use the AddSolutionComponent action
    const result = await this.executeDataverseRequest(
      'POST',
      'AddSolutionComponent',
      componentPayload,
      environmentUrl
    );
    
    return result;
  }

  async getSolutionComponents(solutionUniqueName, environmentUrl) {
    logger.info(`Getting components for solution: ${solutionUniqueName}`);
    
    // Get solution first
    const solutionResult = await this.getSolution(solutionUniqueName, environmentUrl);
    if (!solutionResult.success) {
      return {
        success: false,
        error: `Solution '${solutionUniqueName}' not found`
      };
    }
    
    const result = await this.executeDataverseRequest(
      'GET',
      `solutioncomponents?$filter=_solutionid_value eq '${solutionResult.data.solution.id}'&$select=solutioncomponentid,objectid,componenttype,createdon`,
      null,
      environmentUrl
    );
    
    if (result.success && result.data.value) {
      result.data.components = result.data.value.map(comp => ({
        id: comp.solutioncomponentid,
        objectId: comp.objectid,
        componentType: comp.componenttype,
        createdOn: comp.createdon
      }));
    }
    
    return result;
  }

  // Data Operations
  async createRecord(entityName, recordData, environmentUrl) {
    logger.info(`Creating record in ${entityName}:`, recordData);
    
    const result = await this.executeDataverseRequest(
      'POST',
      entityName,
      recordData,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error(`Failed to create record in ${entityName}:`, result);
    } else {
      logger.info(`Record created successfully in ${entityName}:`, result.data);
    }
    
    return result;
  }

  async getRecords(entityName, queryOptions = null, environmentUrl) {
    logger.info(`Getting records from ${entityName}`);
    
    let endpoint = entityName;
    if (queryOptions) {
      const params = new URLSearchParams();
      if (queryOptions.select) params.append('$select', queryOptions.select);
      if (queryOptions.filter) params.append('$filter', queryOptions.filter);
      if (queryOptions.orderby) params.append('$orderby', queryOptions.orderby);
      if (queryOptions.top) params.append('$top', queryOptions.top);
      if (queryOptions.expand) params.append('$expand', queryOptions.expand);
      if (queryOptions.count) params.append('$count', 'true');
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
    }
    
    const result = await this.executeDataverseRequest(
      'GET',
      endpoint,
      null,
      environmentUrl
    );
    
    if (result.success) {
      logger.info(`Retrieved ${result.data.value?.length || 0} records from ${entityName}`);
    }
    
    return result;
  }

  async updateRecord(entityName, recordId, updateData, environmentUrl) {
    logger.info(`Updating record in ${entityName}:`, recordId);
    
    const result = await this.executeDataverseRequest(
      'PATCH',
      `${entityName}(${recordId})`,
      updateData,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error(`Failed to update record in ${entityName}:`, result);
    } else {
      logger.info(`Record updated successfully in ${entityName}`);
    }
    
    return result;
  }

  async deleteRecord(entityName, recordId, environmentUrl) {
    logger.info(`Deleting record from ${entityName}:`, recordId);
    
    const result = await this.executeDataverseRequest(
      'DELETE',
      `${entityName}(${recordId})`,
      null,
      environmentUrl
    );
    
    if (!result.success) {
      logger.error(`Failed to delete record from ${entityName}:`, result);
    } else {
      logger.info(`Record deleted successfully from ${entityName}`);
    }
    
    return result;
  }

  // Bulk Data Operations
  async createMultipleRecords(entityName, recordsData, environmentUrl) {
    logger.info(`Creating ${recordsData.length} records in ${entityName}`);
    
    const results = [];
    for (let i = 0; i < recordsData.length; i++) {
      const recordData = recordsData[i];
      const result = await this.createRecord(entityName, recordData, environmentUrl);
      results.push({
        index: i,
        data: recordData,
        result: result
      });
      
      // Small delay to avoid rate limiting
      if (i < recordsData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successCount = results.filter(r => r.result.success).length;
    const failCount = results.filter(r => !r.result.success).length;
    
    logger.info(`Bulk creation completed: ${successCount} success, ${failCount} failed`);
    
    return {
      success: failCount === 0,
      results: results,
      summary: {
        total: recordsData.length,
        success: successCount,
        failed: failCount
      }
    };
  }

  async getRecordCount(entityName, filter = null, environmentUrl) {
    logger.info(`Getting record count for ${entityName}`);
    
    let endpoint = `${entityName}?$count=true&$top=0`;
    if (filter) {
      endpoint += `&$filter=${encodeURIComponent(filter)}`;
    }
    
    const result = await this.executeDataverseRequest(
      'GET',
      endpoint,
      null,
      environmentUrl
    );
    
    if (result.success) {
      const count = result.data['@odata.count'] || 0;
      logger.info(`Found ${count} records in ${entityName}`);
      return { success: true, count: count };
    }
    
    return { success: false, error: result.error };
  }

  // Exercise and Movement Pattern specific operations
  async createMovementPatterns(environmentUrl, patterns = null) {
    logger.info('Creating movement pattern records');
    
    const defaultPatterns = [
      {
        jr_name: 'Squat',
        jr_description: 'Hip-dominant movement pattern focusing on posterior chain strength and mobility. Fundamental for lower body development.'
      },
      {
        jr_name: 'Hinge',
        jr_description: 'Hip hinge movement pattern emphasizing posterior chain activation. Essential for deadlift variations and hip mobility.'
      },
      {
        jr_name: 'Push',
        jr_description: 'Upper body pushing movement pattern targeting chest, shoulders, and triceps. Includes horizontal and vertical pushing.'
      },
      {
        jr_name: 'Pull',
        jr_description: 'Upper body pulling movement pattern strengthening back, rear delts, and biceps. Balances pushing movements.'
      },
      {
        jr_name: 'Lunge',
        jr_description: 'Single-leg movement pattern improving unilateral strength, balance, and stability. Addresses movement asymmetries.'
      },
      {
        jr_name: 'Carry',
        jr_description: 'Loaded carry movement pattern enhancing core stability, grip strength, and functional strength endurance.'
      }
    ];
    
    const patternsToCreate = patterns || defaultPatterns;
    
    const result = await this.createMultipleRecords('jr_movementpatterns', patternsToCreate, environmentUrl);
    
    if (result.success) {
      // Return the created patterns with their IDs
      const createdPatterns = result.results
        .filter(r => r.result.success)
        .map(r => ({
          id: r.result.data.jr_movementpatternid,
          name: r.result.data.jr_name,
          description: r.result.data.jr_description
        }));
      
      return {
        success: true,
        patterns: createdPatterns,
        summary: result.summary
      };
    }
    
    return result;
  }

  async createExercisesForPatterns(environmentUrl, movementPatterns, exercises = null) {
    logger.info('Creating exercise records linked to movement patterns');
    
    const defaultExercises = [
      // Squat exercises
      { name: 'Bodyweight Squat', description: 'Basic squat using only body weight. Perfect for beginners learning the movement pattern.', patternName: 'Squat' },
      { name: 'Goblet Squat', description: 'Squat holding a dumbbell or kettlebell at chest level. Great for learning proper squat mechanics.', patternName: 'Squat' },
      { name: 'Back Squat', description: 'Barbell squat with weight on the back. The king of leg exercises for building overall lower body strength.', patternName: 'Squat' },
      { name: 'Front Squat', description: 'Barbell squat with weight at the front. Emphasizes quads and requires good mobility and core strength.', patternName: 'Squat' },
      
      // Hinge exercises
      { name: 'Romanian Deadlift', description: 'Hip hinge movement with straight legs. Excellent for hamstring and glute development.', patternName: 'Hinge' },
      { name: 'Conventional Deadlift', description: 'The king of all exercises. Full-body movement starting from the floor.', patternName: 'Hinge' },
      { name: 'Kettlebell Swing', description: 'Dynamic hip hinge movement with kettlebell. Great for power development and conditioning.', patternName: 'Hinge' },
      { name: 'Good Morning', description: 'Hip hinge with barbell on back. Targets posterior chain and teaches proper hip hinge mechanics.', patternName: 'Hinge' },
      
      // Push exercises
      { name: 'Push-up', description: 'Classic bodyweight pushing exercise. Foundational movement for upper body strength.', patternName: 'Push' },
      { name: 'Bench Press', description: 'Barbell horizontal push. Premier exercise for chest, shoulder, and tricep development.', patternName: 'Push' },
      { name: 'Overhead Press', description: 'Vertical barbell push overhead. Builds shoulder strength and core stability.', patternName: 'Push' },
      { name: 'Dumbbell Press', description: 'Horizontal dumbbell push. Allows for greater range of motion and unilateral training.', patternName: 'Push' },
      
      // Pull exercises
      { name: 'Pull-up', description: 'Vertical bodyweight pull. Ultimate test of relative upper body strength.', patternName: 'Pull' },
      { name: 'Bent-over Row', description: 'Horizontal barbell pull. Essential for back development and posture.', patternName: 'Pull' },
      { name: 'Lat Pulldown', description: 'Vertical machine pull. Great progression towards pull-ups.', patternName: 'Pull' },
      { name: 'Face Pull', description: 'Horizontal cable pull targeting rear delts. Excellent for shoulder health.', patternName: 'Pull' },
      
      // Lunge exercises
      { name: 'Forward Lunge', description: 'Step forward into lunge position. Basic unilateral leg exercise.', patternName: 'Lunge' },
      { name: 'Reverse Lunge', description: 'Step backward into lunge. Often easier on the knees than forward lunges.', patternName: 'Lunge' },
      { name: 'Walking Lunge', description: 'Moving lunge pattern. Great for functional strength and coordination.', patternName: 'Lunge' },
      { name: 'Bulgarian Split Squat', description: 'Rear foot elevated lunge. Challenging single-leg exercise.', patternName: 'Lunge' },
      
      // Carry exercises
      { name: 'Farmer\'s Walk', description: 'Carry heavy weights in each hand. Builds grip strength and core stability.', patternName: 'Carry' },
      { name: 'Suitcase Carry', description: 'Single-arm carry. Challenges lateral core stability.', patternName: 'Carry' },
      { name: 'Front Loaded Carry', description: 'Carry weight at chest level. Emphasizes posture and core strength.', patternName: 'Carry' },
      { name: 'Overhead Carry', description: 'Carry weight overhead. Ultimate shoulder stability challenge.', patternName: 'Carry' }
    ];
    
    const exercisesToCreate = exercises || defaultExercises;
    
    // Create exercise records with movement pattern relationships
    const exerciseRecords = [];
    
    for (const exercise of exercisesToCreate) {
      // Find the corresponding movement pattern
      const movementPattern = movementPatterns.find(mp => mp.name === exercise.patternName);
      
      if (!movementPattern) {
        logger.warn(`Could not find movement pattern '${exercise.patternName}' for exercise '${exercise.name}'`);
        continue;
      }
      
      exerciseRecords.push({
        jr_name: exercise.name,
        jr_description: exercise.description,
        // Link to the movement pattern using OData bind syntax
        'jr_movementpattern@odata.bind': `/jr_movementpatterns(${movementPattern.id})`
      });
    }
    
    const result = await this.createMultipleRecords('jr_exercises', exerciseRecords, environmentUrl);
    
    if (result.success) {
      // Return the created exercises with their IDs
      const createdExercises = result.results
        .filter(r => r.result.success)
        .map((r, index) => ({
          id: r.result.data.jr_exerciseid,
          name: r.result.data.jr_name,
          description: r.result.data.jr_description,
          movementPatternId: exercisesToCreate[r.index]?.patternName
        }));
      
      return {
        success: true,
        exercises: createdExercises,
        summary: result.summary
      };
    }
    
    return result;
  }

  async createCompleteDemoData(environmentUrl) {
    logger.info('Creating complete demo data for Movement Patterns and Exercises');
    
    try {
      // Step 1: Create movement patterns
      const patternsResult = await this.createMovementPatterns(environmentUrl);
      
      if (!patternsResult.success) {
        return {
          success: false,
          error: 'Failed to create movement patterns',
          details: patternsResult
        };
      }
      
      logger.info(`Created ${patternsResult.patterns.length} movement patterns`);
      
      // Step 2: Create exercises linked to movement patterns
      const exercisesResult = await this.createExercisesForPatterns(environmentUrl, patternsResult.patterns);
      
      if (!exercisesResult.success) {
        return {
          success: false,
          error: 'Failed to create exercises',
          details: exercisesResult,
          createdPatterns: patternsResult.patterns
        };
      }
      
      logger.info(`Created ${exercisesResult.exercises.length} exercises`);
      
      // Step 3: Get summary statistics
      const patternCount = await this.getRecordCount('jr_movementpatterns', null, environmentUrl);
      const exerciseCount = await this.getRecordCount('jr_exercises', null, environmentUrl);
      
      return {
        success: true,
        summary: {
          movementPatterns: patternsResult.patterns.length,
          exercises: exercisesResult.exercises.length,
          totalPatternsInSystem: patternCount.success ? patternCount.count : 'unknown',
          totalExercisesInSystem: exerciseCount.success ? exerciseCount.count : 'unknown'
        },
        data: {
          movementPatterns: patternsResult.patterns,
          exercises: exercisesResult.exercises
        }
      };
      
    } catch (error) {
      logger.error('Failed to create complete demo data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================================
  // APPLICATION USER OPERATIONS
  // =====================================

  /**
   * Create Dataverse Application User for Azure AD App Registration
   */
  async createApplicationUser(appId, displayName, environmentUrl) {
    logger.info('Creating Dataverse Application User:', { appId, displayName });
    
    try {
      // Check if application user already exists
      const existingUserResult = await this.getRecords(
        'systemusers',
        {
          filter: `applicationid eq '${appId}'`,
          select: 'systemuserid,fullname,applicationid,accessmode,userlicensetype'
        },
        environmentUrl
      );

      if (existingUserResult.success && existingUserResult.data.value && existingUserResult.data.value.length > 0) {
        const existingUser = existingUserResult.data.value[0];
        logger.info('Application user already exists:', {
          userId: existingUser.systemuserid,
          fullName: existingUser.fullname
        });
        
        return {
          success: true,
          applicationUser: {
            id: existingUser.systemuserid,
            fullName: existingUser.fullname,
            applicationId: existingUser.applicationid,
            exists: true
          }
        };
      }

      // Create new application user
      const businessUnitId = await this.getDefaultBusinessUnit(environmentUrl);
      const applicationUserData = {
        applicationid: appId,
        fullname: displayName || `App User (${appId.substring(0, 8)}...)`,
        userlicensetype: 6, // Application User license type
        accessmode: 4,     // Non-interactive access mode
        isdisabled: false
      };

      // Add business unit reference using OData bind format if available
      if (businessUnitId) {
        applicationUserData['businessunitid@odata.bind'] = `/businessunits(${businessUnitId})`;
      }

      const result = await this.createRecord('systemusers', applicationUserData, environmentUrl);

      if (!result.success) {
        logger.error('Failed to create application user:', result);
        return {
          success: false,
          error: `Failed to create application user: ${result.error}`
        };
      }

      logger.info('Application user created successfully:', {
        userId: result.data.systemuserid,
        fullName: applicationUserData.fullname,
        appId: appId
      });

      return {
        success: true,
        applicationUser: {
          id: result.data.systemuserid,
          fullName: applicationUserData.fullname,
          applicationId: appId,
          exists: false
        }
      };

    } catch (error) {
      logger.error('Failed to create application user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the default business unit for the environment
   */
  async getDefaultBusinessUnit(environmentUrl) {
    try {
      const result = await this.getRecords(
        'businessunits',
        {
          filter: 'parentbusinessunitid eq null',
          select: 'businessunitid,name',
          top: 1
        },
        environmentUrl
      );

      if (result.success && result.data.value && result.data.value.length > 0) {
        const businessUnit = result.data.value[0];
        logger.info('Found default business unit:', {
          id: businessUnit.businessunitid,
          name: businessUnit.name
        });
        return businessUnit.businessunitid;
      }

      // Fallback - try to get any business unit
      const fallbackResult = await this.getRecords(
        'businessunits',
        { select: 'businessunitid,name', top: 1 },
        environmentUrl
      );

      if (fallbackResult.success && fallbackResult.data.value && fallbackResult.data.value.length > 0) {
        const businessUnit = fallbackResult.data.value[0];
        logger.warn('Using fallback business unit:', {
          id: businessUnit.businessunitid,
          name: businessUnit.name
        });
        return businessUnit.businessunitid;
      }

      logger.warn('No business unit found, creating user without business unit reference');
      return null;

    } catch (error) {
      logger.error('Failed to get business unit:', error);
      return null;
    }
  }

  /**
   * Assign security role to application user
   */
  async assignSecurityRoleToApplicationUser(userId, roleName, environmentUrl) {
    logger.info('Assigning security role to application user:', { userId, roleName });
    
    try {
      // Get the security role by name
      const roleResult = await this.getRecords(
        'roles',
        {
          filter: `name eq '${roleName}'`,
          select: 'roleid,name'
        },
        environmentUrl
      );

      if (!roleResult.success || !roleResult.data.value || roleResult.data.value.length === 0) {
        return {
          success: false,
          error: `Security role '${roleName}' not found`
        };
      }

      const role = roleResult.data.value[0];
      
      // Assign the role using the Associate action
      const associationData = {
        "@odata.id": `${environmentUrl}/roles(${role.roleid})`
      };

      const result = await this.executeDataverseRequest(
        'POST',
        `systemusers(${userId})/systemuserroles_association/$ref`,
        associationData,
        environmentUrl
      );

      if (result.success) {
        logger.info('Security role assigned successfully:', {
          userId,
          roleId: role.roleid,
          roleName: role.name
        });

        return {
          success: true,
          roleAssignment: {
            userId,
            roleId: role.roleid,
            roleName: role.name
          }
        };
      } else {
        logger.error('Failed to assign security role:', result);
        return {
          success: false,
          error: `Failed to assign security role: ${result.error}`
        };
      }

    } catch (error) {
      logger.error('Failed to assign security role:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create application user with default System Administrator role
   */
  async createApplicationUserWithRole(appId, displayName, environmentUrl, roleName = 'System Administrator') {
    logger.info('Creating application user with security role:', { appId, displayName, roleName });
    
    try {
      // Step 1: Create the application user
      const userResult = await this.createApplicationUser(appId, displayName, environmentUrl);
      
      if (!userResult.success) {
        return userResult;
      }

      const applicationUser = userResult.applicationUser;
      
      // Step 2: Assign security role (always ensure user has the correct role)
      const roleResult = await this.assignSecurityRoleToApplicationUser(
        applicationUser.id,
        roleName,
        environmentUrl
      );

      if (!roleResult.success) {
        logger.warn('Application user exists but role assignment failed:', roleResult.error);
        return {
          success: true,
          applicationUser: applicationUser,
          roleAssignment: {
            success: false,
            error: roleResult.error
          }
        };
      }

      return {
        success: true,
        applicationUser: applicationUser,
        roleAssignment: roleResult.roleAssignment
      };

    } catch (error) {
      logger.error('Failed to create application user with role:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List application users in environment
   */
  async listApplicationUsers(environmentUrl) {
    logger.info('Listing application users in environment');
    
    const result = await this.getRecords(
      'systemusers',
      {
        filter: 'userlicensetype eq 6 and accessmode eq 4', // Application users
        select: 'systemuserid,fullname,applicationid,createdon,isdisabled',
        orderby: 'createdon desc'
      },
      environmentUrl
    );

    if (result.success && result.data.value) {
      const applicationUsers = result.data.value.map(user => ({
        id: user.systemuserid,
        fullName: user.fullname,
        applicationId: user.applicationid,
        createdOn: user.createdon,
        isDisabled: user.isdisabled
      }));

      return {
        success: true,
        applicationUsers: applicationUsers,
        count: applicationUsers.length
      };
    }

    return result;
  }

  // =====================================
  // GENERIC TABLE OPERATIONS
  // =====================================

  /**
   * Create a custom table with specified fields
   */
  async createTable(tableConfig, environmentUrl) {
    logger.info('Creating custom table:', tableConfig.logicalName);
    
    try {
      // Create the table entity metadata
      const entityMetadata = {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        SchemaName: tableConfig.schemaName || tableConfig.logicalName,
        LogicalName: tableConfig.logicalName,
        DisplayName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: tableConfig.displayName,
            LanguageCode: 1033
          }]
        },
        DisplayCollectionName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", 
            Label: tableConfig.pluralDisplayName || `${tableConfig.displayName}s`,
            LanguageCode: 1033
          }]
        },
        Description: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: tableConfig.description || '',
            LanguageCode: 1033
          }]
        },
        OwnershipType: "UserOwned", // UserOwned, OrganizationOwned, TeamOwned
        TableType: "Standard",
        HasActivities: false,
        HasNotes: true,
        IsActivity: false,
        IsActivityParty: false,
        IsAuditEnabled: { Value: true },
        IsAvailableOffline: true,
        IsDocumentManagementEnabled: false,
        IsMailMergeEnabled: { Value: false },
        IsValidForQueue: { Value: false },
        IsConnectionsEnabled: { Value: false }
      };

      // Add primary name attribute to the table definition
      const primaryNameField = {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        AttributeType: "String",
        AttributeTypeName: { Value: "StringType" },
        SchemaName: tableConfig.primaryFieldName || "jr_name",
        LogicalName: (tableConfig.primaryFieldName || "jr_name").toLowerCase(),
        DisplayName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: "Name",
            LanguageCode: 1033
          }]
        },
        Description: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: "The primary name field for the record",
            LanguageCode: 1033
          }]
        },
        RequiredLevel: { Value: "ApplicationRequired" },
        MaxLength: 100,
        FormatName: { Value: "Text" },
        IsPrimaryName: true
      };

      // Add primary field and any custom fields to attributes array
      const allAttributes = [primaryNameField];
      if (tableConfig.fields && tableConfig.fields.length > 0) {
        allAttributes.push(...tableConfig.fields.map(field => this.createFieldMetadata(field)));
      }
      entityMetadata.Attributes = allAttributes;

      const result = await this.executeDataverseRequest(
        'POST',
        'EntityDefinitions',
        entityMetadata,
        environmentUrl
      );

      if (result.success) {
        logger.info('Table created successfully:', {
          logicalName: tableConfig.logicalName,
          displayName: tableConfig.displayName
        });
        
        return {
          success: true,
          table: {
            logicalName: tableConfig.logicalName,
            displayName: tableConfig.displayName,
            metadataId: result.data.MetadataId
          }
        };
      } else {
        logger.error('Failed to create table:', result);
        return result;
      }
      
    } catch (error) {
      logger.error('Failed to create table:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create field metadata based on field configuration
   */
  createFieldMetadata(fieldConfig) {
    const baseMetadata = {
      LogicalName: fieldConfig.logicalName,
      DisplayName: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [{
          "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
          Label: fieldConfig.displayName,
          LanguageCode: 1033
        }]
      },
      Description: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label", 
        LocalizedLabels: [{
          "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
          Label: fieldConfig.description || '',
          LanguageCode: 1033
        }]
      },
      RequiredLevel: {
        Value: fieldConfig.required ? "ApplicationRequired" : "None"
      },
      IsAuditEnabled: { Value: true },
      IsCustomizable: { Value: true },
      IsRenameable: { Value: true },
      IsValidForAdvancedFind: { Value: true },
      IsValidForCreate: { Value: true },
      IsValidForRead: { Value: true },
      IsValidForUpdate: { Value: true }
    };

    // Set field type specific properties
    switch (fieldConfig.type.toLowerCase()) {
      case 'string':
      case 'text':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
          AttributeType: "String",
          AttributeTypeName: { Value: "StringType" },
          MaxLength: fieldConfig.maxLength || 100,
          FormatName: { Value: "Text" }
        };

      case 'memo':
      case 'multiline':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
          AttributeType: "Memo",
          AttributeTypeName: { Value: "MemoType" },
          MaxLength: fieldConfig.maxLength || 2000,
          Format: "TextArea"
        };

      case 'integer':
      case 'number':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
          AttributeType: "Integer",
          AttributeTypeName: { Value: "IntegerType" },
          MinValue: fieldConfig.minValue || -2147483648,
          MaxValue: fieldConfig.maxValue || 2147483647,
          Format: "None"
        };

      case 'decimal':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
          AttributeType: "Decimal",
          AttributeTypeName: { Value: "DecimalType" },
          MinValue: fieldConfig.minValue || -100000000000,
          MaxValue: fieldConfig.maxValue || 100000000000,
          Precision: fieldConfig.precision || 2,
          ImeMode: "Disabled"
        };

      case 'money':
      case 'currency':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
          AttributeType: "Money",
          AttributeTypeName: { Value: "MoneyType" },
          MinValue: fieldConfig.minValue || -922337203685477,
          MaxValue: fieldConfig.maxValue || 922337203685477,
          Precision: fieldConfig.precision || 4,
          PrecisionSource: 2,
          ImeMode: "Disabled"
        };

      case 'datetime':
      case 'date':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
          AttributeType: "DateTime",
          AttributeTypeName: { Value: "DateTimeType" },
          Format: fieldConfig.format || "DateAndTime",
          ImeMode: "Disabled"
        };

      case 'boolean':
      case 'yesno':
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
          AttributeType: "Boolean",
          AttributeTypeName: { Value: "BooleanType" },
          OptionSet: {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            TrueOption: {
              Value: 1,
              Label: {
                "@odata.type": "Microsoft.Dynamics.CRM.Label",
                LocalizedLabels: [{
                  "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                  Label: fieldConfig.trueLabel || "Yes",
                  LanguageCode: 1033
                }]
              }
            },
            FalseOption: {
              Value: 0,
              Label: {
                "@odata.type": "Microsoft.Dynamics.CRM.Label",
                LocalizedLabels: [{
                  "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                  Label: fieldConfig.falseLabel || "No",
                  LanguageCode: 1033
                }]
              }
            }
          }
        };

      case 'lookup':
        if (!fieldConfig.targetTable) {
          throw new Error('Lookup fields require targetTable to be specified');
        }
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
          AttributeType: "Lookup",
          AttributeTypeName: { Value: "LookupType" },
          Targets: [fieldConfig.targetTable]
        };

      case 'picklist':
      case 'optionset':
        if (!fieldConfig.options || fieldConfig.options.length === 0) {
          throw new Error('Picklist fields require options to be specified');
        }
        return {
          ...baseMetadata,
          "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
          AttributeType: "Picklist",
          AttributeTypeName: { Value: "PicklistType" },
          OptionSet: {
            "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
            IsGlobal: false,
            Options: fieldConfig.options.map((option, index) => ({
              Value: option.value || (index + 1),
              Label: {
                "@odata.type": "Microsoft.Dynamics.CRM.Label",
                LocalizedLabels: [{
                  "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                  Label: option.label,
                  LanguageCode: 1033
                }]
              }
            }))
          }
        };

      default:
        throw new Error(`Unsupported field type: ${fieldConfig.type}`);
    }
  }

  /**
   * Add a field to an existing table
   */
  async addFieldToTable(tableLogicalName, fieldConfig, environmentUrl) {
    logger.info(`Adding field to table ${tableLogicalName}:`, fieldConfig.logicalName);
    
    try {
      const fieldMetadata = this.createFieldMetadata(fieldConfig);
      
      const result = await this.executeDataverseRequest(
        'POST',
        `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes`,
        fieldMetadata,
        environmentUrl
      );

      if (result.success) {
        logger.info('Field added successfully:', {
          table: tableLogicalName,
          field: fieldConfig.logicalName
        });
      }

      return result;
      
    } catch (error) {
      logger.error('Failed to add field to table:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================================
  // RELATIONSHIP OPERATIONS
  // =====================================

  /**
   * Create a one-to-many relationship between tables
   */
  async createOneToManyRelationship(relationshipConfig, environmentUrl) {
    logger.info('Creating one-to-many relationship:', relationshipConfig.schemaName);
    
    try {
      const relationshipMetadata = {
        "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
        SchemaName: relationshipConfig.schemaName,
        ReferencedEntity: relationshipConfig.referencedEntity,
        ReferencingEntity: relationshipConfig.referencingEntity,
        ReferencedAttribute: relationshipConfig.referencedAttribute || `${relationshipConfig.referencedEntity}id`,
        AssociatedMenuConfiguration: {
          Behavior: "UseCollectionName",
          Group: "Details",
          Label: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [{
              "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
              Label: relationshipConfig.menuLabel || relationshipConfig.referencingEntity,
              LanguageCode: 1033
            }]
          },
          Order: 10000
        },
        CascadeConfiguration: {
          Assign: "NoCascade",
          Delete: "RemoveLink",
          Merge: "NoCascade", 
          Reparent: "NoCascade",
          Share: "NoCascade",
          Unshare: "NoCascade"
        },
        Lookup: {
          "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
          AttributeType: "Lookup",
          AttributeTypeName: { Value: "LookupType" },
          SchemaName: relationshipConfig.lookupField?.schemaName || `${relationshipConfig.referencedEntity}_lookup`,
          DisplayName: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [{
              "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
              Label: relationshipConfig.lookupField?.displayName || relationshipConfig.referencedEntity,
              LanguageCode: 1033
            }]
          },
          RequiredLevel: { Value: relationshipConfig.lookupField?.required ? "ApplicationRequired" : "None" }
        }
      };

      const result = await this.executeDataverseRequest(
        'POST',
        'RelationshipDefinitions',
        relationshipMetadata,
        environmentUrl
      );

      return result;
      
    } catch (error) {
      logger.error('Failed to create relationship:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a table to a solution
   * @param {string} tableName - Logical name of table
   * @param {string} solutionName - Unique name of solution
   * @param {string} environmentUrl - Dataverse environment URL
   */
  async addTableToSolution(tableName, solutionName, environmentUrl) {
    logger.info(`Adding table ${tableName} to solution ${solutionName}`);
    
    try {
      // Get table metadata ID
      const tableMetadata = await this.executeDataverseRequest(
        'GET',
        `EntityDefinitions?$filter=LogicalName eq '${tableName}'&$select=MetadataId`,
        null,
        environmentUrl
      );

      if (!tableMetadata.success || !tableMetadata.data.value || tableMetadata.data.value.length === 0) {
        return {
          success: false,
          error: `Table ${tableName} not found`
        };
      }

      const metadataId = tableMetadata.data.value[0].MetadataId;

      const result = await this.addComponentToSolution(
        solutionName,
        {
          componentId: metadataId,
          componentType: 1, // Entity
          addRequiredComponents: true
        },
        environmentUrl
      );

      return result;
      
    } catch (error) {
      logger.error('Failed to add table to solution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a many-to-many relationship between tables
   */
  async createManyToManyRelationship(relationshipConfig, environmentUrl) {
    logger.info('Creating many-to-many relationship:', relationshipConfig.schemaName);
    
    try {
      const relationshipMetadata = {
        "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata",
        SchemaName: relationshipConfig.schemaName,
        Entity1LogicalName: relationshipConfig.entity1LogicalName,
        Entity2LogicalName: relationshipConfig.entity2LogicalName,
        IntersectEntityName: relationshipConfig.intersectEntityName || `${relationshipConfig.entity1LogicalName}_${relationshipConfig.entity2LogicalName}`,
        Entity1AssociatedMenuConfiguration: {
          Behavior: relationshipConfig.entity1MenuBehavior || "UseLabel",
          Group: "Details", 
          Label: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [{
              "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
              Label: relationshipConfig.entity1MenuLabel || relationshipConfig.entity2LogicalName,
              LanguageCode: 1033
            }]
          },
          Order: relationshipConfig.entity1MenuOrder || 10000
        },
        Entity2AssociatedMenuConfiguration: {
          Behavior: relationshipConfig.entity2MenuBehavior || "UseLabel",
          Group: "Details",
          Label: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label", 
            LocalizedLabels: [{
              "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
              Label: relationshipConfig.entity2MenuLabel || relationshipConfig.entity1LogicalName,
              LanguageCode: 1033
            }]
          },
          Order: relationshipConfig.entity2MenuOrder || 10000
        }
      };

      // Add navigation property names if specified
      if (relationshipConfig.entity1NavigationPropertyName) {
        relationshipMetadata.Entity1NavigationPropertyName = relationshipConfig.entity1NavigationPropertyName;
      }
      
      if (relationshipConfig.entity2NavigationPropertyName) {
        relationshipMetadata.Entity2NavigationPropertyName = relationshipConfig.entity2NavigationPropertyName;
      }

      const result = await this.executeDataverseRequest(
        'POST',
        'RelationshipDefinitions',
        relationshipMetadata,
        environmentUrl
      );

      if (result.success) {
        logger.info('Many-to-many relationship created successfully:', {
          schemaName: relationshipConfig.schemaName,
          entity1: relationshipConfig.entity1LogicalName,
          entity2: relationshipConfig.entity2LogicalName
        });
      }

      return result;
      
    } catch (error) {
      logger.error('Failed to create many-to-many relationship:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List relationships for a table
   */
  async listTableRelationships(tableLogicalName, environmentUrl) {
    logger.info('Listing relationships for table:', tableLogicalName);
    
    try {
      const result = await this.executeDataverseRequest(
        'GET',
        `EntityDefinitions(LogicalName='${tableLogicalName}')?$expand=OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships`,
        null,
        environmentUrl
      );

      if (result.success) {
        const relationships = {
          oneToMany: result.data.OneToManyRelationships || [],
          manyToOne: result.data.ManyToOneRelationships || [],
          manyToMany: result.data.ManyToManyRelationships || []
        };

        logger.info(`Found relationships for ${tableLogicalName}:`, {
          oneToMany: relationships.oneToMany.length,
          manyToOne: relationships.manyToOne.length,
          manyToMany: relationships.manyToMany.length
        });

        return {
          success: true,
          relationships: relationships
        };
      }

      return result;
      
    } catch (error) {
      logger.error('Failed to list table relationships:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('Disconnected from Power Platform');
  }
}

module.exports = PowerPlatformMCPClient;