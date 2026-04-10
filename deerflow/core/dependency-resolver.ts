/**
 * @module dependency-resolver
 * @description Dependency management and conflict resolution for the Deerflow
 * Agent Framework. Provides conflict detection, dependency graph analysis,
 * compatibility checking, security auditing, lock file validation, and
 * safe upgrade advisory.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** A single dependency entry */
export interface DependencyEntry {
  name: string;
  version: string;
  source: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  isDirect: boolean;
}

/** A version conflict between two dependency sources */
export interface VersionConflict {
  packageName: string;
  versions: Array<{ version: string; source: string }>;
  severity: 'error' | 'warning';
  resolution?: string;
}

/** An edge in the dependency graph */
export interface DependencyEdge {
  from: string;
  to: string;
  version: string;
  type: 'production' | 'dev' | 'peer' | 'optional';
}

/** A node in the dependency graph */
export interface DependencyNode {
  name: string;
  version: string;
  edges: DependencyEdge[];
  depth: number;
}

/** A known vulnerability entry */
export interface VulnerabilityInfo {
  packageName: string;
  installedVersion: string;
  vulnerableRange: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  url?: string;
  patchedIn?: string;
}

/** A lock file validation issue */
export interface LockFileIssue {
  readonly type: 'missing' | 'mismatch' | 'corrupt' | 'outdated';
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

/** An upgrade recommendation */
export interface UpgradeRecommendation {
  packageName: string;
  currentVersion: string;
  recommendedVersion: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  breakingChange: boolean;
}

/** Result of a full dependency resolution pass */
export interface ResolutionResult {
  conflicts: VersionConflict[];
  vulnerabilities: VulnerabilityInfo[];
  lockFileIssues: LockFileIssue[];
  upgrades: UpgradeRecommendation[];
  cycleDetected: boolean;
  cyclePaths: string[][];
  summary: string;
}

/** Parsed package.json structure (partial) */
interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Version Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare two semver version strings.
 * @returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): { nums: number[]; prerelease: string } => {
    const cleaned = v.replace(/^\^|~|>=|<=|>|<|=|\s/g, '');
    const dashIdx = cleaned.indexOf('-');
    let nums: number[];
    let prerelease = '';
    if (dashIdx >= 0) {
      nums = cleaned.slice(0, dashIdx).split('.').map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });
      prerelease = cleaned.slice(dashIdx + 1);
    } else {
      nums = cleaned.split('.').map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });
    }
    return { nums, prerelease };
  };
  const pa = parse(a);
  const pb = parse(b);
  // Compare numeric parts first
  const maxLen = Math.max(pa.nums.length, pb.nums.length);
  for (let i = 0; i < maxLen; i++) {
    const na = pa.nums[i] ?? 0;
    const nb = pb.nums[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  // Same numeric version — pre-release is lower than release
  if (pa.prerelease && !pb.prerelease) return -1;
  if (!pa.prerelease && pb.prerelease) return 1;
  if (pa.prerelease && pb.prerelease) return pa.prerelease.localeCompare(pb.prerelease);
  return 0;
}

/**
 * Check if `installedVersion` satisfies the `range` (simplified semver matching).
 */
export function satisfiesRange(installedVersion: string, range: string): boolean {
  const cleanRange = range.trim();
  // Exact match
  if (!/^[\^~><=]/.test(cleanRange)) {
    return compareVersions(installedVersion, cleanRange) === 0;
  }
  // Caret ^: compatible with major version
  if (cleanRange.startsWith('^')) {
    const target = cleanRange.slice(1);
    const [major] = target.split('.').map(Number);
    const [iMajor] = installedVersion.split('.').map(Number);
    if (iMajor !== major) return false;
    return compareVersions(installedVersion, target) >= 0;
  }
  // Tilde ~: compatible with minor version
  if (cleanRange.startsWith('~')) {
    const target = cleanRange.slice(1);
    const [major, minor] = target.split('.').map(Number);
    const [iMajor, iMinor] = installedVersion.split('.').map(Number);
    if (iMajor !== major || iMinor !== minor) return false;
    return compareVersions(installedVersion, target) >= 0;
  }
  // >= 
  if (cleanRange.startsWith('>=')) {
    return compareVersions(installedVersion, cleanRange.slice(2)) >= 0;
  }
  // <= 
  if (cleanRange.startsWith('<=')) {
    return compareVersions(installedVersion, cleanRange.slice(2)) <= 0;
  }
  // >
  if (cleanRange.startsWith('>')) {
    return compareVersions(installedVersion, cleanRange.slice(1)) > 0;
  }
  // <
  if (cleanRange.startsWith('<')) {
    return compareVersions(installedVersion, cleanRange.slice(1)) < 0;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conflict Detector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects version conflicts within and between dependency sections
 * of a package.json file.
 */
export class ConflictDetector {
  /**
   * Scan a parsed package.json for version conflicts.
   */
  detect(pkg: PackageJson): VersionConflict[] {
    const conflicts: VersionConflict[] = [];
    const allDeps: Array<{ name: string; version: string; source: string }> = [];

    const sections: Array<{ key: keyof PackageJson; label: string }> = [
      { key: 'dependencies', label: 'dependencies' },
      { key: 'devDependencies', label: 'devDependencies' },
      { key: 'peerDependencies', label: 'peerDependencies' },
      { key: 'optionalDependencies', label: 'optionalDependencies' },
    ];

    for (const section of sections) {
      const deps = pkg[section.key] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const [name, version] of Object.entries(deps)) {
        allDeps.push({ name, version, source: section.label });
      }
    }

    // Group by package name
    const grouped = new Map<string, Array<{ version: string; source: string }>>();
    for (const dep of allDeps) {
      const group = grouped.get(dep.name) ?? [];
      group.push({ version: dep.version, source: dep.source });
      grouped.set(dep.name, group);
    }

    // Find conflicts (same package, different versions)
    for (const [packageName, entries] of grouped) {
      if (entries.length > 1) {
        const uniqueVersions = new Set(entries.map((e) => e.version));
        if (uniqueVersions.size > 1) {
          conflicts.push({
            packageName,
            versions: entries,
            severity: entries.some((e) => e.source === 'peerDependencies') ? 'error' : 'warning',
            resolution: `Unify ${packageName} to a single version across all dependency sections`,
          });
        }
      }
    }

    return conflicts;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Graph
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds and queries a dependency tree graph. Supports cycle detection,
 * depth calculation, and sub-tree extraction.
 */
export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private adjacencyList: Map<string, DependencyEdge[]> = new Map();

  /** Get a node by name */
  getNode(name: string): DependencyNode | undefined {
    return this.nodes.get(name);
  }

  /** Get all edges from a node */
  getEdges(name: string): DependencyEdge[] {
    return this.adjacencyList.get(name) ?? [];
  }

  /** Get all node names */
  getAllNodeNames(): string[] {
    return Array.from(this.nodes.keys());
  }

  /** Add a node to the graph */
  addNode(name: string, version: string): DependencyNode {
    const node: DependencyNode = { name, version, edges: [], depth: 0 };
    this.nodes.set(name, node);
    this.adjacencyList.set(name, []);
    return node;
  }

  /** Add an edge between two nodes */
  addEdge(from: string, to: string, version: string, type: DependencyEdge['type'] = 'production'): void {
    if (!this.nodes.has(from)) this.addNode(from, 'unknown');
    if (!this.nodes.has(to)) this.addNode(to, version);

    const edge: DependencyEdge = { from, to, version, type };
    const edges = this.adjacencyList.get(from) ?? [];
    edges.push(edge);
    this.adjacencyList.set(from, edges);

    // Also update the node's edges
    const fromNode = this.nodes.get(from)!;
    fromNode.edges.push(edge);
  }

  /**
   * Build a dependency graph from a parsed package.json.
   */
  static fromPackageJson(pkg: PackageJson, projectName: string = 'root'): DependencyGraph {
    const graph = new DependencyGraph();
    const rootVersion = pkg.version ?? '0.0.0';
    graph.addNode(projectName, rootVersion);

    const addDeps = (
      deps: Record<string, string> | undefined,
      type: DependencyEdge['type'],
    ) => {
      if (!deps) return;
      for (const [name, version] of Object.entries(deps)) {
        graph.addEdge(projectName, name, version, type);
        graph.addNode(name, version.replace(/^[\^~>=<]*/, ''));
      }
    };

    addDeps(pkg.dependencies, 'production');
    addDeps(pkg.devDependencies, 'dev');
    addDeps(pkg.peerDependencies, 'peer');
    addDeps(pkg.optionalDependencies, 'optional');

    // Calculate depths
    graph.calculateDepths(projectName);

    return graph;
  }

  /** Calculate depth for each node via BFS */
  private calculateDepths(root: string): void {
    const visited = new Set<string>();
    const queue: Array<{ name: string; depth: number }> = [{ name: root, depth: 0 }];

    while (queue.length > 0) {
      const { name, depth } = queue.shift()!;
      if (visited.has(name)) continue;
      visited.add(name);

      const node = this.nodes.get(name);
      if (node) node.depth = depth;

      for (const edge of this.getEdges(name)) {
        if (!visited.has(edge.to)) {
          queue.push({ name: edge.to, depth: depth + 1 });
        }
      }
    }
  }

  /**
   * Detect cycles in the dependency graph using DFS.
   * @returns Array of cycles, where each cycle is a list of node names.
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const edge of this.getEdges(node)) {
        if (!visited.has(edge.to)) {
          dfs(edge.to);
        } else if (recursionStack.has(edge.to)) {
          // Found a cycle
          const cycleStart = path.indexOf(edge.to);
          cycles.push([...path.slice(cycleStart), edge.to]);
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const name of this.getAllNodeNames()) {
      if (!visited.has(name)) dfs(name);
    }

    return cycles;
  }

  /** Total number of nodes in the graph */
  get size(): number {
    return this.nodes.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility Checker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies package compatibility by checking engine requirements,
 * peer dependency satisfaction, and Node.js version constraints.
 */
export class CompatibilityChecker {
  private nodeVersion: string;

  constructor(nodeVersion?: string) {
    this.nodeVersion = nodeVersion ?? process.version.replace('v', '');
  }

  /**
   * Check compatibility of a package.json with the current environment.
   * @returns Array of incompatibility messages (empty if compatible).
   */
  check(pkg: PackageJson): string[] {
    const issues: string[] = [];

    // Check engines constraint
    const engines = (pkg as Record<string, unknown>).engines as Record<string, string> | undefined;
    if (engines?.node) {
      if (!satisfiesRange(this.nodeVersion, engines.node)) {
        issues.push(`Node.js ${this.nodeVersion} does not satisfy engine requirement "${engines.node}"`);
      }
    }

    return issues;
  }

  /**
   * Check if a set of peer dependencies would be satisfied given
   * the currently installed direct dependencies.
   */
  checkPeerDeps(
    peerDeps: Record<string, string>,
    installedDeps: Record<string, string>,
  ): string[] {
    const issues: string[] = [];
    for (const [name, requiredRange] of Object.entries(peerDeps)) {
      const installed = installedDeps[name];
      if (!installed) {
        issues.push(`Peer dependency "${name}@${requiredRange}" is not installed`);
      } else if (!satisfiesRange(installed, requiredRange)) {
        issues.push(`Peer dep "${name}": installed ${installed} does not satisfy ${requiredRange}`);
      }
    }
    return issues;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Auditor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks dependencies against known vulnerability databases.
 * Uses a local advisory list and can integrate with npm audit output.
 */
export class SecurityAuditor {
  private advisories: Map<string, VulnerabilityInfo[]> = new Map();

  constructor() {
    this.loadBuiltInAdvisories();
  }

  /**
   * Add a custom vulnerability advisory.
   */
  addAdvisory(advisory: VulnerabilityInfo): void {
    const list = this.advisories.get(advisory.packageName) ?? [];
    list.push(advisory);
    this.advisories.set(advisory.packageName, list);
  }

  /**
   * Audit all dependencies in the given package.json.
   */
  audit(pkg: PackageJson): VulnerabilityInfo[] {
    const allDeps: Record<string, string> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const found: VulnerabilityInfo[] = [];
    for (const [name, version] of Object.entries(allDeps)) {
      const cleanVersion = version.replace(/^[\^~>=<\s]*/, '');
      const advisories = this.advisories.get(name) ?? [];
      for (const adv of advisories) {
        if (satisfiesRange(cleanVersion, adv.vulnerableRange)) {
          found.push({ ...adv, installedVersion: cleanVersion });
        }
      }
    }
    return found;
  }

  /**
   * Parse `npm audit --json` output and extract vulnerabilities.
   */
  parseNpmAuditOutput(jsonOutput: string): VulnerabilityInfo[] {
    try {
      const data = JSON.parse(jsonOutput);
      const vulns: VulnerabilityInfo[] = [];
      const advisories = data.vulnerabilities ?? data.advisories ?? {};
      for (const [pkgName, info] of Object.entries(advisories)) {
        const adv = info as Record<string, unknown>;
        const viaArray = (Array.isArray(adv.via) ? adv.via : []) as Array<Record<string, unknown>>;
        vulns.push({
          packageName: pkgName,
          installedVersion: String(viaArray[0]?.range ?? adv.range ?? '*'),
          vulnerableRange: String(viaArray[0]?.range ?? adv.range ?? '*'),
          severity: String(adv.severity ?? 'moderate') as VulnerabilityInfo['severity'],
          title: String(adv.title ?? adv.name ?? 'Unknown vulnerability'),
          url: adv.url ? String(adv.url) : undefined,
          patchedIn: adv.patched_versions ? String(adv.patched_versions) : undefined,
        });
      }
      return vulns;
    } catch {
      return [];
    }
  }

  private loadBuiltInAdvisories(): void {
    // Example built-in advisories for common packages
    // In production, this would be loaded from a real database
    const builtins: Array<{
      pkg: string;
      range: string;
      severity: VulnerabilityInfo['severity'];
      title: string;
      patched?: string;
    }> = [
      {
        pkg: 'lodash',
        range: '<4.17.21',
        severity: 'high',
        title: 'Prototype Pollution in lodash',
        patched: '4.17.21',
      },
      {
        pkg: 'express',
        range: '<4.18.0',
        severity: 'moderate',
        title: 'Open Redirect in express',
        patched: '4.18.0',
      },
      {
        pkg: 'minimist',
        range: '<1.2.6',
        severity: 'moderate',
        title: 'Prototype Pollution in minimist',
        patched: '1.2.6',
      },
    ];

    for (const b of builtins) {
      this.addAdvisory({
        packageName: b.pkg,
        installedVersion: '',
        vulnerableRange: b.range,
        severity: b.severity,
        title: b.title,
        patchedIn: b.patched,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lock File Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the integrity of lock files (package-lock.json or yarn.lock).
 */
export class LockFileValidator {
  /**
   * Validate lock file presence and consistency.
   */
  validate(projectRoot: string, pkg: PackageJson): LockFileIssue[] {
    const issues: LockFileIssue[] = [];
    const lockPath = path.join(projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(projectRoot, 'yarn.lock');

    // Check existence
    if (!fs.existsSync(lockPath) && !fs.existsSync(yarnLockPath)) {
      issues.push({
        type: 'missing',
        message: 'No lock file found. Run npm install or yarn install to generate one.',
        severity: 'error',
      });
      return issues;
    }

    // Validate package-lock.json if present
    if (fs.existsSync(lockPath)) {
      try {
        const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

        // Check lockfileVersion
        if (!lockContent.lockfileVersion) {
          issues.push({
            type: 'corrupt',
            message: 'package-lock.json is missing lockfileVersion field',
            severity: 'error',
          });
        }

        // Verify package name matches
        if (lockContent.name && pkg.name && lockContent.name !== pkg.name) {
          issues.push({
            type: 'mismatch',
            message: `Lock file name "${lockContent.name}" does not match package.json name "${pkg.name}"`,
            severity: 'error',
          });
        }

        // Check that all direct dependencies appear in the lock file
        const lockPackages = lockContent.packages ?? lockContent.dependencies ?? {};
        const lockPackageNames = Object.keys(lockPackages).map((p) =>
          p.replace(/^node_modules\//, ''),
        );

        const allDirectDeps: Record<string, string> = {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
        };

        for (const depName of Object.keys(allDirectDeps)) {
          if (!lockPackageNames.some((n) => n === depName || n.endsWith(`/${depName}`))) {
            issues.push({
              type: 'outdated',
              message: `Dependency "${depName}" is in package.json but not in lock file`,
              severity: 'warning',
            });
          }
        }
      } catch {
        issues.push({
          type: 'corrupt',
          message: 'package-lock.json could not be parsed',
          severity: 'error',
        });
      }
    }

    return issues;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upgrade Advisor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suggests safe upgrades for dependencies based on current versions
 * and known patch versions.
 */
export class UpgradeAdvisor {
  private knownLatestVersions: Map<string, string> = new Map();

  /**
   * Set the known latest version for a package.
   */
  setLatestVersion(packageName: string, version: string): void {
    this.knownLatestVersions.set(packageName, version);
  }

  /**
   * Load known latest versions from npm registry output.
   */
  loadFromNpmView(jsonOutput: string): void {
    try {
      const data = JSON.parse(jsonOutput);
      if (data['dist-tags']?.latest) {
        // Single package result
        this.setLatestVersion(data.name, data['dist-tags'].latest);
      }
    } catch {
      // Bulk format or unparseable — skip
    }
  }

  /**
   * Generate upgrade recommendations for a package.json.
   */
  suggest(pkg: PackageJson): UpgradeRecommendation[] {
    const recommendations: UpgradeRecommendation[] = [];
    const allDeps: Record<string, string> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    for (const [name, currentVersion] of Object.entries(allDeps)) {
      const cleanCurrent = currentVersion.replace(/^[\^~>=<\s]*/, '');
      const latest = this.knownLatestVersions.get(name);

      if (latest && compareVersions(latest, cleanCurrent) > 0) {
        const currentMajor = parseInt(cleanCurrent.split('.')[0]!, 10) || 0;
        const latestMajor = parseInt(latest.split('.')[0]!, 10) || 0;
        const breakingChange = latestMajor > currentMajor;

        recommendations.push({
          packageName: name,
          currentVersion,
          recommendedVersion: `^${latest}`,
          reason: breakingChange
            ? `Major version upgrade available: ${cleanCurrent} → ${latest}`
            : `Patch/minor update available: ${cleanCurrent} → ${latest}`,
          risk: breakingChange ? 'high' : 'low',
          breakingChange,
        });
      }
    }

    return recommendations;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Resolver (Top-level orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level dependency resolver that combines all sub-components to provide
 * comprehensive dependency analysis, conflict resolution, and upgrade advice.
 */
export class DependencyResolver {
  private conflictDetector: ConflictDetector;
  private securityAuditor: SecurityAuditor;
  private lockFileValidator: LockFileValidator;
  private compatibilityChecker: CompatibilityChecker;
  private upgradeAdvisor: UpgradeAdvisor;

  constructor(nodeVersion?: string) {
    this.conflictDetector = new ConflictDetector();
    this.securityAuditor = new SecurityAuditor();
    this.lockFileValidator = new LockFileValidator();
    this.compatibilityChecker = new CompatibilityChecker(nodeVersion);
    this.upgradeAdvisor = new UpgradeAdvisor();
  }

  /**
   * Run a full dependency resolution pass on the project.
   */
  resolve(projectRoot: string): ResolutionResult {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return {
        conflicts: [],
        vulnerabilities: [],
        lockFileIssues: [{ type: 'missing', message: 'package.json not found', severity: 'error' }],
        upgrades: [],
        cycleDetected: false,
        cyclePaths: [],
        summary: 'No package.json found',
      };
    }

    let pkg: PackageJson;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      return {
        conflicts: [],
        vulnerabilities: [],
        lockFileIssues: [{ type: 'corrupt', message: 'package.json could not be parsed', severity: 'error' }],
        upgrades: [],
        cycleDetected: false,
        cyclePaths: [],
        summary: 'package.json is corrupt or unreadable',
      };
    }

    // Build dependency graph
    const graph = DependencyGraph.fromPackageJson(pkg, pkg.name ?? 'root');

    // Detect conflicts
    const conflicts = this.conflictDetector.detect(pkg);

    // Detect cycles
    const cyclePaths = graph.detectCycles();

    // Security audit
    const vulnerabilities = this.securityAuditor.audit(pkg);

    // Lock file validation
    const lockFileIssues = this.lockFileValidator.validate(projectRoot, pkg);

    // Compatibility check
    const compatIssues = this.compatibilityChecker.check(pkg);
    for (const issue of compatIssues) {
      lockFileIssues.push({ type: 'mismatch', message: issue, severity: 'warning' });
    }

    // Upgrade suggestions
    const upgrades = this.upgradeAdvisor.suggest(pkg);

    // Build summary
    const parts: string[] = [];
    if (conflicts.length > 0) parts.push(`${conflicts.length} conflict(s)`);
    if (vulnerabilities.length > 0) parts.push(`${vulnerabilities.length} vulnerability(s)`);
    if (lockFileIssues.length > 0) parts.push(`${lockFileIssues.length} lock file issue(s)`);
    if (cyclePaths.length > 0) parts.push(`${cyclePaths.length} cycle(s)`);
    if (upgrades.length > 0) parts.push(`${upgrades.length} upgrade(s) available`);
    if (parts.length === 0) parts.push('All checks passed');

    return {
      conflicts,
      vulnerabilities,
      lockFileIssues,
      upgrades,
      cycleDetected: cyclePaths.length > 0,
      cyclePaths,
      summary: parts.join(', '),
    };
  }

  /** Access sub-components for targeted queries */
  get conflicts(): ConflictDetector {
    return this.conflictDetector;
  }

  get security(): SecurityAuditor {
    return this.securityAuditor;
  }

  get lockFile(): LockFileValidator {
    return this.lockFileValidator;
  }

  get compatibility(): CompatibilityChecker {
    return this.compatibilityChecker;
  }

  get upgrades(): UpgradeAdvisor {
    return this.upgradeAdvisor;
  }
}
