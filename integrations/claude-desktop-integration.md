# Claude Desktop Integration Guide

This guide shows how to integrate the PRD-First Orchestrator with Claude Desktop's PRD Creation Assistant.

## Architecture

```
Claude Desktop → PRD Assistant → Export to Orchestrator → Project Setup
```

## Integration Methods

### Method 1: Direct API Integration

Claude Desktop can call the orchestrator API directly:

```javascript
// In Claude Desktop PRD Assistant
async function exportToOrchestrator(prd, projectName) {
  const response = await fetch('http://localhost:3000/api/orchestrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://claude.ai'
    },
    body: JSON.stringify({
      projectName,
      prd: {
        source: 'claude',
        content: prd
      }
    })
  });
  
  const result = await response.json();
  return result;
}
```

### Method 2: File Export + Upload

Claude Desktop exports PRD to file, user uploads to orchestrator:

```javascript
// Export PRD as YAML file
function exportPRDFile(prd) {
  const yamlContent = yaml.dump(prd);
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'project-prd.yaml';
  a.click();
}

// User uploads this file to the orchestrator
```

### Method 3: Webhook Integration

Claude Desktop sends webhook when PRD is completed:

```javascript
// Claude Desktop webhook sender
async function sendPRDWebhook(prd, conversationId) {
  await fetch('http://localhost:3000/api/claude/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'prd_created',
      data: {
        prd,
        conversationId,
        timestamp: new Date().toISOString()
      }
    })
  });
}
```

## Claude Desktop PRD Assistant Enhancements

### Add Export Button

```typescript
// In Claude Desktop PRD Assistant
export function PRDExportButton({ prd, projectName }: PRDExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const result = await exportToOrchestrator(prd, projectName);
      
      if (result.executionId) {
        // Show success and provide status link
        showNotification({
          type: 'success',
          title: 'Project Orchestration Started',
          message: `Execution ID: ${result.executionId}`,
          actions: [
            {
              label: 'View Progress',
              url: `http://localhost:3000/api/orchestrate/${result.executionId}`
            }
          ]
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting || !prd || !projectName}
      className="export-button"
    >
      {isExporting ? 'Creating Project...' : 'Create Project in Power Platform'}
    </button>
  );
}
```

### Progress Monitoring Component

```typescript
export function ProjectProgressMonitor({ executionId }: ProgressProps) {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/orchestrate/${executionId}`);
        const statusData = await response.json();
        setStatus(statusData);
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Status polling failed:', error);
      }
    };
    
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial call
    
    return () => clearInterval(interval);
  }, [executionId]);

  return (
    <div className="progress-monitor">
      <h3>Project Creation Progress</h3>
      <div className="status-indicator">
        Status: {status?.status || 'Loading...'}
      </div>
      
      {status?.result?.phases && (
        <div className="phases-list">
          {status.result.phases.map((phase, index) => (
            <div key={index} className={`phase phase-${phase.status}`}>
              <span className="phase-name">{phase.name}</span>
              <span className="phase-status">{phase.status}</span>
            </div>
          ))}
        </div>
      )}
      
      {status?.status === 'completed' && status?.summary && (
        <div className="completion-summary">
          <h4>Project Ready! 🎉</h4>
          <p>✅ {status.summary.projectManagement.epics} Epics created</p>
          <p>✅ {status.summary.projectManagement.features} Features created</p>
          <p>✅ {status.summary.projectManagement.userStories} User Stories created</p>
          <p>✅ {status.summary.infrastructure.environments} Environments set up</p>
          
          <div className="next-steps">
            <h5>Next Steps:</h5>
            <ol>
              <li>Review work items in Azure DevOps</li>
              <li>Start development in Sprint 1</li>
              <li>Configure Power Platform apps</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Configuration

### Claude Desktop Settings

Add orchestrator endpoint to Claude Desktop settings:

```json
{
  "prd_assistant": {
    "orchestrator_endpoint": "http://localhost:3000",
    "auto_export": false,
    "webhook_enabled": true
  }
}
```

### User Workflow

1. **Create PRD** using Claude Desktop PRD Assistant
2. **Review and refine** PRD with Claude's help
3. **Click "Create Project"** button in PRD Assistant
4. **Monitor progress** in real-time within Claude Desktop
5. **Get completion notification** with links to Azure DevOps and Power Platform

## Example Implementation

```typescript
// Claude Desktop PRD Assistant Integration
class PRDOrchestrator {
  constructor(endpoint = 'http://localhost:3000') {
    this.endpoint = endpoint;
  }

  async createProject(prd: PRD, projectName: string): Promise<OrchestrationResult> {
    // Validate PRD first
    const validation = await this.validatePRD(prd);
    if (!validation.valid) {
      throw new Error(`PRD validation failed: ${validation.errors.join(', ')}`);
    }

    // Start orchestration
    const response = await fetch(`${this.endpoint}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        prd: {
          source: 'claude',
          content: prd
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Orchestration failed');
    }

    return await response.json();
  }

  async validatePRD(prd: PRD): Promise<ValidationResult> {
    const response = await fetch(`${this.endpoint}/api/prd/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prd })
    });

    return await response.json();
  }

  async getStatus(executionId: string): Promise<StatusResult> {
    const response = await fetch(`${this.endpoint}/api/orchestrate/${executionId}`);
    return await response.json();
  }
}

// Usage in Claude Desktop
const orchestrator = new PRDOrchestrator();

// When user clicks "Create Project"
async function handleCreateProject(prd: PRD, projectName: string) {
  try {
    showLoadingIndicator('Creating project...');
    
    const result = await orchestrator.createProject(prd, projectName);
    
    showProgressMonitor(result.executionId);
    
  } catch (error) {
    showError('Project creation failed', error.message);
  } finally {
    hideLoadingIndicator();
  }
}
```

This integration makes the PRD → Project creation seamless within Claude Desktop!