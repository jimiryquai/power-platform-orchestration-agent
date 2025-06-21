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


export interface IMcpServerConfig {
  enabled: boolean;
  serverName: string;
}

export interface IMcpConfig {
  azureDevOps: IMcpServerConfig;
  microsoftGraph: IMcpServerConfig;
  powerPlatform: IMcpServerConfig;
}

export interface ITemplatesConfig {
  directory: string;
  defaultTemplate: string;
}

export interface IConfig {
  app: IAppConfig;
  azure: IAzureConfig;
  powerPlatform: IPowerPlatformConfig;
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