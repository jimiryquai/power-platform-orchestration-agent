// S-Project Template Parser for Azure DevOps Work Items
// Converts YAML template structure to typed work item hierarchy

import {
  WorkItemCreate,
  WorkItemBatch,
  WorkItemType,
  WorkItemFields
} from '../../types/azure-devops-interfaces';

// ============================================================================
// Template Structure Types (matching S-Project YAML)
// ============================================================================

interface ProjectTemplate {
  name: string;
  description: string;
  version: string;
  duration: number; // weeks
  sprintDuration: number; // weeks
  sprintCount: number;
  azureDevOps: AzureDevOpsTemplate;
  workItemTemplates: WorkItemTemplates;
}

interface AzureDevOpsTemplate {
  processTemplate: string;
  repositoryStrategy: string;
  branchingPolicies: BranchingPolicy[];
  pipelineTemplates: string[];
  workItemTypes: string[];
}

interface BranchingPolicy {
  branch: string;
  requirePullRequest: boolean;
  minimumReviewers: number;
}

interface WorkItemTemplates {
  epics: EpicTemplate[];
  features: FeatureTemplate[];
}

interface EpicTemplate {
  name: string;
  description: string;
  estimatedEffort: string;
  priority: number;
  features: string[];
}

interface FeatureTemplate {
  epic: string;
  name: string;
  description: string;
  userStories: string[];
}

// ============================================================================
// Parser Configuration
// ============================================================================

interface ParseConfig {
  project: string;
  areaPath?: string;
  iterationPath?: string;
  defaultPriority: number;
  defaultEffort: number;
  assignedTo?: string;
  tags?: string[];
}

interface ParseResult {
  batch: WorkItemBatch;
  relationships: WorkItemRelationship[];
  metadata: ParseMetadata;
}

interface WorkItemRelationship {
  parentType: WorkItemType;
  parentName: string;
  childType: WorkItemType;
  childName: string;
  relationshipType: 'parent' | 'child';
}

interface ParseMetadata {
  totalWorkItems: number;
  epicsCount: number;
  featuresCount: number;
  userStoriesCount: number;
  tasksCount: number;
  estimatedDurationWeeks: number;
  templateName: string;
  templateVersion: string;
}

// ============================================================================
// Template Parser Class
// ============================================================================

export class SProjectTemplateParser {
  private config: ParseConfig;

  constructor(config: ParseConfig) {
    this.config = config;
  }

  // ============================================================================
  // Main Parse Method
  // ============================================================================

  parseTemplate(template: ProjectTemplate): ParseResult {
    console.log(`Parsing S-Project template: ${template.name} v${template.version}`);

    const batch: WorkItemBatch = {
      epics: [],
      features: [],
      userStories: [],
      tasks: [],
      bugs: []
    };

    const relationships: WorkItemRelationship[] = [];

    // Parse Epics
    template.workItemTemplates.epics.forEach(epicTemplate => {
      const epic = this.parseEpic(epicTemplate);
      batch.epics.push(epic);

      // Parse Features for this Epic
      template.workItemTemplates.features
        .filter(featureTemplate => featureTemplate.epic === epicTemplate.name)
        .forEach(featureTemplate => {
          const feature = this.parseFeature(featureTemplate);
          batch.features.push(feature);

          // Create Epic -> Feature relationship
          relationships.push({
            parentType: 'Epic',
            parentName: epicTemplate.name,
            childType: 'Feature',
            childName: featureTemplate.name,
            relationshipType: 'parent'
          });

          // Parse User Stories for this Feature
          featureTemplate.userStories.forEach(userStoryName => {
            const userStory = this.parseUserStory(userStoryName, featureTemplate.name);
            batch.userStories.push(userStory);

            // Create Feature -> User Story relationship
            relationships.push({
              parentType: 'Feature',
              parentName: featureTemplate.name,
              childType: 'User Story',
              childName: userStoryName,
              relationshipType: 'parent'
            });

            // Generate Tasks for each User Story
            const tasks = this.generateTasksForUserStory(userStoryName);
            batch.tasks.push(...tasks);

            // Create User Story -> Task relationships
            tasks.forEach(task => {
              relationships.push({
                parentType: 'User Story',
                parentName: userStoryName,
                childType: 'Task',
                childName: task.fields['System.Title'],
                relationshipType: 'parent'
              });
            });
          });
        });
    });

    const metadata: ParseMetadata = {
      totalWorkItems: batch.epics.length + batch.features.length + batch.userStories.length + batch.tasks.length + batch.bugs.length,
      epicsCount: batch.epics.length,
      featuresCount: batch.features.length,
      userStoriesCount: batch.userStories.length,
      tasksCount: batch.tasks.length,
      estimatedDurationWeeks: template.duration,
      templateName: template.name,
      templateVersion: template.version
    };

    console.log(`✅ Template parsing complete:`, {
      epics: batch.epics.length,
      features: batch.features.length,
      userStories: batch.userStories.length,
      tasks: batch.tasks.length,
      relationships: relationships.length
    });

    return { batch, relationships, metadata };
  }

