/**
 * @module quality-scoring
 * @description Quality scoring algorithm for automated code assessment within
 * the Deerflow Agent Framework. Evaluates code across multiple dimensions
 * (correctness, maintainability, performance, security, testability), applies
 * weighted scoring, penalizes code smells, tracks technical debt, performs
 * trend analysis, and benchmarks against industry standards.
 */

// ─── Interfaces & Enums ───────────────────────────────────────────────────────

/**
 * Quality dimensions used for scoring.
 */
export enum QualityDimension {
  CORRECTNESS = 'correctness',
  MAINTAINABILITY = 'maintainability',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  TESTABILITY = 'testability',
}

/**
 * Severity levels for code smells and issues.
 */
export enum Severity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Trend direction for quality over time.
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DEGRADING = 'DEGRADING',
}

/**
 * A single code smell or issue detected in the code.
 */
export interface CodeSmell {
  /** Unique identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Description of the issue. */
  description: string;
  /** File path where the smell was detected. */
  filePath: string;
  /** Line number (if applicable). */
  line?: number;
  /** Severity of the smell. */
  severity: Severity;
  /** Penalty points to subtract from the score. */
  penalty: number;
  /** Category (e.g., complexity, naming, duplication). */
  category: CodeSmellCategory;
  /** Suggested fix. */
  suggestion?: string;
}

/**
 * Categories of code smells.
 */
export enum CodeSmellCategory {
  COMPLEXITY = 'complexity',
  NAMING = 'naming',
  DUPLICATION = 'duplication',
  DEAD_CODE = 'dead_code',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  DESIGN = 'design',
  DOCUMENTATION = 'documentation',
  TYPE_SAFETY = 'type_safety',
  ERROR_HANDLING = 'error_handling',
}

/**
 * Per-dimension score.
 */
export interface DimensionScore {
  dimension: QualityDimension;
  score: number; // 0–100
  weight: number; // 0–1
  weightedScore: number;
  issues: string[];
}

/**
 * Complete quality assessment result.
 */
export interface QualityReport {
  /** Unique report id. */
  id: string;
  /** Target file or module. */
  target: string;
  /** Overall quality score (0–100). */
  overallScore: number;
  /** Per-dimension scores. */
  dimensions: DimensionScore[];
  /** Detected code smells. */
  codeSmells: CodeSmell[];
  /** Technical debt summary. */
  technicalDebt: TechnicalDebtSummary;
  /** Trend analysis (if historical data available). */
  trend?: TrendAnalysis;
  /** Benchmark comparison. */
  benchmark?: BenchmarkComparison;
  /** Grade assigned. */
  grade: QualityGrade;
  /** Timestamp of the assessment. */
  timestamp: Date;
}

/**
 * Quality grade based on overall score.
 */
export enum QualityGrade {
  A_PLUS = 'A+',    // 95–100
  A = 'A',          // 90–94
  B_PLUS = 'B+',    // 85–89
  B = 'B',          // 80–84
  C_PLUS = 'C+',    // 75–79
  C = 'C',          // 70–74
  D = 'D',          // 60–69
  F = 'F',          // 0–59
}

/**
 * Technical debt summary.
 */
export interface TechnicalDebtSummary {
  /** Total debt in estimated person-hours. */
  totalDebtHours: number;
  /** Debt broken down by category. */
  byCategory: Map<CodeSmellCategory, number>;
  /** Debt broken down by severity. */
  bySeverity: Map<Severity, number>;
  /** Top 3 highest-impact items to address. */
  topItems: CodeSmell[];
  /** Debt ratio as a percentage of the total codebase effort. */
  debtRatio: number;
}

/**
 * Trend analysis over time.
 */
export interface TrendAnalysis {
  /** Overall trend direction. */
  direction: TrendDirection;
  /** Average change per assessment period. */
  averageChange: number;
  /** Historical scores for charting. */
  historicalScores: Array<{ timestamp: Date; score: number }>;
  /** Per-dimension trends. */
  dimensionTrends: Map<QualityDimension, TrendDirection>;
}

/**
 * Benchmark comparison against industry standards.
 */
