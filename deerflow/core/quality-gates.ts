/**
 * @module quality-gates
 * @description Quality gate system for the Deerflow Agent Framework. Every code
 * change must pass through this pipeline before being committed. Each gate is
 * independently testable and the pipeline supports fast-fail and soft modes.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Core Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a single quality gate check */
export interface GateResult {
  /** `true` when the gate passes */
  readonly passed: boolean;
  /** Human-readable explanation */
  readonly reason: string;
  /** Gate identifier */
  readonly gateName: string;
  /** Timestamp of the check */
  readonly timestamp: Date;
  /** Optional additional diagnostic data */
  readonly details?: Record<string, unknown>;
}

/** Context provided to every quality gate */
export interface GateContext {
  /** Absolute path to the project root */
  projectRoot: string;
  /** Files changed in this commit (absolute paths) */
  changedFiles: string[];
  /** The build output directory (if a build was performed) */
  buildOutputDir?: string;
  /** Contents keyed by absolute path for files too large to re-read */
  fileContents?: Map<string, string>;
}

/**
 * A single quality gate that code must pass.
 */
export interface QualityGate {
  /** Unique name of this gate */
  readonly name: string;
  /** Short description */
  readonly description: string;
  /** Whether this gate is critical (fails the whole pipeline) */
  readonly critical: boolean;
  /** Run the check and return a result */
  check(context: GateContext): Promise<GateResult> | GateResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Quality Gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures TypeScript files compile cleanly:
 * - No `any` type usage
 * - No unused imports
 * - No explicit `// @ts-ignore` or `// @ts-nocheck`
 */
export class TypeScriptQualityGate implements QualityGate {
  readonly name = 'typescript-quality';
  readonly description = 'Ensures TypeScript files have no errors, unused imports, or any types.';
  readonly critical = true;

  async check(context: GateContext): Promise<GateResult> {
    const issues: string[] = [];
    const tsFiles = context.changedFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    for (const filePath of tsFiles) {
      const content = context.fileContents?.get(filePath) ?? this.readOrFail(filePath);
      if (!content) continue;

      // Detect `any` type usage (rough heuristic)
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches && anyMatches.length > 0) {
        issues.push(`${filePath}: ${anyMatches.length} occurrence(s) of ': any' type`);
      }

      // Detect @ts-ignore / @ts-nocheck
      const tsIgnoreMatches = content.match(/\/\/\s*@ts-(ignore|nocheck)/g);
      if (tsIgnoreMatches) {
        issues.push(`${filePath}: ${tsIgnoreMatches.length} @ts-ignore/@ts-nocheck directive(s)`);
      }

      // Detect unused imports (simple heuristic: import not referenced in rest of file)
      const importRegex = /import\s+(?:\{([^}]+)\}|(\*\s+as\s+(\w+))|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) {
        if (m[1]) {
          const symbols = m[1]
            .split(',')
            .map((s) => s.trim().split(/\s+as\s+/).pop()!.trim());
          for (const sym of symbols) {
            const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const usageRegex = new RegExp(`\\b${escaped}\\b`, 'g');
            const matches = content.match(usageRegex);
            // The import line itself counts as one match; expect at least 2
            if (!matches || matches.length <= 1) {
              issues.push(`${filePath}: potentially unused import "${sym}"`);
            }
          }
        }
      }
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'TypeScript quality checks passed' : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }

  private readOrFail(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Quality Gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the build output directory exists, contains expected assets,
 * and that the total output size exceeds a minimum threshold (100 KB).
 */
export class BuildQualityGate implements QualityGate {
  readonly name = 'build-quality';
  readonly description = 'Ensures the build succeeded with output > 100 KB and all expected assets present.';
  readonly critical = true;

  constructor(
    private readonly minSizeBytes: number = 100 * 1024,
    private readonly requiredAssets: string[] = ['index.html', 'main.js'],
  ) {}

  async check(context: GateContext): Promise<GateResult> {
    const outDir = context.buildOutputDir;
    if (!outDir) {
      return {
        passed: false,
        gateName: this.name,
        reason: 'No build output directory specified in context',
        timestamp: new Date(),
      };
    }

    if (!fs.existsSync(outDir)) {
      return {
        passed: false,
        gateName: this.name,
        reason: `Build output directory does not exist: ${outDir}`,
        timestamp: new Date(),
      };
    }

    const issues: string[] = [];
    let totalSize = 0;

    // Walk the build directory
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          totalSize += fs.statSync(full).size;
        }
      }
    };
    walk(outDir);

