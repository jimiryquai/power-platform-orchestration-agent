# Dynamic Permission Resolution Specification

## Overview
This specification defines how to dynamically resolve Microsoft service permissions by querying service principals by display name, eliminating hardcoded GUIDs and making the solution work in any Azure tenant.

## Problem Statement
Currently, the app registration tool uses hardcoded permission GUIDs:
```typescript
// Current problematic approach
const permissions = [
  {
    resourceAppId: "00000007-0000-0000-c000-000000000000", // Dynamics CRM - WRONG
    permissions: [{ id: "78ce3f0f-a1ce-49c2-8cde-64b5c0896db4", type: "Scope" }] // WRONG GUID
  }
];
```

**Issues:**
- GUIDs are tenant-specific and vary
- Hardcoded app IDs may be incorrect
- Admin consent fails because permissions don't exist
- Solution doesn't work across different tenants

## Solution Architecture

### 1. Service Principal Discovery
Query Microsoft first-party service principals by well-known display names:

```typescript
interface ServicePrincipalQuery {
  displayName: string;
  expectedPermissions: string[];
}

const REQUIRED_SERVICES: ServicePrincipalQuery[] = [
  {
    displayName: "Dynamics CRM",
    expectedPermissions: ["user_impersonation"]
  },
  {
    displayName: "Microsoft Graph", 
    expectedPermissions: ["Directory.Read.All", "User.Read"]
  }
];
```

### 2. Dynamic Permission Resolution Process

#### Step 1: Query Service Principal by Display Name
```http
GET /servicePrincipals?$filter=displayName eq 'Dynamics CRM'&$select=id,appId,displayName,oauth2PermissionScopes
```

#### Step 2: Extract Permission Mappings
```typescript
interface ResolvedPermission {
  serviceName: string;
  appId: string;
  permissions: Array<{
    name: string;        // e.g., "user_impersonation"
    id: string;          // Tenant-specific GUID
    type: "Scope" | "Role";
    adminConsentRequired: boolean;
  }>;
}
```

#### Step 3: Build Permission Requests
```typescript
const resolvedPermissions = await resolveServicePermissions(REQUIRED_SERVICES);
const appRegistrationPermissions = buildPermissionRequests(resolvedPermissions);
```

## Implementation Details

### 1. Permission Resolver Service

#### Interface Definition
```typescript
interface IPermissionResolver {
  resolveServicePermissions(services: ServicePrincipalQuery[]): Promise<ResolvedPermission[]>;
  findPermissionByName(serviceName: string, permissionName: string): Promise<PermissionDetails | null>;
  cachePermissions(permissions: ResolvedPermission[]): void;
  clearCache(): void;
}
```

#### Core Methods

**A. Service Principal Discovery**
```typescript
async findServicePrincipal(displayName: string): Promise<ServicePrincipalDetails | null> {
  const response = await this.client.get<{ value: ServicePrincipalDetails[] }>(
    `/servicePrincipals?$filter=displayName eq '${displayName}'&$select=id,appId,displayName,oauth2PermissionScopes`
  );
  
  if (response.status === 200 && response.data.value.length > 0) {
    return response.data.value[0];
  }
  
  return null;
}
```

**B. Permission Mapping**
```typescript
async mapPermissions(servicePrincipal: ServicePrincipalDetails, requiredPermissions: string[]): Promise<PermissionMapping[]> {
  const mappings: PermissionMapping[] = [];
  
  for (const permissionName of requiredPermissions) {
    const scope = servicePrincipal.oauth2PermissionScopes.find(
      scope => scope.value === permissionName
    );
    
    if (scope) {
      mappings.push({
        name: scope.value,
        id: scope.id,
        type: "Scope",
        adminConsentRequired: scope.isEnabled && scope.type === "Admin"
      });
    }
  }
  
  return mappings;
}
```

**C. Permission Caching**
```typescript
private permissionCache = new Map<string, ResolvedPermission>();
private cacheExpiry = 60 * 60 * 1000; // 1 hour

cachePermissions(permissions: ResolvedPermission[]): void {
  permissions.forEach(permission => {
    const key = `${permission.serviceName}:${permission.appId}`;
    this.permissionCache.set(key, {
      ...permission,
      cachedAt: Date.now()
    });
  });
}
```

### 2. App Registration Integration

#### Updated MCP Server Tool
```typescript
// Replace hardcoded permissions with dynamic resolution
async createAppRegistration(args: CreateAppRegistrationArgs): Promise<McpToolResult> {
  try {
    // Step 1: Resolve required permissions dynamically
    const requiredServices: ServicePrincipalQuery[] = [];
    
    if (args.includeDynamicsPermissions) {
      requiredServices.push({
        displayName: "Dynamics CRM",
        expectedPermissions: ["user_impersonation"]
      });
    }
    
    if (args.includePowerPlatformPermissions) {
      requiredServices.push({
        displayName: "Microsoft Graph",
        expectedPermissions: ["Directory.Read.All", "User.Read"]
      });
    }
    
    // Step 2: Resolve permissions
    const resolvedPermissions = await this.permissionResolver.resolveServicePermissions(requiredServices);
    
    // Step 3: Build app registration request
    const permissions = this.buildAppPermissions(resolvedPermissions);
    
    // Step 4: Create app registration
    const result = await this.graphClient.createApplication(args.applicationName, {
      signInAudience: args.signInAudience,
      requiredPermissions: permissions,
      createServicePrincipal: args.createServicePrincipal
    });
    
    return this.formatResponse(result);
  } catch (error) {
    return this.formatError(error);
  }
}
```

