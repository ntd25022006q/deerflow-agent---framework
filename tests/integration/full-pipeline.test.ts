import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Core modules
import {
  ConstraintSeverity,
  ConstraintRegistry,
  MockDataConstraint,
  InfiniteLoopConstraint,
  ImportConflictConstraint,
  ConstraintValidator,
  createDefaultConstraintRegistry,
} from '../../deerflow/core/constraint-engine';
import type { ConstraintContext } from '../../deerflow/core/constraint-engine';

import {
  TypeScriptQualityGate,
  SecurityGate,
  TestCoverageGate,
  QualityGatePipeline,
} from '../../deerflow/core/quality-gates';
import type { GateContext } from '../../deerflow/core/quality-gates';

import {
  ContextPriority,
  ContextManager,
} from '../../deerflow/core/context-manager';

import {
  FileOperationType,
  FileSafetyGuard,
} from '../../deerflow/core/file-safety-guard';

import {
  ViolationSeverity,
  ViolationType,
  AgentValidator,
} from '../../deerflow/core/agent-validator';
import type { AgentAction } from '../../deerflow/core/agent-validator';

import {
  compareVersions,
  satisfiesRange,
  ConflictDetector,
  DependencyGraph,
  SecurityAuditor,
  DependencyResolver,
} from '../../deerflow/core/dependency-resolver';

import {
  RiskLevel,
  RiskFactor,
  ChangeType,
  RiskAssessor,
} from '../../deerflow/algorithms/risk-assessment';
import type { FileChange } from '../../deerflow/algorithms/risk-assessment';

