const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const config = {
  app: {
    name: 'power-platform-orchestration-agent',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  azure: {
    devops: {
      organization: process.env.AZURE_DEVOPS_ORG,
      personalAccessToken: process.env.AZURE_DEVOPS_PAT,
      get baseUrl() {
        return `https://dev.azure.com/${this.organization}`;
      }
    },
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID,
      subscriptionId: process.env.AZURE_SUBSCRIPTION_ID
    }
  },

  powerPlatform: {
    auth: {
      tenantId: process.env.POWER_PLATFORM_TENANT_ID,
      clientId: process.env.POWER_PLATFORM_CLIENT_ID,
      clientSecret: process.env.POWER_PLATFORM_CLIENT_SECRET
    }
  },

  n8n: {
    host: process.env.N8N_HOST || 'localhost',
    port: parseInt(process.env.N8N_PORT, 10) || 5678,
    protocol: process.env.N8N_PROTOCOL || 'http',
    apiKey: process.env.N8N_API_KEY,
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}`;
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },

  mcp: {
    azureDevOps: {
      enabled: process.env.MCP_AZURE_DEVOPS_ENABLED === 'true',
      serverName: 'azure-devops'
    },
    microsoftGraph: {
      enabled: process.env.MCP_MICROSOFT_GRAPH_ENABLED === 'true',
      serverName: 'microsoft-graph'
    },
    n8n: {
      enabled: process.env.MCP_N8N_ENABLED === 'true',
      serverName: 'n8n-mcp'
    },
    docker: {
      enabled: process.env.MCP_DOCKER_ENABLED === 'true',
      serverName: 'MCP_DOCKER'
    }
  },

  templates: {
    directory: path.join(__dirname, '../templates'),
    defaultTemplate: 's-project'
  }
};

function validateConfig() {
  const required = [
    'AZURE_DEVOPS_ORG',
    'AZURE_DEVOPS_PAT',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

if (config.app.environment === 'production') {
  validateConfig();
}

module.exports = config;