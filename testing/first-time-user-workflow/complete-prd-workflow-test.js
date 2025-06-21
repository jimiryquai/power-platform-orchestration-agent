#!/usr/bin/env node

// Complete PRD-to-Work Items First-Time User Journey Test
// Tests the full workflow: PRD → Validation → Service Principal → Project → Work Items

const fs = require('fs');

console.log('🎯 COMPLETE PRD-to-Work Items First-Time User Journey\n');

console.log('📋 This test simulates the complete workflow:');
console.log('   1. 📄 User creates PRD with Claude PRD Assistant');
console.log('   2. ✅ Validate PRD with Orchestrator MCP');
console.log('   3. 🔐 Create Service Principal (first-time user)');
console.log('   4. 🚀 Create project from PRD');
console.log('   5. 📊 Generate work items from PRD requirements\n');

// Step 1: Create realistic PRD from Claude PRD Assistant
console.log('📍 STEP 1: PRD Creation (Claude PRD Assistant → Orchestrator MCP)');

const samplePRD = {
  projectName: "Customer Support Portal",
  description: "A comprehensive customer support solution with Power Platform and Azure DevOps integration for ticket management, knowledge base, and customer communication",
  requirements: {
    azureDevOps: {
      organization: "jamesryandev",
      projectTemplate: "Agile",
      workItemTypes: ["Epic", "Feature", "User Story", "Task", "Bug"],
      repositories: ["customer-portal-solution", "deployment-scripts", "power-automate-flows"],
      pipelines: {
        ci: true,
        cd: true,
        environments: ["dev", "test", "prod"]
      },
      sprints: {
        duration: "2 weeks",
        count: 6,
        capacity: {
          developers: 3,
          testers: 1,
          projectManager: 1
        }
      }
    },
    powerPlatform: {
      environments: [
        {
          name: "Development",
          type: "development", 
          region: "unitedstates",
          sku: "Developer"
        },
        {
          name: "Test",
          type: "sandbox",
          region: "unitedstates", 
          sku: "Production"
        },
        {
          name: "Production",
          type: "production",
          region: "unitedstates",
          sku: "Production"
        }
      ],
      solutions: [
        {
          name: "CustomerSupportCore",
          description: "Core customer support functionality",
          components: ["entities", "forms", "views", "workflows", "canvas-apps"]
        },
        {
          name: "KnowledgeBase",
          description: "Knowledge base and FAQ management",
          components: ["entities", "model-driven-app", "portals"]
        }
      ],
      publisher: {
        name: "JamesRyanDev",
        prefix: "jrd"
      }
    },
    integration: {
      authentication: "service-principal",
      permissions: {
        powerPlatform: ["system-administrator", "power-platform-administrator"],
        azureDevOps: ["project-administrator", "build-administrator"]
      },
      dataConnections: ["sharepoint", "teams", "office365"],
      apis: ["microsoft-graph", "dataverse-web-api"]
    }
  },
  timeline: {
    estimatedDuration: "12 weeks",
    phases: [
      {
        name: "Project Setup & Authentication",
        duration: "1 week",
        deliverables: [
          "Azure DevOps project configured",
          "Power Platform environments created", 
          "Service Principal with permissions",
          "Initial repositories and pipelines"
        ],
        workItems: [
          {
            type: "Epic",
            title: "Project Foundation Setup",
            description: "Establish project infrastructure and authentication"
          },
          {
            type: "Feature", 
            title: "Azure DevOps Project Setup",
            description: "Create and configure Azure DevOps project with repositories"
          },
          {
            type: "User Story",
            title: "Create Development Environment",
            description: "As a developer, I need a Power Platform development environment"
          }
        ]
      },
      {
        name: "Core Solution Development",
        duration: "6 weeks",
        deliverables: [
          "Customer entity model",
          "Ticket management system",
          "Canvas app for customer portal",
          "Power Automate workflows"
        ],
        workItems: [
          {
            type: "Epic",
            title: "Customer Support Core Features",
            description: "Build core customer support functionality"
          },
          {
            type: "Feature",
            title: "Customer Data Model",
            description: "Design and implement customer and ticket entities"
          },
          {
            type: "User Story",
            title: "Customer Registration",
            description: "As a customer, I need to register and create an account"
          },
          {
            type: "User Story", 
            title: "Submit Support Ticket",
            description: "As a customer, I need to submit support tickets"
          },
          {
            type: "Task",
            title: "Create Customer Entity",
            description: "Implement Customer entity with required fields"
          }
        ]
      },
      {
        name: "Knowledge Base Implementation",
        duration: "3 weeks", 
        deliverables: [
          "Knowledge base portal",
          "FAQ management system",
          "Search functionality",
          "Content approval workflow"
        ],
        workItems: [
          {
            type: "Epic",
            title: "Knowledge Base System",
            description: "Implement knowledge base and FAQ functionality"
          },
          {
            type: "Feature",
            title: "FAQ Management",
            description: "System for managing and publishing FAQ content"
          },
          {
            type: "User Story",
            title: "Search Knowledge Base",
            description: "As a customer, I need to search the knowledge base for answers"
          }
        ]
      },
      {
        name: "Testing & Deployment",
        duration: "2 weeks",
        deliverables: [
          "Test cases executed",
          "Production deployment", 
          "User documentation",
          "Training materials"
        ],
        workItems: [
          {
            type: "Epic",
            title: "Testing & Deployment",
            description: "Comprehensive testing and production deployment"
          },
          {
            type: "Feature",
            title: "End-to-End Testing",
            description: "Complete system testing across all environments"
          },
          {
            type: "Task",
            title: "Deploy to Production",
            description: "Deploy solution to production environment"
          }
        ]
      }
    ]
  },
  resources: {
    team: {
      projectManager: 1,
      developers: 3,
      testers: 1,
      businessAnalyst: 1
    },
    infrastructure: {
      environments: 3,
      storage: "standard",
      monitoring: "comprehensive"
    },
    budget: {
      powerPlatformLicenses: "$500/month",
      azureDevOpsLicenses: "$300/month", 
      additionalServices: "$200/month"
    }
  }
};

