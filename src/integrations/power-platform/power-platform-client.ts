import axios, { AxiosResponse, AxiosError } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  EntityRecord,
  TableMetadata,
  OneToManyRelationshipMetadata
} from '../../types/power-platform-interfaces';

// Configuration interfaces
interface ApplicationConfig {
  azure: AzureConfig;
  powerPlatform?: PowerPlatformConfig;
}

interface AzureConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

interface PowerPlatformConfig {
  environmentUrl: string;
  useInteractiveAuth: boolean;
  defaultRegion: string;
}

// Environment and metadata interfaces
interface EnvironmentInfo {
  name: string;
  displayName: string;
  type: string;
  state: string;
  location: string;
  hasDataverse: boolean;
  webApiUrl?: string;
}

interface PublisherInfo {
  id: string;
  uniqueName: string;
  friendlyName: string;
  description: string;
  customizationPrefix: string;
  isSystem: boolean;
}

interface SolutionInfo {
  id: string;
  uniqueName: string;
  friendlyName: string;
  description: string;
  version: string;
  isManaged: boolean;
  publisherId: string;
}

interface ApplicationUserInfo {
  id: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  domainName: string;
}

const execAsync = promisify(exec);

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

interface ExecuteRequestResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

// Custom response types that include success field
type PowerPlatformCreateResponse = 
  | { success: true; data: { id: string; message: string } }
  | { success: false; error: string };

type ListEnvironmentsResponse = 
  | { success: true; data: { environments: EnvironmentInfo[] } }
  | { success: false; error: string };

type ListPublishersResponse = 
  | { success: true; data: { publishers: PublisherInfo[] } }
  | { success: false; error: string };

type ListSolutionsResponse = 
  | { success: true; data: { solutions: SolutionInfo[] } }
  | { success: false; error: string };

type ListApplicationUsersResponse = 
  | { success: true; data: { users: ApplicationUserInfo[] } }
  | { success: false; error: string };

