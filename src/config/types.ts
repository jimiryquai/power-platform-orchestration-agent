/**
 * Configuration type definitions for the Power Platform Orchestration Agent
 */

export interface IAppConfig {
  name: string;
  version: string;
  environment: string;
  port: number;
  logLevel: string;
}

export interface IAzureDevOpsConfig {
  organization: string;
  personalAccessToken: string;
  readonly baseUrl: string;
}

export interface IAzureAuthConfig {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  subscriptionId?: string;
}

export interface IAzureConfig {
  devops: IAzureDevOpsConfig;
  auth: IAzureAuthConfig;
}

export interface IPowerPlatformAuthConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface IPowerPlatformConfig {
  auth: IPowerPlatformAuthConfig;
}

export interface IN8nConfig {
  host: string;
  port: number;
  protocol: string;
  apiKey?: string;
  readonly baseUrl: string;
}

export interface IRedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface IMcpServerConfig {
  enabled: boolean;
  serverName: string;
}

export interface IMcpConfig {
  azureDevOps: IMcpServerConfig;
  microsoftGraph: IMcpServerConfig;
  n8n: IMcpServerConfig;
  docker: IMcpServerConfig;
}

export interface ITemplatesConfig {
  directory: string;
  defaultTemplate: string;
}

export interface IConfig {
  app: IAppConfig;
  azure: IAzureConfig;
  powerPlatform: IPowerPlatformConfig;
  n8n: IN8nConfig;
  redis: IRedisConfig;
  mcp: IMcpConfig;
  templates: ITemplatesConfig;
}

/**
 * Environment variable validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVariables: string[]
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}