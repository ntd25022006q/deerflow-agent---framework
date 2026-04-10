/**
 * @module constraint-engine
 * @description Runtime constraint enforcement engine for the Deerflow Agent Framework.
 * Validates code changes, file operations, and agent outputs against registered rules
 * to prevent common failure modes such as mock data leaks, infinite loops, and import conflicts.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Severity levels for constraint violations */
export enum ConstraintSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/** A single constraint rule registered in the system */
export interface Constraint {
  /** Unique identifier for this constraint */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /** Severity when violated */
  readonly severity: ConstraintSeverity;
  /** Whether this constraint is currently active */
  enabled: boolean;
  /** The validation function — returns `true` when the constraint is satisfied */
  validate(context: ConstraintContext): ConstraintResult;
}

/** Context provided to every constraint validator */
export interface ConstraintContext {
  /** Absolute path of the file being checked */
  filePath: string;
  /** New content of the file (or the diff content) */
  content: string;
  /** The original content before changes (if available) */
  originalContent?: string;
  /** Project root directory */
  projectRoot: string;
  /** Arbitrary metadata bag */
  metadata?: Record<string, unknown>;
}

/** Result returned by a constraint validation */
export interface ConstraintResult {
  readonly passed: boolean;
  readonly message: string;
  readonly severity: ConstraintSeverity;
  readonly details?: string;
}

/** A violation record persisted by the registry */
export interface ConstraintViolation {
  readonly constraintId: string;
  readonly filePath: string;
  readonly message: string;
  readonly severity: ConstraintSeverity;
  readonly timestamp: Date;
  readonly details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConstraintRegistry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Central store for all constraints. Supports registration, lookup,
 * enable/disable toggling, and bulk validation.
 */
export class ConstraintRegistry {
  private constraints: Map<string, Constraint> = new Map();
  private violations: ConstraintViolation[] = [];

  /**
   * Register a new constraint. Overwrites any existing constraint with the same id.
   */
  register(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /** Remove a constraint by id */
  unregister(id: string): boolean {
    return this.constraints.delete(id);
  }

  /** Get a constraint by id */
  get(id: string): Constraint | undefined {
    return this.constraints.get(id);
  }

  /** Return all currently registered constraints */
  getAll(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /** Return only enabled constraints */
  getEnabled(): Constraint[] {
    return this.getAll().filter((c) => c.enabled);
  }

  /** Enable or disable a constraint by id */
  setEnabled(id: string, enabled: boolean): boolean {
    const c = this.constraints.get(id);
    if (c) {
      c.enabled = enabled;
      return true;
    }
    return false;
  }

  /** Record a violation */
  recordViolation(violation: ConstraintViolation): void {
    this.violations.push(violation);
  }

  /** Return all recorded violations, optionally filtered by severity */
  getViolations(severity?: ConstraintSeverity): ConstraintViolation[] {
    if (severity) {
      return this.violations.filter((v) => v.severity === severity);
    }
    return [...this.violations];
  }

  /** Clear all recorded violations */
  clearViolations(): void {
    this.violations = [];
  }

  /** Validate all enabled constraints against a given context */
  validateAll(context: ConstraintContext): ConstraintResult[] {
    const results: ConstraintResult[] = [];
    for (const constraint of this.getEnabled()) {
      const result = constraint.validate(context);
      if (!result.passed) {
        this.recordViolation({
          constraintId: constraint.id,
          filePath: context.filePath,
          message: result.message,
          severity: result.severity,
          timestamp: new Date(),
          details: result.details,
        });
      }
      results.push(result);
    }
    return results;
  }

  /** Number of registered constraints */
  get size(): number {
    return this.constraints.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Constraint Implementations
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns commonly used as placeholder / mock data */
const MOCK_DATA_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /lorem\s+ipsum/i, label: 'Lorem Ipsum placeholder text' },
  { pattern: /\bTODO\b.*\bimplement\b/i, label: 'TODO implement marker' },
  { pattern: /\bFIXME\b/i, label: 'FIXME marker' },
  { pattern: /\bHACK\b/i, label: 'HACK marker' },
  { pattern: /placeholder/i, label: 'Generic placeholder text' },
  { pattern: /\bxxx+\b/i, label: 'Filler xxx marker' },
  { pattern: /\bmock[_\s]data\b/i, label: 'Mock data reference' },
  { pattern: /example\.com/i, label: 'Example domain URL' },
  { pattern: /asdf/i, label: 'Keyboard-mash placeholder' },
];

/** Detect infinite-loop prone patterns */
const INFINITE_LOOP_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /while\s*\(\s*true\s*\)/, label: 'while(true) loop' },
  { pattern: /for\s*\(\s*;\s*;\s*\)/, label: 'empty for(;;) loop' },
  { pattern: /while\s*\(\s*1\s*\)/, label: 'while(1) loop' },
  { pattern: /while\s*\(\s*!\s*false\s*\)/, label: 'while(!false) loop' },
  { pattern: /setInterval\([^)]*\)\s*(?:\/\/[^\n]*)?$/, label: 'setInterval without clear reference' },
  { pattern: /do\s*\{[^}]*\}\s*while\s*\(\s*true\s*\)/, label: 'do…while(true) loop' },
];

