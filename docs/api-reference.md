# API Reference — Deerflow Agent Framework Core Engine

This document provides comprehensive API documentation for all public classes,
interfaces, enums, and functions exported by the Deerflow Agent Framework
core engine (`deerflow/core/index.ts`).

---

## Table of Contents

1. [ConstraintEngine API](#constraint-engine-api)
2. [QualityGates API](#quality-gates-api)
3. [ContextManager API](#context-manager-api)
4. [FileSafetyGuard API](#file-safety-guard-api)
5. [AgentValidator API](#agent-validator-api)
6. [DependencyResolver API](#dependency-resolver-api)
7. [Algorithm APIs](#algorithm-apis)
8. [Configuration API](#configuration-api)
9. [MCP Tool APIs](#mcp-tool-apis)

---

## ConstraintEngine API

**Module:** `deerflow/core/constraint-engine`

### Enums

#### `ConstraintSeverity`

Severity levels for constraint violations.

```typescript
enum ConstraintSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}
```

### Interfaces

#### `Constraint`

A single constraint rule that can be registered in the system.

```typescript
interface Constraint {
  readonly id: string;
  readonly description: string;
  readonly severity: ConstraintSeverity;
  enabled: boolean;
  validate(context: ConstraintContext): ConstraintResult;
}
```

#### `ConstraintContext`

Context provided to every constraint validator function.

```typescript
interface ConstraintContext {
  filePath: string;           // Absolute path of the file being checked
  content: string;            // New content of the file
  originalContent?: string;   // Original content before changes
  projectRoot: string;        // Project root directory
  metadata?: Record<string, unknown>; // Arbitrary metadata bag
}
```

#### `ConstraintResult`

Result returned by a constraint validation function.

```typescript
interface ConstraintResult {
  readonly passed: boolean;
  readonly message: string;
  readonly severity: ConstraintSeverity;
  readonly details?: string;
}
```

#### `ConstraintViolation`

A violation record persisted by the registry.

```typescript
interface ConstraintViolation {
  readonly constraintId: string;
  readonly filePath: string;
  readonly message: string;
  readonly severity: ConstraintSeverity;
  readonly timestamp: Date;
  readonly details?: string;
}
```

#### `ValidationSummary`

Aggregated summary of constraint validation for a single file.

```typescript
interface ValidationSummary {
  readonly filePath: string;
  readonly passed: boolean;
  readonly results: ConstraintResult[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}
```

#### `GuardResult`

Result of a guarded file operation.

```typescript
interface GuardResult {
  readonly allowed: boolean;
  readonly summary: ValidationSummary | null;
  readonly reason?: string;
}
```

### Classes

#### `ConstraintRegistry`

Central store for all constraints. Supports registration, lookup, enable/disable,
and bulk validation.

```typescript
class ConstraintRegistry {
  // Registration
  register(constraint: Constraint): void;
  unregister(id: string): boolean;
  get(id: string): Constraint | undefined;
  getAll(): Constraint[];
  getEnabled(): Constraint[];

  // Toggle
  setEnabled(id: string, enabled: boolean): boolean;

  // Validation
  validateAll(context: ConstraintContext): ConstraintResult[];

  // Violation tracking
  recordViolation(violation: ConstraintViolation): void;
  getViolations(severity?: ConstraintSeverity): ConstraintViolation[];
  clearViolations(): void;

  // Metadata
  readonly size: number;
}
```

#### `ConstraintValidator`

High-level validator that checks code changes against all registered constraints.

```typescript
class ConstraintValidator {
  constructor(registry: ConstraintRegistry);

  validateFileChange(
    filePath: string,
    content: string,
    projectRoot: string,
    originalContent?: string,
  ): ValidationSummary;

  validateMultiple(
    changes: Array<{ filePath: string; content: string; originalContent?: string }>,
    projectRoot: string,
  ): ValidationSummary[];
}
```

#### `FileOperationGuard`

Intercepts file operations and validates them against the constraint registry.

```typescript
class FileOperationGuard {
  constructor(registry: ConstraintRegistry, projectRoot: string);

  async guardWrite(filePath: string, content: string): Promise<GuardResult>;
  async guardDelete(filePath: string): Promise<GuardResult>;
}
```

### Built-in Constraints

#### `MockDataConstraint`

Detects and rejects placeholder/mock data patterns.

```typescript
class MockDataConstraint implements Constraint {
  readonly id = 'no-mock-data';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  constructor(
    extraPatterns?: ReadonlyArray<{ pattern: RegExp; label: string }>
  );
  validate(context: ConstraintContext): ConstraintResult;
}
```

Detected patterns: `lorem ipsum`, `TODO implement`, `FIXME`, `HACK`,
`placeholder`, `xxx`, `mock_data`, `example.com`, `asdf`.

#### `InfiniteLoopConstraint`

Detects potentially non-terminating loop constructs.

```typescript
class InfiniteLoopConstraint implements Constraint {
  readonly id = 'no-infinite-loops';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult;
}
```

Detected patterns: `while(true)`, `for(;;)`, `while(1)`, `while(!false)`,
`setInterval` without clear, `do...while(true)`.

#### `ImportConflictConstraint`

Detects duplicate or conflicting import statements.

```typescript
class ImportConflictConstraint implements Constraint {
  readonly id = 'no-import-conflicts';
  readonly severity = ConstraintSeverity.Warning;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult;
}
```

#### `OutputSizeConstraint`

Verifies build output files meet a minimum size threshold.

```typescript
class OutputSizeConstraint implements Constraint {
  readonly id = 'minimum-output-size';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  constructor(minSizeBytes?: number = 100 * 1024);
  validate(context: ConstraintContext): ConstraintResult;
}
```

### Factory Functions

#### `createDefaultConstraintRegistry()`

Creates a `ConstraintRegistry` pre-loaded with all standard Deerflow constraints.

```typescript
function createDefaultConstraintRegistry(): ConstraintRegistry;
```

Returns a registry with: `MockDataConstraint`, `InfiniteLoopConstraint`,
`ImportConflictConstraint`, `OutputSizeConstraint`.

---

## QualityGates API

**Module:** `deerflow/core/quality-gates`

### Interfaces

#### `GateResult`

Result of a single quality gate check.

```typescript
interface GateResult {
  readonly passed: boolean;
  readonly reason: string;
  readonly gateName: string;
  readonly timestamp: Date;
  readonly details?: Record<string, unknown>;
}
```

#### `GateContext`

Context provided to every quality gate.

```typescript
interface GateContext {
  projectRoot: string;                   // Absolute path to project root
  changedFiles: string[];                // Changed files (absolute paths)
  buildOutputDir?: string;               // Build output directory
  fileContents?: Map<string, string>;    // Pre-loaded file contents
}
```

#### `QualityGate`

Interface for implementing custom quality gates.

```typescript
interface QualityGate {
  readonly name: string;
  readonly description: string;
  readonly critical: boolean;
  check(context: GateContext): Promise<GateResult> | GateResult;
}
```

#### `PipelineOptions`

Options for configuring the quality gate pipeline.

```typescript
interface PipelineOptions {
  failFast?: boolean;  // Stop on critical failure (default: true)
}
```

#### `PipelineResult`

Aggregated result of running the full pipeline.

```typescript
interface PipelineResult {
  readonly passed: boolean;
  readonly results: GateResult[];
  readonly totalGates: number;
  readonly gatesRun: number;
  readonly errorCount: number;
}
```

### Classes

#### `TypeScriptQualityGate`

Ensures TypeScript files have no `any` types, unused imports, or ts-ignore directives.

```typescript
class TypeScriptQualityGate implements QualityGate {
  readonly name = 'typescript-quality';
  readonly critical = true;
  async check(context: GateContext): Promise<GateResult>;
}
```

#### `BuildQualityGate`

Verifies build output exists, exceeds minimum size, and contains required assets.

```typescript
class BuildQualityGate implements QualityGate {
  readonly name = 'build-quality';
  readonly critical = true;

  constructor(
    minSizeBytes?: number = 100 * 1024,
    requiredAssets?: string[] = ['index.html', 'main.js']
  );
  async check(context: GateContext): Promise<GateResult>;
}
```

#### `TestCoverageGate`

Enforces minimum code coverage threshold.

```typescript
class TestCoverageGate implements QualityGate {
  readonly name = 'test-coverage';
  readonly critical = true;

  constructor(minimumCoverage?: number = 80);
  async check(context: GateContext): Promise<GateResult>;
}
```

Reads from `coverage/coverage-summary.json` or `coverage-summary.json`.
Soft-passes if no coverage file is found.

#### `SecurityGate`

Scans for hardcoded secrets, eval usage, and innerHTML assignment.

```typescript
class SecurityGate implements QualityGate {
  readonly name = 'security';
  readonly critical = true;
  async check(context: GateContext): Promise<GateResult>;
}
```

#### `DependencyConsistencyGate`

Checks package.json and lock file consistency.

```typescript
class DependencyConsistencyGate implements QualityGate {
  readonly name = 'dependency-consistency';
  readonly critical = false;
  async check(context: GateContext): Promise<GateResult>;
}
```

#### `UIConsistencyGate`

Verifies that relative imports resolve to existing files.

```typescript
class UIConsistencyGate implements QualityGate {
  readonly name = 'ui-consistency';
  readonly critical = true;
  async check(context: GateContext): Promise<GateResult>;
}
```

#### `QualityGatePipeline`

Orchestrates running all quality gates in sequence.

```typescript
class QualityGatePipeline {
  constructor(options?: PipelineOptions);

  addGate(gate: QualityGate): this;       // Chainable
  removeGate(name: string): boolean;
  async run(context: GateContext): Promise<PipelineResult>;

  static createDefault(): QualityGatePipeline;
}
```

---

## ContextManager API

**Module:** `deerflow/core/context-manager`

### Enums

#### `ContextPriority`

```typescript
enum ContextPriority {
  Critical = 0,  // Never evict unless unpinned
  High = 1,
  Medium = 2,
  Low = 3,       // First candidate for eviction
}
```

### Interfaces

#### `ContextItem`

```typescript
interface ContextItem {
  readonly id: string;
  readonly label: string;
  tokenCount: number;
  priority: ContextPriority;
  readonly addedAt: Date;
  content: string;
  pinned: boolean;
}
```

#### `TaskState`

```typescript
interface TaskState {
  taskDescription: string;
  phase: string;
  filesModified: string[];
  startedAt: Date;
  metadata?: Record<string, unknown>;
}
```

#### `ContextCheckpoint`

```typescript
interface ContextCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly createdAt: Date;
  readonly items: ContextItem[];
  readonly taskState: TaskState | null;
  readonly totalTokensUsed: number;
}
```

#### `ContextManagerConfig`

```typescript
interface ContextManagerConfig {
  maxTokens: number;              // Default: 128,000
  summarizationThreshold: number; // Default: 0.8
  persistenceDir: string;         // Default: '.deerflow/context'
  tokensPerChar: number;          // Default: 0.25
}
```

### Classes

#### `ContextManager`

```typescript
class ContextManager {
  constructor(config?: Partial<ContextManagerConfig>);

  // Item management
  addItem(label: string, content: string, priority?: ContextPriority, pinned?: boolean): ContextItem;
  removeItem(id: string): boolean;
  getItem(id: string): ContextItem | undefined;
  getAllItems(): ContextItem[];
  updateItem(id: string, newContent: string): boolean;
  setPinned(id: string, pinned: boolean): boolean;

  // Token management
  readonly totalTokensUsed: number;
  readonly maxTokens: number;
  readonly usageFraction: number;
  readonly shouldSummarize: boolean;
  readonly itemCount: number;

  // Summarization
  autoSummarize(): ContextItem | null;

  // Task state
  startTask(description: string, phase?: string): void;
  setPhase(phase: string): void;
  recordFileModification(filePath: string): void;
  getTaskState(): TaskState | null;
  clearTask(): void;

  // Checkpoints
  saveCheckpoint(label: string): ContextCheckpoint;
  restoreCheckpoint(id: string): boolean;
  listCheckpoints(): ContextCheckpoint[];
  deleteCheckpoint(id: string): boolean;

  // Session persistence
  persistSession(): void;
  restoreSession(): boolean;

  // Reset
  reset(clearCheckpoints?: boolean): void;
}
```

### Utility Functions

#### `estimateTokens()`

```typescript
function estimateTokens(text: string, tokensPerChar?: number = 0.25): number;
```

---

## FileSafetyGuard API

**Module:** `deerflow/core/file-safety-guard`

### Enums

#### `FileOperationType`

```typescript
enum FileOperationType {
  Write = 'write',
  Delete = 'delete',
  Rename = 'rename',
  Copy = 'copy',
  Create = 'create',
}
```

### Interfaces

#### `FileOperationRecord`

```typescript
interface FileOperationRecord {
  readonly id: string;
  readonly type: FileOperationType;
  readonly timestamp: Date;
  readonly filePath: string;
  readonly destinationPath?: string;
  readonly content?: string;
  readonly previousContent?: string;
  readonly backupPath?: string;
  readonly checksum: string;
  readonly previousChecksum?: string;
  readonly success: boolean;
  readonly error?: string;
}
```

#### `GuardedOperationResult`

```typescript
interface GuardedOperationResult {
  readonly success: boolean;
  readonly operationId: string;
  readonly error?: string;
}
```

#### `ScopeRules`

```typescript
interface ScopeRules {
  projectRoot: string;
  allowedPaths?: string[];
  deniedPaths?: string[];
  deniedPatterns?: string[];
  allowHidden?: boolean;
}
```

#### `DeletionConfirmationHandler`

```typescript
type DeletionConfirmationHandler = (
  filePath: string,
  record: FileOperationRecord,
) => boolean | Promise<boolean>;
```

### Classes

#### `ChangeLogger`

Audit trail for all file operations.

```typescript
class ChangeLogger {
  constructor(logDir?: string = '.deerflow/logs');
  log(record: FileOperationRecord): void;
  getRecords(filter?: { type?: FileOperationType; filePath?: string }): FileOperationRecord[];
  getRecentRecords(limit?: number = 50): FileOperationRecord[];
  clear(): void;
  readonly count: number;
}
```

#### `BackupManager`

Creates and manages file backups.

```typescript
class BackupManager {
  constructor(backupDir?: string = '.deerflow/backups');
  createBackup(filePath: string): string | null;
  restoreFromBackup(backupPath: string, targetPath: string): boolean;
  listBackups(): string[];
  deleteBackup(backupPath: string): boolean;
}
```

#### `AtomicWriteOperation`

Performs atomic file writes via temp-file-then-rename.

```typescript
class AtomicWriteOperation {
  static write(filePath: string, content: string, encoding?: BufferEncoding): void;
}
```

#### `ScopeValidator`

Validates file operations stay within project scope.

```typescript
class ScopeValidator {
  constructor(rules: ScopeRules);
  validate(filePath: string): { allowed: boolean; reason?: string };
}
```

#### `DeletionConfirmProtocol`

Wraps deletions with an explicit confirmation step.

```typescript
class DeletionConfirmProtocol {
  constructor(handler?: DeletionConfirmationHandler);
  setHandler(handler: DeletionConfirmationHandler): void;
  async confirm(filePath: string, record: FileOperationRecord): Promise<boolean>;
}
```

#### `RollbackManager`

Reverts file operations using the backup trail.

```typescript
class RollbackManager {
  constructor(changeLogger: ChangeLogger, backupManager: BackupManager);
  async rollback(count?: number): Promise<number>;
  rollbackById(operationId: string): boolean;
}
```

#### `FileSafetyGuard`

Top-level guard orchestrating all file safety subsystems.

```typescript
class FileSafetyGuard {
  constructor(scopeRules: ScopeRules, logDir?: string, backupDir?: string);

  async writeFile(filePath: string, content: string): Promise<GuardedOperationResult>;
  async deleteFile(filePath: string): Promise<GuardedOperationResult>;
  async renameFile(oldPath: string, newPath: string): Promise<GuardedOperationResult>;

  setDeletionHandler(handler: DeletionConfirmationHandler): void;
  readonly logger: ChangeLogger;
  readonly backups: BackupManager;
  readonly rollback: RollbackManager;
}
```

---

## AgentValidator API

**Module:** `deerflow/core/agent-validator`

### Enums

#### `ViolationSeverity`

```typescript
enum ViolationSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}
```

#### `ViolationType`

```typescript
enum ViolationType {
  Hallucination = 'hallucination',
  TokenWaste = 'token-waste',
  IncompleteTask = 'incomplete-task',
  RepeatedMistake = 'repeated-mistake',
  ScopeViolation = 'scope-violation',
  IgnoredConstraints = 'ignored-constraints',
  ExcessiveRetries = 'excessive-retries',
  UnverifiedOutput = 'unverified-output',
}
```

### Interfaces

#### `Violation`

```typescript
interface Violation {
  readonly id: string;
  readonly type: ViolationType;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: string;
  readonly details?: Record<string, unknown>;
}
```

#### `AgentMetrics`

```typescript
interface AgentMetrics {
  accuracy: number;    // 0-100
  efficiency: number;  // 0-100
  completion: number;  // 0-100
  compliance: number;  // 0-100
  overall: number;     // 0-100 (weighted average)
}
```

#### `AgentScore`

```typescript
interface AgentScore {
  readonly metrics: AgentMetrics;
  readonly violations: Violation[];
  readonly evaluatedAt: Date;
  readonly sessionId: string;
}
```

#### `AgentAction`

```typescript
interface AgentAction {
  readonly type: 'code_generation' | 'file_operation' | 'shell_command' | 'explanation' | 'correction';
  readonly content: string;
  readonly timestamp: Date;
  readonly tokensUsed: number;
  readonly filePath?: string;
  readonly success: boolean;
}
```

#### `AgentValidatorConfig`

```typescript
interface AgentValidatorConfig {
  sessionId: string;
  minimumScore: number;      // Default: 70
  maxHallucinations: number; // Default: 0
  maxRetries: number;        // Default: 3
}
```

### Classes

#### `HallucinationDetector`

```typescript
class HallucinationDetector {
  detect(content: string): Array<{ label: string; match: string }>;
  isClean(content: string): boolean;
}
```

#### `TokenEfficiencyScorer`

```typescript
class TokenEfficiencyScorer {
  score(actions: AgentAction[]): number;  // Returns 0-100
}
```

#### `TaskCompletionVerifier`

```typescript
class TaskCompletionVerifier {
  verify(
    taskDescription: string,
    actions: AgentAction[],
    finalOutput?: string,
  ): { completed: boolean; confidence: number; issues: string[] };
}
```

#### `BehaviorChecker`

```typescript
class BehaviorChecker {
  constructor(config: AgentValidatorConfig);
  check(action: AgentAction): Violation[];
  reset(): void;
}
```

#### `ViolationLogger`

```typescript
class ViolationLogger {
  log(violation: Violation): void;
  logAll(violations: Violation[]): void;
  getViolations(filter?: { type?: ViolationType; severity?: ViolationSeverity }): Violation[];
  countBySeverity(): Record<ViolationSeverity, number>;
  countByType(): Record<ViolationType, number>;
  generateReport(): string;
  clear(): void;
  readonly totalViolations: number;
}
```

#### `AgentValidator`

```typescript
class AgentValidator {
  constructor(config?: Partial<AgentValidatorConfig>);

  recordAction(action: AgentAction): void;
  evaluate(taskDescription: string, finalOutput?: string): AgentScore;
  meetsMinimumThreshold(taskDescription: string, finalOutput?: string): boolean;
  getReport(): string;
  getViolations(): Violation[];
  reset(): void;
}
```

---

## DependencyResolver API

**Module:** `deerflow/core/dependency-resolver`

### Interfaces

#### `DependencyEntry`

```typescript
interface DependencyEntry {
  name: string;
  version: string;
  source: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  isDirect: boolean;
}
```

#### `VersionConflict`, `DependencyEdge`, `DependencyNode`, `VulnerabilityInfo`, `LockFileIssue`, `UpgradeRecommendation`

```typescript
interface VersionConflict {
  packageName: string;
  versions: Array<{ version: string; source: string }>;
  severity: 'error' | 'warning';
  resolution?: string;
}

interface DependencyEdge {
  from: string; to: string; version: string;
  type: 'production' | 'dev' | 'peer' | 'optional';
}

interface DependencyNode {
  name: string; version: string;
  edges: DependencyEdge[]; depth: number;
}

interface VulnerabilityInfo {
  packageName: string; installedVersion: string;
  vulnerableRange: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string; url?: string; patchedIn?: string;
}

interface LockFileIssue {
  readonly type: 'missing' | 'mismatch' | 'corrupt' | 'outdated';
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

interface UpgradeRecommendation {
  packageName: string; currentVersion: string;
  recommendedVersion: string; reason: string;
  risk: 'low' | 'medium' | 'high';
  breakingChange: boolean;
}
```

#### `ResolutionResult`

```typescript
interface ResolutionResult {
  conflicts: VersionConflict[];
  vulnerabilities: VulnerabilityInfo[];
  lockFileIssues: LockFileIssue[];
  upgrades: UpgradeRecommendation[];
  cycleDetected: boolean;
  cyclePaths: string[][];
  summary: string;
}
```

### Functions

#### `compareVersions()`

```typescript
function compareVersions(a: string, b: string): number;
// Returns negative if a < b, 0 if equal, positive if a > b
```

#### `satisfiesRange()`

```typescript
function satisfiesRange(installedVersion: string, range: string): boolean;
// Supports: exact, ^, ~, >=, <=, >, <
```

### Classes

#### `ConflictDetector`

```typescript
class ConflictDetector {
  detect(pkg: PackageJson): VersionConflict[];
}
```

#### `DependencyGraph`

```typescript
class DependencyGraph {
  getNode(name: string): DependencyNode | undefined;
  getEdges(name: string): DependencyEdge[];
  getAllNodeNames(): string[];
  addNode(name: string, version: string): DependencyNode;
  addEdge(from: string, to: string, version: string, type?: DependencyEdge['type']): void;
  detectCycles(): string[][];
  readonly size: number;

  static fromPackageJson(pkg: PackageJson, projectName?: string): DependencyGraph;
}
```

#### `CompatibilityChecker`

```typescript
class CompatibilityChecker {
  constructor(nodeVersion?: string);
  check(pkg: PackageJson): string[];
  checkPeerDeps(peerDeps: Record<string, string>, installedDeps: Record<string, string>): string[];
}
```

#### `SecurityAuditor`

```typescript
class SecurityAuditor {
  addAdvisory(advisory: VulnerabilityInfo): void;
  audit(pkg: PackageJson): VulnerabilityInfo[];
  parseNpmAuditOutput(jsonOutput: string): VulnerabilityInfo[];
}
```

#### `LockFileValidator`

```typescript
class LockFileValidator {
  validate(projectRoot: string, pkg: PackageJson): LockFileIssue[];
}
```

#### `UpgradeAdvisor`

```typescript
class UpgradeAdvisor {
  setLatestVersion(packageName: string, version: string): void;
  loadFromNpmView(jsonOutput: string): void;
  suggest(pkg: PackageJson): UpgradeRecommendation[];
}
```

#### `DependencyResolver`

```typescript
class DependencyResolver {
  constructor(nodeVersion?: string);
  resolve(projectRoot: string): ResolutionResult;

  readonly conflicts: ConflictDetector;
  readonly security: SecurityAuditor;
  readonly lockFile: LockFileValidator;
  readonly compatibility: CompatibilityChecker;
  readonly upgrades: UpgradeAdvisor;
}
```

---

## Algorithm APIs

**Module:** `deerflow/algorithms`

All algorithm modules are re-exported from `deerflow/algorithms/index.ts`:

### Constraint Propagation

Provides constraint propagation algorithms used by the constraint engine
to ensure constraint satisfaction across dependent modules.

### Dependency Graph

Graph construction and traversal algorithms used by `DependencyResolver`:
- BFS-based depth calculation
- DFS-based cycle detection

### Quality Scoring

Multi-factor quality assessment used to compute composite quality scores
for the `AgentValidator` and quality gate reports.

### Risk Assessment

Change risk analysis based on file modification scope, dependency impact,
and historical failure patterns.

---

## Configuration API

**File:** `deerflow.config.yaml`

The configuration is loaded and validated at framework initialization. All
sections are optional with sensible defaults:

| Section      | Description                              |
|-------------|------------------------------------------|
| `quality`   | Test coverage, complexity, size limits    |
| `security`  | Audit, secrets, CSP, rate limiting        |
| `context`   | Token limits, checkpoints, auto-save      |
| `workflow`  | Phase definitions, timeouts, parallelism  |
| `penalty`   | Warning limits, escalation actions        |
| `mcp`       | Server list, timeouts, retry counts       |
| `skills`    | Required/optional skills, timeouts        |
| `reporting` | Output directory, formats, retention      |

Configuration can be overridden via environment variables (see Getting Started
guide for the full list).

---

## MCP Tool APIs

**Registry:** `deerflow/mcp/tools-registry.json`

Deerflow exposes the following tools through MCP servers. Each tool has a typed
JSON schema for parameters and usage rules (confirmation, rate limits).

### Filesystem Tools

| Tool            | Description                               | Modifies Files | Confirmation |
|-----------------|-------------------------------------------|----------------|--------------|
| `read_file`     | Read file contents with optional offset/limit | No           | No           |
| `write_file`    | Write content to a file                   | Yes           | Yes          |
| `list_directory`| List files/dirs with glob filtering       | No            | No           |

### Search Tools

| Tool           | Description                               | Modifies Files | Confirmation |
|----------------|-------------------------------------------|----------------|--------------|
| `search_code`  | Regex-based codebase search via ripgrep   | No            | No           |

### Git Tools

| Tool         | Description                               | Modifies Files | Confirmation |
|--------------|-------------------------------------------|----------------|--------------|
| `git_diff`   | Show diff between refs or working tree    | No            | No           |
| `git_log`    | Show commit history with filtering        | No            | No           |
| `git_blame`  | Show per-line author information          | No            | No           |

### Testing Tools

| Tool         | Description                               | Modifies Files | Confirmation |
|--------------|-------------------------------------------|----------------|--------------|
| `run_tests`  | Execute test suites with coverage          | No            | No           |

### Validation Tools

| Tool              | Description                               | Modifies Files | Confirmation |
|-------------------|-------------------------------------------|----------------|--------------|
| `run_validation`  | Run quality gate suite                    | If `fix=true` | No           |

### Documentation Tools

| Tool            | Description                               | Modifies Files | Confirmation |
|-----------------|-------------------------------------------|----------------|--------------|
| `generate_docs` | Generate API reference, README, changelog | Yes           | Yes          |

### Security Tools

| Tool             | Description                               | Modifies Files | Confirmation |
|------------------|-------------------------------------------|----------------|--------------|
| `security_audit` | Dependency and secret scanning            | No            | No           |

### Performance Tools

| Tool              | Description                               | Modifies Files | Confirmation |
|-------------------|-------------------------------------------|----------------|--------------|
| `analyze_bundle`  | Bundle size analysis and regression check | No            | No           |

### Context Tools

| Tool              | Description                               | Modifies Files | Confirmation |
|-------------------|-------------------------------------------|----------------|--------------|
| `update_context`  | Update deerflow/context.md sections       | Yes           | No           |
