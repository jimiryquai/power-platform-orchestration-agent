const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

async function setupTemplates() {
  console.log('Setting up project templates...');
  
  const templatesDir = path.join(__dirname, '../src/templates');
  
  try {
    // Ensure templates directory exists
    await fs.mkdir(templatesDir, { recursive: true });
    
    // Verify s-project-template exists
    const sProjectPath = path.join(templatesDir, 's-project-template.yaml');
    const exists = await fs.access(sProjectPath).then(() => true).catch(() => false);
    
    if (exists) {
      console.log('✓ S Project template found');
      
      // Validate template format
      const content = await fs.readFile(sProjectPath, 'utf8');
      const template = yaml.load(content);
      
      if (template.projectTemplate && template.workItemTemplates) {
        console.log('✓ Template format validated');
        console.log(`  - Project duration: ${template.projectTemplate.duration} weeks`);
        console.log(`  - Sprint count: ${template.projectTemplate.sprintCount}`);
        console.log(`  - Environments: ${template.projectTemplate.environments.length}`);
        console.log(`  - Epics: ${template.workItemTemplates.epics.length}`);
      } else {
        console.error('✗ Invalid template format');
        process.exit(1);
      }
    } else {
      console.error('✗ S Project template not found');
      process.exit(1);
    }
    
    console.log('✓ Template setup completed successfully');
    
  } catch (error) {
    console.error('✗ Template setup failed:', error.message);
    process.exit(1);
  }
}

// Additional template validation functions
async function validateTemplate(templatePath) {
  try {
    const content = await fs.readFile(templatePath, 'utf8');
    const template = yaml.load(content);
    
    const errors = [];
    
    // Check required top-level keys
    if (!template.projectTemplate) {
      errors.push('Missing projectTemplate section');
    }
    
    if (!template.workItemTemplates) {
      errors.push('Missing workItemTemplates section');
    }
    
    // Check projectTemplate structure
    if (template.projectTemplate) {
      const pt = template.projectTemplate;
      
      if (!pt.name) errors.push('projectTemplate.name is required');
      if (!pt.duration) errors.push('projectTemplate.duration is required');
      if (!pt.sprintCount) errors.push('projectTemplate.sprintCount is required');
      if (!pt.environments || !Array.isArray(pt.environments)) {
        errors.push('projectTemplate.environments must be an array');
      }
      if (!pt.azureDevOps) errors.push('projectTemplate.azureDevOps section is required');
    }
    
    // Check workItemTemplates structure
    if (template.workItemTemplates) {
      const wit = template.workItemTemplates;
      
      if (!wit.epics || !Array.isArray(wit.epics)) {
        errors.push('workItemTemplates.epics must be an array');
      }
      
      if (!wit.features || !Array.isArray(wit.features)) {
        errors.push('workItemTemplates.features must be an array');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      template
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [`Template parsing failed: ${error.message}`],
      template: null
    };
  }
}

// Run if called directly
if (require.main === module) {
  setupTemplates().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = {
  setupTemplates,
  validateTemplate
};