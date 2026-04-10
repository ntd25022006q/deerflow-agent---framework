# Migrating an Existing Project to Deerflow Framework

This guide walks you through the process of adding the Deerflow Agent Framework
to an existing codebase. Whether your project is brand new or has years of
history, this guide ensures a smooth migration with minimal disruption.

---

## Table of Contents

1. [Pre-Migration Assessment](#pre-migration-assessment)
2. [Migration Strategy Overview](#migration-strategy-overview)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Handling Common Migration Challenges](#handling-common-migration-challenges)
5. [Gradual Rollout Strategy](#gradual-rollout-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Post-Migration Checklist](#post-migration-checklist)
8. [Case Studies](#case-studies)

---

## Pre-Migration Assessment

Before starting the migration, assess your project's readiness:

### Project Health Check

Run this checklist against your existing codebase:

```bash
# 1. Check TypeScript strictness
npx tsc --noEmit --strict 2>&1 | wc -l

# 2. Check existing test coverage
npm run test:coverage 2>/dev/null || npx jest --coverage

# 3. Check for existing linting config
ls -la .eslintrc* eslint.config.* biome.json

# 4. Check for existing git hooks
ls -la .husky/ .git/hooks/pre-commit

# 5. Check for hardcoded secrets
rg -i 'password\s*[:=]\s*["\x27]' --type-add 'secrets:*' -t secrets
rg -i 'api[_-]?key\s*[:=]\s*["\x27]' --type-add 'secrets:*' -t secrets

# 6. Check for mock/placeholder data
rg -i 'lorem ipsum|placeholder|TODO implement|FIXME|HACK' src/

# 7. Check for infinite loop patterns
rg -w 'while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)' src/

# 8. Count files and estimate migration scope
find src -name '*.ts' -o -name '*.tsx' | wc -l
```

### Compatibility Matrix

| Project Type     | Deerflow Support | Migration Effort | Notes                         |
|------------------|------------------|------------------|-------------------------------|
| Next.js 14+      | Full             | Low              | Template available            |
| React + Vite     | Full             | Low              | Template available            |
| Vue 3 + Vite     | Full             | Low              | Template available            |
| React + CRA      | Partial          | Medium           | Requires Vite migration       |
| Express API      | Full             | Low              | Backend-focused config        |
| Python/FastAPI   | Partial          | Medium           | TypeScript gates skipped      |
| Go/Rust monorepo | Minimal          | High             | File safety only              |
| Monorepo (turborepo/nx) | Full      | Medium           | Per-package config            |

---

## Migration Strategy Overview

Deerflow supports three migration strategies:

### Strategy 1: Big Bang (Recommended for small projects < 50 files)

Add all Deerflow components at once. Best for greenfield or small projects
where the team can address all issues in a single pass.

**Duration:** 1-2 days
**Risk:** Medium — many issues surface at once
**Best for:** Small projects, new teams, high-quality codebases

### Strategy 2: Phased Rollout (Recommended for medium/large projects)

Gradually introduce Deerflow components in phases. Each phase adds more
enforcement while the team adapts.

**Duration:** 2-4 weeks
**Risk:** Low — issues addressed incrementally
**Best for:** Medium to large projects, teams new to quality gates

### Strategy 3: Shadow Mode (Recommended for CI/CD heavy projects)

Run Deerflow in reporting-only mode alongside existing tools. No enforcement
until the team is confident.

**Duration:** 1-2 weeks shadow + 1 week enforcement
**Risk:** Very low — no disruption during shadow period
**Best for:** Mission-critical projects, strict CI/CD pipelines

---

## Step-by-Step Migration

### Phase 1: Install the Framework

```bash
# Step 1: Install Deerflow as a dev dependency
npm install --save-dev @deerflow/core

# Step 2: Copy the configuration file
npx @deerflow/cli init

# Step 3: Copy the rules directory
cp -r node_modules/@deerflow/core/rules deerflow/rules

# Step 4: Verify installation
npx deerflow health-check
```

### Phase 2: Configure for Your Project

Start with a permissive configuration and tighten over time:

```yaml
# deerflow.config.yaml — Initial migration config (permissive)
version: "1.0.0"
framework: deerflow

quality:
  # Start with lower thresholds during migration
  min_test_coverage: 0          # Will tighten to 80 later
  max_cyclomatic_complexity: 20 # Will tighten to 10 later
  max_function_lines: 100       # Will tighten to 50 later
  max_file_lines: 1000          # Will tighten to 500 later
  min_build_size_kb: 10         # Will tighten to 100 later
  strict_typescript: false      # Will enable later
  no_any_types: false           # Will enable later
  explicit_return_types: false  # Will enable later
  sort_imports: false           # Will enable later
  max_function_params: 8        # Will tighten to 5 later

security:
  audit_on_install: true
  no_hardcoded_secrets: true
  no_dynamic_code: true        # Start strict on security
  enforce_https: true

context:
  checkpoint_threshold_percent: 80
  auto_save: true
  max_checkpoints: 5

workflow:
  phases:
    - understand
    - plan
    - implement
    - test
    - review
  skip_requires_approval: false  # Require approval during migration

mcp:
  enabled: true
  servers:
    - filesystem
    - search
    - git
    - validation

penalty:
  warning_limit: 10             # Generous during migration
  critical_violations_stop: false # Don't block during migration
  reset_on_success: true
```

### Phase 3: Run Assessment (No Enforcement)

```bash
# Run the full validation suite in report-only mode
DEERFLOW_CI_MODE=true DEERFLOW_SKIP_HOOKS=true \
  npx deerflow validate --report-only --format json > migration-report.json

# Review the report
npx deerflow report migration-report.json --summary
```

### Phase 4: Address Critical Issues

Fix the most critical issues first:

#### 4.1 Remove Hardcoded Secrets

```bash
# Find all secrets
rg -i 'password|api_key|secret|token.*[:=]\s*['\''"]' src/

# Move to environment variables
# Before:
const dbPassword = "my-secret-password";
// After:
const dbPassword = process.env.DB_PASSWORD!;
```

#### 4.2 Remove Mock/Placeholder Data

```bash
# Find all placeholders
rg -i 'lorem ipsum|TODO implement|FIXME|HACK|placeholder|example\.com' src/

# Replace with real implementations or remove
```

#### 4.3 Fix Infinite Loop Patterns

```bash
# Find infinite loops
rg -w 'while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)' src/

# Add proper termination conditions
```

### Phase 5: Install Git Hooks

```bash
# Install hooks (they'll use permissive thresholds initially)
bash scripts/install-hooks.sh

# Test that hooks run without blocking
git commit --allow-empty -m "test: verify hooks"
```

### Phase 6: Enable Enforcement (Gradual)

Tighten the configuration in stages:

```yaml
# Week 1: Enable basic enforcement
quality:
  strict_typescript: true
  no_hardcoded_secrets: true
  no_dynamic_code: true

# Week 2: Enable type safety
quality:
  no_any_types: true
  explicit_return_types: true

# Week 3: Enable code quality
quality:
  max_cyclomatic_complexity: 15
  max_function_lines: 75

# Week 4: Full enforcement
quality:
  min_test_coverage: 80
  max_cyclomatic_complexity: 10
  max_function_lines: 50
  max_file_lines: 500
  min_build_size_kb: 100
  sort_imports: true
  max_function_params: 5
```

---

## Handling Common Migration Challenges

### Challenge 1: Existing Code Has Many `any` Types

**Problem:** Enabling `no_any_types` immediately fails on hundreds of files.

**Solution:** Use a phased approach:

```typescript
// Step 1: Identify all any usages
// rg ':\s*any\b' src/ --count-matches

// Step 2: Replace with unknown + type narrowing
// Before:
function parse(data: any): Result { ... }
// After:
function parse(data: unknown): Result {
  if (typeof data !== 'object' || data === null) throw new Error('...');
  return data as Result;
}

// Step 3: For external library types, install @types packages
npm install --save-dev @types/library-name
```

### Challenge 2: Low Test Coverage

**Problem:** Existing project has < 50% coverage but Deerflow requires 80%.

**Solution:** Write a coverage improvement plan:

```bash
# 1. Generate a coverage report to identify gaps
npx jest --coverage --coverageReporters=text

# 2. Prioritize critical path files (auth, payments, data access)
# 3. Use the context manager to track coverage improvement per task
# 4. Set incremental coverage targets:
#    Week 1: 50%, Week 2: 60%, Week 3: 70%, Week 4: 80%
```

### Challenge 3: Large Files Exceeding Size Limits

**Problem:** Some files are > 500 lines and fail the size gate.

**Solution:** Refactor incrementally:

```bash
# 1. Identify oversized files
find src -name '*.ts' -exec wc -l {} + | sort -rn | head -20

# 2. Use the Deerflow planning phase to create refactoring tasks
# 3. Extract related functions into separate modules
# 4. Use barrel exports (index.ts) for clean public APIs
```

### Challenge 4: Conflicting Linting Configurations

**Problem:** Project already uses ESLint, Biome, or other linters.

**Solution:** Integrate Deerflow with existing tools:

```javascript
// eslint.config.js — Add Deerflow rules alongside existing
import deerflow from '@deerflow/eslint-plugin';

export default [
  // Your existing config
  ...existingConfig,
  // Deerflow rules
  deerflow.configs.recommended,
  {
    rules: {
      // Override specific Deerflow rules if needed
      '@deerflow/max-function-lines': ['warn', { max: 75 }], // Relaxed
    },
  },
];
```

### Challenge 5: Monorepo with Multiple Packages

**Problem:** Different packages have different quality requirements.

**Solution:** Use per-package configuration:

```
monorepo/
├── deerflow.config.yaml          # Root config (shared settings)
├── packages/
│   ├── api/
│   │   └── deerflow.config.yaml  # API-specific overrides
│   ├── web/
│   │   └── deerflow.config.yaml  # Web-specific overrides
│   └── shared/
│       └── deerflow.config.yaml  # Shared lib overrides
```

---

## Gradual Rollout Strategy

### Week-by-Week Plan

| Week | Focus Area              | Action Items                                          |
|------|-------------------------|-------------------------------------------------------|
| 1    | Install & Assess        | Install framework, run assessment, fix critical issues |
| 2    | Security                | Enable security gates, fix secrets and unsafe patterns |
| 3    | Type Safety             | Enable TypeScript strict mode, fix `any` types         |
| 4    | Code Quality            | Enable complexity/size limits, refactor large files    |
| 5    | Testing                 | Write tests to reach 80% coverage                      |
| 6    | Full Enforcement        | Enable all gates, set final thresholds                 |
| 7    | Agent Integration       | Configure MCP servers, test with AI agent              |
| 8    | Optimization            | Tune context settings, optimize pipeline performance   |

---

## Rollback Plan

If the migration causes critical issues:

### Emergency Rollback (< 5 minutes)

```bash
# 1. Skip all hooks immediately
export DEERFLOW_SKIP_HOOKS=true

# 2. Revert the configuration
git checkout HEAD~1 -- deerflow.config.yaml

# 3. Remove git hooks
rm -f .git/hooks/pre-commit .git/hooks/pre-push .git/hooks/commit-msg

# 4. Verify normal operation
git commit --allow-empty -m "chore: verify normal operation after rollback"
```

### Partial Rollback

Disable specific components while keeping others:

```yaml
# Disable specific gates
mcp:
  enabled: false  # Disable MCP entirely

penalty:
  critical_violations_stop: false  # Don't block on violations

quality:
  min_test_coverage: 0  # Disable coverage gate
```

---

## Post-Migration Checklist

- [ ] Deerflow configuration file exists and is valid
- [ ] All critical security issues resolved (no hardcoded secrets)
- [ ] All mock/placeholder data removed from source code
- [ ] Git hooks installed and working
- [ ] TypeScript strict mode enabled with zero errors
- [ ] Test coverage meets minimum threshold (80%)
- [ ] All quality gates passing in CI pipeline
- [ ] MCP servers configured and health-checked
- [ ] Team trained on 7-phase workflow
- [ ] Context management configured for project size
- [ ] Backup and rollback procedures tested
- [ ] Documentation updated with Deerflow setup instructions
- [ ] Monitoring/alerting configured for quality gate failures

---

## Case Studies

### Case Study 1: React SaaS Application (15K lines)

**Starting state:** ESLint + Prettier only, 45% test coverage, some `any` types.

**Migration approach:** Phased rollout over 3 weeks.

**Results:**
- Security gate caught 3 hardcoded API keys in staging code
- Mock data constraint found 12 placeholder strings in production components
- Coverage increased from 45% to 82%
- Build quality gate caught a silently failing webpack configuration
- Total effort: ~40 developer-hours

### Case Study 2: Next.js E-Commerce Platform (50K lines)

**Starting state:** No linting, no type checking, manual deployment.

**Migration approach:** Shadow mode for 1 week, then phased enforcement.

**Results:**
- Security scan found AWS credentials in a debug file
- Import conflict constraint prevented a duplicate Lodash import issue
- UI consistency gate caught broken imports after a component rename
- Total effort: ~80 developer-hours over 4 weeks

### Case Study 3: Express API Microservice (5K lines)

**Starting state:** Good test coverage (75%), but no quality gates.

**Migration approach:** Big bang with permissive initial config.

**Results:**
- Up and running in 4 hours
- All gates at full enforcement within 1 week
- Dependency resolver caught 2 vulnerable packages
- Total effort: ~12 developer-hours