describe('full-pipeline integration', () => {
  // ── Constraint Engine + Quality Gates Pipeline ──────────────────────

  describe('constraint-engine + quality-gates pipeline', () => {
    it('should validate clean code through constraint engine and pass quality gates', async () => {
      const registry = new ConstraintRegistry();
      registry.register(new MockDataConstraint());
      registry.register(new InfiniteLoopConstraint());
      registry.register(new ImportConflictConstraint());
      const validator = new ConstraintValidator(registry);

      const cleanCode = `const greeting = 'Hello, World!';
export { greeting };
`;
      const summary = validator.validateFileChange('/src/clean.ts', cleanCode, '/project');
      expect(summary.passed).toBe(true);
      expect(summary.errorCount).toBe(0);

      // Run through quality gates
      const pipeline = new QualityGatePipeline();
      pipeline.addGate(new TypeScriptQualityGate());
      pipeline.addGate(new SecurityGate());

      const ctx: GateContext = {
        projectRoot: '/project',
        changedFiles: ['/src/clean.ts'],
        fileContents: new Map([['/src/clean.ts', cleanCode]]),
      };
      const result = await pipeline.run(ctx);
      expect(result.passed).toBe(true);
    });

    it('should detect dirty code through constraint engine and quality gates', async () => {
      const registry = createDefaultConstraintRegistry();
      const validator = new ConstraintValidator(registry);

      const dirtyCode = `
// TODO implement this
while (true) {
  const password = "supersecret123";
  eval(password);
}
`;
      const summary = validator.validateFileChange('/src/dirty.ts', dirtyCode, '/project');
      expect(summary.passed).toBe(false);
      expect(summary.errorCount).toBeGreaterThanOrEqual(1);

      const pipeline = new QualityGatePipeline();
      pipeline.addGate(new SecurityGate());

      const ctx: GateContext = {
        projectRoot: '/project',
        changedFiles: ['/src/dirty.ts'],
        fileContents: new Map([['/src/dirty.ts', dirtyCode]]),
      };
      const result = await pipeline.run(ctx);
      expect(result.passed).toBe(false);
    });

    it('should detect import conflicts through constraint engine', () => {
      const registry = new ConstraintRegistry();
      registry.register(new ImportConflictConstraint());
      const validator = new ConstraintValidator(registry);

      const conflictCode = `
import { Foo } from './module-a';
import { Foo } from './module-b';
`;
      const summary = validator.validateFileChange('/src/conflict.ts', conflictCode, '/project');
      // ImportConflictConstraint has severity Warning, so `passed` is true (no errors),
      // but warningCount should be >= 1
      expect(summary.warningCount).toBeGreaterThanOrEqual(1);
    });

    it('should pass quality gate pipeline with no changes', async () => {
      const pipeline = new QualityGatePipeline();
      pipeline.addGate(new TypeScriptQualityGate());
      pipeline.addGate(new SecurityGate());

      const ctx: GateContext = {
        projectRoot: '/project',
        changedFiles: [],
      };
      const result = await pipeline.run(ctx);
      expect(result.passed).toBe(true);
    });
  });

  // ── ContextManager + AgentValidator Pipeline ─────────────────────────

  describe('context-manager + agent-validator pipeline', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-pipeline-cm-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should track context and validate agent actions end-to-end', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('Implement user authentication');

      cm.addItem('requirements', 'Implement login, logout, and session management', ContextPriority.Critical);
      cm.addItem('implementation', 'Built auth middleware with JWT tokens', ContextPriority.High);

      cm.recordFileModification('/src/auth/middleware.ts');
      cm.recordFileModification('/src/auth/jwt.ts');
      cm.setPhase('testing');

      const taskState = cm.getTaskState();
      expect(taskState).not.toBeNull();
      expect(taskState!.phase).toBe('testing');
      expect(taskState!.filesModified).toHaveLength(2);
      expect(taskState!.taskDescription).toBe('Implement user authentication');

      // Validate agent actions
      const av = new AgentValidator({ sessionId: 'auth-session' });
      av.recordAction({
        type: 'code_generation',
        content: 'Implementing user authentication with JWT tokens',
        timestamp: new Date(),
        tokensUsed: 300,
        success: true,
      });
      av.recordAction({
        type: 'shell_command',
        content: 'npm test -- auth middleware',
        timestamp: new Date(),
        tokensUsed: 150,
        success: true,
      });

      const score = av.evaluate('Implement user authentication');
      expect(score.metrics.overall).toBeGreaterThanOrEqual(50);
      expect(score.metrics.completion).toBeGreaterThanOrEqual(50);
      expect(score.sessionId).toBe('auth-session');
    });

    it('should detect hallucinating agent and penalize score', () => {
      const av = new AgentValidator({ sessionId: 'hallucination-test' });
      av.recordAction({
        type: 'explanation',
        content: 'This undocumented API function version 99.0.0 always works.',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });

      const violations = av.getViolations();
      const hallucinations = violations.filter((v) => v.type === ViolationType.Hallucination);
      expect(hallucinations.length).toBeGreaterThanOrEqual(1);

      const score = av.evaluate('test task');
      expect(score.metrics.accuracy).toBeLessThan(100);
    });

    it('should checkpoint and restore context state', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('Phase 1 task');
      cm.addItem('data', 'Important context data', ContextPriority.Critical);
      cm.setPhase('implementation');

      // Save checkpoint
      const checkpoint = cm.saveCheckpoint('before-phase-2');
      expect(checkpoint.id).toBeTruthy();
      expect(checkpoint.items.length).toBeGreaterThanOrEqual(1);

      // Modify state
      cm.setPhase('testing');
      cm.addItem('new-data', 'New info', ContextPriority.Low);
      expect(cm.getTaskState()!.phase).toBe('testing');

      // Restore checkpoint
      const restored = cm.restoreCheckpoint(checkpoint.id);
      expect(restored).toBe(true);
      expect(cm.getTaskState()!.phase).toBe('implementation');
    });

    it('should persist and restore session across instances', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('Persistent task');
      cm.addItem('note', 'Must not be lost', ContextPriority.Critical);
      cm.persistSession();

      // Create new instance from same persistence dir
      const cm2 = new ContextManager({ persistenceDir: tmpDir });
      const restored = cm2.restoreSession();
      expect(restored).toBe(true);
      expect(cm2.getTaskState()).not.toBeNull();
      expect(cm2.getTaskState()!.taskDescription).toBe('Persistent task');
      expect(cm2.itemCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── File Safety Guard + Context Manager Pipeline ────────────────────

  describe('file-safety-guard + context-manager pipeline', () => {
    let tmpDir: string;
    let projectDir: string;
    let logDir: string;
    let backupDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-pipeline-fsg-'));
      projectDir = path.join(tmpDir, 'project');
      logDir = path.join(tmpDir, 'logs');
      backupDir = path.join(tmpDir, 'backups');
      fs.mkdirSync(projectDir);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should guard file writes and track in context', async () => {
      const guard = new FileSafetyGuard(
        { projectRoot: projectDir, allowHidden: true },
        logDir,
        backupDir,
      );
      const cm = new ContextManager({ persistenceDir: logDir });
      cm.startTask('Write safe files');

      const filePath = path.join(projectDir, 'src', 'app.ts');
      const result = await guard.writeFile(filePath, 'export const app = true;');
      expect(result.success).toBe(true);
      expect(guard.logger.count).toBe(1);
      expect(fs.existsSync(filePath)).toBe(true);

      cm.recordFileModification(filePath);
      expect(cm.getTaskState()!.filesModified).toHaveLength(1);
    });

    it('should prevent writing outside scope and track violations', async () => {
      const guard = new FileSafetyGuard(
        { projectRoot: projectDir },
        logDir,
        backupDir,
      );

      const result = await guard.writeFile('/etc/evil.ts', 'hack');
      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project root');
    });

    it('should guard rename operations and create backups', async () => {
      const guard = new FileSafetyGuard(
        { projectRoot: projectDir },
        logDir,
        backupDir,
      );

      const oldPath = path.join(projectDir, 'original.txt');
      const newPath = path.join(projectDir, 'renamed.txt');
      fs.writeFileSync(oldPath, 'content');

      const result = await guard.renameFile(oldPath, newPath);
      expect(result.success).toBe(true);
      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(guard.backups.listBackups().length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Dependency Resolver + Dependency Graph Pipeline ──────────────────

  describe('dependency-resolver + dependency-graph pipeline', () => {
    it('should resolve dependencies and build graph consistently', () => {
      const pkg = {
        name: 'myapp',
        version: '1.0.0',
        dependencies: { react: '^18.0.0', lodash: '^4.17.21' },
        devDependencies: { typescript: '^5.0.0' },
      };

      // Build dependency graph
      const graph = DependencyGraph.fromPackageJson(pkg, 'myapp');
      expect(graph.size).toBe(4);
      expect(graph.detectCycles()).toHaveLength(0);

      // Check conflicts
      const detector = new ConflictDetector();
      const conflicts = detector.detect(pkg);
      expect(conflicts).toHaveLength(0);

      // Check security
      const auditor = new SecurityAuditor();
      const vulns = auditor.audit(pkg);
      const lodashVulns = vulns.filter((v) => v.packageName === 'lodash');
      expect(lodashVulns).toHaveLength(0);
    });

    it('should detect version conflicts and security issues together', () => {
      const pkg = {
        name: 'vulnerable-app',
        dependencies: { lodash: '4.17.0', express: '3.0.0' },
        peerDependencies: { lodash: '^4.17.21' },
      };

      const detector = new ConflictDetector();
      const conflicts = detector.detect(pkg);
      expect(conflicts.length).toBeGreaterThanOrEqual(1);

      const auditor = new SecurityAuditor();
      const vulns = auditor.audit(pkg);
      expect(vulns.length).toBeGreaterThanOrEqual(1);
    });

    it('should use DependencyGraph to analyze complex dependency trees', () => {
      const graph = new DependencyGraph();
      graph.addNode('app', '1.0.0');
      graph.addEdge('app', 'express', '^4.0.0', 'production');
      graph.addEdge('express', 'cookie-parser', '^1.0.0', 'production');
      graph.addEdge('express', 'body-parser', '^1.0.0', 'production');
      graph.addEdge('app', 'mongoose', '^7.0.0', 'production');
      graph.addEdge('mongoose', 'mongodb', '^5.0.0', 'production');

      expect(graph.size).toBe(6);
      expect(graph.detectCycles()).toHaveLength(0);
      expect(graph.getEdges('express').length).toBe(2);
    });
  });

  // ── Cross-module: ConstraintEngine → ContextManager ─────────────────

  describe('cross-module: constraint-engine + context-manager', () => {
    it('should validate code with constraint engine then track with context-manager', () => {
      const registry = new ConstraintRegistry();
      registry.register(new MockDataConstraint());
      registry.register(new InfiniteLoopConstraint());
      const validator = new ConstraintValidator(registry);

      const cleanCode = 'const x = 42;\nexport default x;\n';
      const result = validator.validateFileChange('/src/module.ts', cleanCode, '/project');
      expect(result.passed).toBe(true);

      // Track this validation in context
      const violations = registry.getViolations();
      expect(violations).toHaveLength(0);

      // Context manager tracks what was validated
      const cm = new ContextManager();
      cm.startTask('Validate clean module');
      cm.addItem('validation-result', `Passed: ${result.passed}, Errors: ${result.errorCount}`, ContextPriority.High);
      cm.recordFileModification('/src/module.ts');
      expect(cm.getTaskState()!.filesModified).toHaveLength(1);
    });

    it('should reject dirty code and log violations in context', () => {
      const registry = new ConstraintRegistry();
      registry.register(new MockDataConstraint());
      registry.register(new InfiniteLoopConstraint());
      const validator = new ConstraintValidator(registry);

      const dirtyCode = 'while (true) { // TODO implement\n  // lorem ipsum\n}';
      const result = validator.validateFileChange('/src/dirty.ts', dirtyCode, '/project');
      expect(result.passed).toBe(false);
      expect(result.errorCount).toBeGreaterThanOrEqual(1);

      // Log violations in context
      const cm = new ContextManager();
      cm.startTask('Review dirty code');
      for (const v of registry.getViolations()) {
        cm.addItem(`violation-${v.constraintId}`, `${v.message} (severity: ${v.severity})`, ContextPriority.Critical);
      }
      expect(cm.itemCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── DependencyResolver on Real Project ──────────────────────────────

  describe('DependencyResolver on real project', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-pipeline-dr-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should fully resolve a project with lock file, security, and conflicts', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'real-project',
        version: '1.0.0',
        dependencies: { lodash: '4.17.0', express: '4.17.0' },
        devDependencies: { lodash: '^4.17.21' },
        peerDependencies: { react: '^18.0.0' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'real-project',
        lockfileVersion: 3,
        packages: {
          'node_modules/lodash': { version: '4.17.0' },
          'node_modules/express': { version: '4.17.0' },
        },
      }));

      const resolver = new DependencyResolver('20.0.0');
      const result = resolver.resolve(tmpDir);

      // Should detect lodash version conflict (deps vs devDeps)
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1);

      // Should detect security vulnerabilities (lodash < 4.17.21, express < 4.18.0)
      expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(1);

      // Should have lock file entries (missing peer dep react reported via compatibility)
      expect(result.summary).toBeTruthy();

      // Should not detect cycles
      expect(result.cycleDetected).toBe(false);
    });

    it('should resolve clean project with all checks passing', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'clean-project',
        version: '1.0.0',
        dependencies: { lodash: '^4.17.21', axios: '^1.6.0' },
        devDependencies: { typescript: '^5.0.0' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify({
        name: 'clean-project',
        lockfileVersion: 3,
        packages: {
          'node_modules/lodash': { version: '4.17.21' },
          'node_modules/axios': { version: '1.6.0' },
          'node_modules/typescript': { version: '5.0.0' },
        },
      }));

      const resolver = new DependencyResolver('20.0.0');
      const result = resolver.resolve(tmpDir);

      expect(result.conflicts).toHaveLength(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.cycleDetected).toBe(false);
      expect(result.summary).toContain('All checks passed');
    });
  });

  // ── RiskAssessor + DependencyResolver Integration ───────────────────

  describe('RiskAssessor + DependencyResolver integration', () => {
    it('should assess risk of a project with known vulnerabilities', () => {
      const resolver = new DependencyResolver();
      const pkg = {
        name: 'risky-project',
        version: '1.0.0',
        dependencies: { lodash: '4.17.0' },
      };

      // Run dependency resolution
      const auditor = resolver.security;
      const vulns = auditor.audit(pkg);
      expect(vulns.length).toBeGreaterThanOrEqual(1);

      // Use risk assessor to evaluate the impact of fixing these vulnerabilities
      const riskAssessor = new RiskAssessor();
      const change: FileChange = {
        filePath: 'package.json',
        changeType: ChangeType.MODIFY,
        linesAdded: 2,
        linesDeleted: 1,
        linesModified: 0,
        description: `Upgrade ${vulns.length} vulnerable dependencies`,
        dependents: ['server.ts', 'middleware.ts'],
      };
      const riskResult = riskAssessor.assessFileChange(change);
      expect(riskResult.riskScore).toBeGreaterThanOrEqual(0);
      expect(riskResult.riskScore).toBeLessThanOrEqual(100);
    });

    it('should combine quality scoring and risk assessment for a file change', () => {
      const riskAssessor = new RiskAssessor();

      // Simulate upgrading a vulnerable dependency
      const vulnFix: FileChange = {
        filePath: 'package.json',
        changeType: ChangeType.MODIFY,
        linesAdded: 1,
        linesDeleted: 1,
        linesModified: 0,
        complexity: 3,
        dependents: ['app.ts', 'server.ts'],
        testFiles: ['package.test.ts', 'package.test2.ts', 'package.test3.ts'],
        description: 'Upgrade lodash from 4.17.0 to 4.17.21',
      };
      const riskResult = riskAssessor.assessFileChange(vulnFix);
      // Well-tested, small change, few deps = should be low risk
      expect(riskResult.riskLevel).toBe(RiskLevel.LOW);
      expect(riskResult.mitigations.length).toBeGreaterThanOrEqual(0);
    });

    it('should flag a large refactor across security-critical files', () => {
      const riskAssessor = new RiskAssessor();

      const dangerousChange: FileChange = {
        filePath: 'auth/security-manager.ts',
        changeType: ChangeType.REFACTOR,
        linesAdded: 200,
        linesDeleted: 150,
        linesModified: 30,
        complexity: 20,
        dependents: ['routes/api.ts', 'routes/admin.ts', 'routes/user.ts', 'middleware/auth.ts', 'services/session.ts'],
        securityAreas: ['authentication', 'authorization', 'session-management'],
      };
      const riskResult = riskAssessor.assessFileChange(dangerousChange);
      expect([RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(riskResult.riskLevel);
      expect(riskResult.impactPrediction.directImpactCount).toBe(5);
      expect(riskResult.impactPrediction.blastRadius).toBeGreaterThanOrEqual(3);
    });
  });

  // ── End-to-End: Dirty Code Gets Caught at Every Stage ───────────────

  describe('end-to-end: dirty code caught at every stage', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deerflow-pipeline-e2e-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should catch security issues through constraint engine, quality gates, and risk assessment', async () => {
      const dirtyCode = `
const apiKey = "sk-1234567890abcdef1234567890abcdef";
const password = "admin12345678";
function processInput(input: string) {
  document.getElementById("output").innerHTML = input;
  eval(input);
}
while (true) {
  // lorem ipsum placeholder
  // TODO implement this
  // FIXME broken
  console.log("placeholder");
}
`;

      // Stage 1: Constraint engine catches mock data and infinite loops
      const registry = createDefaultConstraintRegistry();
      const validator = new ConstraintValidator(registry);
      const summary = validator.validateFileChange('/src/dirty.ts', dirtyCode, '/project');
      expect(summary.passed).toBe(false);
      expect(summary.errorCount).toBeGreaterThanOrEqual(2);

      // Stage 2: Quality gates catch security issues
      const pipeline = new QualityGatePipeline();
      pipeline.addGate(new SecurityGate());
      pipeline.addGate(new TypeScriptQualityGate());
      const ctx: GateContext = {
        projectRoot: '/project',
        changedFiles: ['/src/dirty.ts'],
        fileContents: new Map([['/src/dirty.ts', dirtyCode]]),
      };
      const gateResult = await pipeline.run(ctx);
      expect(gateResult.passed).toBe(false);

      // Stage 3: Agent validator records and evaluates actions
      const av = new AgentValidator({ sessionId: 'e2e-test' });
      av.recordAction({
        type: 'code_generation',
        content: dirtyCode,
        timestamp: new Date(),
        tokensUsed: 500,
        success: true,
      });
      const violations = av.getViolations();

      // Stage 4: Risk assessment flags security exposure
      const riskAssessor = new RiskAssessor();
      const riskResult = riskAssessor.assessFileChange({
        filePath: '/src/dirty.ts',
        changeType: ChangeType.ADD,
        linesAdded: dirtyCode.split('\n').length,
        linesDeleted: 0,
        linesModified: 0,
        securityAreas: ['hardcoded-secrets', 'code-injection'],
      });
      expect(riskResult.factorScores.get(RiskFactor.SECURITY_EXPOSURE)!).toBeGreaterThan(0);

      // Verify end-to-end: at least one stage caught the problem
      const caughtByConstraintEngine = !summary.passed;
      const caughtByQualityGates = !gateResult.passed;
      const caughtByRiskAssessment = riskResult.factorScores.get(RiskFactor.SECURITY_EXPOSURE)! > 0;
      expect(caughtByConstraintEngine || caughtByQualityGates || caughtByRiskAssessment).toBe(true);
    });
  });
});