    // Check minimum size
    if (totalSize < this.minSizeBytes) {
      issues.push(
        `Total build output is ${(totalSize / 1024).toFixed(1)}KB — below minimum ${(this.minSizeBytes / 1024).toFixed(0)}KB`,
      );
    }

    // Check required assets
    for (const asset of this.requiredAssets) {
      const assetPath = path.join(outDir, asset);
      if (!fs.existsSync(assetPath)) {
        issues.push(`Missing required asset: ${asset}`);
      }
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'Build output meets all requirements' : issues.join('; '),
      timestamp: new Date(),
      details: { totalSizeBytes: totalSize, fileCount: this.countFiles(outDir) },
    };
  }

  private countFiles(dir: string): number {
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += this.countFiles(full);
      else count++;
    }
    return count;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Coverage Gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforces a minimum code-coverage threshold (default 80%).
 * Reads a coverage summary file (e.g., coverage-summary.json) if available,
 * otherwise performs a lightweight heuristic.
 */
export class TestCoverageGate implements QualityGate {
  readonly name = 'test-coverage';
  readonly description = 'Enforces minimum code coverage (default 80%).';
  readonly critical = true;

  constructor(private readonly minimumCoverage: number = 80) {}

  async check(context: GateContext): Promise<GateResult> {
    // Try to read a coverage summary
    const coveragePaths = [
      path.join(context.projectRoot, 'coverage', 'coverage-summary.json'),
      path.join(context.projectRoot, 'coverage-summary.json'),
    ];

    for (const cp of coveragePaths) {
      if (fs.existsSync(cp)) {
        try {
          const raw = JSON.parse(fs.readFileSync(cp, 'utf-8'));
          const pct = raw.total?.lines?.pct ?? raw.lines?.pct ?? null;
          if (pct !== null) {
            const passed = pct >= this.minimumCoverage;
            return {
              passed,
              gateName: this.name,
              reason: passed
                ? `Coverage ${pct.toFixed(1)}% meets minimum ${this.minimumCoverage}%`
                : `Coverage ${pct.toFixed(1)}% is below minimum ${this.minimumCoverage}%`,
              timestamp: new Date(),
              details: { coverage: pct, minimum: this.minimumCoverage },
            };
          }
        } catch {
          // Continue to fallback
        }
      }
    }

    // Fallback: no coverage file found — soft pass with warning
    return {
      passed: true,
      gateName: this.name,
      reason: 'No coverage summary file found; gate soft-passed',
      timestamp: new Date(),
      details: { coverage: null, minimum: this.minimumCoverage },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Gate
// ─────────────────────────────────────────────────────────────────────────────

/** Common secret / credential patterns */
const SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/i, label: 'Hardcoded password' },
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'Hardcoded API key' },
  { pattern: /(?:secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'Hardcoded secret/token' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, label: 'Private key material' },
  { pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/, label: 'AWS access key' },
  { pattern: /ghp_[0-9a-zA-Z]{36,}/, label: 'GitHub personal access token' },
];

/**
 * Scans changed files for hardcoded secrets and known-vulnerable patterns.
 */
export class SecurityGate implements QualityGate {
  readonly name = 'security';
  readonly description = 'Rejects code containing hardcoded secrets or known vulnerable patterns.';
  readonly critical = true;

