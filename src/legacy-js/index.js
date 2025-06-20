const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./api/routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      templates: '/api/templates',
      projects: '/api/projects',
      commands: '/api/commands'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: config.app.environment === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const port = config.app.port;
app.listen(port, () => {
  logger.info(`Power Platform Orchestration Agent started on port ${port}`, {
    environment: config.app.environment,
    version: config.app.version
  });
  
  logger.info('Available endpoints:', {
    root: `http://localhost:${port}/`,
    health: `http://localhost:${port}/api/health`,
    templates: `http://localhost:${port}/api/templates`,
    projects: `http://localhost:${port}/api/projects`,
    commands: `http://localhost:${port}/api/commands`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;