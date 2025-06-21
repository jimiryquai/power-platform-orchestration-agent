// Work Item Orchestrator - Coordinates Azure DevOps work item creation and relationships
// Handles complex hierarchical work item creation with proper dependency management

import {
  WorkItem,
  WorkItemBatch,
  WorkItemRelationship,
  WorkItemCreate
} from '../../types/azure-devops-interfaces';
import AzureDevOpsClient from './azure-devops-client';

// ============================================================================
// Orchestrator Types
// ============================================================================

interface OrchestrationConfig {
  project: string;
  parallelBatchSize: number;
  maxRetries: number;
  delayBetweenBatchesMs: number;
  validateCreation: boolean;
  dryRun: boolean;
}

interface OrchestrationResult {
  success: boolean;
  workItemsCreated: WorkItem[];
  relationshipsCreated: number;
  errors: OrchestrationError[];
  executionTimeMs: number;
  summary: OrchestrationSummary;
}

interface OrchestrationError {
  phase: 'epic' | 'feature' | 'userStory' | 'task' | 'relationship';
  workItemTitle?: string;
  error: string;
  retryCount: number;
}

interface OrchestrationSummary {
  totalPlanned: number;
  totalCreated: number;
  epicsCreated: number;
  featuresCreated: number;
  userStoriesCreated: number;
  tasksCreated: number;
  bugsCreated: number;
  relationshipsCreated: number;
  failureRate: number;
}

interface WorkItemIdMap {
  [workItemTitle: string]: number;
}

// ============================================================================
// Work Item Orchestrator Class
// ============================================================================

export class WorkItemOrchestrator {
  private client: AzureDevOpsClient;
  private config: OrchestrationConfig;
  private workItemIdMap: WorkItemIdMap = {};

  constructor(client: AzureDevOpsClient, config: OrchestrationConfig) {
    this.client = client;
    this.config = config;
  }

  // ============================================================================
  // Main Orchestration Methods
  // ============================================================================

  async orchestrateWorkItemCreation(
    batch: WorkItemBatch,
    templateRelationships: Array<{
      parentType: string;
      parentName: string;
      childType: string;
      childName: string;
      relationshipType: string;
    }>
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const errors: OrchestrationError[] = [];
    const workItemsCreated: WorkItem[] = [];

    console.log('🚀 Starting work item orchestration', {
      project: this.config.project,
      totalWorkItems: this.getTotalWorkItemCount(batch),
      dryRun: this.config.dryRun
    });

    if (this.config.dryRun) {
      return this.performDryRun(batch, templateRelationships);
    }

    try {
      // Phase 1: Create Epics
      console.log('📋 Phase 1: Creating Epics');
      const epicResults = await this.createWorkItemsInPhase(
        this.config.project,
        batch.epics,
        'epic'
      );
      workItemsCreated.push(...epicResults.created);
      errors.push(...epicResults.errors);
      this.updateWorkItemIdMap(epicResults.created);

      // Phase 2: Create Features  
      console.log('📋 Phase 2: Creating Features');
      const featureResults = await this.createWorkItemsInPhase(
        this.config.project,
        batch.features,
        'feature'
      );
      workItemsCreated.push(...featureResults.created);
      errors.push(...featureResults.errors);
      this.updateWorkItemIdMap(featureResults.created);

      // Phase 3: Create User Stories
      console.log('📋 Phase 3: Creating User Stories');
      const userStoryResults = await this.createWorkItemsInPhase(
        this.config.project,
        batch.userStories,
        'userStory'
      );
      workItemsCreated.push(...userStoryResults.created);
      errors.push(...userStoryResults.errors);
      this.updateWorkItemIdMap(userStoryResults.created);

      // Phase 4: Create Tasks
      console.log('📋 Phase 4: Creating Tasks');
      const taskResults = await this.createWorkItemsInPhase(
        this.config.project,
        batch.tasks,
        'task'
      );
      workItemsCreated.push(...taskResults.created);
      errors.push(...taskResults.errors);
      this.updateWorkItemIdMap(taskResults.created);

      // Phase 5: Create Bugs
      if (batch.bugs.length > 0) {
        console.log('📋 Phase 5: Creating Bugs');
        const bugResults = await this.createWorkItemsInPhase(
          this.config.project,
          batch.bugs,
          'task'
        );
        workItemsCreated.push(...bugResults.created);
        errors.push(...bugResults.errors);
        this.updateWorkItemIdMap(bugResults.created);
      }

      // Phase 6: Create Relationships
      console.log('📋 Phase 6: Creating Work Item Relationships');
      const relationshipCount = await this.createWorkItemRelationships(templateRelationships, errors);

      const executionTime = Date.now() - startTime;
      const summary = this.createSummary(batch, workItemsCreated, relationshipCount);

      console.log('✅ Work item orchestration completed', {
        created: workItemsCreated.length,
        errors: errors.length,
        executionTimeMs: executionTime
      });

      return {
        success: errors.length === 0,
        workItemsCreated,
        relationshipsCreated: relationshipCount,
        errors,
        executionTimeMs: executionTime,
        summary
      };

    } catch (error) {
      console.error('❌ Work item orchestration failed:', error);
      
      const executionTime = Date.now() - startTime;
      const summary = this.createSummary(batch, workItemsCreated, 0);

      return {
        success: false,
        workItemsCreated,
        relationshipsCreated: 0,
        errors: [...errors, {
          phase: 'epic',
          error: error instanceof Error ? error.message : String(error),
          retryCount: 0
        }],
        executionTimeMs: executionTime,
        summary
      };
    }
  }

