# Architecture Decisions

## Key Technical Decisions Made

### 1. Architecture Simplification (Major Decision)
**Decision**: Eliminate n8n dependency and move to MCP-only conversational architecture  
**Rationale**:
- n8n adds unnecessary complexity for conversational automation
- Direct REST API integration is more reliable than CLI subprocess management
- Claude Desktop provides superior natural language interface
- MCP servers offer better modularity and maintainability

**Migration Path**:
- **Old**: `User → API → n8n → PAC CLI/MCPs → Azure/PowerPlatform`
- **New**: `User → Claude Desktop → MCP Servers → REST APIs → Azure/PowerPlatform`

### 2. Power Platform Integration Strategy
**Decision**: Use direct REST APIs instead of PAC CLI  
**Rationale**:
- **Dataverse Web API** can create solutions: `POST /api/data/v9.2/solutions`
- **Power Platform Admin API** can manage environments
- **No CLI dependencies** = more portable and reliable
- **Better error handling** through direct HTTP responses

### 3. MCP Server Architecture
**Decision**: Three specialized MCP servers  
**Components**:
1. **Azure DevOps MCP** - Project and work item management (✅ Working)
2. **Power Platform MCP** - Environment and solution management
3. **Microsoft Graph API MCP** - App registrations and Service Principals

**Rationale**: Direct Microsoft Graph API integration rather than CLI subprocess calls for app registration creation.

## Technical Implementation Status

### ✅ Completed & Working
- **Azure DevOps Integration**: Project creation fixed (400 Bad Request resolved)
- **Authentication**: PAT token with Basic auth working
- **S-Project Template**: Complete 12-week template with 3 environments
- **Configuration Management**: Environment variables and base URL construction functional

### 🔄 Architecture Migration Complete
- **PRD Updated**: Reflects new MCP-only architecture
- **Template Structure**: Ready for MCP integration
- **Direct API Strategy**: Documented and planned

### ❌ Requires Implementation
- **Power Platform MCP Server**: Replace PAC CLI with direct REST API
- **Microsoft Graph MCP Server**: App registration automation
- **Orchestrator Refactoring**: Remove n8n dependencies

## Critical Technical Insights

### Azure DevOps API Lessons
- **Payload Validation**: Azure DevOps API requires strict payload structure
- **Error Handling**: Specific error messages improve debugging
- **Authentication**: PAT tokens work reliably with Basic auth
- **API Versioning**: Version 7.0 works well for project creation

### Power Platform API Capabilities
- **Environment Creation**: Power Platform Admin API handles full lifecycle
- **Solution Management**: Dataverse Web API supports complete CRUD operations
- **No CLI Required**: All operations achievable via REST APIs
- **Authentication**: Service Principal recommended for automation

### Azure MCP Server Analysis
**Repository**: https://github.com/Azure/azure-mcp/tree/1ea702cb489ba95c5d9bea8d41fc18e9343703f8  
**Capabilities**:
- ❌ **No Direct App Registration Support** - Focuses on data services
- ✅ **Azure CLI Integration** - Can run `az ad app create` indirectly
- ✅ **Resource Group Management** - Direct support
- ❌ **No Microsoft Graph API Integration** - Requires custom implementation

## Environment Configuration

### Required Environment Variables
```bash
AZURE_DEVOPS_ORG=jamesryandev
AZURE_DEVOPS_PAT=[working-token]
AZURE_CLIENT_ID=[needed-for-power-platform]
AZURE_CLIENT_SECRET=[needed-for-power-platform]
AZURE_TENANT_ID=[needed-for-power-platform]
```

### Integration Status
- **Azure DevOps**: ✅ Connection validated, project creation working
- **Power Platform**: ❌ Authentication needs Service Principal setup
- **Microsoft Graph**: 📋 Pending implementation

## Success Metrics Achieved
- **Azure DevOps Integration**: Fixed major blocker (400 payload validation)
- **Template Structure**: Comprehensive S-Project template ready
- **Architecture Decision**: Clear MCP-only path forward
- **Documentation**: PRD updated to reflect simplified direction

## Next Implementation Priorities

### 1. Power Platform MCP Server Design
- REST API endpoints for environment management
- Dataverse Web API integration for solution creation
- Service Principal authentication strategy

### 2. Microsoft Graph API MCP Server
- App registration creation automation
- Service Principal creation and permission assignment
- Authentication via existing Service Principal

### 3. Orchestrator Refactoring
- Remove n8n dependencies from existing orchestrator
- Implement direct MCP server coordination
- Maintain working Azure DevOps integration

This simplified architecture eliminates complexity while providing more reliable automation through direct API integration and conversational control via Claude Desktop.