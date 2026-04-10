import { describe, it, expect, beforeEach } from 'vitest';
import {
  ViolationSeverity,
  ViolationType,
  HallucinationDetector,
  TokenEfficiencyScorer,
  TaskCompletionVerifier,
  BehaviorChecker,
  ViolationLogger,
  AgentValidator,
} from '../../deerflow/core/agent-validator';
import type {
  Violation,
  AgentAction,
  AgentScore,
  AgentMetrics,
  AgentValidatorConfig,
} from '../../deerflow/core/agent-validator';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeAction(overrides: Partial<AgentAction> = {}): AgentAction {
  return {
    type: 'code_generation',
    content: 'const x = 1;',
    timestamp: new Date(),
    tokensUsed: 100,
    success: true,
    ...overrides,
  };
}

function makeViolation(overrides: Partial<Violation> = {}): Violation {
  return {
    id: 'v-test-' + Math.random().toString(36).slice(2, 8),
    type: ViolationType.Hallucination,
    severity: ViolationSeverity.High,
    message: 'test violation',
    timestamp: new Date(),
    ...overrides,
  };
}

const defaultConfig: AgentValidatorConfig = {
  sessionId: 'test-session',
  minimumScore: 70,
  maxHallucinations: 0,
  maxRetries: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('agent-validator', () => {
  // ─── ViolationSeverity ────────────────────────────────────────────────────

  describe('ViolationSeverity enum', () => {
    it('should have all four severity levels with correct string values', () => {
      expect(ViolationSeverity.Low).toBe('low');
      expect(ViolationSeverity.Medium).toBe('medium');
      expect(ViolationSeverity.High).toBe('high');
      expect(ViolationSeverity.Critical).toBe('critical');
    });

    it('should have exactly 4 members', () => {
      expect(Object.keys(ViolationSeverity)).toHaveLength(4);
    });
  });

  // ─── ViolationType ────────────────────────────────────────────────────────

  describe('ViolationType enum', () => {
    it('should have all 8 expected violation types', () => {
      expect(ViolationType.Hallucination).toBe('hallucination');
      expect(ViolationType.TokenWaste).toBe('token-waste');
      expect(ViolationType.IncompleteTask).toBe('incomplete-task');
      expect(ViolationType.RepeatedMistake).toBe('repeated-mistake');
      expect(ViolationType.ScopeViolation).toBe('scope-violation');
      expect(ViolationType.IgnoredConstraints).toBe('ignored-constraints');
      expect(ViolationType.ExcessiveRetries).toBe('excessive-retries');
      expect(ViolationType.UnverifiedOutput).toBe('unverified-output');
    });

    it('should have exactly 8 members', () => {
      expect(Object.keys(ViolationType)).toHaveLength(8);
    });
  });

  // ─── HallucinationDetector ────────────────────────────────────────────────

  describe('HallucinationDetector', () => {
    let detector: HallucinationDetector;

    beforeEach(() => {
      detector = new HallucinationDetector();
    });

    it('should return empty array for clean content', () => {
      expect(detector.detect('The function returns a valid result.')).toHaveLength(0);
      expect(detector.detect('import React from "react";')).toHaveLength(0);
      expect(detector.detect('const sum = (a, b) => a + b;')).toHaveLength(0);
    });

    it('should report clean content via isClean', () => {
      expect(detector.isClean('Normal code without issues')).toBe(true);
      expect(detector.isClean('')).toBe(true);
    });

    it('should report dirty content via isClean', () => {
      expect(detector.isClean('This undocumented API function works perfectly.')).toBe(false);
    });

    it('should detect undocumented/unreleased API references', () => {
      const signals = detector.detect('This undocumented API provides special functionality.');
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals[0]!.label).toContain('undocumented');
    });

    it('should detect unreleased feature references', () => {
      const signals = detector.detect('The unreleased feature will be available soon.');
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect contradictory documentation claims', () => {
      const signals = detector.detect(
        'According to the docs say but I can override it.',
      );
      // The pattern requires "according to|as stated in|the docs say|documentation says" ... "but|however I|we can|could"
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect import of non-existent @deerflow package', () => {
      const signals = detector.detect('import { magic } from "@deerflow/utils";');
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals.some((s) => s.label.includes('non-existent'))).toBe(true);
    });

    it('should detect import of non-existent @runtime package', () => {
      const signals = detector.detect('const rt = require("@runtime/core");');
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect import of non-existent @magic package', () => {
      const signals = detector.detect('import { spell } from "@magic/wand";');
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect implausible version numbers (99.x)', () => {
      const signals = detector.detect('The library uses version 99.0.0');
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals.some((s) => s.label.includes('version'))).toBe(true);
    });

    it('should detect overly confident universal claims', () => {
      const signals = detector.detect('This always works and is guaranteed compatible.');
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect "never" in universal claims', () => {
      const signals = detector.detect('This is never supported on any platform.');
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect citation placeholders without real references', () => {
      const signals = detector.detect('According to [ref 1] this is correct.');
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals.some((s) => s.label.includes('Citation'))).toBe(true);
    });

    it('should detect multiple hallucination signals in one string', () => {
      const content =
        'This undocumented API always works. Import it via "@magic/lib". See [ref a].';
      const signals = detector.detect(content);
      expect(signals.length).toBeGreaterThanOrEqual(3);
    });

    it('should return objects with label and match properties', () => {
      const signals = detector.detect('This unreleased API is version 99.1.0');
      for (const s of signals) {
        expect(s).toHaveProperty('label');
        expect(s).toHaveProperty('match');
        expect(typeof s.label).toBe('string');
        expect(typeof s.match).toBe('string');
      }
    });
  });

  // ─── TokenEfficiencyScorer ────────────────────────────────────────────────

  describe('TokenEfficiencyScorer', () => {
    let scorer: TokenEfficiencyScorer;

    beforeEach(() => {
      scorer = new TokenEfficiencyScorer();
    });

    it('should return 100 for empty actions array', () => {
      expect(scorer.score([])).toBe(100);
    });

    it('should return 100 for a single efficient action', () => {
      const actions = [makeAction()];
      expect(scorer.score(actions)).toBe(100);
    });

    it('should return 100 for multiple unique, successful, non-empty actions', () => {
      const actions = [
        makeAction({ content: 'const a = 1;', tokensUsed: 50 }),
        makeAction({ content: 'const b = 2;', tokensUsed: 50 }),
        makeAction({ content: 'const c = 3;', tokensUsed: 50 }),
      ];
      expect(scorer.score(actions)).toBe(100);
    });

    it('should penalize empty/whitespace content actions', () => {
      const actions = [makeAction({ content: '   ', tokensUsed: 100 })];
      const score = scorer.score(actions);
      expect(score).toBeLessThan(100);
    });

    it('should heavily penalize many empty content actions', () => {
      const actions = [
        makeAction({ content: '   ', tokensUsed: 100 }),
        makeAction({ content: '   ', tokensUsed: 100 }),
        makeAction({ content: '   ', tokensUsed: 100 }),
      ];
      const score = scorer.score(actions);
      expect(score).toBeLessThan(50);
    });

    it('should penalize duplicate content', () => {
      const actions = [
        makeAction({ content: 'const x = 1;', tokensUsed: 50 }),
        makeAction({ content: 'const x = 1;', tokensUsed: 50 }),
      ];
      const score = scorer.score(actions);
      expect(score).toBeLessThan(100);
    });

    it('should penalize failed actions', () => {
      const actions = [makeAction({ success: false, tokensUsed: 100 })];
      const score = scorer.score(actions);
      expect(score).toBeLessThan(100);
    });

    it('should penalize excessive whitespace content (>30%)', () => {
      // Build a string with >30% whitespace
      const spaces = ' '.repeat(50);
      const code = 'x';
      const content = spaces + code; // 50 spaces + 1 char = ~98% whitespace
      const actions = [makeAction({ content, tokensUsed: 200, success: true })];
      const score = scorer.score(actions);
      expect(score).toBeLessThan(100);
    });

    it('should clamp score to minimum 0', () => {
      // Many extremely wasteful actions should bottom out at 0, not go negative
      const actions: AgentAction[] = Array.from({ length: 50 }, () => ({
        type: 'code_generation' as const,
        content: '   ',
        timestamp: new Date(),
        tokensUsed: 500,
        success: false,
      }));
      const score = scorer.score(actions);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should clamp score to maximum 100', () => {
      const actions = [makeAction({ tokensUsed: 0 })];
      const score = scorer.score(actions);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ─── TaskCompletionVerifier ────────────────────────────────────────────────

  describe('TaskCompletionVerifier', () => {
    let verifier: TaskCompletionVerifier;

    beforeEach(() => {
      verifier = new TaskCompletionVerifier();
    });

    it('should report completion when test action exists and recent actions succeed', () => {
      const actions = [
        makeAction({ type: 'code_generation', content: 'building auth', success: true }),
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('build auth system', actions);
      expect(result.completed).toBe(true);
    });

    it('should flag missing test/verification step', () => {
      const actions = [makeAction({ type: 'code_generation', content: 'some code' })];
      const result = verifier.verify('build feature', actions);
      expect(result.issues).toContain('No test or verification step performed');
    });

    it('should detect task-abandonment language in final output', () => {
      const actions = [
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('build feature', actions, "I can't complete this task");
      expect(result.issues).toContain('Final output contains task-abandonment language');
    });

    it('should detect TODO/stub abandonment patterns', () => {
      const actions = [
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('build feature', actions, 'Left as exercise for the reader.');
      expect(result.issues).toContain('Final output contains task-abandonment language');
    });

    it('should detect "incomplete" or "work in progress" patterns', () => {
      const actions = [
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('build feature', actions, 'This is work in progress still incomplete.');
      expect(result.issues).toContain('Final output contains task-abandonment language');
    });

    it('should flag excessive corrections (>5)', () => {
      const corrections: AgentAction[] = Array.from({ length: 8 }, (_, i) =>
        makeAction({ type: 'correction', content: `fix attempt ${i}` }),
      );
      corrections.push(makeAction({ type: 'shell_command', content: 'npm test', success: true }));
      const result = verifier.verify('task', corrections);
      expect(result.issues.some((issue) => issue.includes('Excessive corrections'))).toBe(true);
    });

    it('should not flag corrections when count is 5 or fewer', () => {
      const corrections: AgentAction[] = Array.from({ length: 5 }, (_, i) =>
        makeAction({ type: 'correction', content: `fix ${i}` }),
      );
      corrections.push(makeAction({ type: 'shell_command', content: 'npm test', success: true }));
      const result = verifier.verify('task', corrections);
      expect(result.issues.some((issue) => issue.includes('Excessive corrections'))).toBe(false);
    });

    it('should boost confidence with good keyword coverage', () => {
      const actions = [
        makeAction({ type: 'code_generation', content: 'implementing authentication middleware', success: true }),
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('implement authentication middleware', actions);
      expect(result.confidence).toBeGreaterThan(65);
    });

    it('should flag poor keyword coverage', () => {
      const actions = [
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('implement complex authentication middleware system', actions);
      expect(result.issues).toContain('Task keywords are poorly represented in agent actions');
    });

    it('should return confidence clamped between 0 and 100', () => {
      const result = verifier.verify('task', []);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should return completed=true when confidence >= 60', () => {
      const actions = [
        makeAction({ type: 'code_generation', content: 'doing the task work', success: true }),
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
      ];
      const result = verifier.verify('task work', actions);
      expect(result.completed).toBe(true);
    });

    it('should flag recent failures', () => {
      const actions = [
        makeAction({ type: 'shell_command', content: 'npm test', success: true }),
        makeAction({ type: 'code_generation', content: 'fix', success: false }),
        makeAction({ type: 'shell_command', content: 'npm test', success: false }),
      ];
      const result = verifier.verify('task', actions);
      expect(result.issues).toContain('Recent actions include failures');
    });
  });

  // ─── BehaviorChecker ──────────────────────────────────────────────────────

  describe('BehaviorChecker', () => {
    let checker: BehaviorChecker;

    beforeEach(() => {
      checker = new BehaviorChecker(defaultConfig);
    });

    it('should return empty violations for a single successful action', () => {
      const violations = checker.check(makeAction({ success: true }));
      expect(violations).toHaveLength(0);
    });

    it('should detect repeated mistakes with identical error content', () => {
      const errorContent = 'TypeError: Cannot read property "x" of undefined';
      checker.check(makeAction({ content: errorContent, success: false }));
      checker.check(makeAction({ content: 'some other action', success: true }));
      const violations = checker.check(makeAction({ content: errorContent, success: false }));
      const repeated = violations.filter((v) => v.type === ViolationType.RepeatedMistake);
      expect(repeated.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT flag repeated mistakes for different error content', () => {
      checker.check(makeAction({ content: 'Error A', success: false }));
      const violations = checker.check(makeAction({ content: 'Error B', success: false }));
      const repeated = violations.filter((v) => v.type === ViolationType.RepeatedMistake);
      expect(repeated).toHaveLength(0);
    });

    it('should detect excessive retries beyond maxRetries', () => {
      // 4 consecutive failures exceeds default maxRetries of 3
      for (let i = 0; i < 4; i++) {
        const violations = checker.check(
          makeAction({ content: `error attempt ${i}`, success: false }),
        );
        if (i >= 3) {
          const excessive = violations.filter((v) => v.type === ViolationType.ExcessiveRetries);
          expect(excessive.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should reset retry count after a success', () => {
      // 3 failures
      checker.check(makeAction({ content: 'err 1', success: false }));
      checker.check(makeAction({ content: 'err 2', success: false }));
      checker.check(makeAction({ content: 'err 3', success: false }));
      // 1 success resets counter
      const okViolations = checker.check(makeAction({ content: 'fixed', success: true }));
      expect(okViolations).toHaveLength(0);
      // Next failure starts from retryCount=0, so no excessive retry
      const nextViolations = checker.check(makeAction({ content: 'err 4', success: false }));
      const excessive = nextViolations.filter((v) => v.type === ViolationType.ExcessiveRetries);
      expect(excessive).toHaveLength(0);
    });

    it('should detect unverified output from consecutive code generations', () => {
      checker.check(makeAction({ type: 'code_generation', content: 'code block 1', success: true }));
      checker.check(makeAction({ type: 'code_generation', content: 'code block 2', success: true }));
      // A third code_gen without tests triggers unverified output
      const violations = checker.check(makeAction({ type: 'code_generation', content: 'code block 3', success: true }));
      const unverified = violations.filter((v) => v.type === ViolationType.UnverifiedOutput);
      expect(unverified.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT flag unverified output when test actions are present', () => {
      checker.check(makeAction({ type: 'code_generation', content: 'code 1', success: true }));
      checker.check(makeAction({ type: 'shell_command', content: 'npm test', success: true }));
      checker.check(makeAction({ type: 'code_generation', content: 'code 2', success: true }));
      const violations = checker.check(makeAction({ type: 'code_generation', content: 'code 3', success: true }));
      const unverified = violations.filter((v) => v.type === ViolationType.UnverifiedOutput);
      expect(unverified).toHaveLength(0);
    });

    it('should clear all state on reset', () => {
      checker.check(makeAction({ content: 'error A', success: false }));
      checker.reset();
      // Same error after reset should not trigger repeated mistake
      const violations = checker.check(makeAction({ content: 'error A', success: false }));
      const repeated = violations.filter((v) => v.type === ViolationType.RepeatedMistake);
      expect(repeated).toHaveLength(0);
    });
  });

  // ─── ViolationLogger ──────────────────────────────────────────────────────

  describe('ViolationLogger', () => {
    let logger: ViolationLogger;

    beforeEach(() => {
      logger = new ViolationLogger();
    });

    it('should log a single violation', () => {
      logger.log(makeViolation());
      expect(logger.totalViolations).toBe(1);
    });

    it('should log multiple violations via logAll', () => {
      const violations = [
        makeViolation({ id: 'v-1', type: ViolationType.Hallucination }),
        makeViolation({ id: 'v-2', type: ViolationType.TokenWaste }),
        makeViolation({ id: 'v-3', type: ViolationType.IncompleteTask }),
      ];
      logger.logAll(violations);
      expect(logger.totalViolations).toBe(3);
    });

    it('should return all violations unfiltered', () => {
      logger.log(makeViolation({ type: ViolationType.Hallucination }));
      logger.log(makeViolation({ type: ViolationType.TokenWaste }));
      expect(logger.getViolations()).toHaveLength(2);
    });

    it('should filter violations by type', () => {
      logger.log(makeViolation({ type: ViolationType.Hallucination }));
      logger.log(makeViolation({ type: ViolationType.TokenWaste }));
      logger.log(makeViolation({ type: ViolationType.Hallucination }));
      expect(logger.getViolations({ type: ViolationType.Hallucination })).toHaveLength(2);
      expect(logger.getViolations({ type: ViolationType.TokenWaste })).toHaveLength(1);
    });

    it('should filter violations by severity', () => {
      logger.log(makeViolation({ severity: ViolationSeverity.Critical }));
      logger.log(makeViolation({ severity: ViolationSeverity.Low }));
      logger.log(makeViolation({ severity: ViolationSeverity.Low }));
      expect(logger.getViolations({ severity: ViolationSeverity.Low })).toHaveLength(2);
      expect(logger.getViolations({ severity: ViolationSeverity.Critical })).toHaveLength(1);
    });

    it('should filter by both type and severity combined', () => {
      logger.log(makeViolation({ type: ViolationType.Hallucination, severity: ViolationSeverity.High }));
      logger.log(makeViolation({ type: ViolationType.Hallucination, severity: ViolationSeverity.Low }));
      logger.log(makeViolation({ type: ViolationType.TokenWaste, severity: ViolationSeverity.High }));
      const filtered = logger.getViolations({
        type: ViolationType.Hallucination,
        severity: ViolationSeverity.High,
      });
      expect(filtered).toHaveLength(1);
    });

    it('should countBySeverity correctly', () => {
      logger.log(makeViolation({ severity: ViolationSeverity.High }));
      logger.log(makeViolation({ severity: ViolationSeverity.High }));
      logger.log(makeViolation({ severity: ViolationSeverity.Low }));
      const counts = logger.countBySeverity();
      expect(counts[ViolationSeverity.High]).toBe(2);
      expect(counts[ViolationSeverity.Low]).toBe(1);
      expect(counts[ViolationSeverity.Medium]).toBe(0);
      expect(counts[ViolationSeverity.Critical]).toBe(0);
    });

    it('should countByType correctly', () => {
      logger.log(makeViolation({ type: ViolationType.Hallucination }));
      logger.log(makeViolation({ type: ViolationType.Hallucination }));
      logger.log(makeViolation({ type: ViolationType.ExcessiveRetries }));
      const counts = logger.countByType();
      expect(counts[ViolationType.Hallucination]).toBe(2);
      expect(counts[ViolationType.ExcessiveRetries]).toBe(1);
    });

    it('should generateReport containing header and severity breakdown', () => {
      logger.log(makeViolation({ type: ViolationType.Hallucination, severity: ViolationSeverity.High }));
      const report = logger.generateReport();
      expect(report).toContain('Agent Violation Report');
      expect(report).toContain('Total violations: 1');
      expect(report).toContain('HIGH');
      expect(report).toContain('HALLUCINATION');
    });

    it('should generateReport with zero violations', () => {
      const report = logger.generateReport();
      expect(report).toContain('Total violations: 0');
    });

    it('should clear all violations', () => {
      logger.log(makeViolation());
      logger.log(makeViolation());
      logger.clear();
      expect(logger.totalViolations).toBe(0);
      expect(logger.getViolations()).toHaveLength(0);
    });

    it('should sort violations by timestamp descending in getViolations', () => {
      const early = new Date('2023-01-01T00:00:00Z');
      const mid = new Date('2024-06-15T12:00:00Z');
      const late = new Date('2025-12-31T23:59:59Z');
      logger.log(makeViolation({ id: 'v-early', timestamp: early, message: 'oldest' }));
      logger.log(makeViolation({ id: 'v-late', timestamp: late, message: 'newest' }));
      logger.log(makeViolation({ id: 'v-mid', timestamp: mid, message: 'middle' }));
      const all = logger.getViolations();
      expect(all[0]!.message).toBe('newest');
      expect(all[1]!.message).toBe('middle');
      expect(all[2]!.message).toBe('oldest');
    });
  });

  // ─── AgentValidator (full integration) ────────────────────────────────────

  describe('AgentValidator', () => {
    let validator: AgentValidator;

    beforeEach(() => {
      validator = new AgentValidator({
        sessionId: 'test-session',
        minimumScore: 70,
        maxHallucinations: 0,
        maxRetries: 3,
      });
    });

    it('should use default config values when none provided', () => {
      const v = new AgentValidator();
      expect(v.getViolations()).toHaveLength(0);
      // Should not throw on evaluate
      const score = v.evaluate('task');
      expect(score.sessionId).toMatch(/^session-/);
    });

    it('should accept partial config and merge with defaults', () => {
      const v = new AgentValidator({ sessionId: 'custom' });
      const score = v.evaluate('task');
      expect(score.sessionId).toBe('custom');
    });

    it('should record actions without throwing', () => {
      expect(() => {
        validator.recordAction(makeAction());
      }).not.toThrow();
    });

    it('should evaluate and return AgentScore with all metric fields', () => {
      validator.recordAction(makeAction());
      const score = validator.evaluate('task');
      expect(score.metrics).toBeDefined();
      expect(score.metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(score.metrics.accuracy).toBeLessThanOrEqual(100);
      expect(score.metrics.efficiency).toBeGreaterThanOrEqual(0);
      expect(score.metrics.efficiency).toBeLessThanOrEqual(100);
      expect(score.metrics.completion).toBeGreaterThanOrEqual(0);
      expect(score.metrics.completion).toBeLessThanOrEqual(100);
      expect(score.metrics.compliance).toBeGreaterThanOrEqual(0);
      expect(score.metrics.compliance).toBeLessThanOrEqual(100);
      expect(score.metrics.overall).toBeGreaterThanOrEqual(0);
      expect(score.metrics.overall).toBeLessThanOrEqual(100);
      expect(score.evaluatedAt).toBeInstanceOf(Date);
      expect(score.sessionId).toBe('test-session');
      expect(score.violations).toBeInstanceOf(Array);
    });

    it('should give a high overall score for a clean, successful session', () => {
      const actions: AgentAction[] = [
        makeAction({ type: 'code_generation', content: 'Implementing user authentication', success: true, tokensUsed: 200 }),
        makeAction({ type: 'file_operation', content: 'Write auth module', success: true, tokensUsed: 100 }),
        makeAction({ type: 'shell_command', content: 'npm test', success: true, tokensUsed: 150 }),
        makeAction({ type: 'shell_command', content: 'npm run lint', success: true, tokensUsed: 100 }),
      ];
      for (const a of actions) validator.recordAction(a);
      const score = validator.evaluate('Implement user authentication');
      expect(score.metrics.overall).toBeGreaterThanOrEqual(70);
    });

    it('should detect hallucination violations in explanation actions', () => {
      validator.recordAction({
        type: 'explanation',
        content: 'This undocumented API function is always guaranteed to work.',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });
      const violations = validator.getViolations();
      const hallucinations = violations.filter((v) => v.type === ViolationType.Hallucination);
      expect(hallucinations.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect hallucination violations in code_generation actions', () => {
      validator.recordAction({
        type: 'code_generation',
        content: 'import { spell } from "@magic/wand";\nconst x = 1;',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });
      const violations = validator.getViolations();
      const hallucinations = violations.filter((v) => v.type === ViolationType.Hallucination);
      expect(hallucinations.length).toBeGreaterThanOrEqual(1);
    });

    it('should lower accuracy metric when hallucinations are present', () => {
      validator.recordAction({
        type: 'explanation',
        content: 'This undocumented API works.',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });
      validator.recordAction({
        type: 'explanation',
        content: 'This unreleased function is version 99.1.0.',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });
      const score = validator.evaluate('task');
      expect(score.metrics.accuracy).toBeLessThan(100);
    });

    it('should detect repeated mistakes through recordAction', () => {
      const errorMsg = 'SyntaxError: unexpected token';
      validator.recordAction(makeAction({ content: errorMsg, success: false }));
      validator.recordAction(makeAction({ content: 'some other', success: true }));
      validator.recordAction(makeAction({ content: errorMsg, success: false }));
      const violations = validator.getViolations();
      const repeated = violations.filter((v) => v.type === ViolationType.RepeatedMistake);
      expect(repeated.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect excessive retries through recordAction', () => {
      for (let i = 0; i < 6; i++) {
        validator.recordAction(makeAction({ content: `error ${i}`, success: false }));
      }
      const violations = validator.getViolations();
      const excessive = violations.filter((v) => v.type === ViolationType.ExcessiveRetries);
      expect(excessive.length).toBeGreaterThanOrEqual(1);
    });

    it('should meetsMinimumThreshold return true for clean session', () => {
      validator.recordAction(makeAction({ type: 'code_generation', content: 'Implement user auth', success: true }));
      validator.recordAction(makeAction({ type: 'shell_command', content: 'npm test', success: true }));
      expect(validator.meetsMinimumThreshold('Implement user auth')).toBe(true);
    });

    it('should meetsMinimumThreshold return false for heavily violated session', () => {
      // Pump in many hallucinations and failures to tank the score
      for (let i = 0; i < 5; i++) {
        validator.recordAction({
          type: 'explanation',
          content: `This undocumented API ${i} is version 99.${i}.0.`,
          timestamp: new Date(),
          tokensUsed: 100,
          success: true,
        });
      }
      for (let i = 0; i < 5; i++) {
        validator.recordAction(makeAction({ content: `error ${i}`, success: false }));
      }
      expect(validator.meetsMinimumThreshold('do things')).toBe(false);
    });

    it('should getReport return a string with report header', () => {
      validator.recordAction(makeAction());
      const report = validator.getReport();
      expect(report).toContain('Agent Violation Report');
    });

    it('should getViolations return all logged violations', () => {
      validator.recordAction(makeAction());
      expect(validator.getViolations()).toBeInstanceOf(Array);
    });

    it('should reset clear all state for a fresh evaluation', () => {
      validator.recordAction({
        type: 'explanation',
        content: 'This undocumented API works.',
        timestamp: new Date(),
        tokensUsed: 100,
        success: true,
      });
      expect(validator.getViolations().length).toBeGreaterThanOrEqual(1);
      validator.reset();
      expect(validator.getViolations()).toHaveLength(0);
      // After reset, a clean action should not produce violations
      validator.recordAction(makeAction({ type: 'code_generation', content: 'clean code', success: true }));
      expect(validator.getViolations()).toHaveLength(0);
    });

    it('should pass final output through to TaskCompletionVerifier', () => {
      validator.recordAction(makeAction({ type: 'shell_command', content: 'npm test', success: true }));
      const scoreGood = validator.evaluate('task', 'All done successfully!');
      const scoreBad = validator.evaluate('task', "I can't complete this task");
      // Abandonment language should lower completion
      expect(scoreBad.metrics.completion).toBeLessThan(scoreGood.metrics.completion);
    });

    it('should produce a valid AgentScore structure', () => {
      validator.recordAction(makeAction());
      const score: AgentScore = validator.evaluate('test task');
      // Verify all required fields exist and have correct types
      expect(typeof score.metrics.accuracy).toBe('number');
      expect(typeof score.metrics.efficiency).toBe('number');
      expect(typeof score.metrics.completion).toBe('number');
      expect(typeof score.metrics.compliance).toBe('number');
      expect(typeof score.metrics.overall).toBe('number');
      expect(Array.isArray(score.violations)).toBe(true);
      expect(score.evaluatedAt).toBeInstanceOf(Date);
      expect(typeof score.sessionId).toBe('string');
    });
  });
});
