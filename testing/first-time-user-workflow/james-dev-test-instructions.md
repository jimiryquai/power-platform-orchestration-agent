# James Dev Environment Testing Instructions

## 🎯 Simplified First-Time User Test (No Environment Creation)

### Configuration for James Dev Environment

**Copy this to:** `C:\Users\james\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "power-platform-orchestrator": {
      "command": "npx",
      "args": [
        "power-platform-orchestration-agent"
      ],
      "env": {
        "AZURE_DEVOPS_ORG": "jamesryandev",
        "AZURE_DEVOPS_PAT": "4uyeQL4elPHIQEH4y5PSm7nYdUizzjHaRwjkovgg5rebhoYOQiBwJQQJ99BFACAAAAA6SZTrAAASAZDO1rHZ",
        "AZURE_TENANT_ID": "92f292bf-d44c-427e-b092-c466178e9ffa",
        "AZURE_USE_INTERACTIVE_AUTH": "true",
        "POWER_PLATFORM_ENVIRONMENT_URL": "https://james-dev.crm11.dynamics.com/api/data/v9.2",
        "SKIP_ENVIRONMENT_CREATION": "true",
        "USE_EXISTING_ENVIRONMENT": "true",
        "POWER_PLATFORM_DEFAULT_REGION": "unitedstates",
        "ENABLE_PARALLEL_EXECUTION": "true",
        "DEBUG_LOGGING": "true"
      }
    }
  }
}
```

## 📋 What This Configuration Does

✅ **Uses existing James Dev environment** (`https://james-dev.crm11.dynamics.com/api/data/v9.2`)  
✅ **Skips environment creation** (`SKIP_ENVIRONMENT_CREATION=true`)  
✅ **Creates solutions and components** in your existing environment  
✅ **Creates Azure DevOps project** with work items from PRD  
✅ **First-time user flow** (no Service Principal initially)  

## 🚀 Testing Workflow

### 1. Basic MCP Connection Test
```
"List available Power Platform templates"
```
*Expected: Should show standard, enterprise, and quickstart templates*

### 2. Service Principal Creation (First-Time User)
```
"I need to create a Service Principal for Power Platform access. Use interactive authentication to create one with the appropriate permissions."
```
*Expected: Creates Service Principal via Microsoft Graph API*

### 3. PRD Validation
```
"Validate this PRD for the standard template: [paste sample PRD content]"
```
*Expected: Validates PRD structure and work items*

### 4. Project Creation (James Dev Environment)
```
"Create a project from this validated PRD. Use the existing James Dev environment at https://james-dev.crm11.dynamics.com/api/data/v9.2 instead of creating new environments."
```
*Expected: Creates Azure DevOps project + solutions in James Dev environment*

### 5. Status Monitoring
```
"Check the status of the project creation operation"
```
*Expected: Shows progress of Azure DevOps and Power Platform setup*

## 📊 Expected Results

### Azure DevOps
- ✅ New project: "Customer Support Portal"
- ✅ Work items created from PRD timeline (14 items)
- ✅ Repositories: customer-portal-solution, deployment-scripts
- ✅ Basic pipelines configured

### James Dev Environment
- ✅ Solutions created: CustomerSupportCore, KnowledgeBase
- ✅ Publisher registered: JamesRyanDev (jrd prefix)
- ✅ No new environments created (uses existing)
- ✅ Components ready for development

## 🔍 Verification Steps

After running the test:

1. **Check Azure DevOps**: `https://dev.azure.com/jamesryandev/CustomerSupportPortal`
2. **Check James Dev**: Open your Power Platform environment and look for new solutions
3. **Verify Work Items**: Should see Epics, Features, User Stories, and Tasks

## ⚠️ Important Notes

- **No environment creation** - saves capacity
- **Uses existing James Dev environment only**
- **Service Principal created on-demand** for first-time users
- **Work items generated from PRD timeline structure**

This configuration tests the complete PRD → Azure DevOps + Power Platform workflow while respecting your environment capacity limits!