import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConstraintRegistry,
  ConstraintSeverity,
  MockDataConstraint,
  InfiniteLoopConstraint,
  ImportConflictConstraint,
  OutputSizeConstraint,
  ConstraintValidator,
  FileOperationGuard,
  createDefaultConstraintRegistry,
  type Constraint,
  type ConstraintContext,
} from '../../deerflow/core/constraint-engine.js';

describe('ConstraintEngine', () => {
  describe('ConstraintRegistry', () => {
    let registry: ConstraintRegistry;

    beforeEach(() => {
      registry = new ConstraintRegistry();
    });

    it('should start empty', () => {
      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
      expect(registry.getEnabled()).toEqual([]);
      expect(registry.getViolations()).toEqual([]);
    });

    it('should register and retrieve a constraint', () => {
      const constraint: Constraint = {
        id: 'test-1',
        description: 'Test constraint',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({
          passed: true,
          message: 'OK',
          severity: ConstraintSeverity.Error,
        }),
      };
      registry.register(constraint);
      expect(registry.size).toBe(1);
      expect(registry.get('test-1')).toBe(constraint);
    });

    it('should overwrite existing constraint on duplicate id', () => {
      const c1: Constraint = {
        id: 'dup',
        description: 'First',
        severity: ConstraintSeverity.Warning,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Warning }),
      };
      const c2: Constraint = {
        id: 'dup',
        description: 'Second',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Error }),
      };
      registry.register(c1);
      registry.register(c2);
      expect(registry.size).toBe(1);
      expect(registry.get('dup')!.description).toBe('Second');
    });

    it('should unregister a constraint', () => {
      registry.register({
        id: 'rm-me',
        description: 'To remove',
        severity: ConstraintSeverity.Info,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Info }),
      });
      expect(registry.unregister('rm-me')).toBe(true);
      expect(registry.size).toBe(0);
    });

    it('should return false when unregistering non-existent constraint', () => {
      expect(registry.unregister('ghost')).toBe(false);
    });

    it('should return undefined for non-existent constraint', () => {
      expect(registry.get('ghost')).toBeUndefined();
    });

    it('should getAll return all constraints', () => {
      for (let i = 0; i < 3; i++) {
        registry.register({
          id: `c-${i}`,
          description: `Constraint ${i}`,
          severity: ConstraintSeverity.Error,
          enabled: true,
          validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Error }),
        });
      }
      expect(registry.getAll()).toHaveLength(3);
    });

    it('should getEnabled only return enabled constraints', () => {
      registry.register({
        id: 'enabled-1',
        description: 'Enabled',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Error }),
      });
      registry.register({
        id: 'disabled-1',
        description: 'Disabled',
        severity: ConstraintSeverity.Warning,
        enabled: false,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Warning }),
      });
      expect(registry.getEnabled()).toHaveLength(1);
      expect(registry.getEnabled()[0]!.id).toBe('enabled-1');
    });

    it('should setEnabled toggle constraint', () => {
      registry.register({
        id: 'toggle',
        description: 'Toggle me',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: '', severity: ConstraintSeverity.Error }),
      });
      expect(registry.setEnabled('toggle', false)).toBe(true);
      expect(registry.getEnabled()).toHaveLength(0);
      expect(registry.setEnabled('toggle', true)).toBe(true);
      expect(registry.getEnabled()).toHaveLength(1);
    });

    it('should setEnabled return false for unknown constraint', () => {
      expect(registry.setEnabled('ghost', true)).toBe(false);
    });

    it('should record and retrieve violations', () => {
      registry.recordViolation({
        constraintId: 'test-violation',
        filePath: '/tmp/file.ts',
        message: 'Test violation',
        severity: ConstraintSeverity.Error,
        timestamp: new Date(),
      });
      expect(registry.getViolations()).toHaveLength(1);
      expect(registry.getViolations(ConstraintSeverity.Error)).toHaveLength(1);
      expect(registry.getViolations(ConstraintSeverity.Warning)).toHaveLength(0);
    });

    it('should clear violations', () => {
      registry.recordViolation({
        constraintId: 'v1',
        filePath: '/tmp/a.ts',
        message: 'Violation',
        severity: ConstraintSeverity.Error,
        timestamp: new Date(),
      });
      registry.clearViolations();
      expect(registry.getViolations()).toHaveLength(0);
    });

    it('should validateAll and record failures', () => {
      registry.register({
        id: 'pass-c',
        description: 'Always pass',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: 'OK', severity: ConstraintSeverity.Error }),
      });
      registry.register({
        id: 'fail-c',
        description: 'Always fail',
        severity: ConstraintSeverity.Warning,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: false, message: 'Failed', severity: ConstraintSeverity.Warning }),
      });
      const ctx: ConstraintContext = { filePath: '/tmp/test.ts', content: 'hello', projectRoot: '/tmp' };
      const results = registry.validateAll(ctx);
      expect(results).toHaveLength(2);
      expect(results[0]!.passed).toBe(true);
      expect(results[1]!.passed).toBe(false);
      expect(registry.getViolations()).toHaveLength(1);
    });

    it('should skip disabled constraints in validateAll', () => {
      registry.register({
        id: 'disabled-fail',
        description: 'Disabled',
        severity: ConstraintSeverity.Error,
        enabled: false,
        validate: (ctx: ConstraintContext) => ({ passed: false, message: 'Should not run', severity: ConstraintSeverity.Error }),
      });
      const ctx: ConstraintContext = { filePath: '/tmp/test.ts', content: '', projectRoot: '/tmp' };
      const results = registry.validateAll(ctx);
      expect(results).toHaveLength(0);
      expect(registry.getViolations()).toHaveLength(0);
    });
  });

  describe('MockDataConstraint', () => {
    it('should detect lorem ipsum', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'lorem ipsum dolor sit amet', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
      expect(result.details).toContain('Lorem Ipsum placeholder text');
    });

    it('should detect TODO implement', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: '// TODO implement this later', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect FIXME', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: '// FIXME broken code', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect HACK', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: '// HACK workaround', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect placeholder text', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'This is placeholder text', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect example.com', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'const url = "https://example.com"', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should pass clean content', () => {
      const c = new MockDataConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'const x = 42; console.log(x);', projectRoot: '/tmp' });
      expect(result.passed).toBe(true);
    });

    it('should support extra patterns via constructor', () => {
      const c = new MockDataConstraint([{ pattern: /BANANA/i, label: 'Banana placeholder' }]);
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'BANANA republic', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
      expect(result.details).toContain('Banana placeholder');
    });
  });

  describe('InfiniteLoopConstraint', () => {
    it('should detect while(true)', () => {
      const c = new InfiniteLoopConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'while (true) { doStuff(); }', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect for(;;)', () => {
      const c = new InfiniteLoopConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'for (;;) { loop(); }', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect while(1)', () => {
      const c = new InfiniteLoopConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'while (1) { process(); }', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should detect do-while(true)', () => {
      const c = new InfiniteLoopConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'do { step(); } while (true);', projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
    });

    it('should pass clean code', () => {
      const c = new InfiniteLoopConstraint();
      const result = c.validate({ filePath: '/tmp/a.ts', content: 'for (let i = 0; i < 10; i++) { process(i); }', projectRoot: '/tmp' });
      expect(result.passed).toBe(true);
    });
  });

  describe('ImportConflictConstraint', () => {
    it('should detect symbol imported from multiple sources', () => {
      const c = new ImportConflictConstraint();
      const content = `import { Foo } from './a.js';\nimport { Foo } from './b.js';`;
      const result = c.validate({ filePath: '/tmp/a.ts', content, projectRoot: '/tmp' });
      expect(result.passed).toBe(false);
      expect(result.details).toContain('Foo');
    });

    it('should pass clean imports', () => {
      const c = new ImportConflictConstraint();
      const content = `import { A } from './a.js';\nimport { B } from './b.js';`;
      const result = c.validate({ filePath: '/tmp/a.ts', content, projectRoot: '/tmp' });
      expect(result.passed).toBe(true);
    });
  });

  describe('ConstraintValidator', () => {
    it('should validateFileChange with passing result', () => {
      const registry = new ConstraintRegistry();
      registry.register({
        id: 'always-pass',
        description: 'Pass',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: true, message: 'OK', severity: ConstraintSeverity.Error }),
      });
      const validator = new ConstraintValidator(registry);
      const summary = validator.validateFileChange('/tmp/test.ts', 'clean code', '/tmp');
      expect(summary.passed).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
    });

    it('should validateFileChange with error result', () => {
      const registry = new ConstraintRegistry();
      registry.register({
        id: 'always-fail',
        description: 'Fail',
        severity: ConstraintSeverity.Error,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({ passed: false, message: 'Error found', severity: ConstraintSeverity.Error }),
      });
      const validator = new ConstraintValidator(registry);
      const summary = validator.validateFileChange('/tmp/test.ts', 'bad code', '/tmp');
      expect(summary.passed).toBe(false);
      expect(summary.errorCount).toBe(1);
    });

    it('should validateMultiple changes', () => {
      const registry = new ConstraintRegistry();
      registry.register({
        id: 'check',
        description: 'Check',
        severity: ConstraintSeverity.Warning,
        enabled: true,
        validate: (ctx: ConstraintContext) => ({
          passed: ctx.content.length > 5,
          message: ctx.content.length > 5 ? 'OK' : 'Too short',
          severity: ConstraintSeverity.Warning,
        }),
      });
      const validator = new ConstraintValidator(registry);
      const results = validator.validateMultiple([
        { filePath: '/tmp/a.ts', content: 'long enough content' },
        { filePath: '/tmp/b.ts', content: 'tiny' },
      ], '/tmp');
      expect(results).toHaveLength(2);
      expect(results[0]!.passed).toBe(true);
      // Warning severity does not cause passed=false; it passes with warningCount
      expect(results[1]!.passed).toBe(true);
      expect(results[1]!.warningCount).toBe(1);
    });
  });

  describe('createDefaultConstraintRegistry', () => {
    it('should create registry with 4 default constraints', () => {
      const registry = createDefaultConstraintRegistry();
      expect(registry.size).toBe(4);
      expect(registry.get('no-mock-data')).toBeDefined();
      expect(registry.get('no-infinite-loops')).toBeDefined();
      expect(registry.get('no-import-conflicts')).toBeDefined();
      expect(registry.get('minimum-output-size')).toBeDefined();
    });
  });

  describe('FileOperationGuard', () => {
    let tmpDir: string;
    let guard: FileOperationGuard;
    let registry: ConstraintRegistry;

    beforeEach(() => {
      tmpDir = path.join(os.tmpdir(), `deerflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(tmpDir, { recursive: true });
      registry = new ConstraintRegistry();
      guard = new FileOperationGuard(registry, tmpDir);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should allow writing clean content', async () => {
      const result = await guard.guardWrite('test.ts', 'const x = 1;');
      expect(result.allowed).toBe(true);
    });

    it('should reject writing content with mock data when MockDataConstraint is registered', async () => {
      registry.register(new MockDataConstraint());
      const result = await guard.guardWrite('test.ts', 'lorem ipsum dolor sit amet');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Mock');
    });

    it('should reject deleting non-existent file', async () => {
      const result = await guard.guardDelete('nonexistent.ts');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('should allow deleting existing file with guardDelete (scope check only)', async () => {
      registry.register(new MockDataConstraint());
      const filePath = path.join(tmpDir, 'real-file.ts');
      fs.writeFileSync(filePath, 'real content');
      const result = await guard.guardDelete('real-file.ts');
      expect(result.allowed).toBe(true);
    });
  });
});
