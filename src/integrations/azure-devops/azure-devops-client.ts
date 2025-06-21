// Azure DevOps MCP Client - Enterprise-grade TypeScript implementation
// Wraps Microsoft's official Azure DevOps MCP server with type safety

import {
  IAzureDevOpsClient,
  AzureDevOpsConfig,
  AzureDevOpsResponse,
  AzureDevOpsListResponse,
  AzureDevOpsProject,
  WorkItem,
  WorkItemFields,
  WorkItemCreate,
  WorkItemCreateResponse,
  WorkItemUpdate,
  WorkItemUpdateResponse,
  WorkItemBatch,
  WorkItemBatchResult,
  WorkItemRelationship,
  Repository,
  PullRequest,
  PullRequestCreateRequest,
  BuildDefinition,
  Build,
  Team,
  RetryConfig,
  AzureDevOpsError,
  WorkItemCreationError,
  ProjectNotFoundError
} from '../../types/azure-devops-interfaces';

// MCP server function types - these will be available through Claude Desktop
declare global {
  function mcp__azure_devops__core_list_projects(params?: {
    skip?: number;
    top?: number;
    stateFilter?: 'all' | 'wellFormed' | 'createPending' | 'deleted';
    continuationToken?: number;
  }): Promise<any>;

  function mcp__azure_devops__core_list_project_teams(params: {
    project: string;
    mine?: boolean;
    skip?: number;
    top?: number;
  }): Promise<any>;

  function mcp__azure_devops__wit_create_work_item(params: {
    project: string;
    workItemType: string;
    fields: Record<string, any>;
  }): Promise<any>;

  function mcp__azure_devops__wit_update_work_item(params: {
    id: number;
    updates: Array<{
      op: 'add' | 'replace' | 'remove';
      path: string;
      value?: string;
    }>;
  }): Promise<any>;

  function mcp__azure_devops__wit_get_work_item(params: {
    id: number;
    project: string;
    expand?: string;
    fields?: string[];
    asOf?: string;
  }): Promise<any>;

  function mcp__azure_devops__wit_add_child_work_item(params: {
    parentId: number;
    project: string;
    workItemType: string;
    title: string;
    description: string;
    areaPath?: string;
    iterationPath?: string;
  }): Promise<any>;

  function mcp__azure_devops__wit_work_items_link(params: {
    project: string;
    updates: Array<{
      id: number;
      linkToId: number;
      type?: string;
      comment?: string;
    }>;
  }): Promise<any>;

  function mcp__azure_devops__wit_update_work_items_batch(params: {
    updates: Array<{
      id: number;
      op: 'add' | 'replace' | 'remove';
      path: string;
      value?: string;
    }>;
  }): Promise<any>;

  function mcp__azure_devops__repo_list_repos_by_project(params: {
    project: string;
  }): Promise<any>;

  function mcp__azure_devops__repo_create_pull_request(params: {
    repositoryId: string;
    sourceRefName: string;
    targetRefName: string;
    title: string;
    description?: string;
    isDraft?: boolean;
  }): Promise<any>;

  function mcp__azure_devops__build_get_definitions(params: {
    project: string;
    name?: string;
    path?: string;
    top?: number;
  }): Promise<any>;

  function mcp__azure_devops__build_run_build(params: {
    project: string;
    definitionId: number;
    sourceBranch?: string;
  }): Promise<any>;

  function mcp__azure_devops__build_get_status(params: {
    project: string;
    buildId: number;
  }): Promise<any>;
}

export class AzureDevOpsClient implements IAzureDevOpsClient {
  private config: AzureDevOpsConfig;
  private retryConfig: RetryConfig;

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
    this.retryConfig = config.retryConfig;
    
