const MicrosoftGraphMCPClient = require('./mcp-client');
const logger = require('../../utils/logger');

/**
 * Example usage of Microsoft Graph MCP Client for Power Platform app registration
 */
async function createPowerPlatformAppRegistration(projectName, environment = 'dev') {
  const client = new MicrosoftGraphMCPClient();
  
  try {
    logger.info(`Creating app registration for project: ${projectName}`);
    
    // Connect to Microsoft Graph
    const connected = await client.connect();
    if (!connected) {
      throw new Error('Failed to connect to Microsoft Graph');
    }
    
    // Create app registration with Power Platform permissions
    const appData = {
      displayName: `${projectName}-${environment}`,
      description: `Power Platform application for ${projectName} (${environment} environment)`,
      redirectUris: [
        `https://${projectName}-${environment}.powerapps.com/auth/callback`,
        'https://localhost:8080/auth/callback' // For local development
      ],
      createServicePrincipal: true,
      grantAdminConsent: true // Automatically grant admin consent
    };
    
    const appResult = await client.createAppRegistration(appData);
    
    if (!appResult.success) {
      throw new Error(`Failed to create app registration: ${appResult.error}`);
    }
    
    logger.info(`App registration created successfully: ${appResult.data.appId}`);
    
    // Create client secret
    const secretResult = await client.addClientSecret(appResult.data.id, {
      displayName: `${projectName}-${environment}-secret`,
      endDateTime: new Date(Date.now() + (24 * 30 * 24 * 60 * 60 * 1000)).toISOString() // 2 years
    });
    
    if (!secretResult.success) {
      logger.warn(`Failed to create client secret: ${secretResult.error}`);
    }
    
    // Return the complete app registration details
    return {
      success: true,
      appRegistration: {
        appId: appResult.data.appId,
        objectId: appResult.data.id,
        displayName: appResult.data.displayName,
        servicePrincipalId: appResult.data.servicePrincipal?.id,
        clientSecret: secretResult.success ? {
          keyId: secretResult.data.keyId,
          secretText: secretResult.data.secretText,
          displayName: secretResult.data.displayName,
          endDateTime: secretResult.data.endDateTime
        } : null
      }
    };
    
  } catch (error) {
    logger.error('Failed to create Power Platform app registration:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.disconnect();
  }
}

/**
 * Get app registration by display name
 */
async function getAppRegistrationByName(displayName) {
  const client = new MicrosoftGraphMCPClient();
  
  try {
    await client.connect();
    
    const filter = `displayName eq '${displayName}'`;
    const result = await client.listAppRegistrations(filter);
    
    if (result.success && result.data.value && result.data.value.length > 0) {
      return {
        success: true,
        appRegistration: result.data.value[0]
      };
    } else {
      return {
        success: false,
        error: 'App registration not found'
      };
    }
    
  } catch (error) {
    logger.error('Failed to get app registration:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.disconnect();
  }
}

/**
 * Delete app registration by display name (cleanup)
 */
async function deleteAppRegistrationByName(displayName) {
  const client = new MicrosoftGraphMCPClient();
  
  try {
    await client.connect();
    
    // First find the app registration
    const appResult = await getAppRegistrationByName(displayName);
    
    if (!appResult.success) {
      return appResult;
    }
    
    // Delete the app registration
    const deleteResult = await client.deleteAppRegistration(appResult.appRegistration.id);
    
    if (deleteResult.success) {
      logger.info(`App registration deleted: ${displayName}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: deleteResult.error
      };
    }
    
  } catch (error) {
    logger.error('Failed to delete app registration:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.disconnect();
  }
}

module.exports = {
  createPowerPlatformAppRegistration,
  getAppRegistrationByName,
  deleteAppRegistrationByName
};