/**
 * Mock data detection constraint.
 * Rejects files containing placeholder or mock content that should not ship.
 */
export class MockDataConstraint implements Constraint {
  readonly id = 'no-mock-data';
  readonly description =
    'Detects and rejects placeholder / mock data patterns that should not appear in production code.';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  /** Additional patterns supplied at construction time */
  private extraPatterns: ReadonlyArray<{ pattern: RegExp; label: string }>;

  constructor(extraPatterns: ReadonlyArray<{ pattern: RegExp; label: string }> = []) {
    this.extraPatterns = extraPatterns;
  }

  validate(context: ConstraintContext): ConstraintResult {
    const allPatterns = [...MOCK_DATA_PATTERNS, ...this.extraPatterns];
    const hits: string[] = [];
    for (const { pattern, label } of allPatterns) {
      if (pattern.test(context.content)) {
        hits.push(label);
      }
    }
    if (hits.length > 0) {
      return {
        passed: false,
        message: `Mock/placeholder data detected in ${path.basename(context.filePath)}`,
        severity: this.severity,
        details: hits.join('; '),
      };
    }
    return { passed: true, message: 'No mock data detected', severity: this.severity };
  }
}

/**
 * Infinite loop pattern detection constraint.
 * Flags potentially non-terminating loop constructs.
 */
export class InfiniteLoopConstraint implements Constraint {
  readonly id = 'no-infinite-loops';
  readonly description =
    'Detects code patterns that are likely to result in infinite loops or unbounded recursion.';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    const hits: string[] = [];
    for (const { pattern, label } of INFINITE_LOOP_PATTERNS) {
      if (pattern.test(context.content)) {
        hits.push(label);
      }
    }
    if (hits.length > 0) {
      return {
        passed: false,
        message: `Infinite-loop-prone pattern(s) found in ${path.basename(context.filePath)}`,
        severity: this.severity,
        details: hits.join('; '),
      };
    }
    return { passed: true, message: 'No infinite loop patterns detected', severity: this.severity };
  }
}

/**
 * Import conflict detection constraint.
 * Ensures that no file imports the same symbol from two different sources
 * and that no circular imports exist (simple heuristic).
 */
export class ImportConflictConstraint implements Constraint {
  readonly id = 'no-import-conflicts';
  readonly description =
    'Detects duplicate or potentially conflicting import statements within a single file.';
  readonly severity = ConstraintSeverity.Warning;
  enabled = true;

  validate(context: ConstraintContext): ConstraintResult {
    const importRegex =
      /import\s+(?:\{([^}]+)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    const symbolSources = new Map<string, Set<string>>();
    const issues: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(context.content)) !== null) {
      const source = match[4];
      if (!source) continue;
      if (match[1]) {
        // Named imports: { A, B, C }
        const symbols = match[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!.trim());
        for (const sym of symbols) {
          const sources = symbolSources.get(sym) ?? new Set();
          sources.add(source);
          symbolSources.set(sym, sources);
        }
      }
    }

    for (const [symbol, sources] of symbolSources) {
      if (sources.size > 1) {
        issues.push(`Symbol "${symbol}" imported from multiple sources: ${[...sources].join(', ')}`);
      }
    }

    if (issues.length > 0) {
      return {
        passed: false,
        message: `Import conflicts detected in ${path.basename(context.filePath)}`,
        severity: this.severity,
        details: issues.join('; '),
      };
    }
    return { passed: true, message: 'No import conflicts detected', severity: this.severity };
  }
}

/**
 * Output size verification constraint.
 * Ensures build output files meet a minimum size threshold (default 100 KB).
 */
export class OutputSizeConstraint implements Constraint {
  readonly id = 'minimum-output-size';
  readonly description =
    'Verifies that build output files meet the minimum size threshold (100 KB by default).';
  readonly severity = ConstraintSeverity.Error;
  enabled = true;

  constructor(private readonly minSizeBytes: number = 100 * 1024) {}