export interface BenchmarkComparison {
  /** Industry average for similar codebases. */
  industryAverage: number;
  /** Score relative to industry average (positive = above). */
  deltaFromAverage: number;
  /** Percentile ranking (0–100). */
  percentile: number;
  /** Comparison category (e.g., 'web-frontend', 'api-server'). */
  category: string;
}

/**
 * Configuration for the quality scorer.
 */
export interface QualityScorerConfig {
  /** Custom weights per dimension. Keys are dimension names, values 0–1. */
  dimensionWeights?: Partial<Record<QualityDimension, number>>;
  /** Custom penalty multipliers by severity. */
  severityMultipliers?: Partial<Record<Severity, number>>;
  /** Whether to include trend analysis. */
  enableTrendAnalysis?: boolean;
  /** Whether to include benchmarking. */
  enableBenchmarking?: boolean;
  /** Benchmark category for comparison. */
  benchmarkCategory?: string;
  /** Hours per penalty point for debt estimation. */
  debtHoursPerPenalty?: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_DIMENSION_WEIGHTS: Record<QualityDimension, number> = {
  [QualityDimension.CORRECTNESS]: 0.30,
  [QualityDimension.MAINTAINABILITY]: 0.25,
  [QualityDimension.PERFORMANCE]: 0.15,
  [QualityDimension.SECURITY]: 0.20,
  [QualityDimension.TESTABILITY]: 0.10,
};

const DEFAULT_SEVERITY_MULTIPLIERS: Record<Severity, number> = {
  [Severity.INFO]: 0,
  [Severity.LOW]: 1,
  [Severity.MEDIUM]: 2,
  [Severity.HIGH]: 4,
  [Severity.CRITICAL]: 8,
};

const INDUSTRY_BENCHMARKS: Record<string, number> = {
  'web-frontend': 72,
  'api-server': 74,
  'library': 82,
  'cli-tool': 68,
  'fullstack': 70,
  'default': 70,
};

// ─── Main Class ───────────────────────────────────────────────────────────────

/**
 * QualityScorer evaluates code quality across multiple dimensions, applies
 * weighted scoring with code smell penalties, tracks technical debt, performs
 * trend analysis, and benchmarks against industry standards.
 *
 * @example
 * ```ts
 * const scorer = new QualityScorer({ benchmarkCategory: 'api-server' });
 * scorer.addCodeSmell({
 *   id: 'sm1', name: 'Long Function', description: 'Function exceeds 50 lines',
 *   filePath: 'handler.ts', line: 42, severity: Severity.MEDIUM, penalty: 5,
 *   category: CodeSmellCategory.COMPLEXITY, suggestion: 'Extract sub-functions.',
 * });
 * scorer.setDimensionScore(QualityDimension.CORRECTNESS, 88, ['Missing edge case on line 15']);
 * const report = scorer.generateReport('handler.ts');
 * console.log(report.grade); // QualityGrade.B
 * ```
 */
export class QualityScorer {
  private dimensionScores: Map<QualityDimension, { score: number; issues: string[] }> = new Map();
  private codeSmells: CodeSmell[] = [];
  private history: Array<{ timestamp: Date; overallScore: number; dimensions: Map<QualityDimension, number> }> = [];
  private config: Required<QualityScorerConfig>;
  private reportCounter = 0;

  constructor(config?: QualityScorerConfig) {
    this.config = {
      dimensionWeights: { ...DEFAULT_DIMENSION_WEIGHTS, ...config?.dimensionWeights },
      severityMultipliers: { ...DEFAULT_SEVERITY_MULTIPLIERS, ...config?.severityMultipliers },
      enableTrendAnalysis: config?.enableTrendAnalysis ?? true,
      enableBenchmarking: config?.enableBenchmarking ?? true,
      benchmarkCategory: config?.benchmarkCategory ?? 'default',
      debtHoursPerPenalty: config?.debtHoursPerPenalty ?? 0.5,
    };

    // Initialize dimension scores
    for (const dim of Object.values(QualityDimension)) {
      this.dimensionScores.set(dim, { score: 100, issues: [] });
    }
  }

  // ── Score Management ────────────────────────────────────────────────────

