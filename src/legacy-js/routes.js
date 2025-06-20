const express = require('express');
const router = express.Router();
const ProjectOrchestrator = require('../workflows/orchestrator');
const logger = require('../utils/logger');

const orchestrator = new ProjectOrchestrator();

// Initialize orchestrator
orchestrator.initialize().then((success) => {
  if (success) {
    logger.info('API routes initialized with orchestrator');
  } else {
    logger.error('Failed to initialize orchestrator for API routes');
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const connections = await orchestrator.testConnections();
    const allConnected = connections.every(conn => conn.connected);
    
    res.status(allConnected ? 200 : 503).json({
      status: allConnected ? 'healthy' : 'unhealthy',
      connections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available templates
router.get('/templates', (req, res) => {
  try {
    const templates = orchestrator.getAvailableTemplates();
    res.json({
      templates,
      count: templates.length
    });
  } catch (error) {
    logger.error('Failed to get templates:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Get specific template details
router.get('/templates/:templateName', (req, res) => {
  try {
    const template = orchestrator.getTemplate(req.params.templateName);
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }
    
    res.json(template);
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Create new project
router.post('/projects', async (req, res) => {
  try {
    const projectRequest = req.body;
    
    // Validate required fields
    if (!projectRequest.projectName) {
      return res.status(400).json({
        error: 'Project name is required'
      });
    }
    
    logger.info('Received project creation request:', projectRequest.projectName);
    
    // Start project setup (async)
    const result = await orchestrator.setupProject(projectRequest);
    
    res.status(202).json({
      message: 'Project setup initiated',
      executionId: result.executionId,
      status: result.status,
      projectName: result.projectName
    });
    
  } catch (error) {
    logger.error('Project creation failed:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Get project setup status
router.get('/projects/:executionId/status', async (req, res) => {
  try {
    // In a real implementation, this would check execution status
    // For now, return a placeholder response
    res.json({
      executionId: req.params.executionId,
      status: 'in_progress',
      message: 'Status tracking not yet implemented'
    });
  } catch (error) {
    logger.error('Failed to get project status:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Natural language command endpoint
router.post('/commands', async (req, res) => {
  try {
    const { command, context } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }
    
    logger.info('Received natural language command:', command);
    
    // Parse command (placeholder implementation)
    const parsedCommand = await parseNaturalLanguageCommand(command, context);
    
    if (parsedCommand.intent === 'create_project') {
      const result = await orchestrator.setupProject(parsedCommand.parameters);
      
      res.json({
        intent: parsedCommand.intent,
        parameters: parsedCommand.parameters,
        result: result,
        originalCommand: command
      });
    } else {
      res.json({
        intent: parsedCommand.intent,
        message: 'Command recognized but not yet implemented',
        originalCommand: command
      });
    }
    
  } catch (error) {
    logger.error('Command processing failed:', error);
    res.status(500).json({
      error: error.message,
      originalCommand: req.body.command
    });
  }
});

// Simple natural language command parser (placeholder)
async function parseNaturalLanguageCommand(command, context = {}) {
  const lowercaseCommand = command.toLowerCase();
  
  // Project creation patterns
  if (lowercaseCommand.includes('create') || lowercaseCommand.includes('setup') || lowercaseCommand.includes('new')) {
    if (lowercaseCommand.includes('project')) {
      // Extract project name
      const projectNameMatch = command.match(/project['\"]?\\s+['\"]?([^'\"\\s]+)/i);
      const templateMatch = command.match(/(?:using|with|template)\\s+([^\\s]+)/i);
      
      return {
        intent: 'create_project',
        confidence: 0.8,
        parameters: {
          projectName: projectNameMatch ? projectNameMatch[1] : 'NewProject',
          templateName: templateMatch ? templateMatch[1] : 's-project-template',
          description: `Project created via natural language command: ${command}`
        }
      };
    }
  }
  
  // Environment management patterns
  if (lowercaseCommand.includes('environment') || lowercaseCommand.includes('env')) {
    return {
      intent: 'manage_environment',
      confidence: 0.7,
      parameters: {
        action: lowercaseCommand.includes('create') ? 'create' : 'manage'
      }
    };
  }
  
  // Status inquiry patterns
  if (lowercaseCommand.includes('status') || lowercaseCommand.includes('progress')) {
    return {
      intent: 'get_status',
      confidence: 0.9,
      parameters: {}
    };
  }
  
  // Default fallback
  return {
    intent: 'unknown',
    confidence: 0.1,
    parameters: {},
    suggestions: [
      'Try: \"Create new project CustomerPortal using s-template\"',
      'Try: \"Show project status\"',
      'Try: \"List available templates\"'
    ]
  };
}

module.exports = router;