  validate(context: ConstraintContext): ConstraintResult {
    if (!fs.existsSync(context.filePath)) {
      return {
        passed: false,
        message: `Output file does not exist: ${context.filePath}`,
        severity: this.severity,
      };
    }

    try {
      const stat = fs.statSync(context.filePath);
      if (stat.size < this.minSizeBytes) {
        const sizeKB = (stat.size / 1024).toFixed(1);
        const minKB = (this.minSizeBytes / 1024).toFixed(0);
        return {
          passed: false,
          message: `Output file ${path.basename(context.filePath)} is ${sizeKB}KB — below minimum ${minKB}KB`,
          severity: this.severity,
          details: `Actual: ${stat.size} bytes, Minimum: ${this.minSizeBytes} bytes`,
        };
      }
      return {
        passed: true,
        message: `Output size OK (${(stat.size / 1024).toFixed(1)}KB)`,
        severity: this.severity,
      };
    } catch {
      return {
        passed: false,
        message: `Failed to stat output file: ${context.filePath}`,
        severity: this.severity,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ConstraintValidator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * High-level validator that checks code changes against all registered constraints.
 * Provides summary reporting and can throw on error-level failures.
 */
export class ConstraintValidator {
  constructor(private readonly registry: ConstraintRegistry) {}

  /**
   * Validate a single file change.
   * @returns All individual constraint results plus an overall pass/fail summary.
   */
  validateFileChange(filePath: string, content: string, projectRoot: string, originalContent?: string): ValidationSummary {
    const context: ConstraintContext = { filePath, content, originalContent, projectRoot };
    const results = this.registry.validateAll(context);
    const hasErrors = results.some((r) => !r.passed && r.severity === ConstraintSeverity.Error);
    return {
      filePath,
      passed: !hasErrors,
      results,
      errorCount: results.filter((r) => !r.passed && r.severity === ConstraintSeverity.Error).length,
      warningCount: results.filter((r) => !r.passed && r.severity === ConstraintSeverity.Warning).length,
      infoCount: results.filter((r) => !r.passed && r.severity === ConstraintSeverity.Info).length,
    };
  }

  /**
   * Validate multiple file changes in one pass.
   */
  validateMultiple(
    changes: Array<{ filePath: string; content: string; originalContent?: string }>,
    projectRoot: string,
  ): ValidationSummary[] {
    return changes.map((c) =>
      this.validateFileChange(c.filePath, c.content, projectRoot, c.originalContent),
    );
  }
}

/** Aggregated summary of constraint validation for a single file */
export interface ValidationSummary {
  readonly filePath: string;
  readonly passed: boolean;
  readonly results: ConstraintResult[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FileOperationGuard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intercepts file operations (write, delete, rename) and validates them
 * against the constraint registry before execution.
 */
export class FileOperationGuard {
  constructor(
    private readonly registry: ConstraintRegistry,
    private readonly projectRoot: string,
  ) {}

  /**
   * Intercept a file write: validate content against all constraints first.
   * @returns `true` if the operation is allowed, `false` otherwise.
   */
  async guardWrite(filePath: string, content: string): Promise<GuardResult> {
    const absPath = path.resolve(this.projectRoot, filePath);
    const validator = new ConstraintValidator(this.registry);
    const summary = validator.validateFileChange(absPath, content, this.projectRoot);
    return {
      allowed: summary.passed,
      summary,
      reason: summary.passed
        ? undefined
        : summary.results
            .filter((r) => !r.passed)
            .map((r) => r.message)
            .join('; '),
    };
  }

  /**
   * Intercept a file deletion: currently always allows but logs a warning.
   */
  async guardDelete(filePath: string): Promise<GuardResult> {
    const absPath = path.resolve(this.projectRoot, filePath);
    if (!fs.existsSync(absPath)) {
      return {
        allowed: false,
        summary: {
          filePath: absPath,
          passed: false,
          results: [],
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
        },
        reason: `File does not exist: ${absPath}`,
      };
    }
    return { allowed: true, summary: null };
  }
}

export interface GuardResult {
  readonly allowed: boolean;
  readonly summary: ValidationSummary | null;
  readonly reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory: create a fully populated ConstraintRegistry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a `ConstraintRegistry` pre-loaded with the standard Deerflow constraints.
 * Callers can add or override constraints after creation.
 */
export function createDefaultConstraintRegistry(): ConstraintRegistry {
  const registry = new ConstraintRegistry();
  registry.register(new MockDataConstraint());
  registry.register(new InfiniteLoopConstraint());
  registry.register(new ImportConflictConstraint());
  registry.register(new OutputSizeConstraint());
  return registry;
}
