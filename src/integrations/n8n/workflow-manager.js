const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

class N8NWorkflowManager {
  constructor() {
    this.baseUrl = config.n8n.baseUrl;
    this.apiKey = config.n8n.apiKey;
    this.headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      this.headers['X-N8N-API-KEY'] = this.apiKey;
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows`, {
        headers: this.headers
      });
      
      logger.info('n8n connection test successful');
      return response.status === 200;
    } catch (error) {
      logger.error('n8n connection test failed:', error.message);
      return false;
    }
  }

  // Workflow Operations
  async getWorkflows() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows`, {
        headers: this.headers
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get workflows:', error.message);
      throw error;
    }
  }

  async getWorkflow(workflowId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: this.headers
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to get workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async createWorkflow(workflowData) {
    try {
      logger.info('Creating n8n workflow:', workflowData.name);
      
      const response = await axios.post(`${this.baseUrl}/api/v1/workflows`, workflowData, {
        headers: this.headers
      });
      
      logger.info('Workflow created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      logger.error('Failed to create workflow:', error.message);
      throw error;
    }
  }

  async updateWorkflow(workflowId, workflowData) {
    try {
      logger.info('Updating n8n workflow:', workflowId);
      
      const response = await axios.put(`${this.baseUrl}/api/v1/workflows/${workflowId}`, workflowData, {
        headers: this.headers
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to update workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      logger.info('Deleting n8n workflow:', workflowId);
      
      await axios.delete(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: this.headers
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      logger.info('Activating n8n workflow:', workflowId);
      
      const response = await axios.patch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, 
        { active: true }, 
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to activate workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async deactivateWorkflow(workflowId) {
    try {
      logger.info('Deactivating n8n workflow:', workflowId);
      
      const response = await axios.patch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, 
        { active: false }, 
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to deactivate workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  // Execution Operations
  async executeWorkflow(workflowId, inputData = {}) {
    try {
      logger.info('Executing n8n workflow:', workflowId);
      
      const response = await axios.post(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, 
        inputData, 
        { headers: this.headers }
      );
      
      logger.info('Workflow execution started:', response.data.executionId);
      return response.data;
    } catch (error) {
      logger.error(`Failed to execute workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async getExecution(executionId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/executions/${executionId}`, {
        headers: this.headers
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to get execution ${executionId}:`, error.message);
      throw error;
    }
  }

  async getExecutions(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${this.baseUrl}/api/v1/executions?${params}`, {
        headers: this.headers
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get executions:', error.message);
      throw error;
    }
  }

  async waitForExecution(executionId, timeout = 300000, pollInterval = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const poll = async () => {
        try {
          const execution = await this.getExecution(executionId);
          
          if (execution.finished) {
            if (execution.status === 'success') {
              resolve(execution);
            } else {
              reject(new Error(`Execution failed with status: ${execution.status}`));
            }
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('Execution timeout'));
            return;
          }
          
          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }

  // Template Operations for Power Platform Workflows
  async createProjectSetupWorkflow(templateData) {
    const workflowData = {
      name: `Project Setup: ${templateData.projectName}`,
      nodes: [
        {
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [240, 300],
          parameters: {},
          typeVersion: 1
        },
        {
          name: 'Azure DevOps Project Setup',
          type: 'n8n-nodes-base.function',
          position: [460, 300],
          parameters: {
            functionCode: this.generateAzureDevOpsSetupCode(templateData)
          },
          typeVersion: 1
        },
        {
          name: 'Power Platform Environment Setup',
          type: 'n8n-nodes-base.function',
          position: [680, 300],
          parameters: {
            functionCode: this.generatePowerPlatformSetupCode(templateData)
          },
          typeVersion: 1
        }
      ],
      connections: {
        'Start': {
          main: [
            [
              {
                node: 'Azure DevOps Project Setup',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Azure DevOps Project Setup': {
          main: [
            [
              {
                node: 'Power Platform Environment Setup',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {},
      staticData: {}
    };

    return await this.createWorkflow(workflowData);
  }

  generateAzureDevOpsSetupCode(templateData) {
    return `
// Azure DevOps Project Setup
const azureDevOpsClient = require('../../integrations/azure-devops/mcp-client');
const client = new azureDevOpsClient();

// Project data from template
const projectData = ${JSON.stringify(templateData, null, 2)};

async function setupProject() {
  try {
    // Create project
    const project = await client.createProject({
      name: projectData.projectName,
      description: projectData.description,
      processTemplate: projectData.azureDevOps.processTemplate
    });
    
    // Create sprints
    const iterations = [];
    for (let i = 1; i <= projectData.sprintCount; i++) {
      iterations.push({
        name: \`Sprint \${i}\`,
        path: \`\${projectData.projectName}\\\\Sprint \${i}\`,
        startDate: new Date(Date.now() + (i-1) * projectData.sprintDuration * 7 * 24 * 60 * 60 * 1000),
        finishDate: new Date(Date.now() + i * projectData.sprintDuration * 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    await client.createIterations(projectData.projectName, iterations);
    
    return { success: true, project: project.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

return await setupProject();
    `;
  }

  generatePowerPlatformSetupCode(templateData) {
    return `
// Power Platform Environment Setup
const PACClient = require('../../integrations/power-platform/pac-client');
const client = new PACClient();

const environmentData = ${JSON.stringify(templateData.environments, null, 2)};

async function setupEnvironments() {
  try {
    const results = [];
    
    for (const env of environmentData) {
      const environment = await client.createEnvironment({
        name: \`\${projectData.projectName}-\${env.shortName}\`,
        displayName: env.name,
        location: env.region,
        type: env.type === 'production' ? 'Production' : 'Sandbox',
        description: env.description,
        dataverse: env.settings.dataverse
      });
      
      results.push(environment);
    }
    
    return { success: true, environments: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

return await setupEnvironments();
    `;
  }
}

module.exports = N8NWorkflowManager;