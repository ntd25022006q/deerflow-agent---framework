# Deerflow Agent Framework — Architecture

This document provides a comprehensive overview of the Deerflow Agent Framework's
architecture, including component relationships, data flow, integration points,
extension mechanisms, design rationale, performance characteristics, and
security architecture.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Descriptions](#component-descriptions)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Integration Points](#integration-points)
5. [Extension Points](#extension-points)
6. [Design Decisions and Rationale](#design-decisions-and-rationale)
7. [Performance Considerations](#performance-considerations)
8. [Security Architecture](#security-architecture)

---

## High-Level Architecture

The Deerflow framework is organized as a layered architecture with clear separation
between the core engine, domain-specific modules, integration adapters, and the
AI agent interface.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI AGENT LAYER                                     │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────────────┐  │
│  │ Cursor  │  │  Cline  │  │ Windsurf │  │Copilot │  │ Continue / Aider │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └───┬────┘  └───────┬──────────┘  │
│       │            │            │            │               │              │
├───────┴────────────┴────────────┴────────────┴───────────────┴──────────────┤
│                      INTEGRATION LAYER                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐     │
│  │   MCP Server Bus     │  │        Rules Engine (Markdown)           │     │
│  │  ┌────┐ ┌────┐      │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │     │
│  │  │ fs │ │ git│ ...  │  │  │ 00   │ │ 01   │ │ 02   │ │ 03   │.. │     │
│  │  └────┘ └────┘      │  │  │ fund │ │ file │ │ code │ │ deps │   │     │
│  └──────────┬───────────┘  └────────────────┬─────────────────────────┘     │
├─────────────┴───────────────────────────────┴───────────────────────────────┤
│                         CORE ENGINE LAYER                                    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Constraint   │  │  Quality    │  │   Context      │  │   File Safety  │  │
│  │  Engine      │  │  Gates      │  │   Manager      │  │   Guard        │  │
│  │              │  │             │  │                │  │                │  │
│  │ ┌──────────┐ │  │ ┌─────────┐ │  │ ┌────────────┐ │  │ ┌────────────┐ │  │
│  │ │ Registry │ │  │ │Pipeline │ │  │ │ Token Mgmt │ │  │ │ Scope      │ │  │
│  │ │Validator │ │  │ │ TS Gate │ │  │ │Checkpoint │ │  │ │ Backup     │ │  │
│  │ │Guard     │ │  │ │Build Gt │ │  │ │Task State │ │  │ │ Atomic Wr  │ │  │
│  │ └──────────┘ │  │ │Sec Gate │ │  │ │Eviction   │ │  │ │ Del Confirm│ │  │
│  └──────┬──────┘  │ │Cov Gate │ │  │ │Summarize  │ │  │ │ Rollback   │ │  │
│         │         │ └─────────┘ │  │ └────────────┘ │  │ └────────────┘ │  │
│         │         └──────┬──────┘  └───────┬────────┘  └───────┬────────┘  │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌───────┴────────┐  ┌──────┴────────┐  │
│  │  Dependency  │  │   Agent     │  │   Algorithms   │  │   Reporting   │  │
│  │  Resolver    │  │  Validator  │  │                │  │               │  │
│  │              │  │             │  │ ┌────────────┐ │  │               │  │
│  │ ┌──────────┐ │  │ ┌─────────┐ │  │ │ Constraint │ │  │               │  │
│  │ │Conflict  │ │  │ │Hallucin.│ │  │ │ Propagation│ │  │               │  │
│  │ │Graph     │ │  │ │Effic.   │ │  │ │ Dep Graph  │ │  │               │  │
│  │ │Compat.   │ │  │ │Complet. │ │  │ │ Quality    │ │  │               │  │
│  │ │Security  │ │  │ │Behavior │ │  │ │ Scoring    │ │  │               │  │
│  │ │Lock File │ │  │ │Violations│ │  │ │ Risk       │ │  │               │  │
│  │ │Upgrade   │ │  │ │Score    │ │  │ │ Assessment │ │  │               │  │
│  │ └──────────┘ │  │ └─────────┘ │  │ └────────────┘ │  │               │  │
│  └──────────────┘  └─────────────┘  └────────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                       PERSISTENCE LAYER                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Filesystem│  │  Git     │  │ SQLite   │  │  Backup  │  │  Reports     │  │
│  │ (.deerflow│  │  (.git/) │  │ (opt.)   │  │ (.deerflow│  │ (deerflow/  │  │
│  │  /)       │  │          │  │          │  │  /backups)│  │  reports/)   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Summary

| Layer              | Responsibility                                            |
|--------------------|-----------------------------------------------------------|
| AI Agent Layer     | External AI coding agents that consume the framework       |
| Integration Layer  | MCP protocol, rules parsing, and agent communication      |
| Core Engine Layer  | Constraint enforcement, quality gates, safety, validation  |
| Persistence Layer  | File system, git integration, backups, and reporting       |

---

## Component Descriptions

### ConstraintEngine (`deerflow/core/constraint-engine.ts`)

The ConstraintEngine is the foundation of the framework's safety guarantees.
It provides a registry-based system for defining, registering, and enforcing
constraints on code changes and file operations.

**Key Classes:**

- **`ConstraintRegistry`** — Central store for all constraints. Supports
  registration, enable/disable toggling, and bulk validation.
- **`ConstraintValidator`** — High-level validator that checks file changes
  against all registered constraints with summary reporting.
- **`FileOperationGuard`** — Intercepts file writes and deletes, validating
  content against the registry before allowing the operation.

**Built-in Constraints:**

| Constraint ID          | Description                                       | Severity |
|------------------------|---------------------------------------------------|----------|
| `no-mock-data`         | Detects placeholder/mock data patterns            | Error    |
| `no-infinite-loops`    | Detects non-terminating loop constructs           | Error    |
| `no-import-conflicts`  | Detects duplicate/conflicting imports             | Warning  |
| `minimum-output-size`  | Verifies build output meets minimum size (100 KB) | Error    |

### QualityGates (`deerflow/core/quality-gates.ts`)

The QualityGates module implements a pipeline of checks that every code change
must pass before being committed. Each gate is independently testable and the
pipeline supports fast-fail mode.

**Gate Pipeline:**

```
  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
  │  TypeScript   │────>│    Build      │────>│    Test       │
  │  Quality      │     │    Quality    │     │    Coverage   │
  └───────────────┘     └───────────────┘     └───────┬───────┘
                                                      │
  ┌───────────────┐     ┌───────────────┐     ┌───────┴───────┐
  │    UI         │<────│  Dependency   │<────│   Security    │
  │  Consistency  │     │  Consistency  │     │               │
  └───────────────┘     └───────────────┘     └───────────────┘
```

| Gate Name             | Critical | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| `typescript-quality`  | Yes      | No `any`, no `@ts-ignore`, no unused imports      |
| `build-quality`       | Yes      | Build exists, > 100 KB, required assets present  |
| `test-coverage`       | Yes      | Coverage meets minimum threshold (default 80%)    |
| `security`            | Yes      | No hardcoded secrets, no `eval()`, no `innerHTML` |
| `dependency-consistency` | No    | package.json and lock file are in sync           |
| `ui-consistency`      | Yes      | All relative imports resolve to existing files    |

### ContextManager (`deerflow/core/context-manager.ts`)

Manages the agent's context window with priority-based eviction, checkpointing,
auto-summarization, and session persistence.

**Key Features:**
- **Token tracking** — Estimates token usage per item (configurable ratio)
- **Priority-based eviction** — Critical/High/Medium/Low priority levels with
  oldest-first eviction within each priority
- **Pinned items** — Protected from eviction (e.g., task descriptions)
- **Auto-summarization** — Condenses low-priority items when approaching capacity
- **Checkpoints** — Save and restore full context state at any point
- **Task state** — Track task phase, modified files, and metadata
- **Session persistence** — Save and restore across agent restarts

### FileSafetyGuard (`deerflow/core/file-safety-guard.ts`)

Provides comprehensive safety guarantees for all file operations:

- **Scope validation** — Ensures operations stay within project boundaries
- **Atomic writes** — Write-to-temp-then-rename to prevent partial writes
- **Backup-before-modify** — Automatic backups of files before changes
- **Deletion confirmation** — Explicit approval required for deletions
- **Change logging** — Complete audit trail of all file operations
- **Rollback** — Revert any operation using the backup trail

### AgentValidator (`deerflow/core/agent-validator.ts`)

Monitors and scores AI agent behavior during code-generation sessions:

- **Hallucination detection** — Heuristic patterns for fabricated information
- **Token efficiency scoring** — Measures waste from repetition, empty content
- **Task completion verification** — Checks for test steps and success indicators
- **Behavior checking** — Detects repeated mistakes, excessive retries
- **Composite scoring** — Weighted average of accuracy, efficiency, completion,
  compliance producing a 0-100 `AgentScore`

### DependencyResolver (`deerflow/core/dependency-resolver.ts`)

Comprehensive dependency analysis and conflict resolution:

- **Conflict detection** — Finds packages at different versions across sections
- **Dependency graph** — Builds and queries the dependency tree with cycle detection
- **Compatibility checking** — Validates engine requirements and peer dependencies
- **Security auditing** — Checks against known vulnerability databases
- **Lock file validation** — Verifies integrity of package-lock.json/yarn.lock
- **Upgrade advisory** — Suggests safe upgrades with risk assessment

### Algorithms (`deerflow/algorithms/`)

Supporting algorithms used by core modules:

- **Constraint propagation** — Spreads constraint satisfaction across modules
- **Dependency graph** — Graph construction and traversal algorithms
- **Quality scoring** — Multi-factor quality assessment calculations
- **Risk assessment** — Change risk analysis based on multiple factors

---

## Data Flow Diagrams

### File Write Flow

```
Agent requests file write
         │
         ▼
┌──────────────────┐
│  FileSafetyGuard │
│  .writeFile()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ ScopeValidator   │────>│ Path within project? │
│                  │     │  No ──> DENIED        │
└────────┬─────────┘     └──────────────────────┘
         │ Yes
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ BackupManager    │────>│ Create backup of      │
│                  │     │ existing file (if any)│
└────────┬─────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ ConstraintEngine │────>│ Validate content      │
│ (via Guard)      │     │ against all rules     │
└────────┬─────────┘     │  Fail ──> DENIED      │
         │ Pass          └──────────────────────┘
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ AtomicWrite      │────>│ Write to temp file    │
│ Operation        │     │ Rename to target      │
└────────┬─────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────┐
│ ChangeLogger     │────> Record operation in audit log
└────────┬─────────┘
         │
         ▼
    SUCCESS — Return operation ID
```

### Quality Gate Pipeline Flow

```
Code change submitted
         │
         ▼
┌──────────────────────────────────────┐
│      QualityGatePipeline.run()       │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ TypeScriptQualityGate.check()   │ │
│  │  - No `any` types               │ │
│  │  - No @ts-ignore                │ │
│  │  - No unused imports            │ │
│  │  FAIL? ──> short-circuit (fail) │ │
│  └─────────────┬───────────────────┘ │
│                │ PASS                │
│  ┌─────────────▼───────────────────┐ │
│  │ BuildQualityGate.check()        │ │
│  │  - Build dir exists             │ │
│  │  - Size >= 100 KB               │ │
│  │  - Required assets present      │ │
│  │  FAIL? ──> short-circuit (fail) │ │
│  └─────────────┬───────────────────┘ │
│                │ PASS                │
│  ┌─────────────▼───────────────────┐ │
│  │ TestCoverageGate.check()        │ │
│  │  - Coverage >= 80%              │ │
│  │  FAIL? ──> short-circuit (fail) │ │
│  └─────────────┬───────────────────┘ │
│                │ PASS                │
│  ┌─────────────▼───────────────────┐ │
│  │ SecurityGate.check()            │ │
│  │  - No secrets                   │ │
│  │  - No eval()                    │ │
│  │  - No innerHTML                 │ │
│  │  FAIL? ──> short-circuit (fail) │ │
│  └─────────────┬───────────────────┘ │
│                │ PASS                │
│  ┌─────────────▼───────────────────┐ │
│  │ DependencyConsistencyGate       │ │
│  │  - Lock file exists             │ │
│  │  - No duplicate deps            │ │
│  │  (non-critical: warns only)    │ │
│  └─────────────┬───────────────────┘ │
│                │                     │
│  ┌─────────────▼───────────────────┐ │
│  │ UIConsistencyGate.check()       │ │
│  │  - All imports resolve          │ │
│  │  FAIL? ──> short-circuit (fail) │ │
│  └─────────────┬───────────────────┘ │
│                │                     │
└────────────────┼─────────────────────┘
                 │
                 ▼
          PipelineResult
          ┌──────────┐
          │ passed?  │
          │ results  │
          │ errorCnt │
          └──────────┘
```

### Agent Validation Flow

```
Agent performs action
         │
         ▼
┌──────────────────────────┐
│   AgentValidator         │
│   .recordAction()        │
└────────┬─────────────────┘
         │
    ┌────┴──────────────────────────────────┐
    │                                        │
    ▼                                        ▼
┌────────────────┐                 ┌────────────────────┐
│Hallucination   │                 │BehaviorChecker     │
│Detector        │                 │.check()            │
│.detect()       │                 │  - Repeated error? │
│  - Fabricated  │                 │  - Excessive retry?│
│    API refs    │                 │  - Unverified out? │
│  - Fake pkg    │                 └────────┬───────────┘
│  - Version #   │                          │
│  - Overclaim   │                          │
└────────┬───────┘                          │
         │                                  │
         ▼                                  ▼
┌──────────────────────────────────────────────────┐
│              ViolationLogger                      │
│  .log() — records all detected violations         │
└────────┬─────────────────────────────────────────┘
         │
         │  (on evaluate())
         ▼
┌──────────────────────────────────────────────────┐
│            Composite Scoring                      │
│                                                   │
│  accuracy  ──── 30% ──┐                          │
│  efficiency ─── 20% ──┼──> overall (0-100)      │
│  completion ─── 30% ──┤                          │
│  compliance ─── 20% ──┘                          │
│                                                   │
│  Returns: AgentScore { metrics, violations, ... } │
└──────────────────────────────────────────────────┘
```

---

## Integration Points

### MCP (Model Context Protocol) Integration

Deerflow communicates with AI agents via MCP servers. Each server exposes a
set of typed tools that agents can invoke.

**Available MCP Servers:**

| Server       | Purpose                                      | Key Tools                  |
|-------------|----------------------------------------------|----------------------------|
| `filesystem`| File read/write/list operations               | `read_file`, `write_file`  |
| `search`    | Codebase-wide search                         | `search_code`, `list_dir`  |
| `git`       | Git operations                               | `git_diff`, `git_log`      |
| `testing`   | Test execution and coverage                  | `run_tests`                |
| `validation`| Quality gate execution                       | `run_validation`           |
| `documentation` | Documentation generation                 | `generate_docs`            |
| `security`  | Security auditing                            | `security_audit`           |
| `performance`| Bundle analysis and profiling               | `analyze_bundle`           |

### Git Hook Integration

Deerflow installs git hooks via `scripts/install-hooks.sh`:

- **`pre-commit`** — Runs `ConstraintValidator` + `TypeScriptQualityGate` + ESLint
- **`pre-push`** — Runs full `QualityGatePipeline` + coverage check + security audit
- **`commit-msg`** — Validates conventional commit format

### CI/CD Integration

The `scripts/validate.sh` script provides a CI-ready interface:

```bash
# Run all validations (returns exit code for CI)
bash scripts/validate.sh --ci

# Output JSON for CI parsers
bash scripts/validate.sh --format json

# Run specific gates
bash scripts/validate.sh --gates typescript,security
```

---

## Extension Points

### Custom Constraints

Implement the `Constraint` interface to add project-specific rules:

```typescript
import { Constraint, ConstraintContext, ConstraintResult } from './core';

class NoConsoleLogConstraint implements Constraint {
  readonly id = 'no-console-log';
  readonly description = 'Prohibits console.log in production code';
  readonly severity = ConstraintSeverity.Warning;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    if (/\bconsole\.log\b/.test(context.content)) {
      return { passed: false, message: 'console.log found', severity: this.severity };
    }
    return { passed: true, message: 'No console.log', severity: this.severity };
  }
}
```

### Custom Quality Gates

Implement the `QualityGate` interface:

```typescript
class CustomQualityGate implements QualityGate {
  readonly name = 'my-gate';
  readonly description = 'My custom quality check';
  readonly critical = false;

  async check(context: GateContext): Promise<GateResult> {
    // Custom validation logic
    return { passed: true, gateName: this.name, reason: 'OK', timestamp: new Date() };
  }
}
```

### Custom MCP Servers

Create standalone MCP servers that follow the Deerflow MCP protocol:

```typescript
// my-mcp-server/index.ts
import { McpServer } from '@deerflow/mcp-sdk';

const server = new McpServer('my-custom-server');
server.tool('my_tool', { /* schema */ }, async (params) => {
  // Custom tool implementation
  return { content: [{ type: 'text', text: 'Result' }] };
});
server.start();
```

### Custom Skills

Define new agent skills in `deerflow/skills/`:

```markdown
---
name: my-custom-skill
description: My specialized capability
timeout: 60
requires_confirmation: false
---

# My Custom Skill

Instructions for the AI agent on how to perform this skill...
```

### Custom Algorithms

Add algorithms to `deerflow/algorithms/` and export from `index.ts`:

```typescript
export class MyCustomAlgorithm {
  analyze(data: InputType): ResultType {
    // Custom analysis logic
  }
}
```

---

## Design Decisions and Rationale

### Decision 1: TypeScript as the Core Language

**Rationale:** TypeScript provides static type safety at the core engine level,
catching bugs at compile time rather than at runtime when agents depend on
correct behavior. The type system also serves as living documentation for the
framework's public API.

### Decision 2: Registry Pattern for Constraints

**Rationale:** A registry-based approach allows constraints to be added, removed,
enabled, and disabled at runtime without modifying core code. This is essential
for project-specific customization and for agents that need to toggle constraints
based on task context.

### Decision 3: Fail-Fast Pipeline by Default

**Rationale:** When a critical quality gate fails, subsequent gates are skipped.
This reduces wasted computation in CI pipelines and provides immediate feedback
to agents. Non-critical gates continue to accumulate warnings for a comprehensive
report.

### Decision 4: Regex-Based Pattern Matching

**Rationale:** Regex patterns provide a fast, dependency-free way to detect common
code quality issues without requiring a full AST parser. This keeps the framework
lightweight and fast. For deeper analysis, the framework integrates with external
tools (TypeScript compiler, ESLint) through MCP servers.

### Decision 5: Atomic File Operations

**Rationale:** Writing to a temporary file and then renaming ensures that files
are never in a partial/corrupt state, even if the process crashes mid-write. This
is a standard Unix technique that provides strong consistency guarantees.

### Decision 6: Priority-Based Context Eviction

**Rationale:** When the context window fills up, evicting low-priority items first
preserves critical information (task descriptions, constraints) while reclaiming
space for new work. This is analogous to CPU cache eviction policies.

### Decision 7: Local-Only Processing

**Rationale:** All framework processing happens locally with no external network
calls. This ensures zero latency for constraint checks, protects sensitive code
from leaving the machine, and works in air-gapped environments.

### Decision 8: Markdown-Based Rules

**Rationale:** Rules defined in Markdown are human-readable, easy to diff in pull
requests, and can be consumed by any AI agent regardless of its native format
support. This is more universal than JSON, YAML, or code-based rules.

---

## Performance Considerations

### Constraint Engine Performance

The constraint engine uses pre-compiled regex patterns and avoids file system
operations during validation. Each constraint check runs in O(n) time where n
is the content length. For a typical 500-line TypeScript file:

| Operation                    | Time (approx.) |
|------------------------------|----------------|
| Mock data detection          | < 1 ms         |
| Infinite loop detection      | < 1 ms         |
| Import conflict detection    | < 2 ms         |
| Full constraint validation    | < 5 ms         |

### Quality Gate Pipeline Performance

The pipeline is designed for sub-second total execution on typical projects:

| Gate                      | Time (approx.) | Notes                        |
|---------------------------|----------------|------------------------------|
| TypeScript quality        | < 500 ms       | Regex-based, no tsc required |
| Build quality             | < 100 ms       | File stat only               |
| Test coverage             | < 200 ms       | JSON parse of existing report|
| Security scan             | < 300 ms       | Regex patterns on file contents|
| Dependency consistency    | < 100 ms       | package.json parse           |
| UI consistency            | < 200 ms       | Import resolution check      |
| **Total (all gates)**     | **< 1.5 s**    | With fail-fast: often faster  |

### Context Manager Performance

The context manager uses in-memory Maps for O(1) item lookup and maintains
a running total of token usage to avoid recalculating on every check:

| Operation              | Time   | Notes                     |
|------------------------|--------|---------------------------|
| Add item               | O(1)   | Amortized (includes eviction) |
| Remove item            | O(1)   | Map lookup                |
| Get item               | O(1)   | Map lookup                |
| Save checkpoint        | O(n)   | Serializes all items      |
| Restore checkpoint     | O(n)   | Deserializes all items    |
| Auto-summarize         | O(n)   | Processes evictable items |

### Memory Usage

| Component           | Typical Usage   | Maximum Usage    |
|---------------------|-----------------|------------------|
| ConstraintRegistry  | < 1 MB          | 5 MB             |
| ContextManager      | < 10 MB         | 50 MB (128K ctx) |
| FileSafetyGuard     | < 5 MB          | 20 MB            |
| DependencyGraph     | < 2 MB          | 10 MB            |

---

## Security Architecture

### Defense in Depth

Deerflow implements a multi-layered security model:

```
Layer 1: Scope Validation
  └── FileSafetyGuard.ScopeValidator
      ├── Project root boundary enforcement
      ├── Denied paths/patterns
      └── Hidden file protection

Layer 2: Constraint Enforcement
  └── ConstraintEngine
      ├── Mock data detection
      ├── Infinite loop prevention
      ├── Import conflict detection
      └── Output size verification

Layer 3: Quality Gate Pipeline
  └── QualityGatePipeline
      ├── Security gate (secrets, eval, innerHTML)
      ├── TypeScript strict mode
      └── Dependency vulnerability audit

Layer 4: Agent Behavior Monitoring
  └── AgentValidator
      ├── Hallucination detection
      ├── Scope violation detection
      └── Behavioral anomaly detection

Layer 5: Audit & Recovery
  └── ChangeLogger + BackupManager + RollbackManager
      ├── Complete operation audit trail
      ├── Automatic backups before modifications
      └── Full rollback capability
```

### File Access Control

The `ScopeValidator` enforces a whitelist-based access control model:

1. **Project root boundary** — All operations must occur within the configured
   project root directory. Operations outside this boundary are denied.
2. **Denied paths** — Specific paths (e.g., `node_modules`, `.git`) can be
   explicitly denied, even if they're within the project root.
3. **Denied patterns** — Glob patterns (e.g., `.env`, `*.secret`) can block
   access to sensitive files regardless of their location.
4. **Hidden file protection** — Files and directories starting with `.` are
   denied by default (configurable).

### Secret Detection

The `SecurityGate` uses a comprehensive set of regex patterns to detect:

- Hardcoded passwords and passphrases
- API keys and access tokens
- Private key material (RSA, EC, DSA)
- AWS access keys (AKIA/ASIA prefixes)
- GitHub personal access tokens (ghp_ prefix)
- Generic secrets and tokens

### Operation Audit Trail

Every file operation is logged with:

- Unique operation ID
- Operation type (write, delete, rename, copy)
- Timestamp
- File path and destination
- Content checksums (SHA-256)
- Backup path reference
- Success/failure status
- Error messages (if applicable)

This audit trail is persisted to disk in JSONL format for external analysis
and compliance reporting.

### Backup and Rollback

The `BackupManager` creates timestamped backups before every file modification.
The `RollbackManager` can reverse any operation using the backup trail:

- **Writes** — Restored from backup or deleted if newly created
- **Deletes** — Restored from backup
- **Renames** — Reversed (destination renamed back to source)
- **Copies** — Copy destination deleted

Rollback operations execute in reverse chronological order to maintain
consistency across multi-file changes.

### Principle of Least Privilege

The framework follows the principle of least privilege at every level:

- MCP servers only expose tools explicitly listed in `tools-registry.json`
- Git MCP server denies destructive commands (push, force-push, reset --hard)
- File system MCP server requires confirmation for writes and denies deletes
- Deletion operations require explicit confirmation by default
- All deny-defaults are configurable but security-first
