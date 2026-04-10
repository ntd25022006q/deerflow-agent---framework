# Creating Custom Rules for Deerflow Framework

This guide provides comprehensive instructions for creating custom rules and
constraints that extend the Deerflow Framework's validation capabilities to
enforce project-specific coding standards, business logic constraints, and
domain-specific requirements.

---

## Table of Contents

1. [Understanding the Rules System](#understanding-the-rules-system)
2. [Types of Custom Rules](#types-of-custom-rules)
3. [Creating Constraint-Based Rules](#creating-constraint-based-rules)
4. [Creating Quality Gate Rules](#creating-quality-gate-rules)
5. [Creating Agent Behavior Rules](#creating-agent-behavior-rules)
6. [Rule Registration and Configuration](#rule-registration-and-configuration)
7. [Testing Custom Rules](#testing-custom-rules)
8. [Best Practices](#best-practices)
9. [Advanced Patterns](#advanced-patterns)
10. [Examples Library](#examples-library)

---

## Understanding the Rules System

Deerflow supports two complementary rule systems:

### 1. Markdown Rules (Agent-Facing)

Rules defined in `deerflow/rules/` as Markdown files. These are read by AI
agents as instructions. They are human-readable, diffable, and work with
any AI agent regardless of format support.

### 2. Programmatic Constraints (Engine-Facing)

Rules implemented as TypeScript classes that implement the `Constraint`
interface. These are enforced by the core engine and provide hard guarantees
that cannot be bypassed by agents.

**Both systems should be used together:** Markdown rules tell the agent *what*
to do, and programmatic constraints *enforce* that it was done correctly.

---

## Types of Custom Rules

| Type                     | Enforcement   | Complexity | When to Use                            |
|--------------------------|---------------|------------|----------------------------------------|
| Markdown agent rules     | Soft (advisory)| Low        | Coding standards, naming conventions   |
| Programmatic constraints | Hard (blocking)| Medium     | Security, safety, data integrity       |
| Quality gates            | Hard (blocking)| Medium     | Build verification, coverage, security  |
| Agent behavior rules     | Soft (scoring) | Medium     | Hallucination, token efficiency, scope  |

---

## Creating Constraint-Based Rules

### Basic Constraint Template

Every custom constraint must implement the `Constraint` interface:

```typescript
import {
  Constraint,
  ConstraintContext,
  ConstraintResult,
  ConstraintSeverity,
} from '../deerflow/core/constraint-engine';

export class MyCustomConstraint implements Constraint {
  readonly id = 'my-custom-constraint';
  readonly description = 'Description of what this constraint enforces.';
  readonly severity = ConstraintSeverity.Error; // or Warning, Info
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    // 1. Check the content against your rule
    // 2. Return passed or failed result

    if (/* rule is violated */) {
      return {
        passed: false,
        message: 'Human-readable description of the violation.',
        severity: this.severity,
        details: 'Additional diagnostic information.',
      };
    }

    return {
      passed: true,
      message: 'Brief confirmation message.',
      severity: this.severity,
    };
  }
}
```

### Example: No Console Logging

```typescript
export class NoConsoleLogConstraint implements Constraint {
  readonly id = 'no-console-log';
  readonly description = 'Prohibits console.log statements in production code.';
  readonly severity = ConstraintSeverity.Warning;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    const matches = context.content.match(/\bconsole\.(log|warn|info|debug)\s*\(/g);
    if (matches && matches.length > 0) {
      return {
        passed: false,
        message: `Console logging found in ${context.filePath}`,
        severity: this.severity,
        details: `${matches.length} console statement(s): ${matches.join(', ')}`,
      };
    }
    return { passed: true, message: 'No console logging', severity: this.severity };
  }
}
```

### Example: Enforce API Response Type

```typescript
export class ApiResponseTypedConstraint implements Constraint {
  readonly id = 'api-response-typed';
  readonly description = 'All API response objects must have explicit type annotations.';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    // Only check files in the api/ directory
    if (!context.filePath.includes('/api/')) {
      return { passed: true, message: 'Not an API file, skipped', severity: this.severity };
    }

    // Check for Response objects without type annotations
    const untypedResponsePattern = /:\s*Response\s*[<\[]/g;
    const typedResponsePattern = /:\s*Response<\s*\w+/g;

    const untyped = (context.content.match(untypedResponsePattern) || []).length;
    const typed = (context.content.match(typedResponsePattern) || []).length;

    if (untyped > typed) {
      return {
        passed: false,
        message: 'API responses missing type annotations',
        severity: this.severity,
        details: `${untyped - typed} untyped Response object(s) found`,
      };
    }

    return { passed: true, message: 'All API responses are typed', severity: this.severity };
  }
}
```

### Example: Component File Naming Convention

```typescript
export class ComponentNamingConstraint implements Constraint {
  readonly id = 'component-naming';
  readonly description = 'React components must use PascalCase file names.';
  readonly severity = ConstraintSeverity.Warning;
  enabled = true;

  constructor(
    private readonly componentDir: string = 'src/components',
    private readonly extensions: string[] = ['.tsx', '.jsx'],
  ) {}

  validate(context: ConstraintContext): ConstraintResult {
    if (!context.filePath.includes(this.componentDir)) {
      return { passed: true, message: 'Not in components directory', severity: this.severity };
    }

    const fileName = context.filePath.split('/').pop() || '';
    const hasValidExtension = this.extensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return { passed: true, message: 'Not a component file', severity: this.severity };
    }

    const baseName = fileName.replace(/\.\w+$/, '');
    const startsWithUpper = /^[A-Z]/.test(baseName);

    if (!startsWithUpper) {
      return {
        passed: false,
        message: `Component file "${fileName}" should use PascalCase`,
        severity: this.severity,
        details: `Expected: ${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}.tsx`,
      };
    }

    return { passed: true, message: 'Component naming is correct', severity: this.severity };
  }
}
```

---

## Creating Quality Gate Rules

Quality gates operate at the project level rather than the file level. They
receive a `GateContext` with information about all changed files.

### Basic Quality Gate Template

```typescript
import {
  QualityGate,
  GateContext,
  GateResult,
} from '../deerflow/core/quality-gates';

export class MyCustomGate implements QualityGate {
  readonly name = 'my-custom-gate';
  readonly description = 'Description of this quality gate.';
  readonly critical = true; // Set to false for advisory-only gates

  async check(context: GateContext): Promise<GateResult> {
    // Implement your check logic here

    const issues: string[] = [];
    // ... gather issues ...

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'All checks passed' : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }
}
```

### Example: No Large Files Gate

```typescript
import * as fs from 'fs';
import * as path from 'path';

export class NoLargeFilesGate implements QualityGate {
  readonly name = 'no-large-files';
  readonly description = 'Rejects files exceeding a configurable line count.';
  readonly critical = true;

  constructor(private readonly maxLines: number = 500) {}

  async check(context: GateContext): Promise<GateResult> {
    const issues: string[] = [];

    for (const filePath of context.changedFiles) {
      if (!filePath.match(/\.(ts|tsx|js|jsx|py|go|rs)$/)) continue;

      try {
        const content = context.fileContents?.get(filePath) ??
          fs.readFileSync(filePath, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount > this.maxLines) {
          issues.push(
            `${path.basename(filePath)}: ${lineCount} lines (max: ${this.maxLines})`
          );
        }
      } catch {
        // File might not exist or be unreadable
      }
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0
        ? 'All files within size limits'
        : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }
}
```

### Example: Changelog Updated Gate

```typescript
export class ChangelogUpdatedGate implements QualityGate {
  readonly name = 'changelog-updated';
  readonly description = 'Ensures CHANGELOG.md was modified when source files change.';
  readonly critical = false; // Non-critical — just a warning

  async check(context: GateContext): Promise<GateResult> {
    const sourceChanged = context.changedFiles.some(f =>
      f.includes('/src/') || f.includes('/lib/')
    );
    const changelogChanged = context.changedFiles.some(f =>
      f.endsWith('CHANGELOG.md')
    );

    if (sourceChanged && !changelogChanged) {
      return {
        passed: false,
        gateName: this.name,
        reason: 'Source files modified but CHANGELOG.md was not updated',
        timestamp: new Date(),
      };
    }

    return {
      passed: true,
      gateName: this.name,
      reason: 'CHANGELOG.md is up to date',
      timestamp: new Date(),
    };
  }
}
```

---

## Creating Agent Behavior Rules

Agent behavior rules influence the agent's score without blocking execution.
They are implemented via the `BehaviorChecker` and `HallucinationDetector`.

### Custom Hallucination Patterns

```typescript
// Extend the built-in hallucination detector with project-specific patterns
import { HallucinationDetector } from '../deerflow/core/agent-validator';

// The detector uses static patterns. To add custom ones, create a wrapper:
export class ProjectHallucinationDetector {
  private static readonly CUSTOM_PATTERNS = [
    // Internal API endpoints that don't exist
    { pattern: /\/api\/v3\/internal\//, label: 'Reference to internal-only API endpoint' },
    // Database column names that were renamed
    { pattern: /\buser_name\b/, label: 'Deprecated column "user_name" (renamed to "username")' },
    // Fabricated feature flags
    { pattern: /feature_flag\(['"](?:ENABLE_|DISABLE_)/, label: 'Non-existent feature flag reference' },
  ];

  detect(content: string): Array<{ label: string }> {
    const signals: Array<{ label: string }> = [];
    for (const { pattern, label } of ProjectHallucinationDetector.CUSTOM_PATTERNS) {
      if (pattern.test(content)) {
        signals.push({ label });
      }
    }
    return signals;
  }
}
```

---

## Rule Registration and Configuration

### Registering Custom Constraints

```typescript
import {
  createDefaultConstraintRegistry,
  ConstraintRegistry,
} from '../deerflow/core';

// Create registry with defaults
const registry = createDefaultConstraintRegistry();

// Register custom constraints
registry.register(new NoConsoleLogConstraint());
registry.register(new ComponentNamingConstraint('src/components'));
registry.register(new ApiResponseTypedConstraint());

// Disable built-in constraints you don't need
registry.setEnabled('minimum-output-size', false);

// Use with the validator
import { ConstraintValidator } from '../deerflow/core';
const validator = new ConstraintValidator(registry);
```

### Registering Custom Quality Gates

```typescript
import { QualityGatePipeline } from '../deerflow/core';

// Start with defaults
const pipeline = QualityGatePipeline.createDefault();

// Add custom gates (order matters — earlier gates run first)
pipeline.addGate(new NoLargeFilesGate(500));
pipeline.addGate(new ChangelogUpdatedGate());

// Remove default gates you don't need
pipeline.removeGate('dependency-consistency');

// Configure pipeline options
const strictPipeline = new QualityGatePipeline({ failFast: true })
  .addGate(new NoConsoleLogAsGate())
  .addGate(new NoLargeFilesGate(500))
  .addGate(new ChangelogUpdatedGate());
```

### Configuration via deerflow.config.yaml

Custom rules can be enabled/disabled and configured from the YAML file:

```yaml
# deerflow.config.yaml
quality:
  custom_rules:
    - id: no-console-log
      enabled: true
      severity: warning
      config:
        allowed_methods: ['error', 'table']  # Allow console.error

    - id: no-large-files
      enabled: true
      severity: error
      config:
        max_lines: 500

    - id: component-naming
      enabled: true
      severity: warning
      config:
        component_dir: src/components
        extensions: [.tsx, .jsx]
```

---

## Testing Custom Rules

Every custom rule should have corresponding unit tests:

```typescript
import { describe, it, expect } from 'vitest';
import { NoConsoleLogConstraint } from './no-console-log-constraint';
import { ConstraintSeverity } from '../deerflow/core';

describe('NoConsoleLogConstraint', () => {
  const constraint = new NoConsoleLogConstraint();

  it('should pass when no console statements are present', () => {
    const result = constraint.validate({
      filePath: '/src/utils/math.ts',
      content: 'export function add(a: number, b: number): number { return a + b; }',
      projectRoot: '/src',
    });
    expect(result.passed).toBe(true);
  });

  it('should fail when console.log is present', () => {
    const result = constraint.validate({
      filePath: '/src/utils/math.ts',
      content: 'console.log("debugging");',
      projectRoot: '/src',
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe(ConstraintSeverity.Warning);
  });

  it('should detect multiple console statements', () => {
    const result = constraint.validate({
      filePath: '/src/utils/math.ts',
      content: 'console.log("a"); console.warn("b"); console.debug("c");',
      projectRoot: '/src',
    });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('3');
  });
});
```

---

## Best Practices

### 1. Start with Warnings, Not Errors

New rules should use `ConstraintSeverity.Warning` initially. This lets the team
see the impact without being blocked. Upgrade to `Error` once the codebase is clean.

### 2. Make Rules Configurable

Accept constructor parameters for thresholds and patterns so rules can be
tuned per project without code changes.

```typescript
class MaxLinesConstraint implements Constraint {
  constructor(private readonly maxLines: number = 500) { /* ... */ }
}
```

### 3. Scope Rules to Relevant Files

Skip validation for files that don't match the rule's domain:

```typescript
validate(context: ConstraintContext): ConstraintResult {
  if (!context.filePath.endsWith('.tsx')) {
    return { passed: true, message: 'Skipped (not a TSX file)', severity: this.severity };
  }
  // ... actual validation
}
```

### 4. Provide Actionable Error Messages

Error messages should tell the developer exactly what's wrong and how to fix it:

```typescript
// Bad:
return { passed: false, message: 'Rule violated', severity: this.severity };

// Good:
return {
  passed: false,
  message: `Component "${baseName}.tsx" must use PascalCase. Rename to "${suggestion}.tsx".`,
  severity: this.severity,
};
```

### 5. Include Details for Debugging

Use the `details` field to include diagnostic information:

```typescript
return {
  passed: false,
  message: 'Import conflicts detected',
  severity: this.severity,
  details: `Symbol "Utils" imported from: ./utils.ts, ./helpers.ts. Remove one import.`,
};
```

---

## Advanced Patterns

### Rule Composition

Create composite rules that combine multiple checks:

```typescript
export class CompositeRule implements Constraint {
  readonly id = 'composite-production-readiness';
  readonly description = 'Combines multiple checks for production readiness.';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  private rules: Constraint[] = [
    new NoConsoleLogConstraint(),
    new NoDebugStatementsConstraint(),
    new NoTODOsConstraint(),
  ];

  validate(context: ConstraintContext): ConstraintResult {
    const allResults = this.rules.map(r => r.validate(context));
    const failures = allResults.filter(r => !r.passed);

    return {
      passed: failures.length === 0,
      message: failures.length === 0
        ? 'Production readiness check passed'
        : `${failures.length} production readiness issue(s)`,
      severity: this.severity,
      details: failures.map(f => f.message).join('; '),
    };
  }
}
```

### Context-Aware Rules

Use `metadata` to pass task-specific information:

```typescript
validate(context: ConstraintContext): ConstraintResult {
  const taskType = context.metadata?.taskType as string;
  if (taskType === 'hotfix') {
    // Relax some rules for hotfixes
    return { passed: true, message: 'Relaxed for hotfix', severity: this.severity };
  }
  // Full validation for normal tasks
}
```

### File Diff Awareness

Use `originalContent` to only validate changed lines:

```typescript
validate(context: ConstraintContext): ConstraintResult {
  if (context.originalContent) {
    // Only check new or modified lines
    const originalLines = new Set(context.originalContent.split('\n'));
    const newLines = context.content.split('\n').filter(l => !originalLines.has(l));
    // Validate only newLines
  }
}
```

---

## Examples Library

| Rule ID                     | Category        | Description                                    |
|-----------------------------|-----------------|------------------------------------------------|
| `no-console-log`            | Code Quality    | No console.log/warn/info in production         |
| `no-debugger-statements`    | Code Quality    | No debugger statements                         |
| `no-todo-in-production`     | Code Quality    | No TODO/FIXME in production code               |
| `component-pascal-case`     | Naming          | React components must use PascalCase names     |
| `barrel-exports-only`       | Architecture    | Modules must re-export from index.ts            |
| `no-direct-state-mutation`  | React           | State must be mutated via setState/updater      |
| `api-route-versioned`       | API             | All API routes must include a version prefix    |
| `error-handling-required`   | Error Handling  | All async functions must have try/catch         |
| `max-nested-callbacks`      | Complexity      | No more than 3 levels of callback nesting      |
| `enforce-barrel-imports`    | Architecture    | Must import from barrel files, not deep paths   |
