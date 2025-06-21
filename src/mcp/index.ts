// MCP Server Entry Point - Main entry point for the Power Platform Orchestrator MCP server
// This file is used when running the server via npx or direct execution

import PowerPlatformMcpServer, { McpServerConfig } from './server';
import { OrchestrationConfig } from '../orchestration/project-orchestrator';

// ============================================================================
// Environment Configuration
// ============================================================================

function loadConfigFromEnvironment(): OrchestrationConfig {
  // Validate minimal required environment variables
  const minimalRequiredVars = [
    'AZURE_DEVOPS_ORG',
    'AZURE_DEVOPS_PAT',
    'AZURE_TENANT_ID'
  ];

  const missingMinimalVars = minimalRequiredVars.filter(varName => !process.env[varName]);
  if (missingMinimalVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingMinimalVars.join(', '));
    console.error('💡 Minimal setup requires: AZURE_DEVOPS_ORG, AZURE_DEVOPS_PAT, AZURE_TENANT_ID');
    process.exit(1);
  }

  // Check if we have Service Principal or will use interactive auth
  const hasServicePrincipal = process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET;
  const useInteractiveAuth = process.env.AZURE_USE_INTERACTIVE_AUTH === 'true';
  
  if (!hasServicePrincipal && !useInteractiveAuth) {
    console.warn('⚠️  No authentication method configured. Set either:');
    console.warn('     - AZURE_CLIENT_ID + AZURE_CLIENT_SECRET for Service Principal');
    console.warn('     - AZURE_USE_INTERACTIVE_AUTH=true for interactive authentication');
  }

  return {
    azureDevOps: {
      organization: process.env.AZURE_DEVOPS_ORG!,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT!,
      useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
      retryConfig: {
        maxAttempts: parseInt(process.env.AZURE_DEVOPS_MAX_RETRIES || '3'),
        baseDelayMs: parseInt(process.env.AZURE_DEVOPS_BASE_DELAY || '1000'),
        backoffMultiplier: parseFloat(process.env.AZURE_DEVOPS_BACKOFF_MULTIPLIER || '2'),
        maxDelayMs: parseInt(process.env.AZURE_DEVOPS_MAX_DELAY || '30000'),
        retryableErrors: ['RATE_LIMIT_EXCEEDED', 'SERVER_ERROR', 'NETWORK_ERROR']
      },
      timeoutMs: parseInt(process.env.AZURE_DEVOPS_TIMEOUT || '30000')
    },
    powerPlatform: {
      baseUrl: process.env.POWER_PLATFORM_BASE_URL || 'https://api.powerplatform.com',
      environmentUrl: process.env.POWER_PLATFORM_ENVIRONMENT_URL || process.env.TEST_ENVIRONMENT_URL || '',
      useInteractiveAuth: process.env.AZURE_USE_INTERACTIVE_AUTH === 'true',
      defaultRegion: (process.env.POWER_PLATFORM_DEFAULT_REGION as any) || 'unitedstates',
      timeoutMs: parseInt(process.env.POWER_PLATFORM_TIMEOUT || '60000'),
      retryAttempts: parseInt(process.env.POWER_PLATFORM_RETRY_ATTEMPTS || '3')
    },
    microsoftGraph: {
      accessToken: process.env.GRAPH_ACCESS_TOKEN || generateAccessTokenFromCredentials()
    },
    defaultRegion: (process.env.DEFAULT_REGION as any) || 'unitedstates',
    enableParallelExecution: process.env.ENABLE_PARALLEL_EXECUTION !== 'false',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '300000')
  };
}

function generateAccessTokenFromCredentials(): string {
  // In a real implementation, this would use Azure SDK to get access token
  // from client credentials (client ID, secret, tenant) or interactive auth
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
    console.log('🔐 Using service principal credentials for authentication');
    return 'sp-generated-token'; // Placeholder - would be real token from Azure SDK
  }
  
  if (process.env.AZURE_USE_INTERACTIVE_AUTH === 'true' && process.env.AZURE_TENANT_ID) {
    console.log('🔐 Using interactive authentication for Microsoft Graph');
    return 'interactive-auth-token'; // Placeholder - would be real token from Azure SDK
  }
  
  console.warn('⚠️  No authentication method configured. Set either:');
  console.warn('     - AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID for Service Principal auth');
  console.warn('     - AZURE_USE_INTERACTIVE_AUTH=true, AZURE_TENANT_ID for Interactive auth');
  return 'placeholder-token';
}

// ============================================================================
// Server Configuration
// ============================================================================

function createServerConfig(): McpServerConfig {
  const orchestrationConfig = loadConfigFromEnvironment();
  
  return {
    orchestrationConfig,
    serverName: process.env.MCP_SERVER_NAME || 'power-platform-orchestrator',
    serverVersion: process.env.npm_package_version || '1.0.0',
    enableDebugLogging: process.env.DEBUG_LOGGING === 'true' || process.env.NODE_ENV === 'development'
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Power Platform Orchestrator MCP Server...');
    
    // Display environment info
    console.log('Environment:', {
      nodeEnv: process.env.NODE_ENV || 'production',
      azureDevOpsOrg: process.env.AZURE_DEVOPS_ORG || 'not-set',
      powerPlatformRegion: process.env.POWER_PLATFORM_DEFAULT_REGION || 'unitedstates',
      parallelExecution: process.env.ENABLE_PARALLEL_EXECUTION !== 'false',
      debugLogging: process.env.DEBUG_LOGGING === 'true'
    });

    // Create and start server
    const config = createServerConfig();
    const server = new PowerPlatformMcpServer(config);
    
    await server.start();
    
    // Server will run until interrupted
    console.log('✅ MCP Server is running and ready to accept connections');
    console.log('💡 Connect your MCP client (like Claude Desktop) to start using the orchestrator');
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
}

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ============================================================================
// Execute if run directly
// ============================================================================

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export { main, createServerConfig, loadConfigFromEnvironment };
export default main;