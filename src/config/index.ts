import * as dotenv from 'dotenv';
import * as path from 'path';
import type { 
  IAppConfig, 
  IAzureConfig,
  IConfig, 
  IMcpConfig, 
  IPowerPlatformConfig, 
  ITemplatesConfig
} from './types';

// Load environment variables
dotenv.config();

/**
 * Parse integer from environment variable with fallback
 */
function parseIntWithDefault(value: string | undefined, defaultValue: number): number {
  const parsed = parseInt(value ?? '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

/**
 * Application configuration
 */
const appConfig: IAppConfig = {
  name: 'power-platform-orchestration-agent',
  version: '1.0.0',
  environment: process.env.NODE_ENV ?? 'development',
  port: parseIntWithDefault(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info'
};

/**
 * Azure configuration
 */
const azureConfig: IAzureConfig = {
  devops: {
    organization: process.env.AZURE_DEVOPS_ORG ?? '',
    personalAccessToken: process.env.AZURE_DEVOPS_PAT ?? '',
    get baseUrl(): string {
      return `https://dev.azure.com/${this.organization}`;
    }
  },
  auth: {
    ...(process.env.AZURE_CLIENT_ID !== undefined && process.env.AZURE_CLIENT_ID !== '' ? { clientId: process.env.AZURE_CLIENT_ID } : {}),
    ...(process.env.AZURE_CLIENT_SECRET !== undefined && process.env.AZURE_CLIENT_SECRET !== '' ? { clientSecret: process.env.AZURE_CLIENT_SECRET } : {}),
    ...(process.env.AZURE_TENANT_ID !== undefined && process.env.AZURE_TENANT_ID !== '' ? { tenantId: process.env.AZURE_TENANT_ID } : {}),
    ...(process.env.AZURE_SUBSCRIPTION_ID !== undefined && process.env.AZURE_SUBSCRIPTION_ID !== '' ? { subscriptionId: process.env.AZURE_SUBSCRIPTION_ID } : {})
  }
};

/**
 * Power Platform configuration
 */
const powerPlatformConfig: IPowerPlatformConfig = {
  auth: {
    ...(process.env.POWER_PLATFORM_TENANT_ID !== undefined && process.env.POWER_PLATFORM_TENANT_ID !== '' ? { tenantId: process.env.POWER_PLATFORM_TENANT_ID } : {}),
    ...(process.env.POWER_PLATFORM_CLIENT_ID !== undefined && process.env.POWER_PLATFORM_CLIENT_ID !== '' ? { clientId: process.env.POWER_PLATFORM_CLIENT_ID } : {}),
    ...(process.env.POWER_PLATFORM_CLIENT_SECRET !== undefined && process.env.POWER_PLATFORM_CLIENT_SECRET !== '' ? { clientSecret: process.env.POWER_PLATFORM_CLIENT_SECRET } : {})
  }
};


/**
 * MCP servers configuration
 */
const mcpConfig: IMcpConfig = {
  azureDevOps: {
    enabled: parseBoolean(process.env.MCP_AZURE_DEVOPS_ENABLED),
    serverName: 'azure-devops'
  },
  microsoftGraph: {
    enabled: parseBoolean(process.env.MCP_MICROSOFT_GRAPH_ENABLED),
    serverName: 'microsoft-graph'
  },
  powerPlatform: {
    enabled: parseBoolean(process.env.MCP_POWER_PLATFORM_ENABLED),
    serverName: 'power-platform'
  }
};

/**
 * Templates configuration
 */
const templatesConfig: ITemplatesConfig = {
  directory: path.join(__dirname, '../templates'),
  defaultTemplate: 's-project'
};

/**
 * Complete configuration object
 */
const config: IConfig = {
  app: appConfig,
  azure: azureConfig,
  powerPlatform: powerPlatformConfig,
  mcp: mcpConfig,
  templates: templatesConfig
};

/**
 * Validate required environment variables
 */
function validateConfig(): void {
  const required: string[] = [
    'AZURE_DEVOPS_ORG',
    'AZURE_DEVOPS_PAT',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID'
  ];

  const missing = required.filter(key => process.env[key] === undefined || process.env[key] === '');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate configuration in production
if (config.app.environment === 'production') {
  validateConfig();
}

export default config;
export { validateConfig };