### 3. Admin Consent Process

#### Enhanced Consent Granting
```typescript
async grantAdminConsent(
  servicePrincipalId: string, 
  resolvedPermissions: ResolvedPermission[]
): Promise<GraphResponse<void>> {
  const results: ConsentResult[] = [];
  
  for (const service of resolvedPermissions) {
    try {
      // Find the resource service principal
      const resourceSp = await this.findServicePrincipal(service.serviceName);
      if (!resourceSp) {
        console.error(`❌ Service principal not found: ${service.serviceName}`);
        continue;
      }
      
      // Grant consent for each permission
      for (const permission of service.permissions) {
        if (permission.type === "Scope") {
          const consentResult = await this.createOAuth2PermissionGrant({
            clientId: servicePrincipalId,
            consentType: "AllPrincipals",
            resourceId: resourceSp.id,
            scope: permission.name
          });
          
          results.push({
            service: service.serviceName,
            permission: permission.name,
            success: consentResult.status === 201,
            error: consentResult.status !== 201 ? consentResult.statusText : undefined
          });
        }
      }
    } catch (error) {
      console.error(`❌ Failed to grant consent for ${service.serviceName}:`, error);
    }
  }
  
  // Log results
  this.logConsentResults(results);
  
  return { success: true, data: undefined };
}
```

## Error Handling & Fallbacks

### 1. Service Not Found
```typescript
if (!servicePrincipal) {
  console.warn(`⚠️  Service principal '${displayName}' not found in tenant`);
  // Option 1: Skip this service
  // Option 2: Use fallback well-known app IDs
  // Option 3: Throw error and abort
}
```

### 2. Permission Not Available
```typescript
const missingPermissions = requiredPermissions.filter(name => 
  !servicePrincipal.oauth2PermissionScopes.some(scope => scope.value === name)
);

if (missingPermissions.length > 0) {
  console.warn(`⚠️  Missing permissions in ${serviceName}: ${missingPermissions.join(', ')}`);
  // Continue with available permissions or abort
}
```

### 3. Cache Invalidation
```typescript
// Clear cache if resolution fails
if (!resolvedPermissions || resolvedPermissions.length === 0) {
  this.permissionResolver.clearCache();
  // Retry once without cache
}
```

## Validation & Testing

### 1. Validation Checklist
- [ ] Service principals found by display name
- [ ] All required permissions available in tenant
- [ ] Permission GUIDs resolved correctly
- [ ] App registration created with resolved permissions
- [ ] Admin consent granted successfully
- [ ] Permissions visible in Azure portal

### 2. Test Cases

#### Test 1: Standard Tenant
```typescript
const services = [
  { displayName: "Dynamics CRM", expectedPermissions: ["user_impersonation"] },
  { displayName: "Microsoft Graph", expectedPermissions: ["Directory.Read.All", "User.Read"] }
];

const resolved = await resolver.resolveServicePermissions(services);
expect(resolved).toHaveLength(2);
expect(resolved[0].permissions).toContain({ name: "user_impersonation" });
```

#### Test 2: Missing Service
```typescript
const services = [
  { displayName: "NonExistent Service", expectedPermissions: ["some_permission"] }
];

const resolved = await resolver.resolveServicePermissions(services);
expect(resolved).toHaveLength(0);
// Should not throw error, should log warning
```

#### Test 3: Cache Performance
```typescript
// First call - should hit API
const start1 = Date.now();
const resolved1 = await resolver.resolveServicePermissions(services);
const time1 = Date.now() - start1;

// Second call - should use cache
const start2 = Date.now();
const resolved2 = await resolver.resolveServicePermissions(services);
const time2 = Date.now() - start2;

expect(time2).toBeLessThan(time1 * 0.1); // Cache should be 10x faster
```

## File Structure

### New Files
```
src/
├── integrations/
│   └── microsoft-graph/
│       ├── permission-resolver.ts          # New: Core permission resolution
│       ├── permission-cache.ts             # New: Caching layer
│       └── types/
│           └── permission-types.ts         # New: Type definitions
└── utils/
    └── permission-utils.ts                 # New: Helper functions
```

### Modified Files
```
src/
├── integrations/microsoft-graph/
│   └── graph-client.ts                     # Enhanced with dynamic permissions
├── mcp/
│   └── standards-compliant-server.ts       # Updated app registration tool
└── types/
    └── api-contracts.ts                    # New permission interfaces
```

## Implementation Priority

### Phase 1: Core Resolution (Day 1)
1. Implement `PermissionResolver` class
2. Add service principal discovery by display name
3. Create permission mapping functionality
4. Add basic caching

### Phase 2: Integration (Day 1 continued)
1. Update `MicrosoftGraphClient` to use resolver
2. Modify MCP server tool to use dynamic permissions
3. Update admin consent process
4. Add comprehensive error handling

### Phase 3: Testing & Validation (Day 2)
1. Create unit tests for permission resolver
2. Test in different tenant scenarios
3. Validate admin consent process
4. Performance testing and cache optimization

## Success Criteria
- ✅ Works in any Azure tenant without hardcoded values
- ✅ Correctly resolves Dynamics CRM and Microsoft Graph permissions
- ✅ Successfully grants admin consent for resolved permissions
- ✅ Provides clear error messages for missing services/permissions
- ✅ Performance is acceptable with caching
- ✅ Solution is maintainable and extensible

## Next Steps
1. Review and approve this specification
2. Implement `PermissionResolver` class
3. Update MCP server integration
4. Test with app registration creation
5. Validate admin consent process