    console.log('Azure DevOps Client initialized', {
      organization: config.organization,
      project: config.project,
      useInteractiveAuth: config.useInteractiveAuth
    });
  }

  // ============================================================================
  // Project Operations
  // ============================================================================

  async listProjects(): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<AzureDevOpsProject>>> {
    try {
      console.log('Listing Azure DevOps projects...');
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__core_list_projects({
          top: 100,
          stateFilter: 'wellFormed'
        })
      );

      if (!result || !result.value) {
        return { success: false, error: 'No projects found or invalid response' };
      }

      const projects: AzureDevOpsProject[] = result.value.map((proj: any) => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        url: proj.url,
        state: proj.state,
        visibility: proj.visibility,
        lastUpdateTime: proj.lastUpdateTime,
        capabilities: proj.capabilities
      }));

      console.log(`✅ Found ${projects.length} projects`);
      return {
        success: true,
        data: {
          count: projects.length,
          value: projects
        }
      };
    } catch (error) {
      console.error('❌ Failed to list projects:', error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async getProject(projectName: string): Promise<AzureDevOpsResponse<AzureDevOpsProject>> {
    try {
      console.log(`Getting project: ${projectName}`);
      
      // List all projects and find the one we want
      const projectsResult = await this.listProjects();
      if (!projectsResult.success) {
        return { success: false, error: projectsResult.error };
      }

      const project = projectsResult.data.value.find(p => 
        p.name.toLowerCase() === projectName.toLowerCase()
      );

      if (!project) {
        throw new ProjectNotFoundError(projectName);
      }

      console.log(`✅ Found project: ${project.name}`);
      return { success: true, data: project };
    } catch (error) {
      console.error(`❌ Failed to get project ${projectName}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Work Item Operations
  // ============================================================================

  async createWorkItem(
    project: string, 
    workItem: WorkItemCreate
  ): Promise<AzureDevOpsResponse<WorkItemCreateResponse>> {
    try {
      console.log(`Creating ${workItem.workItemType}: ${workItem.fields['System.Title']}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__wit_create_work_item({
          project,
          workItemType: workItem.workItemType,
          fields: workItem.fields
        })
      );

      if (!result || !result.id) {
        throw new WorkItemCreationError(
          'Invalid response from work item creation',
          workItem
        );
      }

      const response: WorkItemCreateResponse = {
        id: result.id,
        rev: result.rev,
        fields: result.fields,
        url: result.url
      };

      console.log(`✅ Created work item ID: ${result.id}`);
      return { success: true, data: response };
    } catch (error) {
      console.error(`❌ Failed to create work item:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async updateWorkItem(
    id: number, 
    updates: Partial<WorkItemFields>
  ): Promise<AzureDevOpsResponse<WorkItemUpdateResponse>> {
    try {
      console.log(`Updating work item ${id}`);
      
      // Convert partial updates to patch operations
      const patchOperations = Object.entries(updates).map(([field, value]) => ({
        op: 'replace' as const,
        path: `/fields/${field}`,
        value: String(value)
      }));

      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__wit_update_work_item({
          id,
          updates: patchOperations
        })
      );

      if (!result || !result.id) {
        throw new Error('Invalid response from work item update');
      }

      const response: WorkItemUpdateResponse = {
        id: result.id,
        rev: result.rev,
        fields: result.fields,
        url: result.url
      };

      console.log(`✅ Updated work item ID: ${id}`);
      return { success: true, data: response };
    } catch (error) {
      console.error(`❌ Failed to update work item ${id}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async getWorkItem(
    id: number, 
    project: string, 
    expand?: string
  ): Promise<AzureDevOpsResponse<WorkItem>> {
    try {
      console.log(`Getting work item ${id}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__wit_get_work_item({
          id,
          project,
          ...(expand && { expand })
        })
      );

      if (!result || !result.id) {
        throw new Error(`Work item ${id} not found`);
      }

      const workItem: WorkItem = {
        id: result.id,
        rev: result.rev,
        fields: result.fields,
        relations: result.relations,
        url: result.url,
        _links: result._links
      };

      console.log(`✅ Retrieved work item ${id}: ${workItem.fields['System.Title']}`);
      return { success: true, data: workItem };
    } catch (error) {
      console.error(`❌ Failed to get work item ${id}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async linkWorkItems(
    relationships: WorkItemRelationship[]
  ): Promise<AzureDevOpsResponse<void>> {
    try {
      console.log(`Creating ${relationships.length} work item relationships`);
      
      // Group relationships by project (assuming all are in the same project for now)
      const updates = relationships.map(rel => ({
        id: rel.sourceId,
        linkToId: rel.targetId,
        type: rel.relationshipType,
        ...(rel.comment && { comment: rel.comment })
      }));

      await this.executeWithRetry(() => 
        mcp__azure_devops__wit_work_items_link({
          project: this.config.project || '',
          updates
        })
      );

      console.log(`✅ Created ${relationships.length} work item relationships`);
      return { success: true, data: undefined };
    } catch (error) {
      console.error(`❌ Failed to link work items:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async createWorkItemBatch(
    project: string, 
    batch: WorkItemBatch
  ): Promise<AzureDevOpsResponse<WorkItemBatchResult>> {
    try {
      console.log('Creating work item batch:', {
        epics: batch.epics.length,
        features: batch.features.length,
        userStories: batch.userStories.length,
        tasks: batch.tasks.length,
        bugs: batch.bugs.length
      });

      const created: WorkItem[] = [];
      const failed: any[] = [];
      const relationships: WorkItemRelationship[] = [];

      // Create work items in hierarchical order: Epics → Features → User Stories → Tasks/Bugs
      const epicResults = await this.createWorkItemsInParallel(project, batch.epics);
      created.push(...epicResults.created);
      failed.push(...epicResults.failed);

      const featureResults = await this.createWorkItemsInParallel(project, batch.features);
      created.push(...featureResults.created);
      failed.push(...featureResults.failed);

      const userStoryResults = await this.createWorkItemsInParallel(project, batch.userStories);
      created.push(...userStoryResults.created);
      failed.push(...userStoryResults.failed);

      const taskResults = await this.createWorkItemsInParallel(project, batch.tasks);
      created.push(...taskResults.created);
      failed.push(...taskResults.failed);

      const bugResults = await this.createWorkItemsInParallel(project, batch.bugs);
      created.push(...bugResults.created);
      failed.push(...bugResults.failed);

      const result: WorkItemBatchResult = {
        created,
        failed,
        relationships
      };

      console.log(`✅ Batch creation complete: ${created.length} created, ${failed.length} failed`);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Failed to create work item batch:', error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async updateWorkItemsBatch(
    updates: WorkItemUpdate[]
  ): Promise<AzureDevOpsResponse<WorkItem[]>> {
    try {
      console.log(`Batch updating ${updates.length} work items`);
      
      // Convert updates to patch format
      const batchUpdates = updates.flatMap(update => 
        Object.entries(update.fields).map(([field, value]) => ({
          id: update.id,
          op: 'replace' as const,
          path: `/fields/${field}`,
          value: String(value)
        }))
      );

      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__wit_update_work_items_batch({
          updates: batchUpdates
        })
      );

      if (!result || !Array.isArray(result.value)) {
        throw new Error('Invalid response from batch update');
      }

      const updatedWorkItems: WorkItem[] = result.value.map((item: any) => ({
        id: item.id,
        rev: item.rev,
        fields: item.fields,
        relations: item.relations,
        url: item.url,
        _links: item._links
      }));

      console.log(`✅ Batch updated ${updatedWorkItems.length} work items`);
      return { success: true, data: updatedWorkItems };
    } catch (error) {
      console.error('❌ Failed to batch update work items:', error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Repository Operations
  // ============================================================================

  async listRepositories(
    project: string
  ): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<Repository>>> {
    try {
      console.log(`Listing repositories for project: ${project}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__repo_list_repos_by_project({ project })
      );

      if (!result || !result.value) {
        return { success: false, error: 'No repositories found or invalid response' };
      }

      const repositories: Repository[] = result.value.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        project: repo.project,
        size: repo.size,
        remoteUrl: repo.remoteUrl,
        sshUrl: repo.sshUrl,
        webUrl: repo.webUrl,
        defaultBranch: repo.defaultBranch
      }));

      console.log(`✅ Found ${repositories.length} repositories`);
      return {
        success: true,
        data: {
          count: repositories.length,
          value: repositories
        }
      };
    } catch (error) {
      console.error(`❌ Failed to list repositories for ${project}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async createPullRequest(
    repositoryId: string, 
    pullRequest: PullRequestCreateRequest
  ): Promise<AzureDevOpsResponse<PullRequest>> {
    try {
      console.log(`Creating pull request: ${pullRequest.title}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__repo_create_pull_request({
          repositoryId,
          ...pullRequest
        })
      );

      if (!result || !result.pullRequestId) {
        throw new Error('Invalid response from pull request creation');
      }

      const response: PullRequest = {
        pullRequestId: result.pullRequestId,
        title: result.title,
        description: result.description,
        sourceRefName: result.sourceRefName,
        targetRefName: result.targetRefName,
        status: result.status,
        createdBy: result.createdBy,
        creationDate: result.creationDate,
        repository: result.repository,
        url: result.url
      };

      console.log(`✅ Created pull request ID: ${result.pullRequestId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('❌ Failed to create pull request:', error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Build Operations
  // ============================================================================

  async getBuildDefinitions(
    project: string
  ): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<BuildDefinition>>> {
    try {
      console.log(`Getting build definitions for project: ${project}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__build_get_definitions({ project })
      );

      if (!result || !result.value) {
        return { success: false, error: 'No build definitions found or invalid response' };
      }

      const buildDefinitions: BuildDefinition[] = result.value.map((def: any) => ({
        id: def.id,
        name: def.name,
        url: def.url,
        uri: def.uri,
        path: def.path,
        type: def.type,
        queueStatus: def.queueStatus,
        revision: def.revision,
        project: def.project
      }));

      console.log(`✅ Found ${buildDefinitions.length} build definitions`);
      return {
        success: true,
        data: {
          count: buildDefinitions.length,
          value: buildDefinitions
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get build definitions for ${project}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async runBuild(
    project: string, 
    definitionId: number, 
    sourceBranch?: string
  ): Promise<AzureDevOpsResponse<Build>> {
    try {
      console.log(`Running build definition ${definitionId} for project: ${project}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__build_run_build({
          project,
          definitionId,
          ...(sourceBranch && { sourceBranch })
        })
      );

      if (!result || !result.id) {
        throw new Error('Invalid response from build run');
      }

      const build: Build = {
        id: result.id,
        buildNumber: result.buildNumber,
        status: result.status,
        result: result.result,
        queueTime: result.queueTime,
        startTime: result.startTime,
        finishTime: result.finishTime,
        url: result.url,
        definition: result.definition,
        project: result.project,
        sourceBranch: result.sourceBranch,
        sourceVersion: result.sourceVersion
      };

      console.log(`✅ Started build ID: ${result.id}`);
      return { success: true, data: build };
    } catch (error) {
      console.error(`❌ Failed to run build ${definitionId}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  async getBuildStatus(
    project: string, 
    buildId: number
  ): Promise<AzureDevOpsResponse<Build>> {
    try {
      console.log(`Getting build status for build ${buildId}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__build_get_status({
          project,
          buildId
        })
      );

      if (!result || !result.id) {
        throw new Error(`Build ${buildId} not found`);
      }

      const build: Build = {
        id: result.id,
        buildNumber: result.buildNumber,
        status: result.status,
        result: result.result,
        queueTime: result.queueTime,
        startTime: result.startTime,
        finishTime: result.finishTime,
        url: result.url,
        definition: result.definition,
        project: result.project,
        sourceBranch: result.sourceBranch,
        sourceVersion: result.sourceVersion
      };

      console.log(`✅ Build ${buildId} status: ${build.status}`);
      return { success: true, data: build };
    } catch (error) {
      console.error(`❌ Failed to get build status for ${buildId}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Team Operations
  // ============================================================================

  async listTeams(project: string): Promise<AzureDevOpsResponse<AzureDevOpsListResponse<Team>>> {
    try {
      console.log(`Listing teams for project: ${project}`);
      
      const result = await this.executeWithRetry(() => 
        mcp__azure_devops__core_list_project_teams({ project })
      );

      if (!result || !result.value) {
        return { success: false, error: 'No teams found or invalid response' };
      }

      const teams: Team[] = result.value.map((team: any) => ({
        id: team.id,
        name: team.name,
        url: team.url,
        description: team.description,
        identityUrl: team.identityUrl,
        projectId: team.projectId,
        projectName: team.projectName
      }));

      console.log(`✅ Found ${teams.length} teams`);
      return {
        success: true,
        data: {
          count: teams.length,
          value: teams
        }
      };
    } catch (error) {
      console.error(`❌ Failed to list teams for ${project}:`, error);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async createWorkItemsInParallel(
    project: string, 
    workItems: WorkItemCreate[]
  ): Promise<{ created: WorkItem[]; failed: any[] }> {
    const created: WorkItem[] = [];
    const failed: any[] = [];

    // Create work items in parallel batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < workItems.length; i += batchSize) {
      const batch = workItems.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(workItem => this.createWorkItem(project, workItem))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          // Convert response to WorkItem format
          const response = result.value.data;
          const workItem: WorkItem = {
            id: response.id,
            rev: response.rev,
            fields: response.fields,
            url: response.url
          };
          created.push(workItem);
        } else {
          const errorMessage = result.status === 'fulfilled' 
            ? (result.value.success ? 'Unknown error' : result.value.error)
            : 'Promise rejected';
          failed.push({
            workItem: batch[index],
            error: errorMessage
          });
        }
      });
    }

    return { created, failed };
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        const azureError = error as AzureDevOpsError;
        if (!azureError.isRetryable && attempt === 1) {
          throw error;
        }
        
        if (attempt === this.retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelayMs
        );
        
        console.log(`Retry attempt ${attempt}/${this.retryConfig.maxAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private formatError(error: unknown): string {
    if (error instanceof AzureDevOpsError) {
      return `${error.code}: ${error.message}`;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return String(error);
  }

  // Connection status
  getConnectionStatus(): boolean {
    return true; // MCP server handles connection
  }
}

export default AzureDevOpsClient;