  /**
   * Set the raw score for a quality dimension.
   * @param dimension - The quality dimension.
   * @param score - Raw score from 0 to 100.
   * @param issues - Optional list of issue descriptions.
   */
  setDimensionScore(dimension: QualityDimension, score: number, issues: string[] = []): void {
    if (score < 0 || score > 100) {
      throw new Error(`Score must be between 0 and 100, got ${score}.`);
    }
    this.dimensionScores.set(dimension, {
      score: Math.round(score * 100) / 100,
      issues: [...issues],
    });
  }

  /**
   * Get the raw score for a dimension.
   */
  getDimensionScore(dimension: QualityDimension): number {
    return this.dimensionScores.get(dimension)?.score ?? 100;
  }

  /**
   * Add an issue description to a dimension.
   */
  addDimensionIssue(dimension: QualityDimension, issue: string): void {
    const entry = this.dimensionScores.get(dimension);
    if (entry) {
      entry.issues.push(issue);
    }
  }

  // ── Code Smell Management ───────────────────────────────────────────────

  /**
   * Add a code smell to be factored into scoring.
   */
  addCodeSmell(smell: CodeSmell): void {
    this.codeSmells.push({ ...smell });
  }

  /**
   * Remove all code smells for a specific file.
   */
  removeCodeSmellsForFile(filePath: string): number {
    const before = this.codeSmells.length;
    this.codeSmells = this.codeSmells.filter((s) => s.filePath !== filePath);
    return before - this.codeSmells.length;
  }

  /**
   * Remove a code smell by id.
   */
  removeCodeSmell(id: string): boolean {
    const idx = this.codeSmells.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.codeSmells.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all current code smells.
   */
  getCodeSmells(): CodeSmell[] {
    return [...this.codeSmells];
  }

  /**
   * Get code smells filtered by category.
   */
  getCodeSmellsByCategory(category: CodeSmellCategory): CodeSmell[] {
    return this.codeSmells.filter((s) => s.category === category);
  }

  /**
   * Get code smells filtered by severity.
   */
  getCodeSmellsBySeverity(severity: Severity): CodeSmell[] {
    return this.codeSmells.filter((s) => s.severity === severity);
  }

  // ── Weighted Scoring ────────────────────────────────────────────────────

  /**
   * Compute the total penalty from all code smells, weighted by severity.
   */
  computeTotalPenalty(): number {
    let total = 0;
    for (const smell of this.codeSmells) {
      const multiplier = this.config.severityMultipliers[smell.severity] ?? 1;
      total += smell.penalty * multiplier;
    }
    return total;
  }

  /**
   * Compute the weighted overall score from all dimensions, minus penalties.
   */
  computeWeightedScore(): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dimension, weights] of Object.entries(this.config.dimensionWeights)) {
      const dim = dimension as QualityDimension;
      const weight = weights as number;
      const rawScore = this.dimensionScores.get(dim)?.score ?? 100;
      weightedSum += rawScore * weight;
      totalWeight += weight;
    }

    const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 100;
    const penalty = this.computeTotalPenalty();
    const finalScore = Math.max(0, Math.min(100, baseScore - penalty));
    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Compute per-dimension detail results.
   */
  computeDimensionResults(): DimensionScore[] {
    const results: DimensionScore[] = [];

    for (const [dimension, weight] of Object.entries(this.config.dimensionWeights)) {
      const dim = dimension as QualityDimension;
      const rawScore = this.dimensionScores.get(dim)?.score ?? 100;
      const issues = this.dimensionScores.get(dim)?.issues ?? [];

      // Apply dimension-specific smell penalties
      let dimensionPenalty = 0;
      for (const smell of this.codeSmells) {
        if (this.isSmellRelevantToDimension(smell, dim)) {
          const multiplier = this.config.severityMultipliers[smell.severity] ?? 1;
          dimensionPenalty += smell.penalty * multiplier;
        }
      }

      const adjustedScore = Math.max(0, Math.min(100, rawScore - dimensionPenalty));

      results.push({
        dimension: dim,
        score: Math.round(adjustedScore * 100) / 100,
        weight,
        weightedScore: Math.round(adjustedScore * weight * 100) / 100,
        issues,
      });
    }

    return results;
  }

