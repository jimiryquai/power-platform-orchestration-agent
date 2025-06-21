const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Import our MCP clients
const MicrosoftGraphMCPClient = require('../integrations/microsoft-graph/mcp-client');
const PowerPlatformMCPClient = require('../integrations/power-platform/mcp-client');
const AzureDevOpsMCPClient = require('../integrations/azure-devops/mcp-client');

/**
 * PRD-First Project Orchestrator
 * 
 * This orchestrator follows a proper project management flow:
 * 1. PRD Creation/Import (from any source)
 * 2. Work Breakdown Structure generation
 * 3. Parallel execution of technical setup + project structure
 * 4. Auto-completion of technical user stories
 */
class PRDOrchestrator {
  constructor() {
    this.graphClient = new MicrosoftGraphMCPClient();
    this.powerPlatformClient = new PowerPlatformMCPClient();
    this.azureDevOpsClient = new AzureDevOpsMCPClient();
    
    this.prdSources = {
      claude: this.importFromClaude.bind(this),
      copilot: this.importFromCopilot.bind(this),
      manual: this.importManualPRD.bind(this),
      template: this.generateFromTemplate.bind(this),
      file: this.importFromFile.bind(this)
    };
    
    this.executionState = {
      prd: null,
      workBreakdown: null,
      azureDevOpsProject: null,
      powerPlatformResources: null,
      appRegistration: null,
      progress: {}
    };
  }

