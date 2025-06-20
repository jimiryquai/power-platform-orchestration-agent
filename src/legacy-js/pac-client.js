const { spawn } = require('child_process');
const config = require('../../config');
const logger = require('../../utils/logger');

class PACClient {
  constructor() {
    this.isAuthenticated = false;
  }

  async authenticate() {
    if (this.isAuthenticated) {
      return true;
    }

    try {
      logger.info('Validating Power Platform configuration...');
      
      // For Phase 1, we'll validate configuration without actual authentication
      if (!config.powerPlatform.auth.tenantId || 
          config.powerPlatform.auth.tenantId === 'your-power-platform-tenant-id') {
        logger.warn('Power Platform credentials not configured - running in demo mode');
        this.isAuthenticated = true;
        return true;
      }
      
      const result = await this.executeCommand('auth', 'create', [
        '--kind', 'SERVICEPRINCIPALSECRET',
        '--tenantId', config.powerPlatform.auth.tenantId,
        '--applicationId', config.powerPlatform.auth.clientId,
        '--clientSecret', config.powerPlatform.auth.clientSecret
      ]);

      if (result.success) {
        this.isAuthenticated = true;
        logger.info('Successfully authenticated with Power Platform');
        return true;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      logger.error('Power Platform authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  async executeCommand(command, subCommand, args = []) {
    if (!this.isAuthenticated && command !== 'help' && command !== 'auth') {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const pacArgs = [command];
      if (subCommand) pacArgs.push(subCommand);
      pacArgs.push(...args);

      const pacProcess = spawn('pac', pacArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      pacProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pacProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pacProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, data: output });
        } else {
          logger.error(`PAC command failed: ${command} ${subCommand}`, { 
            code, 
            error: errorOutput,
            args 
          });
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });

      pacProcess.on('error', (error) => {
        logger.error('PAC process error:', error);
        reject(error);
      });
    });
  }

  // Environment Operations
  async createEnvironment(environmentData) {
    logger.info('Creating Power Platform environment:', environmentData.displayName);
    
    const args = [
      '--name', environmentData.name,
      '--display-name', environmentData.displayName,
      '--location', environmentData.location || 'northeurope',
      '--type', environmentData.type || 'Sandbox'
    ];

    if (environmentData.description) {
      args.push('--description', environmentData.description);
    }

    if (environmentData.dataverse) {
      args.push('--provision-database');
    }

    return await this.executeCommand('admin', 'create', args);
  }

  async listEnvironments() {
    return await this.executeCommand('admin', 'list');
  }

  async getEnvironment(environmentName) {
    const result = await this.executeCommand('admin', 'list');
    if (result.success) {
      // Parse output to find specific environment
      const environments = this.parseEnvironmentList(result.data);
      return environments.find(env => env.name === environmentName || env.displayName === environmentName);
    }
    return null;
  }

  async deleteEnvironment(environmentName) {
    logger.info('Deleting Power Platform environment:', environmentName);
    
    const args = [
      '--environment', environmentName,
      '--confirm'
    ];

    return await this.executeCommand('admin', 'delete', args);
  }

  // Solution Operations
  async createSolution(solutionData) {
    logger.info('Creating solution:', solutionData.name);
    
    const args = [
      '--name', solutionData.name,
      '--display-name', solutionData.displayName,
      '--publisher-name', solutionData.publisherName,
      '--publisher-prefix', solutionData.publisherPrefix
    ];

    return await this.executeCommand('solution', 'init', args);
  }

  async exportSolution(solutionName, environment) {
    logger.info('Exporting solution:', solutionName);
    
    const args = [
      '--name', solutionName,
      '--environment', environment,
      '--managed', 'false'
    ];

    return await this.executeCommand('solution', 'export', args);
  }

  async importSolution(solutionPath, environment) {
    logger.info('Importing solution to environment:', environment);
    
    const args = [
      '--path', solutionPath,
      '--environment', environment
    ];

    return await this.executeCommand('solution', 'import', args);
  }

  // Data Operations
  async exportData(environment, schema) {
    logger.info('Exporting data from environment:', environment);
    
    const args = [
      '--environment', environment,
      '--schema', schema
    ];

    return await this.executeCommand('data', 'export', args);
  }

  async importData(environment, data) {
    logger.info('Importing data to environment:', environment);
    
    const args = [
      '--environment', environment,
      '--data', data
    ];

    return await this.executeCommand('data', 'import', args);
  }

  // Utility Methods
  parseEnvironmentList(output) {
    // Parse PAC CLI output format for environment list
    const lines = output.split('\n');
    const environments = [];
    
    // Skip header lines and parse environment data
    let dataStarted = false;
    for (const line of lines) {
      if (line.includes('Display Name') && line.includes('Environment Id')) {
        dataStarted = true;
        continue;
      }
      
      if (dataStarted && line.trim()) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          environments.push({
            displayName: parts[0],
            name: parts[1],
            environmentId: parts[2],
            type: parts[3] || 'Unknown'
          });
        }
      }
    }
    
    return environments;
  }

  async disconnect() {
    this.isAuthenticated = false;
    logger.info('Disconnected from Power Platform');
  }
}

module.exports = PACClient;