fs.writeFileSync('sample-prd.json', JSON.stringify(samplePRD, null, 2));
console.log('✅ Created comprehensive PRD (sample-prd.json)');
console.log(`   - Project: ${samplePRD.projectName}`);
console.log(`   - Duration: ${samplePRD.timeline.estimatedDuration}`);
console.log(`   - Phases: ${samplePRD.timeline.phases.length}`);
console.log(`   - Total Work Items: ${samplePRD.timeline.phases.reduce((total, phase) => total + (phase.workItems?.length || 0), 0)}\n`);

// Step 2: PRD Validation workflow
console.log('📍 STEP 2: PRD Validation (MCP validate_prd tool)');

console.log('🔍 Simulating MCP PRD validation...');
console.log('   📋 User: "Validate this PRD for the standard-project template"');
console.log('   🤖 Claude: Using validate_prd MCP tool...');

const validationResult = {
  success: true,
  validation: {
    isValid: true,
    errors: [],
    suggestions: [
      "Consider adding integration testing phase",
      "Power Platform license costs should be validated",
      "Add backup and disaster recovery requirements"
    ],
    workItemsAnalysis: {
      totalWorkItems: samplePRD.timeline.phases.reduce((total, phase) => total + (phase.workItems?.length || 0), 0),
      estimatedEffort: "36 story points",
      riskFactors: ["Complex integration requirements", "Multiple environments"]
    }
  },
  message: "PRD validation passed with suggestions"
};

