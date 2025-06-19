const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const AzureDevOpsMCPClient = require('../integrations/azure-devops/mcp-client');
const PACClient = require('../integrations/power-platform/pac-client');
const N8NWorkflowManager = require('../integrations/n8n/workflow-manager');

class ProjectOrchestrator {
  constructor() {
    this.azureDevOpsClient = new AzureDevOpsMCPClient();
    this.pacClient = new PACClient();
    this.n8nManager = new N8NWorkflowManager();
    this.templates = new Map();
  }

  async initialize() {
    try {
      logger.info('Initializing Project Orchestrator...');
      
      // Load templates
      await this.loadTemplates();
      
      // Test connections
      await this.testConnections();
      
      logger.info('Project Orchestrator initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Project Orchestrator:', error);
      return false;
    }
  }

  async loadTemplates() {
    try {
      const templatesDir = config.templates.directory;
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const filePath = path.join(templatesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = yaml.load(content);
          
          const templateName = path.basename(file, path.extname(file));
          this.templates.set(templateName, template);
          
          logger.info(`Loaded template: ${templateName}`);
        }
      }
    } catch (error) {
      logger.error('Failed to load templates:', error);
      throw error;
    }
  }

  async testConnections() {
    const results = [];
    
    // Test Azure DevOps MCP
    try {
      const azureDevOpsResult = await this.azureDevOpsClient.connect();
      results.push({ service: 'Azure DevOps MCP', connected: azureDevOpsResult });
    } catch (error) {
      results.push({ service: 'Azure DevOps MCP', connected: false, error: error.message });
    }
    
    // Test Power Platform
    try {
      const pacResult = await this.pacClient.authenticate();
      results.push({ service: 'Power Platform', connected: pacResult });
    } catch (error) {
      results.push({ service: 'Power Platform', connected: false, error: error.message });
    }
    
    // Test n8n
    try {
      const n8nResult = await this.n8nManager.testConnection();
      results.push({ service: 'n8n', connected: n8nResult });
    } catch (error) {
      results.push({ service: 'n8n', connected: false, error: error.message });
    }
    
    logger.info('Connection test results:', results);
    return results;
  }

  async setupProject(projectRequest) {
    const executionId = require('uuid').v4();
    logger.info(`Starting project setup: ${projectRequest.projectName} (${executionId})`);
    
    try {
      // Validate request
      const validationResult = this.validateProjectRequest(projectRequest);
      if (!validationResult.valid) {
        throw new Error(`Invalid project request: ${validationResult.errors.join(', ')}`);
      }
      
      // Get template
      const template = this.getTemplate(projectRequest.templateName || 's-project-template');
      if (!template) {
        throw new Error(`Template not found: ${projectRequest.templateName}`);
      }
      
      // Merge request with template
      const projectConfig = this.mergeProjectConfig(template, projectRequest);
      
      // Execute setup phases
      const result = {
        executionId,
        projectName: projectRequest.projectName,
        status: 'in_progress',
        phases: [],
        startTime: new Date().toISOString()
      };
      
      // Phase 1: Azure DevOps Setup
      logger.info('Phase 1: Setting up Azure DevOps project...');
      const azureDevOpsResult = await this.setupAzureDevOpsProject(projectConfig);
      result.phases.push({
        name: 'Azure DevOps Setup',
        status: azureDevOpsResult.success ? 'completed' : 'failed',
        result: azureDevOpsResult,
        timestamp: new Date().toISOString()
      });
      
      if (!azureDevOpsResult.success) {
        result.status = 'failed';
        result.endTime = new Date().toISOString();
        return result;
      }
      
      // Phase 2: Power Platform Environment Setup
      logger.info('Phase 2: Setting up Power Platform environments...');
      const powerPlatformResult = await this.setupPowerPlatformEnvironments(projectConfig);
      result.phases.push({
        name: 'Power Platform Setup',
        status: powerPlatformResult.success ? 'completed' : 'failed',
        result: powerPlatformResult,
        timestamp: new Date().toISOString()
      });
      
      if (!powerPlatformResult.success) {
        result.status = 'failed';
        result.endTime = new Date().toISOString();
        return result;
      }
      
      // Phase 3: Create n8n Workflow
      logger.info('Phase 3: Creating n8n workflow...');
      const workflowResult = await this.createProjectWorkflow(projectConfig);
      result.phases.push({
        name: 'Workflow Creation',
        status: workflowResult.success ? 'completed' : 'failed',
        result: workflowResult,
        timestamp: new Date().toISOString()
      });
      
      result.status = 'completed';
      result.endTime = new Date().toISOString();
      
      logger.info(`Project setup completed: ${projectRequest.projectName} (${executionId})`);
      return result;
      
    } catch (error) {
      logger.error(`Project setup failed: ${projectRequest.projectName} (${executionId})`, error);
      return {
        executionId,
        projectName: projectRequest.projectName,
        status: 'failed',
        error: error.message,
        endTime: new Date().toISOString()
      };
    }
  }

  async setupAzureDevOpsProject(projectConfig) {
    try {
      // Create project
      const projectResult = await this.azureDevOpsClient.createProject({
        name: projectConfig.projectName,
        description: projectConfig.description,
        processTemplate: projectConfig.azureDevOps.processTemplate,
        visibility: 'private'
      });
      
      if (!projectResult.success) {
        logger.error('Project creation failed:', projectResult);
        throw new Error(`Failed to create Azure DevOps project: ${projectResult.error}`);
      }
      
      // Create sprints/iterations
      const iterations = this.generateIterations(projectConfig);
      const iterationsResult = await this.azureDevOpsClient.createIterations(
        projectConfig.projectName,
        iterations
      );
      
      // Create epics and features
      const workItemsResult = await this.createWorkItems(projectConfig);
      
      return {
        success: true,
        project: projectResult.data,
        iterations: iterationsResult.data,
        workItems: workItemsResult
      };
      
    } catch (error) {
      logger.error('Azure DevOps setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async setupPowerPlatformEnvironments(projectConfig) {
    try {
      const environments = [];
      
      for (const envConfig of projectConfig.environments) {
        const envResult = await this.pacClient.createEnvironment({
          name: `${projectConfig.projectName}-${envConfig.shortName}`,
          displayName: `${projectConfig.projectName} ${envConfig.name}`,
          location: envConfig.region,
          type: envConfig.type === 'production' ? 'Production' : 'Sandbox',
          description: envConfig.description,
          dataverse: envConfig.settings.dataverse
        });
        
        environments.push({
          config: envConfig,
          result: envResult
        });
      }
      
      return {
        success: true,
        environments: environments
      };
      
    } catch (error) {
      logger.error('Power Platform setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createProjectWorkflow(projectConfig) {
    try {
      const workflow = await this.n8nManager.createProjectSetupWorkflow(projectConfig);
      
      return {
        success: true,
        workflow: workflow
      };
      
    } catch (error) {
      logger.error('Workflow creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createWorkItems(projectConfig) {
    const workItems = [];
    
    // Create epics
    for (const epicTemplate of projectConfig.workItemTemplates.epics) {
      const epic = await this.azureDevOpsClient.createWorkItem({
        type: 'Epic',
        title: epicTemplate.name,
        description: epicTemplate.description,
        project: projectConfig.projectName,
        priority: epicTemplate.priority || 2
      });
      
      if (epic.success) {
        workItems.push(epic.data);
        
        // Create features for this epic
        const relatedFeatures = projectConfig.workItemTemplates.features
          .filter(f => f.epic === epicTemplate.name);
          
        for (const featureTemplate of relatedFeatures) {
          const feature = await this.azureDevOpsClient.createWorkItem({
            type: 'Feature',
            title: featureTemplate.name,
            description: featureTemplate.description,
            project: projectConfig.projectName
          });
          
          if (feature.success) {
            // Link feature to epic
            await this.azureDevOpsClient.addChildWorkItem(epic.data.id, feature.data);
            workItems.push(feature.data);
          }
        }
      }
    }
    
    return workItems;
  }

  generateIterations(projectConfig) {
    const iterations = [];
    const startDate = new Date();
    
    for (let i = 1; i <= projectConfig.sprintCount; i++) {
      const sprintStart = new Date(startDate);
      sprintStart.setDate(startDate.getDate() + (i - 1) * projectConfig.sprintDuration * 7);
      
      const sprintEnd = new Date(sprintStart);
      sprintEnd.setDate(sprintStart.getDate() + projectConfig.sprintDuration * 7 - 1);
      
      iterations.push({
        name: `Sprint ${i}`,
        path: `${projectConfig.projectName}\\\\Sprint ${i}`,
        startDate: sprintStart.toISOString(),
        finishDate: sprintEnd.toISOString()
      });
    }
    
    return iterations;
  }

  validateProjectRequest(request) {
    const errors = [];
    
    if (!request.projectName) {
      errors.push('Project name is required');
    }
    
    if (request.projectName && !/^[a-zA-Z0-9-_]+$/.test(request.projectName)) {
      errors.push('Project name must contain only alphanumeric characters, hyphens, and underscores');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getTemplate(templateName) {
    return this.templates.get(templateName);
  }

  mergeProjectConfig(template, request) {
    return {
      ...template.projectTemplate,
      ...request,
      workItemTemplates: template.workItemTemplates,
      deploymentSettings: template.deploymentSettings
    };
  }

  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }
}

module.exports = ProjectOrchestrator;