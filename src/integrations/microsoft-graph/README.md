# Microsoft Graph MCP Client

This client provides integration with Microsoft Graph API for managing Azure Active Directory app registrations with specific API permissions for Power Platform integration.

## Features

- ✅ Azure Active Directory authentication using Service Principal
- ✅ App registration creation with predefined API permissions
- ✅ Service principal creation
- ✅ Client secret management
- ✅ Comprehensive error handling and logging

## Pre-configured API Permissions

The client automatically configures app registrations with the following permissions:

### Microsoft Graph API (`00000003-0000-0000-c000-000000000000`)
- **User.Read** (`e1fe6dd8-ba31-4d61-89e7-88639da4683d`) - Scope permission for basic user profile access

### Dynamics CRM API (`00000007-0000-0000-c000-000000000000`)
- **user_impersonation** (`78ce3f0f-a1ce-49c2-8cde-64b5c0896db4`) - Scope permission for Power Platform access

## Required Environment Variables

```bash
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=your-service-principal-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
```

## Usage Example

```javascript
const MicrosoftGraphMCPClient = require('./mcp-client');

async function createPowerPlatformApp() {
  const client = new MicrosoftGraphMCPClient();
  
  try {
    // Connect to Microsoft Graph
    await client.connect();
    
    // Create app registration
    const result = await client.createAppRegistration({
      displayName: 'My Power Platform App',
      description: 'Application for Power Platform integration',
      redirectUris: ['https://localhost:8080/auth/callback'],
      createServicePrincipal: true
    });
    
    if (result.success) {
      console.log('App ID:', result.data.appId);
      console.log('Object ID:', result.data.id);
      
      // Add client secret
      const secretResult = await client.addClientSecret(result.data.id, {
        displayName: 'Main Secret'
      });
      
      if (secretResult.success) {
        console.log('Secret Value:', secretResult.data.secretText);
        // Save this secret securely - it's only shown once!
      }
    }
    
  } finally {
    await client.disconnect();
  }
}
```

## Authentication Flow

1. The client uses the **Client Credentials** flow with Azure AD
2. Authenticates using the service principal configured in environment variables
3. Obtains an access token for Microsoft Graph API access
4. Token is automatically refreshed as needed

## Permissions Required for Service Principal

The service principal used must have the following permissions in Azure AD:

- **Application.ReadWrite.All** - To create and manage app registrations
- **Directory.Read.All** - To read directory information

## Error Handling

The client includes comprehensive error handling for common scenarios:

- Invalid or missing credentials
- Network connectivity issues  
- Azure AD permission errors
- API rate limiting
- Token expiration

All errors are logged with detailed information for troubleshooting.

## Testing

Run the test script to verify the integration:

```bash
node test-graph-client.js
```

This will create a test app registration, add a client secret, and then clean up by deleting the test app.