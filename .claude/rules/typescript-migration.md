# TypeScript Migration Strategy

## Migration Context
This project is currently in JavaScript and requires migration to TypeScript for:
- Better type safety in enterprise integrations
- Enhanced developer experience
- Improved code maintainability
- Better IDE support and refactoring capabilities

## Migration Approach

### Phase 1: Foundation Setup
1. **Install TypeScript dependencies**
   ```bash
   npm install -D typescript @types/node @types/express
   npm install -D ts-node-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```

2. **Create tsconfig.json with strict configuration**
   - Enable strict mode from the start
   - Use modern ES target (ES2022)
   - Enable incremental compilation
   - Set up proper module resolution

3. **Configure build scripts**
   - Update package.json with TypeScript build commands
   - Set up development server with ts-node-dev
   - Configure Jest for TypeScript testing

### Phase 2: Incremental File Migration
**Order of migration** (leaf modules first):
1. `src/config/index.js` → `src/config/index.ts`
2. `src/utils/` folder files
3. `src/integrations/azure-devops/mcp-client.js`
4. `src/integrations/power-platform/pac-client.js`
5. `src/workflows/orchestrator.js`
6. `src/api/routes.js`

### Phase 3: Type Definitions
Create comprehensive interfaces for:
- Azure DevOps API responses
- Power Platform API contracts
- MCP protocol messages
- Project template structures
- Configuration objects

## TypeScript Guidelines

### Type Safety Rules
- **No `any` types** - create proper domain types
- **Strict null checks** - handle undefined/null explicitly
- **Interface definitions** for all external API contracts
- **Union types** instead of enums for string literals
- **Generic types** for reusable API response patterns

### File Organization
```typescript
// interfaces/azure-devops.ts
export interface IAzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public';
}

// services/azure-devops.ts
import { IAzureDevOpsProject } from '../interfaces/azure-devops';

export class AzureDevOpsService {
  async createProject(config: IAzureDevOpsProject): Promise<IAzureDevOpsProject> {
    // Implementation
  }
}
```

### Error Handling Pattern
```typescript
// utils/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage in services
try {
  const result = await apiCall();
  return result;
} catch (error) {
  throw new ApiError(
    `Failed to create project: ${error.message}`,
    500,
    { originalError: error, context: 'project-creation' }
  );
}
```

## Migration Checklist

### Per File Migration
- [ ] Rename `.js` to `.ts`
- [ ] Add proper imports with types
- [ ] Define interfaces for function parameters
- [ ] Add return types to all functions
- [ ] Handle nullable/undefined values explicitly
- [ ] Create domain-specific error types
- [ ] Update tests to use TypeScript
- [ ] Verify no `any` types remain

### Project-Level Tasks
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint with TypeScript rules
- [ ] Update build pipeline for TypeScript
- [ ] Create comprehensive type definitions
- [ ] Document type patterns in CLAUDE.md
- [ ] Update development workflow

## Common Migration Patterns

### Before (JavaScript)
```javascript
function createProject(name, description, visibility) {
  return {
    id: generateId(),
    name: name,
    description: description || null,
    visibility: visibility || 'private'
  };
}
```

### After (TypeScript)
```typescript
interface IProjectConfig {
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
}

interface IProject extends Required<IProjectConfig> {
  id: string;
}

function createProject(config: IProjectConfig): IProject {
  return {
    id: generateId(),
    name: config.name,
    description: config.description ?? '',
    visibility: config.visibility ?? 'private'
  };
}
```

## Benefits After Migration
- **Compile-time error detection** for API integration issues
- **Better IDE support** with autocomplete and refactoring
- **Self-documenting code** through type definitions
- **Easier onboarding** for new developers
- **Reduced runtime errors** in production
- **Better testing** with typed test fixtures

## Success Criteria
Migration is complete when:
- All files use `.ts` extension
- No `any` types in codebase
- All public APIs have proper type definitions
- Tests pass with TypeScript strict mode
- Build pipeline produces optimized JavaScript
- Documentation reflects TypeScript patterns