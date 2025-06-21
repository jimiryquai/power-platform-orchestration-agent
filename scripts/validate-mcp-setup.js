#!/usr/bin/env node

// MCP Setup Validation Script - Validates that the MCP server is properly configured
// This script checks environment variables, dependencies, and basic functionality

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const REQUIRED_ENV_VARS = [
  'AZURE_DEVOPS_ORG',
  'AZURE_DEVOPS_PAT',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_TENANT_ID'
];

const OPTIONAL_ENV_VARS = [
  'POWER_PLATFORM_DEFAULT_REGION',
  'ENABLE_PARALLEL_EXECUTION',
  'DEBUG_LOGGING',
  'MCP_SERVER_NAME'
];

const REQUIRED_FILES = [
  'dist/mcp/index.js',
  'dist/mcp/server.js',
  'dist/orchestration/project-orchestrator.js',
  'package.json'
];

// ============================================================================
// Validation Functions
// ============================================================================

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const missingRequired = [];
  const presentOptional = [];
  
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    } else {
      console.log(`  ✅ ${varName}: present`);
    }
  });
  
  OPTIONAL_ENV_VARS.forEach(varName => {
    if (process.env[varName]) {
      presentOptional.push(varName);
      console.log(`  ✅ ${varName}: ${process.env[varName]}`);
    }
  });
  
  if (missingRequired.length > 0) {
    console.error(`  ❌ Missing required environment variables:`);
    missingRequired.forEach(varName => {
      console.error(`     - ${varName}`);
    });
    return false;
  }
  
  console.log(`  ✅ All ${REQUIRED_ENV_VARS.length} required environment variables present`);
  console.log(`  ℹ️  ${presentOptional.length} optional environment variables configured`);
  return true;
}

function checkBuildFiles() {
  console.log('🔍 Checking build files...');
  
  const missingFiles = [];
  
  REQUIRED_FILES.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(filePath);
    } else {
      console.log(`  ✅ ${filePath}: exists`);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error(`  ❌ Missing build files:`);
    missingFiles.forEach(filePath => {
      console.error(`     - ${filePath}`);
    });
    console.log(`  💡 Run 'npm run build' to generate missing files`);
    return false;
  }
  
  console.log(`  ✅ All ${REQUIRED_FILES.length} required build files present`);
  return true;
}