  // ============================================================================
  // Work Item Parsing Methods
  // ============================================================================

  private parseEpic(epicTemplate: EpicTemplate): WorkItemCreate {
    const fields: WorkItemFields = {
      'System.Title': epicTemplate.name,
      'System.WorkItemType': 'Epic',
      'System.Description': epicTemplate.description,
      'Microsoft.VSTS.Common.Priority': epicTemplate.priority,
      'Microsoft.VSTS.Scheduling.Effort': this.parseEffortEstimate(epicTemplate.estimatedEffort),
      'System.Tags': this.buildTags(['Epic', 'Template']),
      ...(this.config.areaPath && { 'System.AreaPath': this.config.areaPath }),
      ...(this.config.iterationPath && { 'System.IterationPath': this.config.iterationPath }),
      ...(this.config.assignedTo && { 'System.AssignedTo': this.config.assignedTo })
    };

    return {
      workItemType: 'Epic',
      fields
    };
  }

  private parseFeature(featureTemplate: FeatureTemplate): WorkItemCreate {
    const fields: WorkItemFields = {
      'System.Title': featureTemplate.name,
      'System.WorkItemType': 'Feature',
      'System.Description': featureTemplate.description,
      'Microsoft.VSTS.Common.Priority': this.config.defaultPriority,
      'Microsoft.VSTS.Scheduling.Effort': this.config.defaultEffort,
      'System.Tags': this.buildTags(['Feature', 'Template', featureTemplate.epic]),
      ...(this.config.areaPath && { 'System.AreaPath': this.config.areaPath }),
      ...(this.config.iterationPath && { 'System.IterationPath': this.config.iterationPath }),
      ...(this.config.assignedTo && { 'System.AssignedTo': this.config.assignedTo })
    };

    return {
      workItemType: 'Feature',
      fields
    };
  }

  private parseUserStory(userStoryName: string, featureName: string): WorkItemCreate {
    const description = this.generateUserStoryDescription(userStoryName, featureName);
    const acceptanceCriteria = this.generateAcceptanceCriteria(userStoryName);

    const fields: WorkItemFields = {
      'System.Title': userStoryName,
      'System.WorkItemType': 'User Story',
      'System.Description': description,
      'Microsoft.VSTS.Common.AcceptanceCriteria': acceptanceCriteria,
      'Microsoft.VSTS.Common.Priority': this.config.defaultPriority,
      'Microsoft.VSTS.Scheduling.Effort': this.estimateUserStoryEffort(userStoryName),
      'System.Tags': this.buildTags(['User Story', 'Template', featureName]),
      ...(this.config.areaPath && { 'System.AreaPath': this.config.areaPath }),
      ...(this.config.iterationPath && { 'System.IterationPath': this.config.iterationPath }),
      ...(this.config.assignedTo && { 'System.AssignedTo': this.config.assignedTo })
    };

    return {
      workItemType: 'User Story',
      fields
    };
  }