export class PowerPlatformMCPClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly adminBaseUrl: string = 'https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform';
  private readonly authUrl: string;
  private readonly useInteractiveAuth: boolean;
  
  private isConnected: boolean = false;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config?: ApplicationConfig) {
    this.clientId = config?.azure.clientId || process.env.AZURE_CLIENT_ID || '';
    this.clientSecret = config?.azure.clientSecret || process.env.AZURE_CLIENT_SECRET || '';
    this.tenantId = config?.azure.tenantId || process.env.AZURE_TENANT_ID || '';
    this.authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    this.useInteractiveAuth = process.env.AZURE_USE_INTERACTIVE_AUTH === 'true';

    console.log('Power Platform MCP Client initialized', {
      useInteractiveAuth: this.useInteractiveAuth
    });
  }

  async connect(): Promise<boolean> {
    try {
      console.log('Testing Power Platform connection...', {
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
      console.log('Power Platform connection validated successfully');
      return true;
    } catch (error) {
      console.error('Power Platform connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async getAccessToken(): Promise<AuthResult> {
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

      const response: AxiosResponse<TokenResponse> = await axios.post(
        this.authUrl, 
        new URLSearchParams(tokenData), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);

      console.log('Power Platform access token obtained successfully');
      return { success: true, token: this.accessToken || '' };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to obtain Power Platform access token:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: (axiosError.response?.data as any)?.error_description || axiosError.message
      };
    }
  }

  async getInteractiveToken(forDataverse: boolean = false, environmentUrl: string | null = null): Promise<AuthResult> {
    try {
      let scope = 'https://service.powerapps.com/.default';
      
      if (forDataverse && environmentUrl) {
        // Extract environment domain from URL for Dataverse scope
        const url = new URL(environmentUrl);
        scope = `${url.protocol}//${url.hostname}/.default`;
      }

      const azLoginCmd = `az account get-access-token --scope "${scope}" --output json`;
      console.log('Executing Azure CLI command for interactive auth...');
      
      const { stdout } = await execAsync(azLoginCmd);
      const tokenData = JSON.parse(stdout);
      
      this.accessToken = tokenData.accessToken;
      this.tokenExpiry = new Date(tokenData.expiresOn).getTime();
      
      console.log('Interactive authentication successful');
      return { success: true, token: this.accessToken || '' };
    } catch (error) {
      console.error('Interactive authentication failed:', error);
      
      if (error instanceof Error && error.message.includes('az: command not found')) {
        return {
          success: false,
          error: 'Azure CLI not installed. Please install Azure CLI and run "az login" first.'
        };
      }
      
      if (error instanceof Error && error.message.includes('Please run \'az login\'')) {
        return {
          success: false,
          error: 'Not logged in to Azure CLI. Please run "az login" first.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      };
    }
  }

  async executeRequest(method: string, endpoint: string, data?: any): Promise<ExecuteRequestResult> {
    try {
      if (!this.accessToken) {
        const tokenResult = await this.getAccessToken();
        if (!tokenResult.success) {
          return { success: false, error: `Authentication failed: ${tokenResult.error}` };
        }
      }

      const url = `${this.adminBaseUrl}/${endpoint}`;
      const config = {
        method: method.toUpperCase(),
        url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: data || undefined
      };

      const response = await axios(config);
      return { 
        success: true, 
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Power Platform API request failed [${method} ${endpoint}]:`, axiosError.response?.data || axiosError.message);
      
      return {
        success: false,
        error: axiosError.response?.data ? 
          JSON.stringify(axiosError.response.data) : 
          axiosError.message,
        statusCode: axiosError.response?.status || 500
      };
    }
  }

  async executeDataverseRequest(method: string, endpoint: string, data: any, environmentUrl: string): Promise<ExecuteRequestResult> {
    try {
      // Get Dataverse-specific token
      const tokenResult = await this.getInteractiveToken(true, environmentUrl);
      if (!tokenResult.success) {
        return { success: false, error: `Dataverse authentication failed: ${tokenResult.error}` };
      }

      const url = `${environmentUrl}/${endpoint}`;
      const config = {
        method: method.toUpperCase(),
        url,
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json'
        },
        data: data || undefined
      };

      const response = await axios(config);
      return { 
        success: true, 
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Dataverse API request failed [${method} ${endpoint}]:`, axiosError.response?.data || axiosError.message);
      
      return {
        success: false,
        error: axiosError.response?.data ? 
          JSON.stringify(axiosError.response.data) : 
          axiosError.message,
        statusCode: axiosError.response?.status || 500
      };
    }
  }

  // Environment Management
  async listEnvironments(): Promise<ListEnvironmentsResponse> {
    const result = await this.executeRequest('GET', 'environments?api-version=2020-10-01');
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    const environments: EnvironmentInfo[] = result.data?.value?.map((env: any) => ({
      name: env.name,
      displayName: env.properties?.displayName || env.name,
      type: env.properties?.environmentSku || 'Unknown',
      state: env.properties?.provisioningState || 'Unknown',
      location: env.location,
      hasDataverse: !!env.properties?.linkedEnvironmentMetadata?.instanceUrl,
      webApiUrl: env.properties?.linkedEnvironmentMetadata?.instanceUrl ? 
        `${env.properties.linkedEnvironmentMetadata.instanceUrl}/api/data/v9.2` : undefined
    })) || [];

    return { success: true, data: { environments } };
  }

  async createEnvironment(environmentData: any): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeRequest('POST', 'environments?api-version=2020-10-01', environmentData);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.name || 'unknown',
        message: 'Environment creation initiated'
      }
    };
  }

  // Publisher Management
  async listPublishers(environmentUrl: string): Promise<ListPublishersResponse> {
    const result = await this.executeDataverseRequest('GET', 'publishers', null, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    const publishers: PublisherInfo[] = result.data?.value?.map((pub: any) => ({
      id: pub.publisherid,
      uniqueName: pub.uniquename,
      friendlyName: pub.friendlyname,
      description: pub.description,
      customizationPrefix: pub.customizationprefix,
      isSystem: pub.issystem
    })) || [];

    return { success: true, data: { publishers } };
  }

  async createPublisher(publisherData: any, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', 'publishers', publisherData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.publisherid || 'unknown',
        message: 'Publisher created successfully'
      }
    };
  }

  // Solution Management
  async listSolutions(environmentUrl: string): Promise<ListSolutionsResponse> {
    const result = await this.executeDataverseRequest('GET', 'solutions', null, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    const solutions: SolutionInfo[] = result.data?.value?.map((sol: any) => ({
      id: sol.solutionid,
      uniqueName: sol.uniquename,
      friendlyName: sol.friendlyname,
      description: sol.description,
      version: sol.version,
      isManaged: sol.ismanaged,
      publisherId: sol._publisherid_value
    })) || [];

    return { success: true, data: { solutions } };
  }

  async createSolution(solutionData: any, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', 'solutions', solutionData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.solutionid || 'unknown',
        message: 'Solution created successfully'
      }
    };
  }

  // Table Management
  async createTable(tableData: TableMetadata, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', 'EntityDefinitions', tableData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.MetadataId || 'unknown',
        message: 'Table created successfully'
      }
    };
  }

  async createOneToManyRelationship(relationshipData: OneToManyRelationshipMetadata, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', 'RelationshipDefinitions', relationshipData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.MetadataId || 'unknown',
        message: 'Relationship created successfully'
      }
    };
  }

  // Record Management
  async createRecord(entityName: string, recordData: EntityRecord, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', entityName, recordData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.id || 'unknown',
        message: 'Record created successfully'
      }
    };
  }

  async createMultipleRecords(entityName: string, records: EntityRecord[], environmentUrl: string): Promise<PowerPlatformCreateResponse[]> {
    const results: PowerPlatformCreateResponse[] = [];
    
    for (const record of records) {
      const result = await this.createRecord(entityName, record, environmentUrl);
      results.push(result);
    }
    
    return results;
  }

  async getRecord(entityName: string, recordId: string, environmentUrl: string, selectFields?: string[]): Promise<ExecuteRequestResult> {
    let endpoint = `${entityName}(${recordId})`;
    
    if (selectFields && selectFields.length > 0) {
      endpoint += `?$select=${selectFields.join(',')}`;
    }
    
    return await this.executeDataverseRequest('GET', endpoint, null, environmentUrl);
  }

  async updateRecord(entityName: string, recordId: string, updateData: Partial<EntityRecord>, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('PATCH', `${entityName}(${recordId})`, updateData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: recordId,
        message: 'Record updated successfully'
      }
    };
  }

  async deleteRecord(entityName: string, recordId: string, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('DELETE', `${entityName}(${recordId})`, null, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: recordId,
        message: 'Record deleted successfully'
      }
    };
  }

  // Solution Component Management
  async addTableToSolution(tableName: string, solutionName: string, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    // First get the table metadata to find its MetadataId
    const tableMetadata = await this.executeDataverseRequest(
      'GET', 
      `EntityDefinitions?$filter=LogicalName eq '${tableName}'&$select=MetadataId`, 
      null, 
      environmentUrl
    );

    if (!tableMetadata.success || !tableMetadata.data?.value?.[0]) {
      return { success: false, error: `Table ${tableName} not found` };
    }

    const metadataId = tableMetadata.data.value[0].MetadataId;

    // Add the component to solution
    return await this.addComponentToSolution(solutionName, {
      componentId: metadataId,
      componentType: 1, // Entity component type
      addRequiredComponents: true
    }, environmentUrl);
  }

  async addComponentToSolution(solutionName: string, componentData: any, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest(
      'POST', 
      `solutions(uniquename='${solutionName}')/Microsoft.Dynamics.CRM.AddSolutionComponent`, 
      componentData, 
      environmentUrl
    );
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: 'component-added',
        message: 'Component added to solution successfully'
      }
    };
  }

  // Application User Management
  async listApplicationUsers(environmentUrl: string): Promise<ListApplicationUsersResponse> {
    const result = await this.executeDataverseRequest(
      'GET', 
      'systemusers?$filter=applicationid ne null&$select=systemuserid,applicationid,firstname,lastname,domainname', 
      null, 
      environmentUrl
    );
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    const users: ApplicationUserInfo[] = result.data?.value?.map((user: any) => ({
      id: user.systemuserid,
      applicationId: user.applicationid,
      firstName: user.firstname,
      lastName: user.lastname,
      domainName: user.domainname
    })) || [];

    return { success: true, data: { users } };
  }

  async createApplicationUser(userData: any, environmentUrl: string): Promise<PowerPlatformCreateResponse> {
    const result = await this.executeDataverseRequest('POST', 'systemusers', userData, environmentUrl);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { 
      success: true, 
      data: { 
        id: result.data?.systemuserid || 'unknown',
        message: 'Application user created successfully'
      }
    };
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    console.log('Power Platform client disconnected');
  }
}

export default PowerPlatformMCPClient;