  /**
   * Determine if a code smell is relevant to a given quality dimension.
   */
  private isSmellRelevantToDimension(smell: CodeSmell, dimension: QualityDimension): boolean {
    const mapping: Record<CodeSmellCategory, QualityDimension[]> = {
      [CodeSmellCategory.COMPLEXITY]: [QualityDimension.MAINTAINABILITY, QualityDimension.TESTABILITY],
      [CodeSmellCategory.NAMING]: [QualityDimension.MAINTAINABILITY],
      [CodeSmellCategory.DUPLICATION]: [QualityDimension.MAINTAINABILITY, QualityDimension.PERFORMANCE],
      [CodeSmellCategory.DEAD_CODE]: [QualityDimension.MAINTAINABILITY, QualityDimension.PERFORMANCE],
      [CodeSmellCategory.SECURITY]: [QualityDimension.SECURITY, QualityDimension.CORRECTNESS],
      [CodeSmellCategory.PERFORMANCE]: [QualityDimension.PERFORMANCE],
      [CodeSmellCategory.DESIGN]: [QualityDimension.MAINTAINABILITY, QualityDimension.TESTABILITY],
      [CodeSmellCategory.DOCUMENTATION]: [QualityDimension.MAINTAINABILITY],
      [CodeSmellCategory.TYPE_SAFETY]: [QualityDimension.CORRECTNESS, QualityDimension.SECURITY],
      [CodeSmellCategory.ERROR_HANDLING]: [QualityDimension.CORRECTNESS, QualityDimension.CORRECTNESS],
    };

    const relevant = mapping[smell.category] ?? [];
    return relevant.includes(dimension);
  }

  // ── Grade Assignment ────────────────────────────────────────────────────

  /**
   * Assign a letter grade based on the numeric score.
   */
  static assignGrade(score: number): QualityGrade {
    if (score >= 95) return QualityGrade.A_PLUS;
    if (score >= 90) return QualityGrade.A;
    if (score >= 85) return QualityGrade.B_PLUS;
    if (score >= 80) return QualityGrade.B;
    if (score >= 75) return QualityGrade.C_PLUS;
    if (score >= 70) return QualityGrade.C;
    if (score >= 60) return QualityGrade.D;
    return QualityGrade.F;
  }

  // ── Technical Debt ──────────────────────────────────────────────────────

  /**
   * Calculate the technical debt summary from all detected code smells.
   */
  calculateTechnicalDebt(): TechnicalDebtSummary {
    const byCategory = new Map<CodeSmellCategory, number>();
    const bySeverity = new Map<Severity, number>();

    let totalDebtHours = 0;

    for (const smell of this.codeSmells) {
      const multiplier = this.config.severityMultipliers[smell.severity] ?? 1;
      const hours = smell.penalty * multiplier * this.config.debtHoursPerPenalty;
      totalDebtHours += hours;

      byCategory.set(
        smell.category,
        (byCategory.get(smell.category) ?? 0) + hours
      );
      bySeverity.set(
        smell.severity,
        (bySeverity.get(smell.severity) ?? 0) + hours
      );
    }

    // Top items sorted by penalty * severity
    const sorted = [...this.codeSmells]
      .sort((a, b) => {
        const aScore = a.penalty * (this.config.severityMultipliers[a.severity] ?? 1);
        const bScore = b.penalty * (this.config.severityMultipliers[b.severity] ?? 1);
        return bScore - aScore;
      });

    // Debt ratio: assume 40 hours per 1000 lines as a baseline
    const estimatedBaselineHours = 40;
    const debtRatio = estimatedBaselineHours > 0
      ? Math.min(1, totalDebtHours / estimatedBaselineHours)
      : 0;

    return {
      totalDebtHours: Math.round(totalDebtHours * 100) / 100,
      byCategory,
      bySeverity,
      topItems: sorted.slice(0, 3),
      debtRatio: Math.round(debtRatio * 1000) / 1000,
    };
  }

  // ── Trend Analysis ──────────────────────────────────────────────────────

  /**
   * Record the current assessment for historical trend tracking.
   */
  recordHistory(overallScore: number, dimensionScores: Map<QualityDimension, number>): void {
    this.history.push({
      timestamp: new Date(),
      overallScore,
      dimensions: new Map(dimensionScores),
    });
  }