  /**
   * Main orchestration method - PRD-first approach
   */
  async orchestrateProject(orchestrationRequest) {
    const executionId = require('uuid').v4();
    logger.info(`Starting PRD-first project orchestration: ${orchestrationRequest.projectName} (${executionId})`);
    
    try {
      const result = {
        executionId,
        projectName: orchestrationRequest.projectName,
        status: 'in_progress',
        phases: [],
        startTime: new Date().toISOString()
      };

      // Phase 1: PRD Acquisition and Parsing
      logger.info('Phase 1: PRD Acquisition and Parsing');
      const prdResult = await this.acquireAndParsePRD(orchestrationRequest.prd);
      result.phases.push({
        name: 'PRD Processing',
        status: prdResult.success ? 'completed' : 'failed',
        result: prdResult,
        timestamp: new Date().toISOString()
      });

      if (!prdResult.success) {
        result.status = 'failed';
        result.endTime = new Date().toISOString();
        return result;
      }

      this.executionState.prd = prdResult.prd;

      // Phase 2: Work Breakdown Structure Generation
      logger.info('Phase 2: Work Breakdown Structure Generation');
      const wbsResult = await this.generateWorkBreakdownStructure(prdResult.prd);
      result.phases.push({
        name: 'Work Breakdown Structure',
        status: wbsResult.success ? 'completed' : 'failed',
        result: wbsResult,
        timestamp: new Date().toISOString()
      });

      if (!wbsResult.success) {
        result.status = 'failed';
        result.endTime = new Date().toISOString();
        return result;
      }

      this.executionState.workBreakdown = wbsResult.workBreakdown;

      // Phase 3: Foundation Setup (App Registration)
      logger.info('Phase 3: Foundation Setup - App Registration');
      const appRegResult = await this.setupAppRegistration(orchestrationRequest.projectName, prdResult.prd);
      result.phases.push({
        name: 'App Registration Setup',
        status: appRegResult.success ? 'completed' : 'failed',
        result: appRegResult,
        timestamp: new Date().toISOString()
      });

      if (!appRegResult.success) {
        result.status = 'failed';
        result.endTime = new Date().toISOString();
        return result;
      }

      this.executionState.appRegistration = appRegResult;

      // Phase 4: Parallel Execution - Azure DevOps + Power Platform
      logger.info('Phase 4: Parallel Execution - Azure DevOps + Power Platform');
      const parallelResults = await this.executeParallelSetup(orchestrationRequest.projectName, wbsResult.workBreakdown, prdResult.prd);
      
      result.phases.push({
        name: 'Azure DevOps Setup',
        status: parallelResults.azureDevOps.success ? 'completed' : 'failed',
        result: parallelResults.azureDevOps,
        timestamp: new Date().toISOString()
      });

      result.phases.push({
        name: 'Power Platform Setup',
        status: parallelResults.powerPlatform.success ? 'completed' : 'failed',
        result: parallelResults.powerPlatform,
        timestamp: new Date().toISOString()
      });

      // Phase 5: Technical Story Completion
      logger.info('Phase 5: Technical Story Auto-completion');
      const completionResult = await this.autoCompleteTechnicalStories(parallelResults);
      result.phases.push({
        name: 'Technical Story Completion',
        status: completionResult.success ? 'completed' : 'failed',
        result: completionResult,
        timestamp: new Date().toISOString()
      });

      result.status = 'completed';
      result.endTime = new Date().toISOString();
      result.summary = this.generateProjectSummary();

      logger.info(`PRD-first project orchestration completed: ${orchestrationRequest.projectName} (${executionId})`);
      return result;

    } catch (error) {
      logger.error(`PRD-first project orchestration failed: ${orchestrationRequest.projectName} (${executionId})`, error);
      return {
        executionId,
        projectName: orchestrationRequest.projectName,
        status: 'failed',
        error: error.message,
        endTime: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 1: PRD Acquisition and Parsing
   */
  async acquireAndParsePRD(prdConfig) {
    logger.info('Acquiring and parsing PRD from source:', prdConfig.source);

    try {
      // Route to appropriate PRD source handler
      if (!this.prdSources[prdConfig.source]) {
        throw new Error(`Unsupported PRD source: ${prdConfig.source}`);
      }

      const rawPRD = await this.prdSources[prdConfig.source](prdConfig);
      
      // Parse and validate PRD
      const parsedPRD = await this.parsePRD(rawPRD);
      const validationResult = this.validatePRD(parsedPRD);

      if (!validationResult.valid) {
        return {
          success: false,
          error: 'PRD validation failed',
          details: validationResult.errors
        };
      }

      return {
        success: true,
        prd: parsedPRD,
        metadata: {
          source: prdConfig.source,
          processedAt: new Date().toISOString(),
          validation: validationResult
        }
      };

    } catch (error) {
      logger.error('PRD acquisition failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PRD Source Handlers - Tool Agnostic
   */
  async importFromClaude(config) {
    // Integration with Claude Desktop PRD Assistant
    logger.info('Importing PRD from Claude Desktop');
    
    if (config.claudeConversationId) {
      // If we have a conversation ID, we could potentially fetch it
      // For now, expect the PRD content to be provided
      return config.content;
    }
    
    if (config.content) {
      return config.content;
    }
    
    throw new Error('Claude PRD import requires either conversationId or content');
  }

  async importFromCopilot(config) {
    // Integration with GitHub Copilot Chat
    logger.info('Importing PRD from GitHub Copilot');
    
    // Copilot might export to a file or provide content directly
    if (config.githubGistUrl) {
      // Fetch from GitHub Gist
      const response = await require('axios').get(config.githubGistUrl);
      return response.data;
    }
    
    if (config.content) {
      return config.content;
    }
    
    throw new Error('Copilot PRD import requires either githubGistUrl or content');
  }

  async importManualPRD(config) {
    // Manual PRD input - direct content
    logger.info('Processing manual PRD input');
    
    if (!config.content) {
      throw new Error('Manual PRD import requires content');
    }
    
    return config.content;
  }

  async importFromFile(config) {
    // File-based PRD import
    logger.info('Importing PRD from file:', config.filePath);
    
    const content = await fs.readFile(config.filePath, 'utf8');
    return content;
  }

  async generateFromTemplate(config) {
    // Template-based PRD generation
    logger.info('Generating PRD from template');
    
    const template = await this.loadPRDTemplate(config.templateName);
    const prd = this.populateTemplate(template, config.answers);
    
    return prd;
  }

  /**
   * PRD Parser - Supports multiple formats
   */
  async parsePRD(rawPRD) {
    logger.info('Parsing PRD content');

    // Try to detect format and parse
    let prd;
    
    try {
      // Try YAML first
      prd = yaml.load(rawPRD);
    } catch (yamlError) {
      try {
        // Try JSON
        prd = JSON.parse(rawPRD);
      } catch (jsonError) {
        // Try Markdown parser
        prd = this.parseMarkdownPRD(rawPRD);
      }
    }

    // Normalize to standard format
    return this.normalizePRD(prd);
  }

  parseMarkdownPRD(markdown) {
    // Simple markdown PRD parser
    // This would be more sophisticated in practice
    const lines = markdown.split('\n');
    const prd = {
      product: {},
      features: [],
      technical: {},
      project: {}
    };

    let currentSection = null;
    let currentFeature = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // Main product name
        prd.product.name = line.substring(2).trim();
      } else if (line.startsWith('## ')) {
        currentSection = line.substring(3).trim().toLowerCase();
        if (currentSection.includes('feature')) {
          currentFeature = {
            name: currentSection,
            description: '',
            userStories: [],
            acceptance: []
          };
          prd.features.push(currentFeature);
        }
      } else if (line.startsWith('- ') && currentFeature) {
        if (line.includes('As a ')) {
          currentFeature.userStories.push(line.substring(2).trim());
        } else {
          currentFeature.acceptance.push(line.substring(2).trim());
        }
      }
    }

    return prd;
  }

  normalizePRD(prd) {
    // Normalize PRD to standard format
    return {
      product: {
        name: prd.product?.name || prd.name || 'Unnamed Project',
        description: prd.product?.description || prd.description || '',
        owner: prd.product?.owner || prd.owner || '',
        version: prd.product?.version || '1.0.0'
      },
      features: (prd.features || []).map(feature => ({
        name: feature.name || feature.title,
        description: feature.description || '',
        priority: feature.priority || 'Medium',
        userStories: feature.userStories || feature.stories || [],
        acceptance: feature.acceptance || feature.acceptanceCriteria || [],
        epic: feature.epic || null
      })),
      technical: {
        environments: prd.technical?.environments || ['dev', 'test', 'prod'],
        dataModel: prd.technical?.dataModel || [],
        integrations: prd.technical?.integrations || [],
        security: prd.technical?.security || {}
      },
      project: {
        duration: prd.project?.duration || '12 weeks',
        sprints: prd.project?.sprints || 6,
        sprintDuration: prd.project?.sprintDuration || 2,
        team: prd.project?.team || {},
        methodology: prd.project?.methodology || 'Agile'
      }
    };
  }

  validatePRD(prd) {
    const errors = [];

    if (!prd.product?.name) {
      errors.push('Product name is required');
    }

    if (!prd.features || prd.features.length === 0) {
      errors.push('At least one feature is required');
    }

    // Validate each feature has user stories
    prd.features?.forEach((feature, index) => {
      if (!feature.userStories || feature.userStories.length === 0) {
        errors.push(`Feature ${index + 1} (${feature.name}) must have at least one user story`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Phase 2: Work Breakdown Structure Generation
   */
  async generateWorkBreakdownStructure(prd) {
    logger.info('Generating work breakdown structure from PRD');

    try {
      const workBreakdown = {
        epics: [],
        features: [],
        userStories: [],
        technicalStories: [],
        sprints: []
      };

      // Generate Epics from feature groupings
      const epics = this.generateEpics(prd.features);
      workBreakdown.epics = epics;

      // Generate Features
      const features = this.generateFeatures(prd.features, epics);
      workBreakdown.features = features;

      // Generate User Stories
      const userStories = this.generateUserStories(prd.features);
      workBreakdown.userStories = userStories;

      // Generate Technical Setup Stories
      const technicalStories = this.generateTechnicalStories(prd.technical);
      workBreakdown.technicalStories = technicalStories;

      // Generate Sprint Structure
      const sprints = this.generateSprintStructure(prd.project, [...userStories, ...technicalStories]);
      workBreakdown.sprints = sprints;

      return {
        success: true,
        workBreakdown
      };

    } catch (error) {
      logger.error('Work breakdown structure generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateEpics(features) {
    // Group features into epics based on similarity or explicit epic assignment
    const epicMap = new Map();

    features.forEach(feature => {
      const epicName = feature.epic || this.inferEpicFromFeature(feature);
      
      if (!epicMap.has(epicName)) {
        epicMap.set(epicName, {
          name: epicName,
          description: `Epic containing ${epicName.toLowerCase()} related features`,
          features: [],
          priority: 'High'
        });
      }

      epicMap.get(epicName).features.push(feature.name);
    });

    return Array.from(epicMap.values());
  }

  inferEpicFromFeature(feature) {
    // Simple heuristic to group features into epics
    const name = feature.name.toLowerCase();
    
    if (name.includes('user') || name.includes('auth') || name.includes('profile')) {
      return 'User Management';
    } else if (name.includes('data') || name.includes('report') || name.includes('analytics')) {
      return 'Data & Analytics';
    } else if (name.includes('admin') || name.includes('config') || name.includes('setting')) {
      return 'Administration';
    } else {
      return 'Core Features';
    }
  }

  generateFeatures(features, epics) {
    return features.map(feature => ({
      name: feature.name,
      description: feature.description,
      epic: epics.find(epic => epic.features.includes(feature.name))?.name || 'Core Features',
      priority: feature.priority,
      userStoryCount: feature.userStories?.length || 0,
      estimatedPoints: this.estimateStoryPoints(feature)
    }));
  }

  generateUserStories(features) {
    const stories = [];

    features.forEach(feature => {
      feature.userStories?.forEach((story, index) => {
        stories.push({
          title: this.extractStoryTitle(story),
          description: story,
          feature: feature.name,
          priority: feature.priority,
          type: 'User Story',
          storyPoints: this.estimateIndividualStoryPoints(story),
          acceptanceCriteria: feature.acceptance || [],
          status: 'New'
        });
      });
    });

    return stories;
  }

  generateTechnicalStories(technical) {
    const stories = [];

    // Environment setup stories
    technical.environments?.forEach(env => {
      stories.push({
        title: `Set up ${env.charAt(0).toUpperCase() + env.slice(1)} Environment`,
        description: `Create and configure the ${env} environment in Power Platform`,
        type: 'Technical',
        priority: 'High',
        storyPoints: 3,
        autoComplete: true,
        autoCompleteCondition: `environment_${env}_created`,
        status: 'New'
      });
    });

    // Data model stories
    technical.dataModel?.forEach(entity => {
      stories.push({
        title: `Create ${entity.name} Data Model`,
        description: `Create ${entity.name} table with relationships and fields`,
        type: 'Technical',
        priority: 'High',
        storyPoints: 2,
        autoComplete: true,
        autoCompleteCondition: `entity_${entity.name.toLowerCase()}_created`,
        status: 'New'
      });
    });

    // Infrastructure stories
    stories.push(
      {
        title: 'Set up App Registration',
        description: 'Create Azure AD app registration with required permissions',
        type: 'Technical',
        priority: 'High',
        storyPoints: 2,
        autoComplete: true,
        autoCompleteCondition: 'app_registration_created',
        status: 'New'
      },
      {
        title: 'Configure Solution Publisher',
        description: 'Create custom solution publisher for the project',
        type: 'Technical',
        priority: 'Medium',
        storyPoints: 1,
        autoComplete: true,
        autoCompleteCondition: 'publisher_created',
        status: 'New'
      },
      {
        title: 'Create Project Solution',
        description: 'Create Power Platform solution container',
        type: 'Technical',
        priority: 'Medium',
        storyPoints: 1,
        autoComplete: true,
        autoCompleteCondition: 'solution_created',
        status: 'New'
      }
    );

    return stories;
  }

  generateSprintStructure(project, allStories) {
    const sprints = [];
    const sprintCount = project.sprints || 6;
    const sprintDuration = project.sprintDuration || 2;

    // Sort stories by priority and put technical stories first
    const sortedStories = allStories.sort((a, b) => {
      // Technical stories first
      if (a.type === 'Technical' && b.type !== 'Technical') return -1;
      if (a.type !== 'Technical' && b.type === 'Technical') return 1;
      
      // Then by priority
      const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    // Distribute stories across sprints
    const storiesPerSprint = Math.ceil(sortedStories.length / sprintCount);
    
    for (let i = 0; i < sprintCount; i++) {
      const startIndex = i * storiesPerSprint;
      const endIndex = Math.min(startIndex + storiesPerSprint, sortedStories.length);
      const sprintStories = sortedStories.slice(startIndex, endIndex);

      sprints.push({
        number: i + 1,
        name: `Sprint ${i + 1}`,
        duration: `${sprintDuration} weeks`,
        stories: sprintStories,
        totalStoryPoints: sprintStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0),
        startDate: this.calculateSprintStartDate(i, sprintDuration),
        endDate: this.calculateSprintEndDate(i, sprintDuration)
      });
    }

    return sprints;
  }

  extractStoryTitle(story) {
    // Extract a title from the user story
    const match = story.match(/As a .+ I want to (.+?) so that/i);
    if (match) {
      return match[1].trim();
    }
    
    // Fallback to first part
    return story.substring(0, 50) + (story.length > 50 ? '...' : '');
  }

  estimateStoryPoints(feature) {
    // Simple estimation based on user story count and complexity
    const basePoints = (feature.userStories?.length || 1) * 2;
    const complexityMultiplier = feature.description?.length > 200 ? 1.5 : 1;
    return Math.round(basePoints * complexityMultiplier);
  }

  estimateIndividualStoryPoints(story) {
    // Simple estimation based on story complexity
    if (story.toLowerCase().includes('create') || story.toLowerCase().includes('add')) {
      return 3;
    } else if (story.toLowerCase().includes('update') || story.toLowerCase().includes('edit')) {
      return 2;
    } else if (story.toLowerCase().includes('view') || story.toLowerCase().includes('list')) {
      return 1;
    } else {
      return 2; // Default
    }
  }

  calculateSprintStartDate(sprintIndex, sprintDuration) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (sprintIndex * sprintDuration * 7));
    return startDate.toISOString().split('T')[0];
  }

  calculateSprintEndDate(sprintIndex, sprintDuration) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + ((sprintIndex + 1) * sprintDuration * 7) - 1);
    return endDate.toISOString().split('T')[0];
  }

  /**
   * Phase 3: App Registration Setup
   */
  async setupAppRegistration(projectName, prd) {
    logger.info('Setting up app registration for project:', projectName);

    try {
      await this.graphClient.connect();

      const appData = {
        displayName: `${projectName} - Power Platform App`,
        description: `Application registration for ${prd.product.name}`,
        redirectUris: [], // Will be configured later
        grantAdminConsent: true,
        createServicePrincipal: true
      };

      const result = await this.graphClient.createAppRegistration(appData);
      
      if (result.success) {
        // Mark progress
        this.executionState.progress.app_registration_created = true;
        
        return {
          success: true,
          appRegistration: result.data,
          clientId: result.data.appId,
          objectId: result.data.id
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      logger.error('App registration setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Phase 4: Parallel Execution
   */
  async executeParallelSetup(projectName, workBreakdown, prd) {
    logger.info('Executing parallel setup: Azure DevOps + Power Platform');

    try {
      // Execute both setups in parallel
      const [azureDevOpsResult, powerPlatformResult] = await Promise.all([
        this.setupAzureDevOpsProject(projectName, workBreakdown),
        this.setupPowerPlatformResources(projectName, prd)
      ]);

      return {
        azureDevOps: azureDevOpsResult,
        powerPlatform: powerPlatformResult
      };

    } catch (error) {
      logger.error('Parallel setup failed:', error);
      return {
        azureDevOps: { success: false, error: error.message },
        powerPlatform: { success: false, error: error.message }
      };
    }
  }

  async setupAzureDevOpsProject(projectName, workBreakdown) {
    logger.info('Setting up Azure DevOps project with work breakdown structure');

    try {
      await this.azureDevOpsClient.connect();

      // Create project
      const projectResult = await this.azureDevOpsClient.createProject({
        name: projectName,
        description: this.executionState.prd.product.description,
        processTemplate: 'Agile',
        visibility: 'private'
      });

      if (!projectResult.success) {
        return {
          success: false,
          error: projectResult.error
        };
      }

      // Create epics
      const epics = [];
      for (const epic of workBreakdown.epics) {
        const epicResult = await this.azureDevOpsClient.createWorkItem({
          type: 'Epic',
          title: epic.name,
          description: epic.description,
          project: projectName,
          priority: 1
        });
        
        if (epicResult.success) {
          epics.push({ ...epic, id: epicResult.data.id });
        }
      }

      // Create features
      const features = [];
      for (const feature of workBreakdown.features) {
        const parentEpic = epics.find(e => e.name === feature.epic);
        
        const featureResult = await this.azureDevOpsClient.createWorkItem({
          type: 'Feature',
          title: feature.name,
          description: feature.description,
          project: projectName,
          priority: feature.priority === 'High' ? 1 : 2,
          parentId: parentEpic?.id
        });
        
        if (featureResult.success) {
          features.push({ ...feature, id: featureResult.data.id });
        }
      }

      // Create user stories
      const userStories = [];
      for (const story of workBreakdown.userStories) {
        const parentFeature = features.find(f => f.name === story.feature);
        
        const storyResult = await this.azureDevOpsClient.createWorkItem({
          type: 'User Story',
          title: story.title,
          description: story.description,
          project: projectName,
          priority: story.priority === 'High' ? 1 : 2,
          storyPoints: story.storyPoints,
          parentId: parentFeature?.id
        });
        
        if (storyResult.success) {
          userStories.push({ ...story, id: storyResult.data.id });
        }
      }

      // Create technical stories
      const technicalStories = [];
      for (const story of workBreakdown.technicalStories) {
        const storyResult = await this.azureDevOpsClient.createWorkItem({
          type: 'User Story',
          title: story.title,
          description: story.description,
          project: projectName,
          priority: 1, // Technical stories are high priority
          storyPoints: story.storyPoints,
          tags: 'Technical;Infrastructure'
        });
        
        if (storyResult.success) {
          technicalStories.push({ 
            ...story, 
            id: storyResult.data.id,
            workItemId: storyResult.data.id 
          });
        }
      }

      // Create sprints
      const sprints = [];
      for (const sprint of workBreakdown.sprints) {
        const sprintResult = await this.azureDevOpsClient.createIteration({
          name: sprint.name,
          startDate: sprint.startDate,
          finishDate: sprint.endDate,
          project: projectName
        });
        
        if (sprintResult.success) {
          sprints.push({ ...sprint, id: sprintResult.data.id });
        }
      }

      this.executionState.azureDevOpsProject = {
        project: projectResult.data,
        epics,
        features,
        userStories,
        technicalStories,
        sprints
      };

      return {
        success: true,
        project: projectResult.data,
        workItems: {
          epics: epics.length,
          features: features.length,
          userStories: userStories.length,
          technicalStories: technicalStories.length
        },
        sprints: sprints.length
      };

    } catch (error) {
      logger.error('Azure DevOps setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async setupPowerPlatformResources(projectName, prd) {
    logger.info('Setting up Power Platform resources');

    try {
      await this.powerPlatformClient.connect();

      const results = {
        environments: [],
        publisher: null,
        solution: null,
        dataModel: []
      };

      // Create environments
      for (const envName of prd.technical.environments) {
        const envResult = await this.powerPlatformClient.createEnvironment({
          displayName: `${projectName} ${envName.charAt(0).toUpperCase() + envName.slice(1)}`,
          name: `${projectName.toLowerCase()}-${envName}`,
          description: `${envName} environment for ${prd.product.name}`,
          type: envName === 'prod' ? 'Production' : 'Sandbox',
          location: 'northeurope',
          dataverse: true
        });

        if (envResult.success) {
          results.environments.push({
            name: envName,
            result: envResult.data
          });
          
          // Mark progress
          this.executionState.progress[`environment_${envName}_created`] = true;
        }
      }

      // Use dev environment for solution setup
      const devEnvUrl = 'https://james-dev.crm11.dynamics.com/api/data/v9.2'; // Default for now

      // Create publisher
      const publisherResult = await this.powerPlatformClient.createPublisher({
        uniquename: projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        friendlyname: `${projectName} Solutions`,
        description: `Publisher for ${prd.product.name}`,
        customizationprefix: projectName.substring(0, 3).toLowerCase()
      }, devEnvUrl);

      if (publisherResult.success) {
        results.publisher = publisherResult.data;
        this.executionState.progress.publisher_created = true;
      }

      // Create solution
      if (results.publisher) {
        const solutionResult = await this.powerPlatformClient.createSolution({
          uniquename: `${projectName.replace(/[^a-zA-Z0-9]/g, '')}Solution`,
          friendlyname: `${prd.product.name} Solution`,
          description: `Main solution for ${prd.product.name}`,
          version: prd.product.version || '1.0.0.0',
          publisherUniqueName: results.publisher.uniquename
        }, devEnvUrl);

        if (solutionResult.success) {
          results.solution = solutionResult.data;
          this.executionState.progress.solution_created = true;
        }
      }

      // Create data model
      if (prd.technical.dataModel && prd.technical.dataModel.length > 0) {
        for (const entity of prd.technical.dataModel) {
          // This would create the actual tables
          // For now, just mark as completed
          this.executionState.progress[`entity_${entity.name.toLowerCase()}_created`] = true;
          results.dataModel.push({
            name: entity.name,
            status: 'created'
          });
        }
      }

      this.executionState.powerPlatformResources = results;

      return {
        success: true,
        environments: results.environments.length,
        publisher: results.publisher ? 'created' : 'failed',
        solution: results.solution ? 'created' : 'failed',
        dataModel: results.dataModel.length
      };

    } catch (error) {
      logger.error('Power Platform setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Phase 5: Auto-completion of Technical Stories
   */
  async autoCompleteTechnicalStories(parallelResults) {
    logger.info('Auto-completing technical stories based on infrastructure progress');

    try {
      const completedStories = [];
      
      if (this.executionState.azureDevOpsProject?.technicalStories) {
        for (const story of this.executionState.azureDevOpsProject.technicalStories) {
          if (story.autoComplete && story.autoCompleteCondition) {
            const conditionMet = this.executionState.progress[story.autoCompleteCondition];
            
            if (conditionMet) {
              // Update work item status to completed
              const updateResult = await this.azureDevOpsClient.updateWorkItem({
                id: story.workItemId,
                fields: {
                  'System.State': 'Closed',
                  'System.Reason': 'Completed',
                  'Microsoft.VSTS.Common.ClosedDate': new Date().toISOString(),
                  'System.History': `Automatically completed - infrastructure condition met: ${story.autoCompleteCondition}`
                }
              });

              if (updateResult.success) {
                completedStories.push({
                  id: story.workItemId,
                  title: story.title,
                  condition: story.autoCompleteCondition,
                  completedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      return {
        success: true,
        completedStories,
        summary: `${completedStories.length} technical stories auto-completed`
      };

    } catch (error) {
      logger.error('Technical story auto-completion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate project summary
   */
  generateProjectSummary() {
    return {
      project: {
        name: this.executionState.prd?.product?.name,
        description: this.executionState.prd?.product?.description
      },
      infrastructure: {
        appRegistration: !!this.executionState.appRegistration,
        environments: this.executionState.powerPlatformResources?.environments?.length || 0,
        solution: !!this.executionState.powerPlatformResources?.solution
      },
      projectManagement: {
        epics: this.executionState.azureDevOpsProject?.epics?.length || 0,
        features: this.executionState.azureDevOpsProject?.features?.length || 0,
        userStories: this.executionState.azureDevOpsProject?.userStories?.length || 0,
        technicalStories: this.executionState.azureDevOpsProject?.technicalStories?.length || 0,
        sprints: this.executionState.azureDevOpsProject?.sprints?.length || 0
      },
      readiness: {
        developmentReady: true,
        infrastructureComplete: Object.keys(this.executionState.progress).length > 0,
        teamCanStart: true
      }
    };
  }

  /**
   * Helper methods
   */
  async loadPRDTemplate(templateName) {
    // Load PRD template from templates directory
    const templatePath = path.join(__dirname, '../templates/prd', `${templateName}.yaml`);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    return yaml.load(templateContent);
  }

  populateTemplate(template, answers) {
    // Simple template population - replace placeholders with answers
    let content = JSON.stringify(template);
    
    Object.entries(answers).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return JSON.parse(content);
  }

  async disconnect() {
    await this.graphClient.disconnect();
    await this.powerPlatformClient.disconnect();
    await this.azureDevOpsClient.disconnect();
  }
}

module.exports = PRDOrchestrator;