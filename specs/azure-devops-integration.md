# Azure DevOps Integration Specification

## Overview
Detailed specification for integrating with Microsoft's official Azure DevOps MCP server to automate project setup, work item management, and development workflows.

## Architecture

### Integration Pattern
```
Claude Desktop → Azure DevOps MCP Server → Azure DevOps REST API
```

### Authentication
- **Method**: Service Principal (OAuth 2.0)
- **Scope**: Full Azure DevOps project access
- **Token Management**: Handled by MCP server
- **Fallback**: Personal Access Token (PAT) for development

## MCP Server Operations

### Project Management
| Operation | MCP Function | Purpose |
|-----------|--------------|---------|
| List Projects | `mcp__azure-devops__core_list_projects` | Discover existing projects |
| Create Project | Not available via MCP | Use REST API directly |
| Get Project Teams | `mcp__azure-devops__core_list_project_teams` | Team structure setup |

### Work Item Management
| Operation | MCP Function | Parameters | Purpose |
|-----------|--------------|------------|---------|
| Create Work Item | `mcp__azure-devops__wit_create_work_item` | project, workItemType, fields | Create epics, features, stories |
| Update Work Item | `mcp__azure-devops__wit_update_work_item` | id, updates | Modify work item fields |
| Batch Update | `mcp__azure-devops__wit_update_work_items_batch` | updates[] | Bulk work item operations |
| Add Child | `mcp__azure-devops__wit_add_child_work_item` | parentId, type, title, description | Create parent-child relationships |
| Link Work Items | `mcp__azure-devops__wit_work_items_link` | updates[] | Create work item relationships |
| Get Work Item | `mcp__azure-devops__wit_get_work_item` | id, project, expand | Retrieve work item details |
| My Work Items | `mcp__azure-devops__wit_my_work_items` | project, type | Get assigned work items |

### Repository Operations
| Operation | MCP Function | Parameters | Purpose |
|-----------|--------------|------------|---------|
| List Repositories | `mcp__azure-devops__repo_list_repos_by_project` | project | Get project repositories |
| Create Pull Request | `mcp__azure-devops__repo_create_pull_request` | repositoryId, sourceRefName, targetRefName, title | Code review workflow |
| List Branches | `mcp__azure-devops__repo_list_branches_by_repo` | repositoryId | Branch management |
| Get Repository | `mcp__azure-devops__repo_get_repo_by_name_or_id` | project, repositoryNameOrId | Repository details |

### Build and Pipeline Operations
| Operation | MCP Function | Parameters | Purpose |
|-----------|--------------|------------|---------|
| Get Build Definitions | `mcp__azure-devops__build_get_definitions` | project | List available pipelines |
| Run Build | `mcp__azure-devops__build_run_build` | project, definitionId, sourceBranch | Trigger pipeline execution |
| Get Build Status | `mcp__azure-devops__build_get_status` | project, buildId | Monitor build progress |
| Get Build Logs | `mcp__azure-devops__build_get_log` | project, buildId | Troubleshoot build issues |

## Template Integration

### S-Project Template Mapping
```yaml
# Template Structure → Azure DevOps Implementation
projectTemplate:
  name: "S Project Template"
  azureDevOps:
    project: # Create via REST API
      name: "${projectName}"
      description: "${projectDescription}"
      processTemplate: "Agile"
    
    epics: # Create via wit_create_work_item
      - name: "Environment Setup"
        workItemType: "Epic"
        fields:
          "System.Title": "Environment Setup"
          "System.Description": "Configure development, test, and production environments"
          
    features: # Create via wit_create_work_item + wit_add_child_work_item
      - epic: "Environment Setup"
        name: "Development Environment Configuration"
        workItemType: "Feature"
        
    userStories: # Create via wit_create_work_item + wit_add_child_work_item
      - feature: "Development Environment Configuration"
        title: "Create Dataverse environment"
        workItemType: "User Story"
        
    sprints: # Create via work item iteration assignment
      - name: "Sprint 1"
        duration: "2 weeks"
        startDate: "2025-01-01"
```