fs.writeFileSync('prd-validation-result.json', JSON.stringify(validationResult, null, 2));
console.log('✅ PRD validation completed');
console.log(`   - Status: ${validationResult.validation.isValid ? 'VALID' : 'INVALID'}`);
console.log(`   - Work Items: ${validationResult.validation.workItemsAnalysis.totalWorkItems}`);
console.log(`   - Effort: ${validationResult.validation.workItemsAnalysis.estimatedEffort}`);
console.log(`   - Suggestions: ${validationResult.validation.suggestions.length}\n`);

// Step 3: Service Principal creation (first-time user)
console.log('📍 STEP 3: Service Principal Creation (First-Time User)');

const serviceprincipal = {
  clientId: `sp-${Date.now()}`,
  clientSecret: `secret-${Math.random().toString(36).substr(2, 20)}`,
  tenantId: '92f292bf-d44c-427e-b092-c466178e9ffa',
  applicationName: 'CustomerSupportPortal-Orchestrator'
};

console.log('🔐 Creating Service Principal for project...');
console.log(`   - Application: ${serviceprincipal.applicationName}`);
console.log(`   - Client ID: ${serviceprincipal.clientId}`);
console.log('   - Permissions: Power Platform Admin, Azure DevOps\n');

// Step 4: Project creation from PRD
console.log('📍 STEP 4: Project Creation from PRD');

console.log('🚀 Simulating project creation from PRD...');
console.log('   📋 User: "Create project from this validated PRD"');
console.log('   🤖 Claude: Using create_project MCP tool...');

const projectCreationResult = {
  success: true,
  operation: {
    operationId: `proj_${Date.now()}_prd`,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      totalSteps: 8,
      completedSteps: 3,
      currentStep: "Creating Azure DevOps work items from PRD"
    },
    logs: [
      { timestamp: new Date().toISOString(), level: "info", message: "Starting project creation from PRD" },
      { timestamp: new Date().toISOString(), level: "info", message: "Azure DevOps project created: CustomerSupportPortal" },
      { timestamp: new Date().toISOString(), level: "info", message: "Power Platform environments provisioning..." },
      { timestamp: new Date().toISOString(), level: "info", message: "Generating work items from PRD timeline..." }
    ]
  },
  azureDevOps: {
    projectId: "proj-12345",
    projectUrl: "https://dev.azure.com/jamesryandev/CustomerSupportPortal",
    repositoriesCreated: 3,
    workItemsToCreate: samplePRD.timeline.phases.reduce((total, phase) => total + (phase.workItems?.length || 0), 0)
  },
  message: "Project creation in progress - work items being generated from PRD"
};

fs.writeFileSync('project-creation-result.json', JSON.stringify(projectCreationResult, null, 2));
console.log('✅ Project creation initiated');
console.log(`   - Operation ID: ${projectCreationResult.operation.operationId}`);
console.log(`   - Azure DevOps: ${projectCreationResult.azureDevOps.projectUrl}`);
console.log(`   - Work Items to Create: ${projectCreationResult.azureDevOps.workItemsToCreate}\n`);

// Step 5: Work items generation from PRD
console.log('📍 STEP 5: Work Items Generation from PRD Structure');

console.log('📊 Generating work items from PRD timeline...');

let workItemId = 1000;
const generatedWorkItems = [];

samplePRD.timeline.phases.forEach((phase, phaseIndex) => {
  console.log(`\n📋 Phase ${phaseIndex + 1}: ${phase.name}`);
  
  if (phase.workItems) {
    phase.workItems.forEach((workItem, itemIndex) => {
      const item = {
        id: workItemId++,
        type: workItem.type,
        title: workItem.title,
        description: workItem.description,
        phase: phase.name,
        assignedTo: "unassigned",
        state: "New",
        priority: workItem.type === "Epic" ? "High" : "Medium",
        effort: workItem.type === "Epic" ? 8 : workItem.type === "Feature" ? 5 : workItem.type === "User Story" ? 3 : 1,
        tags: [phase.name.toLowerCase().replace(/\s+/g, '-'), workItem.type.toLowerCase()],
        parentId: workItem.type === "Feature" ? (generatedWorkItems.find(wi => wi.type === "Epic" && wi.phase === phase.name)?.id || null) : null
      };
      
      generatedWorkItems.push(item);
      console.log(`   ✅ ${workItem.type}: ${workItem.title} (ID: ${item.id})`);
    });
  }
});