  // ============================================================================
  // Phase-based Work Item Creation
  // ============================================================================

  private async createWorkItemsInPhase(
    project: string,
    workItems: WorkItemCreate[],
    phase: OrchestrationError['phase']
  ): Promise<{ created: WorkItem[]; errors: OrchestrationError[] }> {
    const created: WorkItem[] = [];
    const errors: OrchestrationError[] = [];

    if (workItems.length === 0) {
      return { created, errors };
    }

    console.log(`Creating ${workItems.length} ${phase} work items in batches of ${this.config.parallelBatchSize}`);

    // Process work items in parallel batches
    for (let i = 0; i < workItems.length; i += this.config.parallelBatchSize) {
      const batch = workItems.slice(i, i + this.config.parallelBatchSize);
      
      console.log(`Processing batch ${Math.floor(i / this.config.parallelBatchSize) + 1}/${Math.ceil(workItems.length / this.config.parallelBatchSize)}`);

      const batchResults = await Promise.allSettled(
        batch.map(workItem => this.createWorkItemWithRetry(project, workItem, phase))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          created.push(result.value.workItem);
        } else {
          const workItemTitle = batch[index]?.fields['System.Title'] || 'Unknown';
          const errorMessage = result.status === 'fulfilled' 
            ? (result.value.success ? 'Unknown error' : result.value.error)
            : 'Promise rejected';
          
          errors.push({
            phase,
            workItemTitle,
            error: errorMessage,
            retryCount: this.config.maxRetries
          });
        }
      });