function checkPackageConfiguration() {
  console.log('🔍 Checking package configuration...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check bin configuration
    if (!packageJson.bin || !packageJson.bin['power-platform-orchestrator']) {
      console.error('  ❌ Missing bin configuration for power-platform-orchestrator');
      return false;
    }
    console.log(`  ✅ Bin configuration: ${packageJson.bin['power-platform-orchestrator']}`);
    
    // Check MCP dependencies
    const mcpSdk = packageJson.dependencies && packageJson.dependencies['@modelcontextprotocol/sdk'];
    if (!mcpSdk) {
      console.error('  ❌ Missing @modelcontextprotocol/sdk dependency');
      return false;
    }
    console.log(`  ✅ MCP SDK dependency: ${mcpSdk}`);
    
    // Check scripts
    const requiredScripts = ['start:mcp', 'mcp:dev'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length > 0) {
      console.error(`  ❌ Missing package scripts: ${missingScripts.join(', ')}`);
      return false;
    }
    console.log(`  ✅ All required scripts present: ${requiredScripts.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function checkMcpServerSyntax() {
  console.log('🔍 Checking MCP server syntax...');
  
  return new Promise((resolve) => {
    const mcpServerPath = path.join(process.cwd(), 'dist/mcp/index.js');
    
    if (!fs.existsSync(mcpServerPath)) {
      console.error('  ❌ MCP server file not found - run npm run build first');
      resolve(false);
      return;
    }
    
    // Try to load the module to check for syntax errors
    try {
      require(mcpServerPath);
      console.log('  ✅ MCP server syntax check passed');
      resolve(true);
    } catch (error) {
      console.error(`  ❌ MCP server syntax error: ${error.message}`);
      resolve(false);
    }
  });
}

async function testMcpServerStartup() {
  console.log('🔍 Testing MCP server startup...');
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      server.kill('SIGTERM');
      console.log('  ✅ MCP server startup test passed (timeout reached, server running)');
      resolve(true);
    }, 5000); // 5 second timeout
    
    const server = spawn('node', ['dist/mcp/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Set minimal test environment
        AZURE_DEVOPS_ORG: process.env.AZURE_DEVOPS_ORG || 'test-org',
        AZURE_DEVOPS_PAT: process.env.AZURE_DEVOPS_PAT || 'test-pat',
        AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || 'test-client-id',
        AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || 'test-secret',
        AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || 'test-tenant-id'
      }
    });
    
    let hasStarted = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP Server is running') || output.includes('ready to accept connections')) {
        hasStarted = true;
        clearTimeout(timeout);
        server.kill('SIGTERM');
        console.log('  ✅ MCP server started successfully');
        resolve(true);
      }
    });
    
    server.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('Failed')) {
        clearTimeout(timeout);
        server.kill('SIGTERM');
        console.error(`  ❌ MCP server startup error: ${error.trim()}`);
        resolve(false);
      }
    });
    
    server.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`  ❌ Failed to start MCP server: ${error.message}`);
      resolve(false);
    });
    
    server.on('exit', (code, signal) => {
      clearTimeout(timeout);
      if (!hasStarted && code !== 0 && signal !== 'SIGTERM') {
        console.error(`  ❌ MCP server exited with code ${code}`);
        resolve(false);
      }
    });
  });
}

function generateClaudeDesktopConfig() {
  console.log('🔍 Generating Claude Desktop configuration example...');
  
  const config = {
    mcpServers: {
      "power-platform-orchestrator": {
        command: "npx",
        args: ["power-platform-orchestration-agent"],
        env: {
          AZURE_DEVOPS_ORG: process.env.AZURE_DEVOPS_ORG || "your-organization",
          AZURE_DEVOPS_PAT: process.env.AZURE_DEVOPS_PAT ? "***configured***" : "your-personal-access-token",
          AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || "your-client-id",
          AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET ? "***configured***" : "your-client-secret",
          AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || "your-tenant-id",
          POWER_PLATFORM_DEFAULT_REGION: process.env.POWER_PLATFORM_DEFAULT_REGION || "unitedstates",
          ENABLE_PARALLEL_EXECUTION: process.env.ENABLE_PARALLEL_EXECUTION || "true",
          DEBUG_LOGGING: process.env.DEBUG_LOGGING || "false"
        }
      }
    }
  };
  
  console.log('  ✅ Claude Desktop config example:');
  console.log(JSON.stringify(config, null, 2));
  
  return config;
}

// ============================================================================
// Main Validation Function
// ============================================================================

async function main() {
  console.log('🚀 Power Platform Orchestrator MCP Setup Validation\n');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Build Files', fn: checkBuildFiles },
    { name: 'Package Configuration', fn: checkPackageConfiguration },
    { name: 'MCP Server Syntax', fn: checkMcpServerSyntax },
    { name: 'MCP Server Startup', fn: testMcpServerStartup }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`  ❌ ${check.name} check failed: ${error.message}`);
      allPassed = false;
    }
    console.log(''); // Add spacing between checks
  }
  
  // Always generate the Claude Desktop config example
  generateClaudeDesktopConfig();
  console.log('');
  
  if (allPassed) {
    console.log('✅ All validation checks passed!');
    console.log('💡 Your MCP server is ready to use with Claude Desktop or other MCP clients');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the Claude Desktop configuration to your claude_desktop_config.json');
    console.log('2. Restart Claude Desktop');
    console.log('3. Test the MCP tools in Claude Desktop');
  } else {
    console.log('❌ Some validation checks failed');
    console.log('💡 Please address the issues above before using the MCP server');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// ============================================================================
// Script Execution
// ============================================================================

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironmentVariables,
  checkBuildFiles,
  checkPackageConfiguration,
  generateClaudeDesktopConfig
};