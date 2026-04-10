import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualityDimension,
  Severity,
  TrendDirection,
  CodeSmellCategory,
  QualityGrade,
  QualityScorer,
} from '../../deerflow/algorithms/quality-scoring.js';
import type {
  CodeSmell,
  DimensionScore,
  QualityReport,
  TechnicalDebtSummary,
  TrendAnalysis,
  BenchmarkComparison,
} from '../../deerflow/algorithms/quality-scoring.js';

describe('quality-scoring', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer();
  });

  // ── Enum verification ────────────────────────────────────────────────────
  describe('QualityDimension enum', () => {
    it('should have exactly 5 dimensions', () => {
      expect(Object.values(QualityDimension)).toHaveLength(5);
    });

    it('should have correct string values', () => {
      expect(QualityDimension.CORRECTNESS).toBe('correctness');
      expect(QualityDimension.MAINTAINABILITY).toBe('maintainability');
      expect(QualityDimension.PERFORMANCE).toBe('performance');
      expect(QualityDimension.SECURITY).toBe('security');
      expect(QualityDimension.TESTABILITY).toBe('testability');
    });
  });

  describe('Severity enum', () => {
    it('should have exactly 5 levels', () => {
      expect(Object.values(Severity)).toHaveLength(5);
    });

    it('should have correct string values', () => {
      expect(Severity.INFO).toBe('INFO');
      expect(Severity.LOW).toBe('LOW');
      expect(Severity.MEDIUM).toBe('MEDIUM');
      expect(Severity.HIGH).toBe('HIGH');
      expect(Severity.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('TrendDirection enum', () => {
    it('should have exactly 3 directions', () => {
      expect(Object.values(TrendDirection)).toHaveLength(3);
    });

    it('should have correct string values', () => {
      expect(TrendDirection.IMPROVING).toBe('IMPROVING');
      expect(TrendDirection.STABLE).toBe('STABLE');
      expect(TrendDirection.DEGRADING).toBe('DEGRADING');
    });
  });

  describe('CodeSmellCategory enum', () => {
    it('should have exactly 10 categories', () => {
      expect(Object.values(CodeSmellCategory)).toHaveLength(10);
    });

    it('should include all expected categories', () => {
      expect(CodeSmellCategory.COMPLEXITY).toBe('complexity');
      expect(CodeSmellCategory.NAMING).toBe('naming');
      expect(CodeSmellCategory.DUPLICATION).toBe('duplication');
      expect(CodeSmellCategory.DEAD_CODE).toBe('dead_code');
      expect(CodeSmellCategory.SECURITY).toBe('security');
      expect(CodeSmellCategory.PERFORMANCE).toBe('performance');
      expect(CodeSmellCategory.DESIGN).toBe('design');
      expect(CodeSmellCategory.DOCUMENTATION).toBe('documentation');
      expect(CodeSmellCategory.TYPE_SAFETY).toBe('type_safety');
      expect(CodeSmellCategory.ERROR_HANDLING).toBe('error_handling');
    });
  });

  describe('QualityGrade enum', () => {
    it('should have exactly 8 grades', () => {
      expect(Object.values(QualityGrade)).toHaveLength(8);
    });

    it('should have correct string values', () => {
      expect(QualityGrade.A_PLUS).toBe('A+');
      expect(QualityGrade.A).toBe('A');
      expect(QualityGrade.B_PLUS).toBe('B+');
      expect(QualityGrade.B).toBe('B');
      expect(QualityGrade.C_PLUS).toBe('C+');
      expect(QualityGrade.C).toBe('C');
      expect(QualityGrade.D).toBe('D');
      expect(QualityGrade.F).toBe('F');
    });
  });

  // ── Grade assignment ─────────────────────────────────────────────────────
  describe('assignGrade', () => {
    it('should assign A+ for scores 95–100', () => {
      expect(QualityScorer.assignGrade(95)).toBe(QualityGrade.A_PLUS);
      expect(QualityScorer.assignGrade(97)).toBe(QualityGrade.A_PLUS);
      expect(QualityScorer.assignGrade(100)).toBe(QualityGrade.A_PLUS);
    });

    it('should assign A for scores 90–94', () => {
      expect(QualityScorer.assignGrade(90)).toBe(QualityGrade.A);
      expect(QualityScorer.assignGrade(92)).toBe(QualityGrade.A);
      expect(QualityScorer.assignGrade(94)).toBe(QualityGrade.A);
    });

    it('should assign B+ for scores 85–89', () => {
      expect(QualityScorer.assignGrade(85)).toBe(QualityGrade.B_PLUS);
      expect(QualityScorer.assignGrade(87)).toBe(QualityGrade.B_PLUS);
      expect(QualityScorer.assignGrade(89)).toBe(QualityGrade.B_PLUS);
    });

    it('should assign B for scores 80–84', () => {
      expect(QualityScorer.assignGrade(80)).toBe(QualityGrade.B);
      expect(QualityScorer.assignGrade(82)).toBe(QualityGrade.B);
      expect(QualityScorer.assignGrade(84)).toBe(QualityGrade.B);
    });

    it('should assign C+ for scores 75–79', () => {
      expect(QualityScorer.assignGrade(75)).toBe(QualityGrade.C_PLUS);
      expect(QualityScorer.assignGrade(77)).toBe(QualityGrade.C_PLUS);
      expect(QualityScorer.assignGrade(79)).toBe(QualityGrade.C_PLUS);
    });

    it('should assign C for scores 70–74', () => {
      expect(QualityScorer.assignGrade(70)).toBe(QualityGrade.C);
      expect(QualityScorer.assignGrade(72)).toBe(QualityGrade.C);
      expect(QualityScorer.assignGrade(74)).toBe(QualityGrade.C);
    });

    it('should assign D for scores 60–69', () => {
      expect(QualityScorer.assignGrade(60)).toBe(QualityGrade.D);
      expect(QualityScorer.assignGrade(65)).toBe(QualityGrade.D);
      expect(QualityScorer.assignGrade(69)).toBe(QualityGrade.D);
    });

    it('should assign F for scores 0–59', () => {
      expect(QualityScorer.assignGrade(59)).toBe(QualityGrade.F);
      expect(QualityScorer.assignGrade(30)).toBe(QualityGrade.F);
      expect(QualityScorer.assignGrade(0)).toBe(QualityGrade.F);
    });
  });

  // ── Dimension score management ───────────────────────────────────────────
  describe('setDimensionScore / getDimensionScore', () => {
    it('should default all dimensions to 100', () => {
      for (const dim of Object.values(QualityDimension)) {
        expect(scorer.getDimensionScore(dim)).toBe(100);
      }
    });

    it('should set and retrieve a dimension score', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 85);
      expect(scorer.getDimensionScore(QualityDimension.CORRECTNESS)).toBe(85);
    });

    it('should round score to 2 decimal places', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 85.567);
      expect(scorer.getDimensionScore(QualityDimension.CORRECTNESS)).toBe(85.57);
    });

    it('should throw for score below 0', () => {
      expect(() => scorer.setDimensionScore(QualityDimension.CORRECTNESS, -0.01)).toThrow();
      expect(() => scorer.setDimensionScore(QualityDimension.CORRECTNESS, -100)).toThrow();
    });

    it('should throw for score above 100', () => {
      expect(() => scorer.setDimensionScore(QualityDimension.CORRECTNESS, 100.01)).toThrow();
      expect(() => scorer.setDimensionScore(QualityDimension.CORRECTNESS, 200)).toThrow();
    });

    it('should accept exact boundary values 0 and 100', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 0);
      expect(scorer.getDimensionScore(QualityDimension.CORRECTNESS)).toBe(0);
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 100);
      expect(scorer.getDimensionScore(QualityDimension.CORRECTNESS)).toBe(100);
    });

    it('should store issues alongside dimension score', () => {
      scorer.setDimensionScore(QualityDimension.SECURITY, 70, ['Missing auth check', 'SQL injection risk']);
      const results = scorer.computeDimensionResults();
      const secDim = results.find((d) => d.dimension === QualityDimension.SECURITY)!;
      expect(secDim.issues).toHaveLength(2);
      expect(secDim.issues[0]).toBe('Missing auth check');
    });
  });

  // ── addDimensionIssue ────────────────────────────────────────────────────
  describe('addDimensionIssue', () => {
    it('should append an issue to an existing dimension', () => {
      scorer.setDimensionScore(QualityDimension.PERFORMANCE, 90, ['N+1 query']);
      scorer.addDimensionIssue(QualityDimension.PERFORMANCE, 'Slow loop detected');
      const results = scorer.computeDimensionResults();
      const perfDim = results.find((d) => d.dimension === QualityDimension.PERFORMANCE)!;
      expect(perfDim.issues).toHaveLength(2);
      expect(perfDim.issues).toContain('Slow loop detected');
    });

    it('should create issues array if none existed', () => {
      scorer.addDimensionIssue(QualityDimension.TESTABILITY, 'No test file found');
      const results = scorer.computeDimensionResults();
      const testDim = results.find((d) => d.dimension === QualityDimension.TESTABILITY)!;
      expect(testDim.issues).toContain('No test file found');
    });
  });

  // ── Code smell management ────────────────────────────────────────────────
  describe('code smell management', () => {
    const baseSmell: CodeSmell = {
      id: 'sm1', name: 'Long Function', description: 'Function exceeds 50 lines',
      filePath: 'handler.ts', line: 42, severity: Severity.MEDIUM, penalty: 5,
      category: CodeSmellCategory.COMPLEXITY, suggestion: 'Extract sub-functions.',
    };

    it('should add a code smell', () => {
      scorer.addCodeSmell(baseSmell);
      expect(scorer.getCodeSmells()).toHaveLength(1);
      expect(scorer.getCodeSmells()[0]!.id).toBe('sm1');
    });

    it('should return a copy from getCodeSmells (not internal reference)', () => {
      scorer.addCodeSmell(baseSmell);
      const copy = scorer.getCodeSmells();
      copy.push({ ...baseSmell, id: 'fake' });
      expect(scorer.getCodeSmells()).toHaveLength(1);
    });

    it('should filter code smells by category', () => {
      scorer.addCodeSmell(baseSmell);
      scorer.addCodeSmell({ ...baseSmell, id: 'sm2', category: CodeSmellCategory.NAMING });
      scorer.addCodeSmell({ ...baseSmell, id: 'sm3', category: CodeSmellCategory.COMPLEXITY });
      expect(scorer.getCodeSmellsByCategory(CodeSmellCategory.COMPLEXITY)).toHaveLength(2);
      expect(scorer.getCodeSmellsByCategory(CodeSmellCategory.NAMING)).toHaveLength(1);
      expect(scorer.getCodeSmellsByCategory(CodeSmellCategory.SECURITY)).toHaveLength(0);
    });

    it('should filter code smells by severity', () => {
      scorer.addCodeSmell(baseSmell);
      scorer.addCodeSmell({ ...baseSmell, id: 'sm2', severity: Severity.CRITICAL });
      scorer.addCodeSmell({ ...baseSmell, id: 'sm3', severity: Severity.MEDIUM });
      expect(scorer.getCodeSmellsBySeverity(Severity.MEDIUM)).toHaveLength(2);
      expect(scorer.getCodeSmellsBySeverity(Severity.CRITICAL)).toHaveLength(1);
    });

    it('should remove a code smell by id and return true', () => {
      scorer.addCodeSmell(baseSmell);
      expect(scorer.removeCodeSmell('sm1')).toBe(true);
      expect(scorer.getCodeSmells()).toHaveLength(0);
    });

    it('should return false when removing a nonexistent code smell', () => {
      expect(scorer.removeCodeSmell('ghost')).toBe(false);
    });

    it('should remove all code smells for a file path', () => {
      scorer.addCodeSmell(baseSmell);
      scorer.addCodeSmell({ ...baseSmell, id: 'sm2', filePath: 'handler.ts' });
      scorer.addCodeSmell({ ...baseSmell, id: 'sm3', filePath: 'other.ts' });
      const removed = scorer.removeCodeSmellsForFile('handler.ts');
      expect(removed).toBe(2);
      expect(scorer.getCodeSmells()).toHaveLength(1);
      expect(scorer.getCodeSmells()[0]!.filePath).toBe('other.ts');
    });

    it('should return 0 when no smells match the file path', () => {
      expect(scorer.removeCodeSmellsForFile('nonexistent.ts')).toBe(0);
    });
  });

  // ── Total penalty computation ────────────────────────────────────────────
  describe('computeTotalPenalty', () => {
    it('should return 0 with no code smells', () => {
      expect(scorer.computeTotalPenalty()).toBe(0);
    });

    it('should multiply penalty by severity multiplier (LOW=1, MEDIUM=2, HIGH=4, CRITICAL=8)', () => {
      scorer.addCodeSmell({
        id: 'low', name: 'Low', description: '', filePath: 'a.ts',
        severity: Severity.LOW, penalty: 5, category: CodeSmellCategory.COMPLEXITY,
      });
      scorer.addCodeSmell({
        id: 'med', name: 'Med', description: '', filePath: 'a.ts',
        severity: Severity.MEDIUM, penalty: 5, category: CodeSmellCategory.NAMING,
      });
      scorer.addCodeSmell({
        id: 'high', name: 'High', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 5, category: CodeSmellCategory.SECURITY,
      });
      scorer.addCodeSmell({
        id: 'crit', name: 'Crit', description: '', filePath: 'a.ts',
        severity: Severity.CRITICAL, penalty: 5, category: CodeSmellCategory.SECURITY,
      });
      // 5*1 + 5*2 + 5*4 + 5*8 = 5 + 10 + 20 + 40 = 75
      expect(scorer.computeTotalPenalty()).toBe(75);
    });

    it('should multiply INFO severity by 0 (no penalty)', () => {
      scorer.addCodeSmell({
        id: 'info', name: 'Info', description: '', filePath: 'a.ts',
        severity: Severity.INFO, penalty: 100, category: CodeSmellCategory.DOCUMENTATION,
      });
      expect(scorer.computeTotalPenalty()).toBe(0);
    });
  });

  // ── Weighted score computation ───────────────────────────────────────────
  describe('computeWeightedScore', () => {
    it('should return 100 when all dimensions are 100 and no smells', () => {
      expect(scorer.computeWeightedScore()).toBe(100);
    });

    it('should compute weighted average of dimension scores', () => {
      // Set only correctness; other dims remain 100
      // Weights: correctness=0.30, maintainability=0.25, performance=0.15, security=0.20, testability=0.10
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 80);
      // (80*0.30 + 100*0.25 + 100*0.15 + 100*0.20 + 100*0.10) = 24 + 25 + 15 + 20 + 10 = 94
      expect(scorer.computeWeightedScore()).toBe(94);
    });

    it('should subtract total penalty from weighted average', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'High', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 10, category: CodeSmellCategory.SECURITY,
      });
      // Base = 100, penalty = 10*4 = 40, final = 100-40 = 60
      expect(scorer.computeWeightedScore()).toBe(60);
    });

    it('should clamp score to minimum 0', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 0);
      scorer.setDimensionScore(QualityDimension.MAINTAINABILITY, 0);
      scorer.setDimensionScore(QualityDimension.PERFORMANCE, 0);
      scorer.setDimensionScore(QualityDimension.SECURITY, 0);
      scorer.setDimensionScore(QualityDimension.TESTABILITY, 0);
      scorer.addCodeSmell({
        id: 'sm1', name: 'Crit', description: '', filePath: 'a.ts',
        severity: Severity.CRITICAL, penalty: 100, category: CodeSmellCategory.SECURITY,
      });
      const score = scorer.computeWeightedScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should clamp score to maximum 100', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 100);
      // Even with weird rounding, should never exceed 100
      expect(scorer.computeWeightedScore()).toBeLessThanOrEqual(100);
    });
  });

  // ── Dimension results computation ────────────────────────────────────────
  describe('computeDimensionResults', () => {
    it('should return a result for every dimension', () => {
      const results = scorer.computeDimensionResults();
      expect(results).toHaveLength(5);
    });

    it('should include dimension, score, weight, weightedScore, and issues', () => {
      const results = scorer.computeDimensionResults();
      for (const r of results) {
        expect(r).toHaveProperty('dimension');
        expect(r).toHaveProperty('score');
        expect(r).toHaveProperty('weight');
        expect(r).toHaveProperty('weightedScore');
        expect(r).toHaveProperty('issues');
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
        expect(r.weight).toBeGreaterThan(0);
      }
    });

    it('should subtract dimension-relevant smell penalties from raw score', () => {
      scorer.setDimensionScore(QualityDimension.SECURITY, 90);
      scorer.addCodeSmell({
        id: 'sm1', name: 'Sec issue', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 3, category: CodeSmellCategory.SECURITY,
      });
      const results = scorer.computeDimensionResults();
      const secResult = results.find((d) => d.dimension === QualityDimension.SECURITY)!;
      // SECURITY category maps to [SECURITY, CORRECTNESS]; HIGH multiplier = 4
      // 90 - (3 * 4) = 78
      expect(secResult.score).toBe(78);
    });

    it('should not penalize dimensions that a smell category is not relevant to', () => {
      scorer.setDimensionScore(QualityDimension.PERFORMANCE, 95);
      scorer.addCodeSmell({
        id: 'sm1', name: 'Naming issue', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 10, category: CodeSmellCategory.NAMING,
      });
      const results = scorer.computeDimensionResults();
      const perfResult = results.find((d) => d.dimension === QualityDimension.PERFORMANCE)!;
      // NAMING only maps to MAINTAINABILITY
      expect(perfResult.score).toBe(95);
    });

    it('should compute weightedScore as score * weight', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 80);
      const results = scorer.computeDimensionResults();
      const corrResult = results.find((d) => d.dimension === QualityDimension.CORRECTNESS)!;
      expect(corrResult.weightedScore).toBeCloseTo(80 * 0.30, 2);
    });
  });

  // ── Technical debt calculation ───────────────────────────────────────────
  describe('calculateTechnicalDebt', () => {
    it('should return zero debt with no code smells', () => {
      const debt: TechnicalDebtSummary = scorer.calculateTechnicalDebt();
      expect(debt.totalDebtHours).toBe(0);
      expect(debt.debtRatio).toBe(0);
      expect(debt.topItems).toHaveLength(0);
    });

    it('should calculate debt hours as penalty * severity_multiplier * hoursPerPenalty', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'High smell', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 5, category: CodeSmellCategory.COMPLEXITY,
      });
      const debt = scorer.calculateTechnicalDebt();
      // 5 * 4 (HIGH) * 0.5 (default hours per penalty) = 10 hours
      expect(debt.totalDebtHours).toBe(10);
    });

    it('should break down debt by category', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'Complex', description: '', filePath: 'a.ts',
        severity: Severity.MEDIUM, penalty: 5, category: CodeSmellCategory.COMPLEXITY,
      });
      scorer.addCodeSmell({
        id: 'sm2', name: 'Perf issue', description: '', filePath: 'a.ts',
        severity: Severity.MEDIUM, penalty: 3, category: CodeSmellCategory.PERFORMANCE,
      });
      const debt = scorer.calculateTechnicalDebt();
      expect(debt.byCategory.get(CodeSmellCategory.COMPLEXITY)).toBe(5 * 2 * 0.5); // 5
      expect(debt.byCategory.get(CodeSmellCategory.PERFORMANCE)).toBe(3 * 2 * 0.5); // 3
    });

    it('should break down debt by severity', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'Low smell', description: '', filePath: 'a.ts',
        severity: Severity.LOW, penalty: 4, category: CodeSmellCategory.NAMING,
      });
      const debt = scorer.calculateTechnicalDebt();
      expect(debt.bySeverity.get(Severity.LOW)).toBe(4 * 1 * 0.5); // 2
    });

    it('should return top 3 items sorted by impact', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'Critical', description: '', filePath: 'a.ts',
        severity: Severity.CRITICAL, penalty: 10, category: CodeSmellCategory.SECURITY,
      });
      scorer.addCodeSmell({
        id: 'sm2', name: 'High', description: '', filePath: 'a.ts',
        severity: Severity.HIGH, penalty: 10, category: CodeSmellCategory.COMPLEXITY,
      });
      scorer.addCodeSmell({
        id: 'sm3', name: 'Medium', description: '', filePath: 'a.ts',
        severity: Severity.MEDIUM, penalty: 10, category: CodeSmellCategory.NAMING,
      });
      scorer.addCodeSmell({
        id: 'sm4', name: 'Low', description: '', filePath: 'a.ts',
        severity: Severity.LOW, penalty: 10, category: CodeSmellCategory.DOCUMENTATION,
      });
      scorer.addCodeSmell({
        id: 'sm5', name: 'Info', description: '', filePath: 'a.ts',
        severity: Severity.INFO, penalty: 10, category: CodeSmellCategory.DOCUMENTATION,
      });
      const debt = scorer.calculateTechnicalDebt();
      expect(debt.topItems).toHaveLength(3);
      // Top item should be the CRITICAL one
      expect(debt.topItems[0]!.id).toBe('sm1');
      expect(debt.topItems[1]!.id).toBe('sm2');
      expect(debt.topItems[2]!.id).toBe('sm3');
    });

    it('should compute debt ratio against a 40-hour baseline', () => {
      scorer.addCodeSmell({
        id: 'sm1', name: 'Crit', description: '', filePath: 'a.ts',
        severity: Severity.CRITICAL, penalty: 100, category: CodeSmellCategory.SECURITY,
      });
      const debt = scorer.calculateTechnicalDebt();
      // 100 * 8 * 0.5 = 400 hours; ratio = min(1, 400/40) = 1.0
      expect(debt.debtRatio).toBe(1);
    });
  });

  // ── Trend analysis ───────────────────────────────────────────────────────
  describe('trend analysis', () => {
    it('should return undefined with insufficient history (need >= 2)', () => {
      expect(scorer.analyzeTrend()).toBeUndefined();
    });

    it('should return undefined with only 1 history entry', () => {
      scorer.clearHistory();
      scorer.recordHistory(80, new Map());
      expect(scorer.analyzeTrend()).toBeUndefined();
    });

    it('should detect IMPROVING trend when average change > 1', () => {
      scorer.clearHistory();
      const dimMap = () => {
        const m = new Map<QualityDimension, number>();
        for (const dim of Object.values(QualityDimension)) m.set(dim, 70);
        return m;
      };
      scorer.recordHistory(70, dimMap());
      // Change each dim to 80
      const dimMap2 = new Map<QualityDimension, number>();
      for (const dim of Object.values(QualityDimension)) dimMap2.set(dim, 80);
      scorer.recordHistory(80, dimMap2);
      const trend: TrendAnalysis = scorer.analyzeTrend()!;
      expect(trend.direction).toBe(TrendDirection.IMPROVING);
      expect(trend.averageChange).toBeGreaterThan(0);
    });

    it('should detect DEGRADING trend when average change < -1', () => {
      scorer.clearHistory();
      const dimMap = () => {
        const m = new Map<QualityDimension, number>();
        for (const dim of Object.values(QualityDimension)) m.set(dim, 80);
        return m;
      };
      scorer.recordHistory(80, dimMap());
      const dimMap2 = new Map<QualityDimension, number>();
      for (const dim of Object.values(QualityDimension)) dimMap2.set(dim, 60);
      scorer.recordHistory(60, dimMap2);
      const trend: TrendAnalysis = scorer.analyzeTrend()!;
      expect(trend.direction).toBe(TrendDirection.DEGRADING);
    });

    it('should detect STABLE trend when average change is within [-1, 1]', () => {
      scorer.clearHistory();
      const dimMap = () => {
        const m = new Map<QualityDimension, number>();
        for (const dim of Object.values(QualityDimension)) m.set(dim, 75);
        return m;
      };
      scorer.recordHistory(75, dimMap());
      const dimMap2 = new Map<QualityDimension, number>();
      for (const dim of Object.values(QualityDimension)) dimMap2.set(dim, 76);
      scorer.recordHistory(76, dimMap2);
      const trend: TrendAnalysis = scorer.analyzeTrend()!;
      expect(trend.direction).toBe(TrendDirection.STABLE);
    });

    it('should include per-dimension trends', () => {
      scorer.clearHistory();
      const dimMap1 = new Map<QualityDimension, number>();
      for (const dim of Object.values(QualityDimension)) dimMap1.set(dim, 70);
      scorer.recordHistory(70, dimMap1);
      const dimMap2 = new Map<QualityDimension, number>();
      for (const dim of Object.values(QualityDimension)) dimMap2.set(dim, 80);
      scorer.recordHistory(80, dimMap2);
      const trend = scorer.analyzeTrend()!;
      expect(trend.dimensionTrends.size).toBe(5);
      for (const dir of trend.dimensionTrends.values()) {
        expect(dir).toBe(TrendDirection.IMPROVING);
      }
    });

    it('should include historical scores', () => {
      scorer.clearHistory();
      scorer.recordHistory(70, new Map());
      scorer.recordHistory(80, new Map());
      const trend = scorer.analyzeTrend()!;
      expect(trend.historicalScores).toHaveLength(2);
      expect(trend.historicalScores[0]!.score).toBe(70);
      expect(trend.historicalScores[1]!.score).toBe(80);
    });
  });

  // ── Benchmark comparison ─────────────────────────────────────────────────
  describe('benchmark', () => {
    it('should return BenchmarkComparison with default category', () => {
      const result: BenchmarkComparison = scorer.benchmark(85)!;
      expect(result.industryAverage).toBe(70);
      expect(result.deltaFromAverage).toBe(15);
      expect(result.percentile).toBeGreaterThan(50);
      expect(result.category).toBe('default');
    });

    it('should use custom benchmark category when configured', () => {
      const customScorer = new QualityScorer({ benchmarkCategory: 'api-server' });
      const result = customScorer.benchmark(74)!;
      expect(result.industryAverage).toBe(74);
      expect(result.deltaFromAverage).toBe(0);
    });

    it('should return percentile > 50 when above industry average', () => {
      const result = scorer.benchmark(90)!;
      expect(result.percentile).toBeGreaterThan(50);
    });

    it('should return percentile < 50 when below industry average', () => {
      const result = scorer.benchmark(50)!;
      expect(result.percentile).toBeLessThan(50);
    });

    it('should return undefined when benchmarking is disabled', () => {
      const noBenchScorer = new QualityScorer({ enableBenchmarking: false });
      expect(noBenchScorer.benchmark(85)).toBeUndefined();
    });

    it('should support all predefined benchmark categories', () => {
      const categories = ['web-frontend', 'api-server', 'library', 'cli-tool', 'fullstack'];
      for (const cat of categories) {
        const s = new QualityScorer({ benchmarkCategory: cat });
        const result = s.benchmark(80)!;
        expect(result.category).toBe(cat);
      }
    });
  });

  // ── Report generation ────────────────────────────────────────────────────
  describe('generateReport', () => {
    it('should generate a complete QualityReport', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 90);
      const report: QualityReport = scorer.generateReport('handler.ts');
      expect(report.id).toMatch(/^qr-\d{6}$/);
      expect(report.target).toBe('handler.ts');
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.grade).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.dimensions).toHaveLength(5);
      expect(report.technicalDebt).toBeDefined();
      expect(report.codeSmells).toBeDefined();
    });

    it('should assign correct grade based on score', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 96);
      const report = scorer.generateReport('perfect.ts');
      expect(report.grade).toBe(QualityGrade.A_PLUS);
    });

    it('should include benchmark in report when enabled', () => {
      const report = scorer.generateReport('app.ts');
      expect(report.benchmark).toBeDefined();
    });

    it('should not include benchmark when disabled', () => {
      const noBench = new QualityScorer({ enableBenchmarking: false });
      const report = noBench.generateReport('app.ts');
      expect(report.benchmark).toBeUndefined();
    });

    it('should increment report id sequentially', () => {
      const r1 = scorer.generateReport('a.ts');
      const r2 = scorer.generateReport('b.ts');
      expect(r1.id).toBe('qr-000001');
      expect(r2.id).toBe('qr-000002');
    });

    it('should record history for each generated report', () => {
      scorer.generateReport('a.ts');
      scorer.generateReport('b.ts');
      scorer.generateReport('c.ts');
      expect(scorer.historyCount).toBe(3);
    });
  });

  // ── Reset and clearHistory ───────────────────────────────────────────────
  describe('reset and clearHistory', () => {
    it('should reset dimension scores to 100 and clear code smells but keep history', () => {
      scorer.setDimensionScore(QualityDimension.CORRECTNESS, 50);
      scorer.setDimensionScore(QualityDimension.SECURITY, 30);
      scorer.addCodeSmell({
        id: 'sm1', name: 'Smell', description: '', filePath: 'a.ts',
        severity: Severity.LOW, penalty: 5, category: CodeSmellCategory.COMPLEXITY,
      });
      scorer.generateReport('a.ts');
      scorer.reset();
      expect(scorer.getDimensionScore(QualityDimension.CORRECTNESS)).toBe(100);
      expect(scorer.getDimensionScore(QualityDimension.SECURITY)).toBe(100);
      expect(scorer.getCodeSmells()).toHaveLength(0);
      expect(scorer.historyCount).toBe(1);
    });

    it('should clearHistory remove all historical records', () => {
      scorer.generateReport('a.ts');
      scorer.generateReport('b.ts');
      expect(scorer.historyCount).toBe(2);
      scorer.clearHistory();
      expect(scorer.historyCount).toBe(0);
    });

    it('should clearHistory make trend analysis return undefined', () => {
      scorer.generateReport('a.ts');
      scorer.generateReport('b.ts');
      scorer.clearHistory();
      expect(scorer.analyzeTrend()).toBeUndefined();
    });
  });
});