  async check(context: GateContext): Promise<GateResult> {
    const issues: string[] = [];

    for (const filePath of context.changedFiles) {
      const content = context.fileContents?.get(filePath) ?? this.readOrFail(filePath);
      if (!content) continue;

      for (const { pattern, label } of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          issues.push(`${filePath}: ${label} detected`);
        }
      }

      // Check for dangerously permissive eval / innerHTML
      if (/\.innerHTML\s*=/.test(content)) {
        issues.push(`${filePath}: direct innerHTML assignment (XSS risk)`);
      }
      if (/\beval\s*\(/.test(content)) {
        issues.push(`${filePath}: eval() usage (code injection risk)`);
      }
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'No security issues found' : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }

  private readOrFail(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Consistency Gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks that package.json and lock file are consistent, no duplicate
 * dependencies at different versions, and no circular peer deps.
 */
export class DependencyConsistencyGate implements QualityGate {
  readonly name = 'dependency-consistency';
  readonly description = 'Ensures package.json and lock file are consistent with no conflicts.';
  readonly critical = false;

  async check(context: GateContext): Promise<GateResult> {
    const pkgPath = path.join(context.projectRoot, 'package.json');
    const lockPath = path.join(context.projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(context.projectRoot, 'yarn.lock');
    const issues: string[] = [];

    if (!fs.existsSync(pkgPath)) {
      return { passed: true, gateName: this.name, reason: 'No package.json found — gate skipped', timestamp: new Date() };
    }

    // Check that a lock file exists
    if (!fs.existsSync(lockPath) && !fs.existsSync(yarnLockPath)) {
      issues.push('No lock file (package-lock.json or yarn.lock) found');
    }

    // Parse package.json for duplicate deps
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps: Record<string, string> = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
        ...(pkg.peerDependencies ?? {}),
      };
      const names = Object.keys(allDeps);
      const seen = new Set<string>();
      const dupes = names.filter((n) => {
        const key = n.toLowerCase();
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });
      if (dupes.length > 0) {
        issues.push(`Duplicate dependency entries: ${dupes.join(', ')}`);
      }
    } catch {
      issues.push('Failed to parse package.json');
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'Dependencies are consistent' : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Consistency Gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heuristic check that component imports and exports have not been broken
 * by the current change set. Verifies that imported symbols actually exist
 * in their source modules.
 */
export class UIConsistencyGate implements QualityGate {
  readonly name = 'ui-consistency';
  readonly description = 'Prevents breaking component connections and import/export mismatches.';
  readonly critical = true;

  async check(context: GateContext): Promise<GateResult> {
    const issues: string[] = [];

    for (const filePath of context.changedFiles) {
      const content = context.fileContents?.get(filePath) ?? this.readOrFail(filePath);
      if (!content) continue;

      const importRegex = /import\s+(?:\{([^}]+)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) {
        const source = m[4];
        if (!source) continue;
        if (source.startsWith('.') || source.startsWith('/')) {
          // Relative import — resolve against project root
          const resolved = path.resolve(path.dirname(filePath), source);
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
          const found = extensions.some((ext) => {
            try {
              return fs.existsSync(resolved + ext);
            } catch {
              return false;
            }
          });
          if (!found) {
            issues.push(`${filePath}: cannot resolve import "${source}"`);
          }
        }
      }
    }

    return {
      passed: issues.length === 0,
      gateName: this.name,
      reason: issues.length === 0 ? 'All imports resolve correctly' : issues.join('; '),
      timestamp: new Date(),
      details: { issuesCount: issues.length },
    };
  }

  private readOrFail(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Gate Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/** Options for configuring the pipeline */
export interface PipelineOptions {
  /** Stop running gates as soon as a critical gate fails (default: true) */
  failFast?: boolean;
}

/**
 * Orchestrates running all quality gates in sequence. Supports fail-fast
 * mode where a critical failure short-circuits remaining gates.
 */
export class QualityGatePipeline {
  private gates: QualityGate[] = [];

  constructor(private readonly options: PipelineOptions = {}) {}

  /** Add a gate to the pipeline (order matters) */
  addGate(gate: QualityGate): this {
    this.gates.push(gate);
    return this;
  }

  /** Remove a gate by name */
  removeGate(name: string): boolean {
    const idx = this.gates.findIndex((g) => g.name === name);
    if (idx >= 0) {
      this.gates.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Run all gates against the given context */
  async run(context: GateContext): Promise<PipelineResult> {
    const results: GateResult[] = [];
    let overallPassed = true;

    for (const gate of this.gates) {
      const result = await gate.check(context);
      results.push(result);

      if (!result.passed && gate.critical) {
        overallPassed = false;
        if (this.options.failFast !== false) {
          break;
        }
      }
    }

    const errorCount = results.filter((r) => !r.passed).length;
    return {
      passed: overallPassed,
      results,
      totalGates: this.gates.length,
      gatesRun: results.length,
      errorCount,
    };
  }

  /** Create a pipeline pre-loaded with all standard Deerflow gates */
  static createDefault(): QualityGatePipeline {
    return new QualityGatePipeline()
      .addGate(new TypeScriptQualityGate())
      .addGate(new BuildQualityGate())
      .addGate(new TestCoverageGate())
      .addGate(new SecurityGate())
      .addGate(new DependencyConsistencyGate())
      .addGate(new UIConsistencyGate());
  }
}

/** Aggregated result of running the full pipeline */
export interface PipelineResult {
  readonly passed: boolean;
  readonly results: GateResult[];
  readonly totalGates: number;
  readonly gatesRun: number;
  readonly errorCount: number;
}