      // Delay between batches to avoid overwhelming the API
      if (i + this.config.parallelBatchSize < workItems.length) {
        await this.delay(this.config.delayBetweenBatchesMs);
      }
    }

    console.log(`✅ ${phase} phase completed: ${created.length} created, ${errors.length} failed`);
    return { created, errors };
  }

  private async createWorkItemWithRetry(
    project: string,
    workItem: WorkItemCreate,
    _phase: OrchestrationError['phase']
  ): Promise<{ success: true; workItem: WorkItem } | { success: false; error: string }> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.client.createWorkItem(project, workItem);
        
        if (result.success) {
          // Convert CreateResponse to WorkItem format
          const workItemData: WorkItem = {
            id: result.data.id,
            rev: result.data.rev,
            fields: result.data.fields,
            url: result.data.url
          };

          return { success: true, workItem: workItemData };
        } else {
          lastError = result.error;
          
          if (attempt < this.config.maxRetries) {
            console.log(`Retry ${attempt}/${this.config.maxRetries} for ${workItem.fields['System.Title']}`);
            await this.delay(1000 * attempt); // Exponential backoff
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < this.config.maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    return { success: false, error: lastError };
  }

  // ============================================================================
  // Relationship Management
  // ============================================================================

  private async createWorkItemRelationships(
    templateRelationships: Array<{
      parentType: string;
      parentName: string;
      childType: string;
      childName: string;
      relationshipType: string;
    }>,
    errors: OrchestrationError[]
  ): Promise<number> {
    let relationshipsCreated = 0;

    if (templateRelationships.length === 0) {
      return relationshipsCreated;
    }

    console.log(`Creating ${templateRelationships.length} work item relationships`);

    // Convert template relationships to Azure DevOps relationships
    const relationships: WorkItemRelationship[] = [];

    templateRelationships.forEach(templateRel => {
      const parentId = this.workItemIdMap[templateRel.parentName];
      const childId = this.workItemIdMap[templateRel.childName];

      if (parentId && childId) {
        relationships.push({
          sourceId: parentId,
          targetId: childId,
          relationshipType: 'parent'
        });
      } else {
        errors.push({
          phase: 'relationship',
          error: `Cannot create relationship: ${templateRel.parentName} -> ${templateRel.childName} (missing work item IDs)`,
          retryCount: 0
        });
      }
    });

    // Create relationships in batches
    const batchSize = 10;
    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize);
      
      try {
        const result = await this.client.linkWorkItems(batch);
        
        if (result.success) {
          relationshipsCreated += batch.length;
          console.log(`✅ Created ${batch.length} relationships`);
        } else {
          errors.push({
            phase: 'relationship',
            error: `Failed to create relationship batch: ${result.error}`,
            retryCount: 0
          });
        }
      } catch (error) {
        errors.push({
          phase: 'relationship',
          error: `Error creating relationship batch: ${error instanceof Error ? error.message : String(error)}`,
          retryCount: 0
        });
      }

      // Small delay between relationship batches
      if (i + batchSize < relationships.length) {
        await this.delay(500);
      }
    }

    console.log(`✅ Relationship creation completed: ${relationshipsCreated} created`);
    return relationshipsCreated;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private updateWorkItemIdMap(workItems: WorkItem[]): void {
    workItems.forEach(workItem => {
      const title = workItem.fields['System.Title'];
      if (title) {
        this.workItemIdMap[title] = workItem.id;
      }
    });
  }

  private getTotalWorkItemCount(batch: WorkItemBatch): number {
    return batch.epics.length + 
           batch.features.length + 
           batch.userStories.length + 
           batch.tasks.length + 
           batch.bugs.length;
  }

  private createSummary(
    batch: WorkItemBatch,
    workItemsCreated: WorkItem[],
    relationshipsCreated: number
  ): OrchestrationSummary {
    const totalPlanned = this.getTotalWorkItemCount(batch);
    const totalCreated = workItemsCreated.length;

    // Count created work items by type
    const createdByType = {
      epic: 0,
      feature: 0,
      userStory: 0,
      task: 0,
      bug: 0
    };

    workItemsCreated.forEach(workItem => {
      const type = workItem.fields['System.WorkItemType'];
      switch (type) {
        case 'Epic':
          createdByType.epic++;
          break;
        case 'Feature':
          createdByType.feature++;
          break;
        case 'User Story':
          createdByType.userStory++;
          break;
        case 'Task':
          createdByType.task++;
          break;
        case 'Bug':
          createdByType.bug++;
          break;
      }
    });

    return {
      totalPlanned,
      totalCreated,
      epicsCreated: createdByType.epic,
      featuresCreated: createdByType.feature,
      userStoriesCreated: createdByType.userStory,
      tasksCreated: createdByType.task,
      bugsCreated: createdByType.bug,
      relationshipsCreated,
      failureRate: totalPlanned > 0 ? ((totalPlanned - totalCreated) / totalPlanned) * 100 : 0
    };
  }

  private performDryRun(
    batch: WorkItemBatch,
    templateRelationships: Array<any>
  ): OrchestrationResult {
    console.log('🏃 Performing dry run - no work items will be created');

    const summary = this.createSummary(batch, [], 0);
    summary.relationshipsCreated = templateRelationships.length;

    console.log('Dry run summary:', {
      epics: batch.epics.length,
      features: batch.features.length,
      userStories: batch.userStories.length,
      tasks: batch.tasks.length,
      bugs: batch.bugs.length,
      relationships: templateRelationships.length
    });

    return {
      success: true,
      workItemsCreated: [],
      relationshipsCreated: templateRelationships.length,
      errors: [],
      executionTimeMs: 0,
      summary
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  async validateWorkItemCreation(workItemIds: number[]): Promise<boolean> {
    if (!this.config.validateCreation || workItemIds.length === 0) {
      return true;
    }

    console.log(`Validating creation of ${workItemIds.length} work items`);

    let validationPassed = true;

    // Check work items in batches
    const batchSize = 20;
    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batch = workItemIds.slice(i, i + batchSize);
      
      const validationResults = await Promise.allSettled(
        batch.map(id => this.client.getWorkItem(id, this.config.project))
      );

      validationResults.forEach((result, index) => {
        const workItemId = batch[index];
        if (result.status === 'rejected' || !result.value.success) {
          console.error(`❌ Validation failed for work item ${workItemId}`);
          validationPassed = false;
        }
      });
    }

    console.log(`✅ Validation completed: ${validationPassed ? 'PASSED' : 'FAILED'}`);
    return validationPassed;
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  static createDefaultConfig(project: string): OrchestrationConfig {
    return {
      project,
      parallelBatchSize: 5,
      maxRetries: 3,
      delayBetweenBatchesMs: 1000,
      validateCreation: true,
      dryRun: false
    };
  }

  static createProductionConfig(project: string): OrchestrationConfig {
    return {
      project,
      parallelBatchSize: 3, // More conservative for production
      maxRetries: 5,
      delayBetweenBatchesMs: 2000,
      validateCreation: true,
      dryRun: false
    };
  }
}

export default WorkItemOrchestrator;