  /**
   * Analyze quality trends over time.
   */
  analyzeTrend(): TrendAnalysis | undefined {
    if (this.history.length < 2 || !this.config.enableTrendAnalysis) {
      return undefined;
    }

    const scores = this.history.map((h) => ({ timestamp: h.timestamp, score: h.overallScore }));
    const changes: number[] = [];

    for (let i = 1; i < scores.length; i++) {
      changes.push(scores[i]!.score - scores[i - 1]!.score);
    }

    const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;

    let direction: TrendDirection;
    if (averageChange > 1) {
      direction = TrendDirection.IMPROVING;
    } else if (averageChange < -1) {
      direction = TrendDirection.DEGRADING;
    } else {
      direction = TrendDirection.STABLE;
    }

    // Per-dimension trends
    const dimensionTrends = new Map<QualityDimension, TrendDirection>();
    for (const dim of Object.values(QualityDimension)) {
      const dimChanges: number[] = [];
      for (let i = 1; i < this.history.length; i++) {
        const prev = this.history[i - 1]!.dimensions.get(dim) ?? 100;
        const curr = this.history[i]!.dimensions.get(dim) ?? 100;
        dimChanges.push(curr - prev);
      }
      const avg = dimChanges.length > 0
        ? dimChanges.reduce((s, c) => s + c, 0) / dimChanges.length
        : 0;
      if (avg > 1) dimensionTrends.set(dim, TrendDirection.IMPROVING);
      else if (avg < -1) dimensionTrends.set(dim, TrendDirection.DEGRADING);
      else dimensionTrends.set(dim, TrendDirection.STABLE);
    }

    return {
      direction,
      averageChange: Math.round(averageChange * 100) / 100,
      historicalScores: scores,
      dimensionTrends,
    };
  }

  // ── Benchmarking ────────────────────────────────────────────────────────

  /**
   * Compare the current score against industry benchmarks.
   */
  benchmark(score: number): BenchmarkComparison | undefined {
    if (!this.config.enableBenchmarking) return undefined;

    const category = this.config.benchmarkCategory;
    const industryAverage = INDUSTRY_BENCHMARKS[category] ?? INDUSTRY_BENCHMARKS['default'] ?? 70;
    const deltaFromAverage = Math.round((score - industryAverage) * 100) / 100;

    // Rough percentile estimation using normal distribution approximation
    // Mean = industryAverage, StdDev = 12
    const stdDev = 12;
    const zScore = (score - industryAverage) / stdDev;
    // Approximate CDF using logistic function
    const percentile = Math.round(Math.min(100, Math.max(0, 100 / (1 + Math.exp(-1.7 * zScore)))));

    return {
      industryAverage,
      deltaFromAverage,
      percentile,
      category,
    };
  }

  // ── Report Generation ───────────────────────────────────────────────────

  /**
   * Generate a comprehensive quality report.
   *
   * @param target - File path or module name being assessed.
   */
  generateReport(target: string): QualityReport {
    this.reportCounter++;
    const overallScore = this.computeWeightedScore();
    const dimensions = this.computeDimensionResults();
    const grade = QualityScorer.assignGrade(overallScore);
    const technicalDebt = this.calculateTechnicalDebt();

    // Record in history for trend analysis
    const dimMap = new Map<QualityDimension, number>();
    for (const d of dimensions) {
      dimMap.set(d.dimension, d.score);
    }
    this.recordHistory(overallScore, dimMap);

    const trend = this.analyzeTrend();
    const benchmarkResult = this.benchmark(overallScore);

    return {
      id: `qr-${String(this.reportCounter).padStart(6, '0')}`,
      target,
      overallScore,
      dimensions,
      codeSmells: [...this.codeSmells],
      technicalDebt,
      trend,
      benchmark: benchmarkResult,
      grade,
      timestamp: new Date(),
    };
  }

  /**
   * Reset all scores, smells, and history.
   */
  reset(): void {
    for (const dim of Object.values(QualityDimension)) {
      this.dimensionScores.set(dim, { score: 100, issues: [] });
    }
    this.codeSmells = [];
    // Keep history for trend continuity; clear with clearHistory()
  }

  /**
   * Clear all historical data.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get the number of historical records.
   */
  get historyCount(): number {
    return this.history.length;
  }
}