### Batch Operations Strategy
```typescript
// Efficient bulk work item creation
interface WorkItemBatch {
  epics: WorkItemCreate[];
  features: WorkItemCreate[];
  userStories: WorkItemCreate[];
}

// Implementation pattern
async function createWorkItemHierarchy(batch: WorkItemBatch): Promise<void> {
  // 1. Create epics first
  const epics = await Promise.all(
    batch.epics.map(epic => createWorkItem(epic))
  );
  
  // 2. Create features with epic relationships
  const features = await Promise.all(
    batch.features.map(feature => createChildWorkItem(feature, epic))
  );
  
  // 3. Create user stories with feature relationships
  const userStories = await Promise.all(
    batch.userStories.map(story => createChildWorkItem(story, feature))
  );
}
```

## Error Handling

### Retry Strategy
```typescript
interface RetryConfig {
  maxAttempts: 3;
  backoffMultiplier: 2;
  baseDelay: 1000; // ms
}

// Rate limiting handling
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  // Exponential backoff with jitter
  // Handle 429 (Too Many Requests) specifically
  // Log all retry attempts for debugging
}
```

### Error Types
| Error Type | HTTP Code | Handling Strategy |
|------------|-----------|-------------------|
| Authentication | 401 | Refresh token, fallback to PAT |
| Authorization | 403 | Check permissions, escalate |
| Rate Limiting | 429 | Exponential backoff |
| Not Found | 404 | Create resource if possible |
| Server Error | 500 | Retry with backoff |

## Data Models

### Work Item Creation
```typescript
interface WorkItemCreate {
  workItemType: 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug';
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'Microsoft.VSTS.Common.Priority'?: number;
    'Microsoft.VSTS.Scheduling.Effort'?: number;
    [key: string]: any;
  };
}

interface WorkItemRelationship {
  sourceId: number;
  targetId: number;
  relationshipType: 'parent' | 'child' | 'related' | 'duplicate';
}
```

### Project Configuration
```typescript
interface AzureDevOpsProject {
  name: string;
  description: string;
  visibility: 'private' | 'public';
  capabilities: {
    versioncontrol: {
      sourceControlType: 'Git';
    };
    processTemplate: {
      templateTypeId: string; // Agile, Scrum, CMMI
    };
  };
}
```

## Performance Optimization

### Parallel Execution
- Work item creation can be parallelized within types (all epics together)
- Repository operations independent of work items
- Build definitions can be created alongside work items

### Caching Strategy
- Cache project metadata for session duration
- Cache work item type definitions
- Cache user permissions and team memberships

## Testing Strategy

### Integration Tests
```typescript
describe('Azure DevOps Integration', () => {
  test('creates complete project structure from template', async () => {
    // Test full S-Project template deployment
    // Verify all work items created with correct relationships
    // Validate repository and build configuration
  });
  
  test('handles work item creation failures gracefully', async () => {
    // Test partial failure scenarios
    // Verify rollback and cleanup
  });
});
```

### Mock Strategy
- Use actual Azure DevOps MCP server in integration tests
- Mock only for unit tests of business logic
- Test with real test project for end-to-end validation

## Implementation Checklist

### Phase 1: Basic Integration
- [ ] MCP server connection and authentication
- [ ] Project creation via REST API
- [ ] Basic work item creation (Epic, Feature, User Story)
- [ ] Simple template processing

### Phase 2: Advanced Features
- [ ] Batch work item operations
- [ ] Work item relationship management
- [ ] Repository and build configuration
- [ ] Error handling and retry logic

### Phase 3: Enterprise Features
- [ ] Parallel execution optimization
- [ ] Advanced template customization
- [ ] Comprehensive monitoring and logging
- [ ] Performance metrics and reporting

## Security Considerations

### Service Principal Permissions
```
Required Azure DevOps Permissions:
- Project and Team Reader
- Work Item Read & Write
- Code (read/write for repository operations)
- Build (read/write for pipeline operations)
- Release (read for deployment tracking)
```

### Audit Trail
- Log all work item operations with user context
- Track template application and customization
- Monitor API usage and rate limiting
- Preserve operation history for compliance

This specification provides the foundation for robust, enterprise-grade Azure DevOps integration through the official Microsoft MCP server.