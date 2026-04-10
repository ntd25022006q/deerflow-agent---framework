import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  compareVersions,
  satisfiesRange,
  ConflictDetector,
  DependencyGraph,
  CompatibilityChecker,
  SecurityAuditor,
  LockFileValidator,
  UpgradeAdvisor,
  DependencyResolver,
} from '../../deerflow/core/dependency-resolver';
import type {
  VersionConflict,
  VulnerabilityInfo,
  LockFileIssue,
  UpgradeRecommendation,
  ResolutionResult,
} from '../../deerflow/core/dependency-resolver';

describe('dependency-resolver', () => {
  // ── compareVersions ────────────────────────────────────────────────────

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
    });

    it('should return negative when a < b (patch)', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('should return negative when a < b (minor)', () => {
      expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should return negative when a < b (major)', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should return positive when a > b', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.5.0', '1.4.0')).toBeGreaterThan(0);
    });

    it('should handle version prefixes (^, ~, >=)', () => {
      expect(compareVersions('^1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('~1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('>=1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('<=1.0.0', '1.0.0')).toBe(0);
      // Note: compareVersions strips all prefixes (^, ~, >=, etc.) and compares
      // the raw numeric versions, so '>1.0.0' becomes '1.0.0' and equals '1.0.0'
      expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
    });

    it('should handle prerelease versions (release > prerelease)', () => {
      expect(compareVersions('1.0.0', '1.0.0-beta')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.0.0-alpha.1')).toBeGreaterThan(0);
    });

    it('should compare prerelease strings alphabetically', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
      expect(compareVersions('1.0.0-rc.1', '1.0.0-rc.2')).toBeLessThan(0);
    });

    it('should handle different length version numbers', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
    });
  });

  // ── satisfiesRange ─────────────────────────────────────────────────────

  describe('satisfiesRange', () => {
    it('should exact match', () => {
      expect(satisfiesRange('1.0.0', '1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '2.0.0')).toBe(false);
    });

    it('should caret range ^ — compatible with major', () => {
      expect(satisfiesRange('1.5.0', '^1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '^1.0.0')).toBe(true);
      expect(satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
      expect(satisfiesRange('0.9.0', '^1.0.0')).toBe(false);
    });

    it('should tilde range ~ — compatible with minor', () => {
      expect(satisfiesRange('1.5.3', '~1.5.0')).toBe(true);
      expect(satisfiesRange('1.5.0', '~1.5.0')).toBe(true);
      expect(satisfiesRange('1.4.0', '~1.5.0')).toBe(false);
      expect(satisfiesRange('1.6.0', '~1.5.0')).toBe(false);
    });

    it('should >= range', () => {
      expect(satisfiesRange('2.0.0', '>=1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '>=1.0.0')).toBe(true);
      expect(satisfiesRange('0.9.0', '>=1.0.0')).toBe(false);
    });

    it('should <= range', () => {
      expect(satisfiesRange('0.5.0', '<=1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '<=1.0.0')).toBe(true);
      expect(satisfiesRange('1.5.0', '<=1.0.0')).toBe(false);
    });

    it('should > range (exclusive)', () => {
      expect(satisfiesRange('1.0.1', '>1.0.0')).toBe(true);
      expect(satisfiesRange('2.0.0', '>1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '>1.0.0')).toBe(false);
    });

    it('should < range (exclusive)', () => {
      expect(satisfiesRange('0.9.0', '<1.0.0')).toBe(true);
      expect(satisfiesRange('0.0.1', '<1.0.0')).toBe(true);
      expect(satisfiesRange('1.0.0', '<1.0.0')).toBe(false);
    });
  });

  // ── ConflictDetector ───────────────────────────────────────────────────

  describe('ConflictDetector', () => {
    it('should find no conflicts for a clean package', () => {
      const detector = new ConflictDetector();
      const conflicts = detector.detect({
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { vitest: '^1.0.0' },
      });
      expect(conflicts).toHaveLength(0);
    });

    it('should detect duplicate packages across dependency sections', () => {
      const detector = new ConflictDetector();
      const conflicts = detector.detect({
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { lodash: '^3.0.0' },
      });
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.packageName).toBe('lodash');
      expect(conflicts[0]!.versions).toHaveLength(2);
      expect(conflicts[0]!.severity).toBe('warning');
    });

    it('should escalate to error severity when peer deps are involved', () => {
      const detector = new ConflictDetector();
      const conflicts = detector.detect({
        dependencies: { react: '^18.0.0' },
        peerDependencies: { react: '^17.0.0' },
      });
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.severity).toBe('error');
    });

    it('should not flag same version in different sections', () => {
      const detector = new ConflictDetector();
      const conflicts = detector.detect({
        dependencies: { lodash: '^4.17.0' },
        devDependencies: { lodash: '^4.17.0' },
      });
      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty package', () => {
      const detector = new ConflictDetector();
      expect(detector.detect({})).toHaveLength(0);
    });

    it('should include a resolution suggestion', () => {
      const detector = new ConflictDetector();
      const conflicts = detector.detect({
        dependencies: { foo: '1.0.0' },
        devDependencies: { foo: '2.0.0' },
      });
      expect(conflicts[0]!.resolution).toContain('Unify foo');
    });
  });

  // ── DependencyGraph ───────────────────────────────────────────────────

  describe('DependencyGraph', () => {
    it('should start empty', () => {
      const graph = new DependencyGraph();
      expect(graph.size).toBe(0);
      expect(graph.getAllNodeNames()).toHaveLength(0);
    });

    it('should add nodes and retrieve them', () => {
      const graph = new DependencyGraph();
      graph.addNode('react', '18.0.0');
      expect(graph.size).toBe(1);
      expect(graph.getNode('react')!.version).toBe('18.0.0');
    });

    it('should add edges and auto-create target nodes', () => {
      const graph = new DependencyGraph();
      graph.addNode('app', '1.0.0');
      graph.addEdge('app', 'react', '^18.0.0', 'production');
      expect(graph.size).toBe(2);
      expect(graph.getEdges('app')).toHaveLength(1);
      expect(graph.getEdges('app')[0]!.to).toBe('react');
    });

    it('should getAllNodeNames return all node names', () => {
      const graph = new DependencyGraph();
      graph.addEdge('app', 'react', '18.0.0');
      graph.addEdge('app', 'lodash', '4.0.0');
      const names = graph.getAllNodeNames();
      expect(names).toContain('app');
      expect(names).toContain('react');
      expect(names).toContain('lodash');
    });

    it('should detectCycles return empty array for DAG', () => {
      const graph = new DependencyGraph();
      graph.addEdge('a', 'b', '1.0.0');
      graph.addEdge('b', 'c', '1.0.0');
      graph.addEdge('a', 'c', '1.0.0');
      expect(graph.detectCycles()).toHaveLength(0);
    });

    it('should detectCycles find circular dependency', () => {
      const graph = new DependencyGraph();
      graph.addEdge('a', 'b', '1.0.0');
      graph.addEdge('b', 'c', '1.0.0');
      graph.addEdge('c', 'a', '1.0.0');
      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should fromPackageJson build graph with correct node count', () => {
      const graph = DependencyGraph.fromPackageJson({
        name: 'myapp', version: '1.0.0',
        dependencies: { react: '^18.0.0', lodash: '^4.0.0' },
        devDependencies: { vitest: '^1.0.0' },
      }, 'myapp');
      // myapp + react + lodash + vitest = 4
      expect(graph.size).toBe(4);
      expect(graph.getNode('myapp')!.depth).toBe(0);
    });

    it('should fromPackageJson handle empty package', () => {
      const graph = DependencyGraph.fromPackageJson({ name: 'empty' }, 'empty');
      expect(graph.size).toBe(1);
    });
  });

  // ── CompatibilityChecker ──────────────────────────────────────────────

  describe('CompatibilityChecker', () => {
    it('should pass for package with no engine constraint', () => {
      const checker = new CompatibilityChecker('18.0.0');
      const issues = checker.check({ name: 'test', dependencies: { lodash: '^4.0.0' } });
      expect(issues).toHaveLength(0);
    });

    it('should pass for compatible engine constraint', () => {
      const checker = new CompatibilityChecker('20.0.0');
      const issues = checker.check({
        name: 'test',
        dependencies: { lodash: '^4.0.0' },
        engines: { node: '>=18.0.0' },
      } as Record<string, unknown>);
      expect(issues).toHaveLength(0);
    });

    it('should fail for incompatible engine requirement', () => {
      const checker = new CompatibilityChecker('16.0.0');
      const issues = checker.check({
        name: 'test',
        dependencies: { lodash: '^4.0.0' },
        engines: { node: '>=18.0.0' },
      } as Record<string, unknown>);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('does not satisfy');
    });

    it('should checkPeerDeps detect missing peer dependency', () => {
      const checker = new CompatibilityChecker();
      const issues = checker.checkPeerDeps({ react: '^18.0.0' }, { lodash: '^4.0.0' });
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('not installed');
    });

    it('should checkPeerDeps detect version mismatch', () => {
      const checker = new CompatibilityChecker();
      const issues = checker.checkPeerDeps({ react: '^18.0.0' }, { react: '^17.0.0' });
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('does not satisfy');
    });

    it('should checkPeerDeps pass for satisfied peers', () => {
      const checker = new CompatibilityChecker();
      const issues = checker.checkPeerDeps({ react: '^18.0.0' }, { react: '18.2.0' });
      expect(issues).toHaveLength(0);
    });

    it('should checkPeerDeps pass when all peers are satisfied', () => {
      const checker = new CompatibilityChecker();
      const issues = checker.checkPeerDeps(
        { react: '^18.0.0', 'react-dom': '^18.0.0' },
        { react: '18.2.0', 'react-dom': '18.2.0' },
      );
      expect(issues).toHaveLength(0);
    });
  });

  // ── SecurityAuditor ───────────────────────────────────────────────────

  describe('SecurityAuditor', () => {
    it('should detect built-in lodash < 4.17.21 vulnerability', () => {
      const auditor = new SecurityAuditor();
      const vulns = auditor.audit({ dependencies: { lodash: '4.17.0' } });
      const lodashVulns = vulns.filter((v) => v.packageName === 'lodash');
      expect(lodashVulns.length).toBeGreaterThanOrEqual(1);
      expect(lodashVulns[0]!.severity).toBe('high');
    });

    it('should pass for patched lodash version', () => {
      const auditor = new SecurityAuditor();
      const vulns = auditor.audit({ dependencies: { lodash: '4.17.21' } });
      const lodashVulns = vulns.filter((v) => v.packageName === 'lodash');
      expect(lodashVulns).toHaveLength(0);
    });

    it('should detect built-in express < 4.18.0 vulnerability', () => {
      const auditor = new SecurityAuditor();
      const vulns = auditor.audit({ dependencies: { express: '4.17.0' } });
      const expressVulns = vulns.filter((v) => v.packageName === 'express');
      expect(expressVulns.length).toBeGreaterThanOrEqual(1);
    });

    it('should add custom advisory and detect it', () => {
      const auditor = new SecurityAuditor();
      auditor.addAdvisory({
        packageName: 'custom-lib',
        installedVersion: '',
        vulnerableRange: '<2.0.0',
        severity: 'critical',
        title: 'Custom vulnerability',
      });
      const vulns = auditor.audit({ dependencies: { 'custom-lib': '1.5.0' } });
      expect(vulns.length).toBeGreaterThanOrEqual(1);
      expect(vulns[0]!.packageName).toBe('custom-lib');
      expect(vulns[0]!.title).toBe('Custom vulnerability');
    });

    it('should parseNpmAuditOutput extract vulnerabilities', () => {
      const auditor = new SecurityAuditor();
      const output = JSON.stringify({
        vulnerabilities: {
          lodash: {
            severity: 'high',
            via: [{ range: '<4.17.21', title: 'Prototype Pollution' }],
            title: 'Prototype Pollution in lodash',
          },
        },
      });
      const vulns = auditor.parseNpmAuditOutput(output);
      expect(vulns).toHaveLength(1);
      expect(vulns[0]!.packageName).toBe('lodash');
      expect(vulns[0]!.severity).toBe('high');
    });

    it('should parseNpmAuditOutput return empty for invalid JSON', () => {
      const auditor = new SecurityAuditor();
      expect(auditor.parseNpmAuditOutput('not json at all')).toHaveLength(0);
    });

    it('should audit empty package with no issues', () => {
      const auditor = new SecurityAuditor();
      expect(auditor.audit({})).toHaveLength(0);
    });
  });

  // ── LockFileValidator ─────────────────────────────────────────────────

  describe('LockFileValidator', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-lfv-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should report missing lock file as error', () => {
      const validator = new LockFileValidator();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      const issues = validator.validate(tmpDir, { name: 'test' });
      expect(issues).toHaveLength(1);
      expect(issues[0]!.type).toBe('missing');
      expect(issues[0]!.severity).toBe('error');
    });

    it('should pass with valid lock file matching package.json', () => {
      const validator = new LockFileValidator();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test', dependencies: { lodash: '^4.0.0' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'test', lockfileVersion: 3,
        packages: { 'node_modules/lodash': {} },
      }));
      const issues = validator.validate(tmpDir, { name: 'test', dependencies: { lodash: '^4.0.0' } });
      expect(issues).toHaveLength(0);
    });

    it('should detect name mismatch between lock and package', () => {
      const validator = new LockFileValidator();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-app' }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'different-name', lockfileVersion: 3, packages: {},
      }));
      const issues = validator.validate(tmpDir, { name: 'test-app' });
      const mismatches = issues.filter((i) => i.type === 'mismatch');
      expect(mismatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect missing lockfileVersion field', () => {
      const validator = new LockFileValidator();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'test', packages: {},
      }));
      const issues = validator.validate(tmpDir, { name: 'test' });
      const corrupt = issues.filter((i) => i.type === 'corrupt');
      expect(corrupt.length).toBeGreaterThanOrEqual(1);
    });

    it('should accept yarn.lock as a valid lock file', () => {
      const validator = new LockFileValidator();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '# yarn lockfile\n');
      const issues = validator.validate(tmpDir, { name: 'test' });
      // yarn.lock doesn't get JSON-parsed, so it should not produce a missing error
      // But yarn.lock parsing may still report issues
      expect(issues.some((i) => i.type === 'missing')).toBe(false);
    });
  });

  // ── UpgradeAdvisor ────────────────────────────────────────────────────

  describe('UpgradeAdvisor', () => {
    it('should suggest upgrade when newer version available', () => {
      const advisor = new UpgradeAdvisor();
      advisor.setLatestVersion('lodash', '4.17.21');
      const recs = advisor.suggest({ dependencies: { lodash: '4.17.0' } });
      expect(recs).toHaveLength(1);
      expect(recs[0]!.packageName).toBe('lodash');
      expect(recs[0]!.risk).toBe('low');
      expect(recs[0]!.breakingChange).toBe(false);
    });

    it('should suggest breaking change for major version upgrade', () => {
      const advisor = new UpgradeAdvisor();
      advisor.setLatestVersion('react', '18.0.0');
      const recs = advisor.suggest({ dependencies: { react: '16.0.0' } });
      expect(recs).toHaveLength(1);
      expect(recs[0]!.breakingChange).toBe(true);
      expect(recs[0]!.risk).toBe('high');
    });

    it('should not suggest when already at latest', () => {
      const advisor = new UpgradeAdvisor();
      advisor.setLatestVersion('lodash', '4.17.21');
      const recs = advisor.suggest({ dependencies: { lodash: '4.17.21' } });
      expect(recs).toHaveLength(0);
    });

    it('should not suggest when latest is unknown', () => {
      const advisor = new UpgradeAdvisor();
      const recs = advisor.suggest({ dependencies: { unknown: '1.0.0' } });
      expect(recs).toHaveLength(0);
    });

    it('should loadFromNpmView parse dist-tags', () => {
      const advisor = new UpgradeAdvisor();
      advisor.loadFromNpmView(JSON.stringify({
        name: 'lodash',
        'dist-tags': { latest: '4.17.21' },
      }));
      const recs = advisor.suggest({ dependencies: { lodash: '4.0.0' } });
      expect(recs).toHaveLength(1);
    });

    it('should suggest upgrades for devDependencies too', () => {
      const advisor = new UpgradeAdvisor();
      advisor.setLatestVersion('vitest', '2.0.0');
      const recs = advisor.suggest({ devDependencies: { vitest: '1.0.0' } });
      expect(recs).toHaveLength(1);
    });
  });

  // ── DependencyResolver (full integration) ─────────────────────────────

  describe('DependencyResolver', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-dr-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should report missing package.json', () => {
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.lockFileIssues).toHaveLength(1);
      expect(result.lockFileIssues[0]!.type).toBe('missing');
      expect(result.summary).toContain('No package.json found');
    });

    it('should resolve a valid project with clean dependencies', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'clean-app', version: '1.0.0',
        dependencies: { lodash: '^4.17.21' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'clean-app', lockfileVersion: 3,
        packages: { 'node_modules/lodash': { version: '4.17.21' } },
      }));
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.vulnerabilities.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });

    it('should detect security vulnerabilities in real project', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'vuln-app', version: '1.0.0',
        dependencies: { lodash: '4.17.0', express: '3.0.0' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'vuln-app', lockfileVersion: 3,
        packages: {
          'node_modules/lodash': { version: '4.17.0' },
          'node_modules/express': { version: '3.0.0' },
        },
      }));
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect version conflicts across sections', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'conflict-app', version: '1.0.0',
        dependencies: { foo: '1.0.0' },
        devDependencies: { foo: '2.0.0' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'conflict-app', lockfileVersion: 3,
        packages: { 'node_modules/foo': { version: '1.0.0' } },
      }));
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle corrupt package.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ not valid json');
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.lockFileIssues.some((i) => i.type === 'corrupt')).toBe(true);
    });

    it('should expose sub-component accessors', () => {
      const resolver = new DependencyResolver();
      expect(resolver.conflicts).toBeInstanceOf(ConflictDetector);
      expect(resolver.security).toBeInstanceOf(SecurityAuditor);
      expect(resolver.lockFile).toBeInstanceOf(LockFileValidator);
      expect(resolver.compatibility).toBeInstanceOf(CompatibilityChecker);
      expect(resolver.upgrades).toBeInstanceOf(UpgradeAdvisor);
    });

    it('should produce a non-empty summary string', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test', version: '1.0.0',
        dependencies: { lodash: '^4.17.21' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'test', lockfileVersion: 3,
        packages: { 'node_modules/lodash': { version: '4.17.21' } },
      }));
      const resolver = new DependencyResolver();
      const result = resolver.resolve(tmpDir);
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
