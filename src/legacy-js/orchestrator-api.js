const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const PRDOrchestrator = require('../core/prd-orchestrator');
const logger = require('../utils/logger');

/**
 * RESTful API for PRD-First Project Orchestrator
 * 
 * This API provides tool-agnostic endpoints for:
 * - PRD import from various sources
 * - Project orchestration
 * - Progress monitoring
 * - Integration with Claude Desktop, GitHub Copilot, etc.
 */
class OrchestratorAPI {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.orchestrator = new PRDOrchestrator();
    this.activeOrchestrations = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS for cross-origin requests (Claude Desktop, VS Code extensions, etc.)
    this.app.use(cors({
      origin: [
        'https://claude.ai',
        'vscode-webview://*', 
        'http://localhost:*',
        'https://github.dev',
        'https://*.github.dev'
      ],
      credentials: true
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // File upload for PRD files
    const upload = multer({ 
      dest: 'uploads/',
      limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
    });
    this.upload = upload;

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', this.healthCheck.bind(this));

    // PRD Management Routes
    this.app.post('/api/prd/validate', this.validatePRD.bind(this));
    this.app.post('/api/prd/upload', this.upload.single('prd'), this.uploadPRD.bind(this));
    this.app.post('/api/prd/from-claude', this.importFromClaude.bind(this));
    this.app.post('/api/prd/from-copilot', this.importFromCopilot.bind(this));
    this.app.post('/api/prd/from-template', this.generateFromTemplate.bind(this));

    // Project Orchestration Routes
    this.app.post('/api/orchestrate', this.orchestrateProject.bind(this));
    this.app.get('/api/orchestrate/:executionId', this.getOrchestrationStatus.bind(this));
    this.app.post('/api/orchestrate/:executionId/cancel', this.cancelOrchestration.bind(this));

    // Work Breakdown Structure Routes
    this.app.post('/api/wbs/generate', this.generateWorkBreakdown.bind(this));
    this.app.get('/api/wbs/:executionId', this.getWorkBreakdown.bind(this));

    // Integration Helper Routes
    this.app.get('/api/templates', this.listTemplates.bind(this));
    this.app.get('/api/schemas/prd', this.getPRDSchema.bind(this));
    this.app.get('/api/examples', this.getExamples.bind(this));

    // Claude Desktop Integration
    this.app.post('/api/claude/webhook', this.claudeWebhook.bind(this));
    
    // GitHub Copilot Integration  
    this.app.post('/api/copilot/webhook', this.copilotWebhook.bind(this));

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Health Check
   */
  async healthCheck(req, res) {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      capabilities: [
        'prd-import',
        'project-orchestration', 
        'work-breakdown-generation',
        'claude-integration',
        'copilot-integration'
      ],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * PRD Management Endpoints
   */
  async validatePRD(req, res) {
    try {
      const { prd, format = 'auto' } = req.body;
      
      if (!prd) {
        return res.status(400).json({ 
          error: 'PRD content is required',
          code: 'MISSING_PRD'
        });
      }

      // Parse and validate PRD
      const parsedPRD = await this.orchestrator.parsePRD(prd);
      const validation = this.orchestrator.validatePRD(parsedPRD);

      res.json({
        valid: validation.valid,
        errors: validation.errors,
        parsed: parsedPRD,
        metadata: {
          features: parsedPRD.features?.length || 0,
          userStories: parsedPRD.features?.reduce((sum, f) => sum + (f.userStories?.length || 0), 0) || 0,
          estimatedSprints: parsedPRD.project?.sprints || 6
        }
      });

    } catch (error) {
      logger.error('PRD validation failed:', error);
      res.status(400).json({
        error: 'PRD validation failed',
        details: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
  }

  async uploadPRD(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      const filePath = req.file.path;
      const prdContent = await fs.readFile(filePath, 'utf8');
      
      // Clean up uploaded file
      await fs.unlink(filePath);

      // Parse and validate
      const parsedPRD = await this.orchestrator.parsePRD(prdContent);
      const validation = this.orchestrator.validatePRD(parsedPRD);

      res.json({
        filename: req.file.originalname,
        valid: validation.valid,
        errors: validation.errors,
        prd: parsedPRD
      });

    } catch (error) {
      logger.error('PRD upload failed:', error);
      res.status(400).json({
        error: 'PRD upload processing failed',
        details: error.message,
        code: 'UPLOAD_ERROR'
      });
    }
  }

  async importFromClaude(req, res) {
    try {
      const { content, conversationId, claudeApiKey } = req.body;

      if (!content && !conversationId) {
        return res.status(400).json({
          error: 'Either content or conversationId is required',
          code: 'MISSING_CLAUDE_DATA'
        });
      }

      const prdConfig = {
        source: 'claude',
        content,
        conversationId,
        apiKey: claudeApiKey
      };

      const result = await this.orchestrator.acquireAndParsePRD(prdConfig);

      if (!result.success) {
        return res.status(400).json({
          error: 'Claude PRD import failed',
          details: result.error,
          code: 'CLAUDE_IMPORT_ERROR'
        });
      }

      res.json({
        source: 'claude',
        prd: result.prd,
        metadata: result.metadata
      });

    } catch (error) {
      logger.error('Claude import failed:', error);
      res.status(500).json({
        error: 'Claude integration error',
        details: error.message,
        code: 'CLAUDE_ERROR'
      });
    }
  }

  async importFromCopilot(req, res) {
    try {
      const { content, githubGistUrl, githubToken } = req.body;

      if (!content && !githubGistUrl) {
        return res.status(400).json({
          error: 'Either content or githubGistUrl is required',
          code: 'MISSING_COPILOT_DATA'
        });
      }

      const prdConfig = {
        source: 'copilot',
        content,
        githubGistUrl,
        githubToken
      };

      const result = await this.orchestrator.acquireAndParsePRD(prdConfig);

      if (!result.success) {
        return res.status(400).json({
          error: 'Copilot PRD import failed',
          details: result.error,
          code: 'COPILOT_IMPORT_ERROR'
        });
      }

      res.json({
        source: 'copilot',
        prd: result.prd,
        metadata: result.metadata
      });

    } catch (error) {
      logger.error('Copilot import failed:', error);
      res.status(500).json({
        error: 'Copilot integration error',
        details: error.message,
        code: 'COPILOT_ERROR'
      });
    }
  }

  async generateFromTemplate(req, res) {
    try {
      const { templateName, answers } = req.body;

      if (!templateName || !answers) {
        return res.status(400).json({
          error: 'templateName and answers are required',
          code: 'MISSING_TEMPLATE_DATA'
        });
      }

      const prdConfig = {
        source: 'template',
        templateName,
        answers
      };

      const result = await this.orchestrator.acquireAndParsePRD(prdConfig);

      if (!result.success) {
        return res.status(400).json({
          error: 'Template PRD generation failed',
          details: result.error,
          code: 'TEMPLATE_ERROR'
        });
      }

      res.json({
        source: 'template',
        templateName,
        prd: result.prd,
        metadata: result.metadata
      });

    } catch (error) {
      logger.error('Template generation failed:', error);
      res.status(500).json({
        error: 'Template generation error',
        details: error.message,
        code: 'TEMPLATE_ERROR'
      });
    }
  }

  /**
   * Project Orchestration Endpoints
   */
  async orchestrateProject(req, res) {
    try {
      const { projectName, prd } = req.body;

      if (!projectName || !prd) {
        return res.status(400).json({
          error: 'projectName and prd are required',
          code: 'MISSING_PROJECT_DATA'
        });
      }

      const orchestrationRequest = {
        projectName,
        prd
      };

      // Start orchestration asynchronously
      const orchestrationPromise = this.orchestrator.orchestrateProject(orchestrationRequest);
      
      // Generate execution ID early
      const executionId = require('uuid').v4();
      
      // Store the promise for status tracking
      this.activeOrchestrations.set(executionId, {
        promise: orchestrationPromise,
        startTime: new Date(),
        projectName,
        status: 'running'
      });

      // Handle completion asynchronously
      orchestrationPromise.then(result => {
        const orchestration = this.activeOrchestrations.get(executionId);
        if (orchestration) {
          orchestration.status = result.status;
          orchestration.result = result;
          orchestration.endTime = new Date();
        }
      }).catch(error => {
        const orchestration = this.activeOrchestrations.get(executionId);
        if (orchestration) {
          orchestration.status = 'failed';
          orchestration.error = error.message;
          orchestration.endTime = new Date();
        }
      });

      res.json({
        executionId,
        status: 'started',
        projectName,
        startTime: new Date().toISOString(),
        statusUrl: `/api/orchestrate/${executionId}`
      });

    } catch (error) {
      logger.error('Project orchestration failed:', error);
      res.status(500).json({
        error: 'Orchestration startup failed',
        details: error.message,
        code: 'ORCHESTRATION_ERROR'
      });
    }
  }

  async getOrchestrationStatus(req, res) {
    try {
      const { executionId } = req.params;
      const orchestration = this.activeOrchestrations.get(executionId);

      if (!orchestration) {
        return res.status(404).json({
          error: 'Orchestration not found',
          code: 'NOT_FOUND'
        });
      }

      if (orchestration.status === 'running') {
        res.json({
          executionId,
          status: 'running',
          projectName: orchestration.projectName,
          startTime: orchestration.startTime.toISOString(),
          duration: Date.now() - orchestration.startTime.getTime()
        });
      } else {
        res.json({
          executionId,
          status: orchestration.status,
          projectName: orchestration.projectName,
          startTime: orchestration.startTime.toISOString(),
          endTime: orchestration.endTime?.toISOString(),
          duration: orchestration.endTime ? 
            orchestration.endTime.getTime() - orchestration.startTime.getTime() : 
            Date.now() - orchestration.startTime.getTime(),
          result: orchestration.result,
          error: orchestration.error
        });
      }

    } catch (error) {
      logger.error('Status check failed:', error);
      res.status(500).json({
        error: 'Status check failed',
        details: error.message,
        code: 'STATUS_ERROR'
      });
    }
  }

  async cancelOrchestration(req, res) {
    try {
      const { executionId } = req.params;
      const orchestration = this.activeOrchestrations.get(executionId);

      if (!orchestration) {
        return res.status(404).json({
          error: 'Orchestration not found',
          code: 'NOT_FOUND'
        });
      }

      // Mark as cancelled (actual cancellation depends on implementation)
      orchestration.status = 'cancelled';
      orchestration.endTime = new Date();

      res.json({
        executionId,
        status: 'cancelled',
        message: 'Orchestration cancellation requested'
      });

    } catch (error) {
      logger.error('Cancellation failed:', error);
      res.status(500).json({
        error: 'Cancellation failed',
        details: error.message,
        code: 'CANCEL_ERROR'
      });
    }
  }

  /**
   * Work Breakdown Structure Endpoints
   */
  async generateWorkBreakdown(req, res) {
    try {
      const { prd } = req.body;

      if (!prd) {
        return res.status(400).json({
          error: 'PRD is required',
          code: 'MISSING_PRD'
        });
      }

      const result = await this.orchestrator.generateWorkBreakdownStructure(prd);

      if (!result.success) {
        return res.status(400).json({
          error: 'Work breakdown generation failed',
          details: result.error,
          code: 'WBS_ERROR'
        });
      }

      res.json({
        workBreakdown: result.workBreakdown,
        summary: {
          epics: result.workBreakdown.epics?.length || 0,
          features: result.workBreakdown.features?.length || 0,
          userStories: result.workBreakdown.userStories?.length || 0,
          technicalStories: result.workBreakdown.technicalStories?.length || 0,
          sprints: result.workBreakdown.sprints?.length || 0
        }
      });

    } catch (error) {
      logger.error('Work breakdown generation failed:', error);
      res.status(500).json({
        error: 'Work breakdown generation error',
        details: error.message,
        code: 'WBS_ERROR'
      });
    }
  }

  /**
   * Helper Endpoints
   */
  async listTemplates(req, res) {
    try {
      // This would scan the templates directory
      const templates = [
        {
          name: 'basic-app',
          displayName: 'Basic Application',
          description: 'Simple CRUD application template'
        },
        {
          name: 'fitness-tracker',
          displayName: 'Fitness Tracker',
          description: 'Comprehensive fitness tracking application'
        }
      ];

      res.json({ templates });

    } catch (error) {
      logger.error('Template listing failed:', error);
      res.status(500).json({
        error: 'Template listing failed',
        details: error.message,
        code: 'TEMPLATE_LIST_ERROR'
      });
    }
  }

  async getPRDSchema(req, res) {
    try {
      const schemaPath = path.join(__dirname, '../schemas/prd-schema.yaml');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      res.type('text/yaml').send(schema);

    } catch (error) {
      logger.error('Schema fetch failed:', error);
      res.status(500).json({
        error: 'Schema fetch failed',
        details: error.message,
        code: 'SCHEMA_ERROR'
      });
    }
  }

  async getExamples(req, res) {
    try {
      const examples = [
        {
          name: 'fitness-tracker',
          displayName: 'Fitness Tracker PRD',
          description: 'Complete PRD for a fitness tracking application',
          url: '/api/examples/fitness-tracker'
        }
      ];

      res.json({ examples });

    } catch (error) {
      logger.error('Examples listing failed:', error);
      res.status(500).json({
        error: 'Examples listing failed',
        details: error.message,
        code: 'EXAMPLES_ERROR'
      });
    }
  }

  /**
   * Webhook Endpoints for Tool Integration
   */
  async claudeWebhook(req, res) {
    try {
      // Handle webhook from Claude Desktop
      const { event, data } = req.body;

      if (event === 'prd_created') {
        // Process PRD created event
        const prdConfig = {
          source: 'claude',
          content: data.prd,
          conversationId: data.conversationId
        };

        const result = await this.orchestrator.acquireAndParsePRD(prdConfig);
        
        res.json({
          received: true,
          processed: result.success,
          prdId: result.success ? 'generated' : null,
          errors: result.success ? null : result.error
        });
      } else {
        res.json({ received: true, processed: false, reason: 'Unknown event' });
      }

    } catch (error) {
      logger.error('Claude webhook failed:', error);
      res.status(500).json({
        error: 'Claude webhook processing failed',
        details: error.message,
        code: 'CLAUDE_WEBHOOK_ERROR'
      });
    }
  }

  async copilotWebhook(req, res) {
    try {
      // Handle webhook from GitHub Copilot
      const { event, data } = req.body;

      if (event === 'prd_generated') {
        // Process PRD generated event
        const prdConfig = {
          source: 'copilot',
          content: data.prd,
          githubGistUrl: data.gistUrl
        };

        const result = await this.orchestrator.acquireAndParsePRD(prdConfig);
        
        res.json({
          received: true,
          processed: result.success,
          prdId: result.success ? 'generated' : null,
          errors: result.success ? null : result.error
        });
      } else {
        res.json({ received: true, processed: false, reason: 'Unknown event' });
      }

    } catch (error) {
      logger.error('Copilot webhook failed:', error);
      res.status(500).json({
        error: 'Copilot webhook processing failed',
        details: error.message,
        code: 'COPILOT_WEBHOOK_ERROR'
      });
    }
  }

  /**
   * Error Handler
   */
  errorHandler(error, req, res, next) {
    logger.error('API Error:', error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Server error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start the API server
   */
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 PRD Orchestrator API running on port ${this.port}`);
        logger.info(`📋 API Documentation: http://localhost:${this.port}/health`);
        logger.info(`🔌 Claude Integration: http://localhost:${this.port}/api/claude/webhook`);
        logger.info(`🔌 Copilot Integration: http://localhost:${this.port}/api/copilot/webhook`);
        resolve();
      });
    });
  }

  /**
   * Stop the API server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    await this.orchestrator.disconnect();
  }
}

module.exports = OrchestratorAPI;