# Getting Started with Deerflow Agent Framework

Welcome to the **Deerflow Agent Framework** — a production-grade constraint enforcement,
quality gate, and safety system for AI-powered code generation agents. This guide walks
you through everything you need to go from zero to a fully validated, Deerflow-powered
project in under 15 minutes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [First Project Setup](#first-project-setup)
5. [Verifying the Framework](#verifying-the-framework-is-working)
6. [Your First Workflow](#your-first-workflow)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [FAQ](#faq)
9. [Next Steps](#next-steps)

---

## Prerequisites

Before installing Deerflow, ensure your development environment meets the following
minimum requirements:

### System Requirements

| Requirement         | Minimum Version | Recommended Version |
|---------------------|-----------------|---------------------|
| Node.js             | 18.0.0          | 20.x LTS            |
| npm                 | 9.0.0           | 10.x                |
| Git                 | 2.30.0          | 2.40+               |
| Operating System    | macOS 12+, Ubuntu 20.04+, Windows 10 (WSL2) | Same |
| Available RAM       | 4 GB            | 8 GB+               |
| Disk Space          | 500 MB free     | 2 GB free           |

### AI Agent Compatibility

Deerflow is designed to work with any AI coding agent that supports custom rules
or configuration files:

- **Cursor** — reads `deerflow.config.yaml` and `deerflow/rules/` automatically
- **Cline** — supports Deerflow through custom instruction files
- **Windsurf** — integrates via MCP server protocol
- **GitHub Copilot** — partial support via workspace rules
- **Continue.dev** — full support via custom prompts
- **Aider** — support via `.aider.conf.yml` includes

### Optional Tools

These tools enhance the Deerflow experience but are not strictly required:

- **ripgrep (`rg`)** — required for the search MCP server (used by `deep-search` skill)
- **Jest** or **Vitest** — for running the test suite (quality gate integration)
- **TypeScript** — required for TypeScript quality gate checks
- **ESLint** — for linting quality gates
- **Prettier** — for code formatting quality gates
- **conventional-changelog** — for changelog generation

### Verifying Prerequisites

Run the following command to verify your environment:

```bash
node --version    # Should be >= 18.0.0
npm --version     # Should be >= 9.0.0
git --version     # Should be >= 2.30.0
rg --version      # Optional, but recommended
```

---

## Installation

### Option 1: New Project (Recommended)

Create a new project from a Deerflow template:

```bash
# Using the Deerflow CLI
npx @deerflow/cli create my-deerflow-app --template nextjs

# Available templates:
#   nextjs   — Next.js 14 with App Router
#   react    — React 18 with Vite
#   vue      — Vue 3 with Vite
#   python   — Python with FastAPI

cd my-deerflow-app
npm install
```

### Option 2: Clone the Framework Directly

If you want the framework source code for customization:

```bash
git clone https://github.com/deerflow/deerflow-agent-framework.git
cd deerflow-agent-framework
npm install
```

### Option 3: Install as an npm Dependency

Add Deerflow to an existing project:

```bash
npm install --save-dev @deerflow/core
```

### Option 4: Global CLI Installation

Install the Deerflow CLI globally for use across projects:

```bash
npm install -g @deerflow/cli
```

### Post-Installation Setup

After installation, run the setup script to initialize the Deerflow directory
structure:

```bash
# Run the interactive setup
npx deerflow setup

# Or use the non-interactive setup script
bash scripts/setup.sh
```

This creates the following directory structure:

```
your-project/
├── deerflow/
│   ├── core/           # Core engine modules (TypeScript)
│   ├── rules/          # Constraint and coding rules (Markdown)
│   ├── algorithms/     # Quality scoring and risk assessment
│   ├── workflows/      # Workflow definitions and lifecycle
│   ├── templates/      # Project scaffolding templates
│   ├── mcp/            # MCP server configurations
│   ├── skills/         # Agent skill definitions
│   └── reports/        # Generated reports (auto-created)
├── deerflow.config.yaml    # Main configuration file
├── scripts/
│   ├── setup.sh            # Setup script
│   ├── validate.sh         # Validation runner
│   └── install-hooks.sh    # Git hooks installer
├── docs/                   # Project documentation
├── tests/                  # Test files
├── package.json
└── tsconfig.json
```

---

## Configuration

The central configuration file is `deerflow.config.yaml` at the project root.
It controls quality gates, security settings, context management, workflows,
and MCP server integrations.

### Core Configuration Sections

```yaml
version: "1.0.0"
framework: deerflow

# Quality thresholds enforced on every commit
quality:
  min_test_coverage: 80
  max_cyclomatic_complexity: 10
  max_function_lines: 50
  max_file_lines: 500
  min_build_size_kb: 100
  strict_typescript: true
  no_any_types: true
  explicit_return_types: true
  sort_imports: true
  max_function_params: 5

# Security enforcement
security:
  audit_on_install: true
  no_hardcoded_secrets: true
  input_validation: true
  no_dynamic_code: true
  enforce_https: true

# Context window management
context:
  checkpoint_threshold_percent: 80
  max_tokens_per_task:
    simple: 5000
    medium: 15000
    complex: 30000
    architecture: 50000
  auto_save: true
  max_checkpoints: 10

# 7-Phase workflow configuration
workflow:
  phases:
    - understand
    - plan
    - verify
    - implement
    - test
    - review
    - deploy
  skip_requires_approval: true
  phase_timeout_minutes: 30

# MCP server integration
mcp:
  enabled: true
  servers:
    - filesystem
    - search
    - git
    - testing
    - validation
    - documentation
    - security
    - performance
  connection_timeout: 30
  max_connections: 5
  retry_count: 2
```

### Environment Variables

Deerflow supports the following environment variables for configuration overrides:

| Variable                        | Description                          | Default               |
|---------------------------------|--------------------------------------|-----------------------|
| `DEERFLOW_CONFIG_PATH`          | Path to config file                  | `deerflow.config.yaml`|
| `DEERFLOW_WORKSPACE_ROOT`       | Project root directory               | `process.cwd()`       |
| `DEERFLOW_LOG_LEVEL`            | Logging verbosity                    | `info`                |
| `DEERFLOW_REPORTS_DIR`          | Reports output directory             | `deerflow/reports`    |
| `DEERFLOW_CONTEXT_DIR`          | Context persistence directory        | `.deerflow/context`   |
| `DEERFLOW_BACKUP_DIR`           | File backup directory                | `.deerflow/backups`   |
| `DEERFLOW_CI_MODE`              | Enable CI-specific behavior          | `false`               |
| `DEERFLOW_SKIP_HOOKS`           | Skip git hooks installation          | `false`               |

### Project Template Configurations

Deerflow ships with template-specific configurations for common frameworks:

- **Next.js** (`templates/nextjs/deerflow.config.yaml`) — tuned for Next.js App Router
- **React** (`templates/react/deerflow.config.yaml`) — tuned for React + Vite
- **Vue** (`templates/vue/deerflow.config.yaml`) — tuned for Vue 3 + Vite
- **Python** (`templates/python/deerflow.config.yaml`) — tuned for FastAPI projects

You can copy and customize any template config:

```bash
cp templates/nextjs/deerflow.config.yaml ./deerflow.config.yaml
```

---

## First Project Setup

### Step 1: Initialize Your Project

```bash
# Create a new project with the Deerflow Next.js template
npx @deerflow/cli create my-app --template nextjs
cd my-app
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Install Git Hooks

Git hooks ensure quality gates run automatically on commits and pushes:

```bash
bash scripts/install-hooks.sh
```

This installs the following hooks:

| Hook       | Behavior                                               |
|------------|--------------------------------------------------------|
| `pre-commit` | Runs TypeScript check, ESLint, and constraint validation |
| `pre-push`  | Runs full test suite, coverage check, and security audit  |
| `commit-msg` | Validates commit message follows conventional format     |

### Step 4: Start the Development Server

```bash
npm run dev
```

### Step 5: Begin Your First Task

Open your AI coding agent (Cursor, Cline, Windsurf, etc.) and instruct it to:

```
Follow the Deerflow 7-Phase Workflow to add a "Hello World" page to this project.
Start with the "understand" phase.
```

The agent will automatically:
1. Read the Deerflow rules from `deerflow/rules/`
2. Set up context tracking via `ContextManager`
3. Progress through each workflow phase
4. Validate output through quality gates
5. Log file operations with `FileSafetyGuard`

---

## Verifying the Framework Is Working

### Quick Health Check

Run the built-in validation script to verify everything is configured correctly:

```bash
bash scripts/validate.sh
```

Expected output:

```
[OK] deerflow.config.yaml found and valid
[OK] Core modules loaded (6/6)
[OK] TypeScript quality gate ready
[OK] Build quality gate ready
[OK] Test coverage gate ready
[OK] Security gate ready
[OK] Dependency consistency gate ready
[OK] UI consistency gate ready
[OK] Git hooks installed (3/3)
[OK] MCP servers configured (8/8)
[OK] Required skills available (5/5)

All checks passed. Deerflow is ready.
```

### Run the Test Suite

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run a specific test file
npx jest tests/unit/constraint-engine.test.ts
```

### Test the Quality Gate Pipeline Programmatically

Create a quick test script to verify the pipeline works end-to-end:

```typescript
import {
  QualityGatePipeline,
  createDefaultConstraintRegistry,
  ConstraintValidator,
} from './deerflow/core';

// Test the quality gate pipeline
const pipeline = QualityGatePipeline.createDefault();
console.log(`Pipeline loaded: ${pipeline['gates'].length} gates`);

// Test the constraint engine
const registry = createDefaultConstraintRegistry();
const validator = new ConstraintValidator(registry);
const summary = validator.validateFileChange(
  '/tmp/test.ts',
  'const x: any = 1; // TODO implement this',
  '/tmp',
);
console.log(`Validation: ${summary.passed ? 'PASSED' : 'FAILED'}`);
console.log(`  Errors: ${summary.errorCount}, Warnings: ${summary.warningCount}`);
```

### Test MCP Server Connectivity

Verify that MCP servers can be reached:

```bash
# Test individual MCP servers
npx @deerflow/mcp-server-filesystem --health-check
npx @deerflow/mcp-server-search --health-check
npx @deerflow/mcp-server-git --health-check
```

---

## Troubleshooting Common Issues

### Issue: "deerflow.config.yaml not found"

**Cause:** The configuration file is not in the project root.

**Solution:**
```bash
# Ensure you're in the project root
pwd

# Copy from a template if missing
cp templates/nextjs/deerflow.config.yaml ./deerflow.config.yaml

# Or set the config path via environment variable
export DEERFLOW_CONFIG_PATH=/path/to/deerflow.config.yaml
```

### Issue: "Pre-commit hook fails with TypeScript errors"

**Cause:** TypeScript strict mode is enabled but your code has type errors.

**Solution:**
```bash
# Run TypeScript check to see the specific errors
npx tsc --noEmit

# Option A: Fix the type errors (recommended)
# Option B: Temporarily disable strict mode in deerflow.config.yaml
#   quality:
#     strict_typescript: false
```

### Issue: "Coverage below 80% threshold"

**Cause:** Your test coverage does not meet the minimum threshold.

**Solution:**
```bash
# Generate a coverage report to see which files need more tests
npm run test:coverage

# Option A: Write more tests to increase coverage
# Option B: Lower the threshold in deerflow.config.yaml
#   quality:
#     min_test_coverage: 60  # temporarily lower for migration
```

### Issue: "MCP server connection timeout"

**Cause:** MCP server cannot be reached within the configured timeout.

**Solution:**
```bash
# Increase the timeout in deerflow.config.yaml
#   mcp:
#     connection_timeout: 60

# Or verify the MCP server package is available
npx @deerflow/mcp-server-filesystem --version

# Check network connectivity if using remote MCP servers
```

### Issue: "Context window exceeded"

**Cause:** The context manager has run out of capacity.

**Solution:**
```bash
# Increase the context capacity in deerflow.config.yaml
#   context:
#     checkpoint_threshold_percent: 90

# Or manually clear old context checkpoints
npx deerflow context clear --older-than 7d
```

### Issue: "Git hooks not triggering"

**Cause:** Git hooks were not installed or were overwritten.

**Solution:**
```bash
# Re-install hooks
bash scripts/install-hooks.sh

# Verify hooks are in place
ls -la .git/hooks/pre-commit
ls -la .git/hooks/pre-push

# If using Husky, ensure it's configured correctly
npx husky install
```

### Issue: "Constraint validation fails for mock data"

**Cause:** The `MockDataConstraint` detects placeholder text in your code.

**Solution:**
```typescript
// Option A: Remove the placeholder text (recommended)
// Option B: Disable the specific constraint temporarily
registry.setEnabled('no-mock-data', false);

// Option C: Add an exclusion pattern
const constraint = registry.get('no-mock-data') as MockDataConstraint;
// Custom patterns are passed at construction time
```

### Issue: "File operation denied by scope validator"

**Cause:** The `FileSafetyGuard` is blocking an operation outside the allowed scope.

**Solution:**
```typescript
// Check your scope rules configuration
const guard = new FileSafetyGuard({
  projectRoot: process.cwd(),
  allowedPaths: ['src', 'tests'],
  deniedPaths: ['node_modules', '.git'],
  deniedPatterns: ['.env', '*.secret'],
});
```

### Issue: "Lock file validation fails"

**Cause:** The lock file is out of sync with package.json.

**Solution:**
```bash
# Regenerate the lock file
rm package-lock.json
npm install

# Or if using yarn
rm yarn.lock
yarn install
```

---

## FAQ

### General Questions

**Q: What is the Deerflow Agent Framework?**

A: Deerflow is a comprehensive safety and quality framework for AI-powered code
generation agents. It provides constraint enforcement, quality gates, file safety
guards, context management, dependency resolution, and agent behavior validation.
Think of it as a "guard rails" system that ensures AI-generated code meets
production standards.

**Q: Which AI agents does Deerflow support?**

A: Deerflow is designed to be agent-agnostic. It works with Cursor, Cline,
Windsurf, GitHub Copilot, Continue.dev, Aider, and any agent that can read
project configuration files or communicate via the Model Context Protocol (MCP).

**Q: Is Deerflow suitable for production use?**

A: Yes. Deerflow is designed with production-grade safety guarantees including
atomic file writes, backup-before-modify operations, scope validation, and
comprehensive audit logging. The constraint engine enforces zero-tolerance
policies on common failure modes like mock data leaks and infinite loops.

**Q: Can I use Deerflow with non-TypeScript projects?**

A: Absolutely. While the core engine is written in TypeScript, the rules system
is language-agnostic (Markdown-based rules), and the quality gates can be
configured for any language. Python, Go, Rust, and Java projects all benefit
from Deerflow's safety guarantees.

### Configuration Questions

**Q: Can I customize the quality gate thresholds?**

A: Yes. All thresholds are configurable in `deerflow.config.yaml`. You can set
custom values for test coverage, cyclomatic complexity, function length, file
length, build size, and more. You can also create custom quality gates by
implementing the `QualityGate` interface.

**Q: How do I disable a specific rule or constraint?**

A: Use the constraint registry to disable specific rules:

```typescript
const registry = createDefaultConstraintRegistry();
registry.setEnabled('no-mock-data', false);
registry.setEnabled('no-infinite-loops', false);
```

Or via the configuration file by setting the constraint's `enabled` property.

**Q: Can I add my own custom rules?**

A: Yes. Deerflow supports custom rules through the constraint engine. You can
register custom `Constraint` implementations with your own validation logic.
See the [Custom Rules Guide](../guides/custom-rules.md) for detailed instructions.

### Performance Questions

**Q: Does Deerflow slow down my CI/CD pipeline?**

A: Deerflow is designed for minimal overhead. The quality gate pipeline uses
fail-fast mode by default, and individual gates run in under a second for
typical projects. The constraint engine uses efficient regex-based pattern
matching. In CI mode (`DEERFLOW_CI_MODE=true`), Deerflow skips non-essential
operations like checkpointing and context persistence.

**Q: How much disk space does Deerflow use?**

A: The core framework uses approximately 50 MB. Context checkpoints and backups
are stored in `.deerflow/` (git-ignored) and grow with usage. The retention
policy (default: 30 days) automatically cleans up old reports and backups.

**Q: Can I run Deerflow in parallel with other CI tools?**

A: Yes. Deerflow's quality gates are designed to complement (not replace)
existing CI tools like GitHub Actions, Jenkins, or CircleCI. The `scripts/validate.sh`
script outputs machine-readable JSON for easy integration with any CI platform.

### Security Questions

**Q: Does Deerflow send any data externally?**

A: No. All processing happens locally on your machine. The framework does not
make any external network calls. MCP server connections are configurable and
run locally via `npx`. No telemetry or analytics are collected.

**Q: How does Deerflow protect against secret leaks?**

A: Deerflow includes multiple layers of secret protection:
1. The `SecurityGate` scans all files for hardcoded secrets using regex patterns
2. The `ScopeValidator` prevents writes to sensitive paths (`.env`, `*.secret`)
3. The `DeletionConfirmProtocol` prevents accidental deletion of security files
4. File operations are logged with checksums for audit trail

**Q: What happens if the constraint engine detects a security issue?**

A: Security-critical violations (severity: `error`) immediately block the
offending file operation. A violation record is created with full details,
and the agent is notified via the penalty system. Critical violations can
be configured to halt the entire agent session.

---

## Next Steps

Now that you have Deerflow up and running, explore these resources:

1. **[Architecture Documentation](./architecture.md)** — Understand the framework's
   internal design and component relationships.

2. **[API Reference](./api-reference.md)** — Detailed API documentation for all
   core modules and their public interfaces.

3. **[Custom Rules Guide](../guides/custom-rules.md)** — Learn how to create
   project-specific rules and constraints.

4. **[Migration Guide](../guides/migrating-existing-project.md)** — Step-by-step
   instructions for adding Deerflow to an existing project.

5. **[Custom MCP Servers Guide](../guides/custom-mcp-servers.md)** — Build your
   own MCP servers for specialized agent capabilities.

6. **Rules Reference** — Browse the built-in rules in `deerflow/rules/` to
   understand the default coding standards enforced by the framework.