  private generateTasksForUserStory(userStoryName: string): WorkItemCreate[] {
    const tasks: WorkItemCreate[] = [];

    // Generate standard tasks based on user story type
    const taskTypes = this.determineTaskTypes(userStoryName);

    taskTypes.forEach(taskType => {
      const taskName = this.generateTaskName(userStoryName, taskType);
      const description = this.generateTaskDescription(taskType, userStoryName);

      const fields: WorkItemFields = {
        'System.Title': taskName,
        'System.WorkItemType': 'Task',
        'System.Description': description,
        'Microsoft.VSTS.Common.Priority': this.config.defaultPriority,
        'Microsoft.VSTS.Scheduling.Effort': this.estimateTaskEffort(taskType),
        'System.Tags': this.buildTags(['Task', 'Template', taskType]),
        ...(this.config.areaPath && { 'System.AreaPath': this.config.areaPath }),
        ...(this.config.iterationPath && { 'System.IterationPath': this.config.iterationPath }),
        ...(this.config.assignedTo && { 'System.AssignedTo': this.config.assignedTo })
      };

      tasks.push({
        workItemType: 'Task',
        fields
      });
    });

    return tasks;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private parseEffortEstimate(effort: string): number {
    // Parse effort strings like "1 sprint", "2 weeks", "3 story points"
    const match = effort.match(/(\d+)/);
    if (match && match[1]) {
      const number = parseInt(match[1]);
      if (effort.includes('sprint')) {
        return number * 5; // Assume 5 story points per sprint
      } else if (effort.includes('week')) {
        return number * 2; // Assume 2 story points per week
      }
      return number;
    }
    return this.config.defaultEffort;
  }

  private buildTags(tags: string[]): string {
    const allTags = [...tags, ...(this.config.tags || [])];
    return allTags.filter(tag => tag && tag.trim()).join('; ');
  }

  private generateUserStoryDescription(userStoryName: string, featureName: string): string {
    return `As a user of the ${featureName} feature, I want to ${userStoryName.toLowerCase()} so that I can achieve my business objectives effectively.

This user story is part of the ${featureName} feature and contributes to the overall project goals.

## Context
This work item was generated from the S-Project template and should be refined with specific business requirements.`;
  }

  private generateAcceptanceCriteria(userStoryName: string): string {
    const criteria = [
      `Given that I am working with ${userStoryName.toLowerCase()}`,
      'When I perform the required actions',
      'Then the system should respond appropriately',
      'And all security and performance requirements are met'
    ];

    return criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n');
  }

  private estimateUserStoryEffort(userStoryName: string): number {
    // Simple heuristics for effort estimation based on story complexity
    const complexityIndicators = ['create', 'configure', 'setup', 'deploy'];
    const highComplexityCount = complexityIndicators.filter(indicator => 
      userStoryName.toLowerCase().includes(indicator)
    ).length;

    if (highComplexityCount >= 2) return 8; // Large story
    if (highComplexityCount === 1) return 5; // Medium story
    return 3; // Small story
  }

  private determineTaskTypes(userStoryName: string): string[] {
    const baseTasks = ['Analysis', 'Implementation', 'Testing'];

    // Add specific tasks based on user story content
    if (userStoryName.toLowerCase().includes('environment')) {
      baseTasks.push('Configuration', 'Deployment');
    }

    if (userStoryName.toLowerCase().includes('security')) {
      baseTasks.push('Security Review', 'Compliance Check');
    }

    if (userStoryName.toLowerCase().includes('data')) {
      baseTasks.push('Data Modeling', 'Migration');
    }

    return baseTasks;
  }

  private generateTaskName(userStoryName: string, taskType: string): string {
    return `${taskType}: ${userStoryName}`;
  }

  private generateTaskDescription(taskType: string, userStoryName: string): string {
    const descriptions: Record<string, string> = {
      'Analysis': `Analyze requirements and design approach for: ${userStoryName}`,
      'Implementation': `Implement the solution for: ${userStoryName}`,
      'Testing': `Test the implementation for: ${userStoryName}`,
      'Configuration': `Configure system settings for: ${userStoryName}`,
      'Deployment': `Deploy and validate: ${userStoryName}`,
      'Security Review': `Conduct security review for: ${userStoryName}`,
      'Compliance Check': `Verify compliance requirements for: ${userStoryName}`,
      'Data Modeling': `Design and validate data model for: ${userStoryName}`,
      'Migration': `Plan and execute data migration for: ${userStoryName}`
    };

    return descriptions[taskType] || `Complete ${taskType.toLowerCase()} work for: ${userStoryName}`;
  }

  private estimateTaskEffort(taskType: string): number {
    const effortMap: Record<string, number> = {
      'Analysis': 2,
      'Implementation': 5,
      'Testing': 3,
      'Configuration': 2,
      'Deployment': 3,
      'Security Review': 2,
      'Compliance Check': 1,
      'Data Modeling': 4,
      'Migration': 4
    };

    return effortMap[taskType] || 2;
  }

  // ============================================================================
  // Static Helper Methods
  // ============================================================================

  static createDefaultConfig(project: string): ParseConfig {
    return {
      project,
      defaultPriority: 2,
      defaultEffort: 3,
      tags: ['S-Project', 'Generated']
    };
  }

  static validateTemplate(template: ProjectTemplate): string[] {
    const errors: string[] = [];

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.workItemTemplates) {
      errors.push('Work item templates are required');
    }

    if (!template.workItemTemplates.epics || template.workItemTemplates.epics.length === 0) {
      errors.push('At least one epic is required');
    }

    // Validate that all epic features exist
    template.workItemTemplates.epics.forEach(epic => {
      epic.features.forEach(featureName => {
        const featureExists = template.workItemTemplates.features.some(f => f.name === featureName);
        if (!featureExists) {
          errors.push(`Feature '${featureName}' referenced in epic '${epic.name}' does not exist`);
        }
      });
    });

    // Validate that all features reference existing epics
    template.workItemTemplates.features.forEach(feature => {
      const epicExists = template.workItemTemplates.epics.some(e => e.name === feature.epic);
      if (!epicExists) {
        errors.push(`Epic '${feature.epic}' referenced in feature '${feature.name}' does not exist`);
      }
    });

    return errors;
  }
}

export default SProjectTemplateParser;