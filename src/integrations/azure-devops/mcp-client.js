const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

class AzureDevOpsMCPClient {
  constructor() {
    this.organization = config.azure.devops.organization;
    this.pat = config.azure.devops.personalAccessToken;
    this.baseUrl = config.azure.devops.baseUrl;
    this.isConnected = false;
    
    // Note: In a real implementation, this would integrate with the MCP server
    // For Phase 1, we're using direct API calls as a fallback
    logger.info('Azure DevOps MCP Client initialized (Phase 1: Direct API mode)');
  }

  async connect() {
    try {
      logger.info('Testing Azure DevOps connection...');
      logger.info('Base URL:', this.baseUrl);
      
      // For Phase 1, we'll validate the connection is configured
      if (!this.organization || !this.pat) {
        throw new Error('Azure DevOps credentials not configured');
      }
      
      // Test the connection with a simple API call
      const testResult = await this.executeRequest('GET', 'projects?$top=1');
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }
      
      this.isConnected = true;
      logger.info('Azure DevOps connection validated successfully');
      return true;
    } catch (error) {
      logger.error('Azure DevOps connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  getHeaders() {
    const auth = Buffer.from(`:${this.pat}`).toString('base64');
    
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  async executeRequest(method, endpoint, data = null) {
    try {
      const url = `${this.baseUrl}/_apis/${endpoint}`;
      const options = {
        method,
        url,
        headers: this.getHeaders(),
        params: {
          'api-version': '7.0'
        }
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
      
      logger.error('Azure DevOps API error:', errorDetails);
      
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }

  // Project Operations
  async createProject(projectData) {
    logger.info('Creating Azure DevOps project:', projectData.name);
    
    // Use the standard Agile template ID
    const templateId = '6b724908-ef14-45cf-84f8-768b5384da45'; // Agile template
    
    const projectPayload = {
      name: projectData.name,
      description: projectData.description || '',
      visibility: 'private',
      capabilities: {
        versioncontrol: {
          sourceControlType: 'Git'
        },
        processTemplate: {
          templateTypeId: templateId
        }
      }
    };


    logger.info('About to send project creation request:', JSON.stringify(projectPayload, null, 2));
    const result = await this.executeRequest('POST', 'projects', projectPayload);
    
    if (!result.success) {
      logger.error('Failed to create project:', result);
    } else {
      logger.info('Project created successfully:', result.data);
    }
    
    return result;
  }

  async getProject(projectName) {
    return await this.executeCommand('project_get', { name: projectName });
  }

  // Work Item Operations
  async createWorkItem(workItemData) {
    logger.info('Creating work item:', workItemData.title);
    
    const operations = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: workItemData.title
      }
    ];

    if (workItemData.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: workItemData.description
      });
    }

    if (workItemData.priority) {
      operations.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: workItemData.priority
      });
    }

    const endpoint = `${workItemData.project}/_apis/wit/workitems/$${workItemData.type}?api-version=7.0`;
    const response = await axios.post(
      `${this.baseUrl}/${endpoint}`,
      operations,
      {
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json-patch+json'
        }
      }
    );

    return { success: true, data: response.data };
  }

  async updateWorkItem(workItemId, updates) {
    const args = {
      id: workItemId,
      ...updates
    };

    return await this.executeCommand('wit_update_work_item', args);
  }

  async createWorkItemsBatch(workItems) {
    logger.info('Creating work items batch:', workItems.length);
    
    const args = {
      workItems: workItems
    };

    return await this.executeCommand('wit_update_work_items_batch', args);
  }

  async addChildWorkItem(parentId, childData) {
    const child = await this.createWorkItem(childData);
    if (child.success) {
      return await this.executeCommand('wit_add_child_work_item', {
        parentId: parentId,
        childId: child.data.id
      });
    }
    return child;
  }

  // Sprint/Iteration Operations
  async createIterations(project, iterations) {
    logger.info('Creating iterations for project:', project);
    
    const results = [];
    
    for (const iteration of iterations) {
      const iterationPayload = {
        name: iteration.name,
        attributes: {
          startDate: iteration.startDate,
          finishDate: iteration.finishDate
        }
      };
      
      const result = await this.executeRequest(
        'POST', 
        `wit/classificationnodes/Iterations?$depth=1`,
        iterationPayload
      );
      
      results.push({
        iteration: iteration.name,
        result
      });
    }
    
    return {
      success: results.every(r => r.result.success),
      data: results
    };
  }

  async assignIterationsToTeam(project, team, iterations) {
    const args = {
      project: project,
      team: team,
      iterations: iterations
    };

    return await this.executeCommand('work_assign_iterations', args);
  }

  async getTeamIterations(project, team) {
    const args = {
      project: project,
      team: team
    };

    return await this.executeCommand('work_list_team_iterations', args);
  }

  // Repository Operations
  async listRepositories(project) {
    const args = {
      project: project
    };

    return await this.executeCommand('repo_list_repos_by_project', args);
  }

  async createPullRequest(repositoryId, pullRequestData) {
    const args = {
      repositoryId: repositoryId,
      ...pullRequestData
    };

    return await this.executeCommand('repo_create_pull_request', args);
  }

  // Build Operations
  async getBuildDefinitions(project) {
    const args = {
      project: project
    };

    return await this.executeCommand('build_get_definitions', args);
  }

  async runBuild(project, definitionId) {
    const args = {
      project: project,
      definitionId: definitionId
    };

    return await this.executeCommand('build_run_build', args);
  }

  async getBuildStatus(project, buildId) {
    const args = {
      project: project,
      buildId: buildId
    };

    return await this.executeCommand('build_get_status', args);
  }

  async disconnect() {
    this.isConnected = false;
    logger.info('Disconnected from Azure DevOps MCP server');
  }
}

module.exports = AzureDevOpsMCPClient;