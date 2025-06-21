Context Window Prime - Power Platform Orchestration Agent

RUN: git ls-files

# Essential Context Files
READ: README.md CLAUDE.md 

# Current State & Architecture
READ: ai_docs/session-context.md ai_docs/mcp-interface-specification.md ai_docs/architecture-flow.md specs/dynamic-permission-resolution.md

# Testing & Setup
READ: docs/claude-desktop-setup.md

# Working MCP Server Status
RUN: echo "✅ CURRENT STATUS: MCP server working in Claude Desktop with 6 tools"
RUN: echo "🔧 WORKING MCP SERVER: dist/mcp/standards-compliant-server.js"
RUN: echo "📋 TOOLS AVAILABLE: list_templates, validate_prd, create_project, get_project_status, get_template_details, create_app_registration"
RUN: echo "🔐 APP REGISTRATION: Creates app + service principal + client secret + admin consent"
RUN: echo "⚠️  CURRENT ISSUE: Hardcoded permission GUIDs don't work across tenants"
RUN: echo "🎯 NEXT STEP: Implement dynamic permission resolution (see specs/dynamic-permission-resolution.md)"
RUN: echo "📍 START HERE: Replace hardcoded permissions with tenant-agnostic resolution by service principal display name"