fs.writeFileSync('generated-work-items.json', JSON.stringify(generatedWorkItems, null, 2));

console.log(`\n✅ Work items generation completed`);
console.log(`   - Total items created: ${generatedWorkItems.length}`);
console.log(`   - Epics: ${generatedWorkItems.filter(wi => wi.type === 'Epic').length}`);
console.log(`   - Features: ${generatedWorkItems.filter(wi => wi.type === 'Feature').length}`);
console.log(`   - User Stories: ${generatedWorkItems.filter(wi => wi.type === 'User Story').length}`);
console.log(`   - Tasks: ${generatedWorkItems.filter(wi => wi.type === 'Task').length}`);

// Step 6: Final status check
console.log('\n📍 STEP 6: Project Status Check');

const finalStatus = {
  success: true,
  operation: {
    operationId: projectCreationResult.operation.operationId,
    status: "completed",
    startedAt: projectCreationResult.operation.startedAt,
    completedAt: new Date().toISOString(),
    progress: {
      totalSteps: 8,
      completedSteps: 8,
      currentStep: "Project creation completed"
    }
  },
  results: {
    azureDevOps: {
      projectCreated: true,
      projectUrl: projectCreationResult.azureDevOps.projectUrl,
      workItemsCreated: generatedWorkItems.length,
      repositoriesCreated: 3,
      pipelinesConfigured: 2
    },
    powerPlatform: {
      environmentsCreated: 3,
      solutionsCreated: 2,
      publisherRegistered: true
    },
    summary: {
      totalDuration: "45 seconds (simulated)",
      readyForDevelopment: true,
      nextSteps: [
        "Assign work items to team members",
        "Configure solution deployment pipelines",
        "Begin development in first sprint"
      ]
    }
  },
  message: "Project created successfully from PRD"
};

fs.writeFileSync('final-project-status.json', JSON.stringify(finalStatus, null, 2));

console.log('🎉 COMPLETE PRD-to-Work Items WORKFLOW SUCCESSFUL!\n');

console.log('📊 Final Results Summary:');
console.log(`   ✅ PRD validated and processed`);
console.log(`   ✅ Service Principal created`);
console.log(`   ✅ Azure DevOps project: ${finalStatus.results.azureDevOps.projectUrl}`);
console.log(`   ✅ Work items created: ${finalStatus.results.azureDevOps.workItemsCreated}`);
console.log(`   ✅ Power Platform environments: ${finalStatus.results.powerPlatform.environmentsCreated}`);
console.log(`   ✅ Ready for development`);

console.log('\n📁 Files Generated:');
console.log('   - sample-prd.json (Complete PRD from Claude PRD Assistant)');
console.log('   - prd-validation-result.json (Validation results)');
console.log('   - project-creation-result.json (Project creation status)');
console.log('   - generated-work-items.json (Work items from PRD)');
console.log('   - final-project-status.json (Completed project status)');

console.log('\n🔄 Claude Desktop Workflow:');
console.log('   1. PRD Assistant creates PRD → saves to file');
console.log('   2. User: "Validate this PRD file with the orchestrator"');
console.log('   3. Claude: Uses validate_prd MCP tool');
console.log('   4. User: "Create project from this validated PRD"');
console.log('   5. Claude: Uses create_project MCP tool');
console.log('   6. User: "Check project creation status"');
console.log('   7. Claude: Uses get_project_status MCP tool');
console.log('   8. Result: Complete project with work items ready for development');

console.log('\n🎯 This demonstrates the complete integration:');
console.log('   📄 PRD Assistant → 🔧 Orchestrator MCP → 📊 Azure DevOps Work Items');
console.log('   Ready for real Claude Desktop testing!');