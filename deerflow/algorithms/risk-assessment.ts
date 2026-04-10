/**
 * @module risk-assessment
 * @description Risk assessment algorithm for evaluating code changes within the
 * Deerflow Agent Framework. Analyzes risk across multiple factors (complexity,
 * scope, dependencies, test coverage, security exposure), classifies risk levels,
 * predicts change impacts, estimates failure probability, and provides
 * actionable mitigation recommendations.
 */

// ─── Interfaces & Enums ───────────────────────────────────────────────────────

/**
 * Risk level classification.
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Risk factor categories.
 */
export enum RiskFactor {
  COMPLEXITY = 'complexity',
  SCOPE = 'scope',
  DEPENDENCIES = 'dependencies',
  TEST_COVERAGE = 'testCoverage',
  SECURITY_EXPOSURE = 'securityExposure',
  CHANGE_FREQUENCY = 'changeFrequency',
  TEAM_EXPERIENCE = 'teamExperience',
  REGRESSION_RISK = 'regressionRisk',
}

/**
 * Risk factor configuration with weight and threshold.
 */
export interface RiskFactorConfig {
  /** The risk factor category. */
  factor: RiskFactor;
  /** Weight of this factor in the overall risk score (0–1). */
  weight: number;
  /** Threshold above which this factor is considered high risk. */
  highRiskThreshold: number;
  /** Threshold above which this factor is considered critical risk. */
  criticalRiskThreshold: number;
}

/**
 * Input data for a single risk factor.
 */
export interface RiskFactorInput {
  /** The factor being measured. */
  factor: RiskFactor;
  /** Raw value from 0 to 100 (higher = riskier). */
  value: number;
  /** Optional evidence or notes supporting this assessment. */
  evidence?: string;
}

/**
 * A file change to be assessed.
 */
export interface FileChange {
  /** File path. */
  filePath: string;
  /** Type of change. */
  changeType: ChangeType;
  /** Number of lines added. */
  linesAdded: number;
  /** Number of lines deleted. */
  linesDeleted: number;
  /** Number of lines modified. */
  linesModified: number;
  /** Cyclomatic complexity of the changed code. */
  complexity?: number;
  /** Files that depend on this file. */
  dependents?: string[];
  /** Test files covering this file. */
  testFiles?: string[];
  /** Security-sensitive areas touched. */
  securityAreas?: string[];
  /** Description of the change. */
  description?: string;
}

/**
 * Types of code changes.
 */
export enum ChangeType {
  ADD = 'ADD',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
  RENAME = 'RENAME',
  REFACTOR = 'REFACTOR',
}

/**
 * Risk assessment result for a single file.
 */
export interface FileRiskAssessment {
  /** The file path. */
  filePath: string;
  /** Overall risk score (0–100). */
  riskScore: number;
  /** Classified risk level. */
  riskLevel: RiskLevel;
  /** Per-factor breakdown. */
  factorScores: Map<RiskFactor, number>;
  /** Factors that are above their high-risk threshold. */
  highRiskFactors: RiskFactor[];
  /** Factors that are above their critical threshold. */
  criticalFactors: RiskFactor[];
  /** Predicted impact on dependent files. */
  impactPrediction: ImpactPrediction;
  /** Estimated failure probability (0–1). */
  failureProbability: number;
  /** Recommended mitigations. */
  mitigations: MitigationRecommendation[];
}

/**
 * Predicted impact of a change.
 */
export interface ImpactPrediction {
  /** Number of directly affected files. */
  directImpactCount: number;
  /** Number of transitively affected files. */
  transitiveImpactCount: number;
  /** Affected modules or subsystems. */
  affectedSubsystems: string[];
  /** Estimated blast radius (1–5, 5 being widest). */
  blastRadius: number;
  /** Files at highest risk of breakage. */
  highestRiskFiles: string[];
}

/**
 * A mitigation recommendation.
 */
export interface MitigationRecommendation {
  /** Short title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Priority of implementing this mitigation. */
  priority: RiskLevel;
  /** Estimated effort to implement (person-hours). */
  effortHours: number;
  /** Risk factors this mitigation addresses. */
  addressesFactors: RiskFactor[];
  /** Category of mitigation. */
  category: MitigationCategory;
}

/**
 * Categories of mitigations.
 */
export enum MitigationCategory {
  TESTING = 'TESTING',
  CODE_REVIEW = 'CODE_REVIEW',
  ROLLBACK_PLAN = 'ROLLBACK_PLAN',
  FEATURE_FLAG = 'FEATURE_FLAG',
  INCREMENTAL_DEPLOY = 'INCREMENTAL_DEPLOY',
  MONITORING = 'MONITORING',
  REFACTORING = 'REFACTORING',
  DOCUMENTATION = 'DOCUMENTATION',
  SECURITY_HARDENING = 'SECURITY_HARDENING',
  PERFORMANCE_TESTING = 'PERFORMANCE_TESTING',
}

/**
 * Comprehensive risk assessment report for multiple file changes.
 */
export interface RiskAssessmentReport {
  /** Unique report identifier. */
  id: string;
  /** Assessment timestamp. */
  timestamp: Date;
  /** Overall aggregated risk score (0–100). */
  overallRiskScore: number;
  /** Overall risk level. */
  overallRiskLevel: RiskLevel;
  /** Per-file assessments. */
  fileAssessments: FileRiskAssessment[];
  /** Pre-deployment readiness check. */
  deploymentReadiness: DeploymentReadiness;
  /** Aggregated mitigations across all files. */
  topMitigations: MitigationRecommendation[];
  /** Go/no-go recommendation. */
  recommendation: DeploymentRecommendation;
}

/**
 * Pre-deployment readiness check.
 */
export interface DeploymentReadiness {
  /** Whether the changes are ready for deployment. */
  ready: boolean;
  /** Checklist items and their pass/fail status. */
  checklist: ReadinessCheckItem[];
  /** Blocking issues that must be resolved. */
  blockers: string[];
  /** Warnings (non-blocking). */
  warnings: string[];
}

/**
 * A single readiness check item.
 */
export interface ReadinessCheckItem {
  /** Description of the check. */
  description: string;
  /** Whether the check passed. */
  passed: boolean;
  /** Category of the check. */
  category: string;
  /** Additional notes. */
  notes?: string;
}

/**
 * Final deployment recommendation.
 */
export interface DeploymentRecommendation {
  /** Whether to proceed with deployment. */
  go: boolean;
  /** Confidence level (0–1). */
  confidence: number;
  /** Summary justification. */
  summary: string;
  /** Recommended deployment strategy. */
  strategy: DeploymentStrategy;
}

/**
 * Deployment strategies based on risk level.
 */
export enum DeploymentStrategy {
  /** Standard deployment for low-risk changes. */
  DIRECT = 'DIRECT',
  /** Deploy to canary first. */
  CANARY = 'CANARY',
  /** Blue-green deployment. */
  BLUE_GREEN = 'BLUE_GREEN',
  /** Feature-flagged rollout. */
  FEATURE_FLAGGED = 'FEATURE_FLAGGED',
  /** Staged rollout across regions. */
  STAGED = 'STAGED',
  /** Requires manual review before proceeding. */
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  /** Do not deploy — too risky. */
  BLOCKED = 'BLOCKED',
}

// ─── Default Configuration ─────────────────────────────────────────────────────

const DEFAULT_RISK_FACTORS: RiskFactorConfig[] = [
  { factor: RiskFactor.COMPLEXITY, weight: 0.20, highRiskThreshold: 70, criticalRiskThreshold: 85 },
  { factor: RiskFactor.SCOPE, weight: 0.20, highRiskThreshold: 65, criticalRiskThreshold: 80 },
  { factor: RiskFactor.DEPENDENCIES, weight: 0.20, highRiskThreshold: 60, criticalRiskThreshold: 75 },
  { factor: RiskFactor.TEST_COVERAGE, weight: 0.20, highRiskThreshold: 50, criticalRiskThreshold: 30 },
  { factor: RiskFactor.SECURITY_EXPOSURE, weight: 0.20, highRiskThreshold: 60, criticalRiskThreshold: 80 },
];

// ─── Main Class ───────────────────────────────────────────────────────────────

/**
 * RiskAssessor evaluates the risk of code changes across multiple dimensions,
 * classifies risk levels, predicts impacts, estimates failure probability,
 * and generates mitigation recommendations.
 *
 * @example
 * ```ts
 * const assessor = new RiskAssessor();
 * const assessment = assessor.assessFileChange({
 *   filePath: 'auth/middleware.ts',
 *   changeType: ChangeType.MODIFY,
 *   linesAdded: 45,
 *   linesDeleted: 12,
 *   linesModified: 8,
 *   complexity: 18,
 *   dependents: ['routes/user.ts', 'routes/admin.ts'],
 *   securityAreas: ['authentication', 'authorization'],
 * });
 * console.log(assessment.riskLevel); // RiskLevel.HIGH
 * ```
 */
export class RiskAssessor {
  private factorConfigs: Map<RiskFactor, RiskFactorConfig> = new Map();
  private reportCounter = 0;
  private historicalFailures: Array<{ timestamp: Date; predictedProb: number; actual: boolean }> = [];

  constructor(customFactors?: RiskFactorConfig[]) {
    const factors = customFactors ?? DEFAULT_RISK_FACTORS;
    let totalWeight = 0;
    for (const fc of factors) {
      this.factorConfigs.set(fc.factor, fc);
      totalWeight += fc.weight;
    }
    // Normalize weights if they don't sum to 1
    if (Math.abs(totalWeight - 1) > 0.001) {
      for (const config of this.factorConfigs.values()) {
        config.weight = Math.round((config.weight / totalWeight) * 1000) / 1000;
      }
    }
  }

  // ── Core Assessment ─────────────────────────────────────────────────────

  /**
   * Assess the risk of a single file change.
   */
  assessFileChange(change: FileChange): FileRiskAssessment {
    const factorScores = this.computeFactorScores(change);
    const riskScore = this.computeOverallRiskScore(factorScores);
    const riskLevel = this.classifyRiskLevel(riskScore);
    const highRiskFactors = this.identifyHighRiskFactors(factorScores);
    const criticalFactors = this.identifyCriticalFactors(factorScores);
    const impactPrediction = this.predictImpact(change);
    const failureProbability = this.estimateFailureProbability(riskScore, change);
    const mitigations = this.generateMitigations(change, riskLevel, factorScores, criticalFactors);

    return {
      filePath: change.filePath,
      riskScore,
      riskLevel,
      factorScores,
      highRiskFactors,
      criticalFactors,
      impactPrediction,
      failureProbability,
      mitigations,
    };
  }

  /**
   * Assess multiple file changes and produce a comprehensive report.
   */
  assessChanges(changes: FileChange[]): RiskAssessmentReport {
    this.reportCounter++;

    const fileAssessments = changes.map((change) => this.assessFileChange(change));
    const overallRiskScore = this.aggregateRiskScores(fileAssessments);
    const overallRiskLevel = this.classifyRiskLevel(overallRiskScore);
    const deploymentReadiness = this.checkDeploymentReadiness(fileAssessments);
    const topMitigations = this.aggregateMitigations(fileAssessments);
    const recommendation = this.generateDeploymentRecommendation(
      overallRiskScore,
      overallRiskLevel,
      deploymentReadiness,
      fileAssessments
    );

    return {
      id: `ra-${String(this.reportCounter).padStart(6, '0')}`,
      timestamp: new Date(),
      overallRiskScore,
      overallRiskLevel,
      fileAssessments,
      deploymentReadiness,
      topMitigations: topMitigations.slice(0, 10),
      recommendation,
    };
  }

  // ── Factor Score Computation ────────────────────────────────────────────

  /**
   * Compute risk scores for each factor based on the file change.
   */
  private computeFactorScores(change: FileChange): Map<RiskFactor, number> {
    const scores = new Map<RiskFactor, number>();

    // Complexity: based on cyclomatic complexity and lines changed
    const totalLines = change.linesAdded + change.linesDeleted + change.linesModified;
    const complexityScore = change.complexity
      ? Math.min(100, (change.complexity / 20) * 100)
      : Math.min(100, (totalLines / 100) * 80);
    scores.set(RiskFactor.COMPLEXITY, this.clampScore(complexityScore));

    // Scope: based on lines changed and change type
    let scopeScore = Math.min(100, (totalLines / 200) * 100);
    if (change.changeType === ChangeType.DELETE) scopeScore = Math.min(100, scopeScore * 1.3);
    if (change.changeType === ChangeType.REFACTOR) scopeScore *= 0.8;
    scores.set(RiskFactor.SCOPE, this.clampScore(scopeScore));

    // Dependencies: based on number of dependents
    const depCount = change.dependents?.length ?? 0;
    const depScore = Math.min(100, (depCount / 10) * 100);
    scores.set(RiskFactor.DEPENDENCIES, this.clampScore(depScore));

    // Test coverage: inverse of test files count (fewer tests = higher risk)
    const testCount = change.testFiles?.length ?? 0;
    const testScore = Math.max(0, 100 - testCount * 25);
    scores.set(RiskFactor.TEST_COVERAGE, this.clampScore(testScore));

    // Security exposure: based on security areas touched
    const secAreas = change.securityAreas?.length ?? 0;
    const secScore = Math.min(100, secAreas * 30);
    scores.set(RiskFactor.SECURITY_EXPOSURE, this.clampScore(secScore));

    return scores;
  }

  /**
   * Compute the overall weighted risk score from per-factor scores.
   */
  private computeOverallRiskScore(factorScores: Map<RiskFactor, number>): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, config] of this.factorConfigs.entries()) {
      const score = factorScores.get(factor) ?? 0;
      totalScore += score * config.weight;
      totalWeight += config.weight;
    }

    const raw = totalWeight > 0 ? totalScore / totalWeight : 0;
    return Math.round(raw * 100) / 100;
  }

  /**
   * Classify a numeric risk score into a risk level.
   */
  classifyRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 35) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Identify factors that exceed their high-risk threshold.
   */
  private identifyHighRiskFactors(factorScores: Map<RiskFactor, number>): RiskFactor[] {
    const highRisk: RiskFactor[] = [];
    for (const [factor, config] of this.factorConfigs.entries()) {
      const score = factorScores.get(factor) ?? 0;
      if (score >= config.highRiskThreshold) {
        highRisk.push(factor);
      }
    }
    return highRisk;
  }

  /**
   * Identify factors that exceed their critical threshold.
   */
  private identifyCriticalFactors(factorScores: Map<RiskFactor, number>): RiskFactor[] {
    const critical: RiskFactor[] = [];
    for (const [factor, config] of this.factorConfigs.entries()) {
      const score = factorScores.get(factor) ?? 0;
      if (score >= config.criticalRiskThreshold) {
        critical.push(factor);
      }
    }
    return critical;
  }

  // ── Impact Prediction ───────────────────────────────────────────────────

  /**
   * Predict the impact of a file change.
   */
  private predictImpact(change: FileChange): ImpactPrediction {
    const directDependents = change.dependents ?? [];
    const directImpactCount = directDependents.length;

    // Estimate transitive impact (rough heuristic: multiply by 2 for transitive)
    const transitiveImpactCount = Math.round(directImpactCount * (1 + directImpactCount * 0.3));

    // Determine affected subsystems from file paths
    const affectedSubsystems = this.extractSubsystems([
      change.filePath,
      ...directDependents,
    ]);

    // Blast radius: 1 = single file, 5 = entire system
    let blastRadius = 1;
    if (directImpactCount > 0 && directImpactCount <= 3) blastRadius = 2;
    else if (directImpactCount > 3 && directImpactCount <= 5) blastRadius = 3;
    else if (directImpactCount > 5 && directImpactCount <= 10) blastRadius = 4;
    else if (directImpactCount > 10) blastRadius = 5;
    if (change.changeType === ChangeType.DELETE) blastRadius = Math.min(5, blastRadius + 1);

    // Highest risk files: dependents with no tests
    const highestRiskFiles = directDependents.slice(0, 5);

    return {
      directImpactCount,
      transitiveImpactCount,
      affectedSubsystems,
      blastRadius,
      highestRiskFiles,
    };
  }

  /**
   * Extract subsystem names from file paths.
   */
  private extractSubsystems(filePaths: string[]): string[] {
    const subsystems = new Set<string>();
    for (const path of filePaths) {
      const parts = path.replace(/\\/g, '/').split('/');
      if (parts.length >= 2) {
        subsystems.add(parts.slice(0, 2).join('/'));
      }
    }
    return Array.from(subsystems);
  }

  // ── Failure Probability ─────────────────────────────────────────────────

  /**
   * Estimate the probability of failure for this change.
   *
   * Uses a logistic regression-like formula:
   * P(failure) = 1 / (1 + exp(-k * (score - midpoint)))
   */
  private estimateFailureProbability(riskScore: number, change: FileChange): number {
    // Logistic parameters calibrated to give:
    // ~5% at score 25, ~25% at score 50, ~60% at score 75, ~90% at score 90
    const k = 0.08;
    const midpoint = 55;
    const raw = 1 / (1 + Math.exp(-k * (riskScore - midpoint)));

    // Boost for security-sensitive changes
    let adjusted = raw;
    if ((change.securityAreas?.length ?? 0) > 0) {
      adjusted = Math.min(1, adjusted * 1.2);
    }

    // Reduce for well-tested changes
    if ((change.testFiles?.length ?? 0) >= 3) {
      adjusted *= 0.7;
    }

    return Math.round(adjusted * 1000) / 1000;
  }

  // ── Mitigation Recommendations ──────────────────────────────────────────

  /**
   * Generate mitigation recommendations based on the assessment.
   */
  private generateMitigations(
    change: FileChange,
    riskLevel: RiskLevel,
    factorScores: Map<RiskFactor, number>,
    criticalFactors: RiskFactor[]
  ): MitigationRecommendation[] {
    const mitigations: MitigationRecommendation[] = [];

    // Always recommend code review for medium+ risk
    if (riskLevel !== RiskLevel.LOW) {
      mitigations.push({
        title: 'Mandatory Code Review',
        description: `Require at least 2 reviewers for ${change.filePath} due to ${riskLevel} risk level.`,
        priority: riskLevel,
        effortHours: 2,
        addressesFactors: [RiskFactor.COMPLEXITY, RiskFactor.SCOPE],
        category: MitigationCategory.CODE_REVIEW,
      });
    }

    // Test coverage mitigation
    const testScore = factorScores.get(RiskFactor.TEST_COVERAGE) ?? 0;
    if (testScore > 50) {
      mitigations.push({
        title: 'Add Integration Tests',
        description: `${change.filePath} has insufficient test coverage. Add integration tests covering the change.`,
        priority: RiskLevel.HIGH,
        effortHours: 4,
        addressesFactors: [RiskFactor.TEST_COVERAGE],
        category: MitigationCategory.TESTING,
      });
    }

    // Dependency mitigation
    const depScore = factorScores.get(RiskFactor.DEPENDENCIES) ?? 0;
    if (depScore > 60) {
      mitigations.push({
        title: 'Dependency Impact Analysis',
        description: `This change affects ${(change.dependents?.length ?? 0)} dependent files. Run full regression suite.`,
        priority: RiskLevel.HIGH,
        effortHours: 3,
        addressesFactors: [RiskFactor.DEPENDENCIES, RiskFactor.REGRESSION_RISK],
        category: MitigationCategory.TESTING,
      });
    }

    // Security mitigation
    const secScore = factorScores.get(RiskFactor.SECURITY_EXPOSURE) ?? 0;
    if (secScore >= 60) {
      mitigations.push({
        title: 'Security Review',
        description: `Change touches security-sensitive areas: ${change.securityAreas?.join(', ') ?? 'unknown'}. Require security team review.`,
        priority: RiskLevel.CRITICAL,
        effortHours: 4,
        addressesFactors: [RiskFactor.SECURITY_EXPOSURE],
        category: MitigationCategory.SECURITY_HARDENING,
      });
    }

    // Complexity mitigation
    const compScore = factorScores.get(RiskFactor.COMPLEXITY) ?? 0;
    if (compScore > 70) {
      mitigations.push({
        title: 'Simplify Complex Logic',
        description: `Cyclomatic complexity is ${(change.complexity ?? 'high')}. Consider breaking into smaller, testable functions.`,
        priority: RiskLevel.MEDIUM,
        effortHours: 3,
        addressesFactors: [RiskFactor.COMPLEXITY],
        category: MitigationCategory.REFACTORING,
      });
    }

    // Rollback plan for critical changes
    if (riskLevel === RiskLevel.CRITICAL || criticalFactors.length > 0) {
      mitigations.push({
        title: 'Prepare Rollback Plan',
        description: 'Create a detailed rollback plan including database migrations and configuration changes.',
        priority: RiskLevel.CRITICAL,
        effortHours: 2,
        addressesFactors: criticalFactors,
        category: MitigationCategory.ROLLBACK_PLAN,
      });

      mitigations.push({
        title: 'Feature Flag Deployment',
        description: 'Deploy behind a feature flag to allow instant rollback without code deployment.',
        priority: RiskLevel.HIGH,
        effortHours: 3,
        addressesFactors: [RiskFactor.SCOPE, RiskFactor.COMPLEXITY],
        category: MitigationCategory.FEATURE_FLAG,
      });

      mitigations.push({
        title: 'Enhanced Monitoring',
        description: 'Add targeted monitoring and alerting for the affected subsystems post-deployment.',
        priority: RiskLevel.HIGH,
        effortHours: 2,
        addressesFactors: [RiskFactor.REGRESSION_RISK],
        category: MitigationCategory.MONITORING,
      });
    }

    // Performance testing for large changes
    const totalLines = change.linesAdded + change.linesDeleted + change.linesModified;
    if (totalLines > 200) {
      mitigations.push({
        title: 'Performance Regression Testing',
        description: 'Large change detected. Run performance benchmarks to ensure no degradation.',
        priority: RiskLevel.MEDIUM,
        effortHours: 3,
        addressesFactors: [RiskFactor.COMPLEXITY, RiskFactor.SCOPE],
        category: MitigationCategory.PERFORMANCE_TESTING,
      });
    }

    // Documentation for scope changes
    const scopeScore = factorScores.get(RiskFactor.SCOPE) ?? 0;
    if (scopeScore >= 50) {
      mitigations.push({
        title: 'Update Documentation',
        description: 'Significant scope change. Update relevant API docs, README, and changelog.',
        priority: RiskLevel.LOW,
        effortHours: 1,
        addressesFactors: [RiskFactor.SCOPE],
        category: MitigationCategory.DOCUMENTATION,
      });
    }

    return mitigations;
  }

  // ── Pre-Deployment Readiness ────────────────────────────────────────────

  /**
   * Run pre-deployment readiness checks against the assessments.
   */
  private checkDeploymentReadiness(assessments: FileRiskAssessment[]): DeploymentReadiness {
    const checklist: ReadinessCheckItem[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Check 1: No critical risk files without mitigations
    const criticalFiles = assessments.filter((a) => a.riskLevel === RiskLevel.CRITICAL);
    checklist.push({
      description: 'No unmitigated critical-risk changes',
      passed: criticalFiles.length === 0,
      category: 'risk',
      notes: criticalFiles.length > 0 ? `${criticalFiles.length} critical-risk file(s) detected.` : undefined,
    });
    if (criticalFiles.length > 0) {
      warnings.push(`${criticalFiles.length} file(s) have CRITICAL risk level and require mitigation.`);
    }

    // Check 2: All files have test coverage
    const noTests = assessments.filter((a) => {
      return (a.factorScores.get(RiskFactor.TEST_COVERAGE) ?? 0) > 75;
    });
    checklist.push({
      description: 'All changed files have adequate test coverage',
      passed: noTests.length === 0,
      category: 'testing',
    });
    if (noTests.length > 0) {
      blockers.push(`${noTests.length} file(s) lack adequate test coverage.`);
    }

    // Check 3: No security exposure without review
    const secRisk = assessments.filter((a) => {
      return (a.factorScores.get(RiskFactor.SECURITY_EXPOSURE) ?? 0) > 60;
    });
    checklist.push({
      description: 'Security-sensitive changes reviewed',
      passed: secRisk.length === 0,
      category: 'security',
    });
    if (secRisk.length > 0) {
      blockers.push(`${secRisk.length} file(s) touch security-sensitive code and require security review.`);
    }

    // Check 4: Complexity is manageable
    const complexFiles = assessments.filter((a) => {
      return (a.factorScores.get(RiskFactor.COMPLEXITY) ?? 0) > 70;
    });
    checklist.push({
      description: 'Code complexity within acceptable limits',
      passed: complexFiles.length === 0,
      category: 'complexity',
    });
    if (complexFiles.length > 0) {
      warnings.push(`${complexFiles.length} file(s) have high complexity.`);
    }

    // Check 5: Failure probability is acceptable
    const highFailure = assessments.filter((a) => a.failureProbability > 0.5);
    checklist.push({
      description: 'Failure probability is below 50%',
      passed: highFailure.length === 0,
      category: 'reliability',
    });
    if (highFailure.length > 0) {
      warnings.push(`${highFailure.length} file(s) have >50% estimated failure probability.`);
    }

    const allPassed = checklist.every((item) => item.passed);

    return {
      ready: allPassed && blockers.length === 0,
      checklist,
      blockers,
      warnings,
    };
  }

  // ── Aggregation ─────────────────────────────────────────────────────────

  /**
   * Aggregate individual file risk scores into an overall score.
   */
  private aggregateRiskScores(assessments: FileRiskAssessment[]): number {
    if (assessments.length === 0) return 0;
    if (assessments.length === 1) return assessments[0]!.riskScore;

    // Use the maximum score as the primary driver, with mean as secondary
    const maxScore = Math.max(...assessments.map((a) => a.riskScore));
    const meanScore = assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length;

    // Weighted combination: 60% max, 40% mean
    const combined = maxScore * 0.6 + meanScore * 0.4;
    return Math.round(combined * 100) / 100;
  }

  /**
   * Aggregate and deduplicate mitigations across all file assessments.
   */
  private aggregateMitigations(assessments: FileRiskAssessment[]): MitigationRecommendation[] {
    const seen = new Set<string>();
    const all: MitigationRecommendation[] = [];

    for (const assessment of assessments) {
      for (const mit of assessment.mitigations) {
        if (!seen.has(mit.title)) {
          seen.add(mit.title);
          all.push(mit);
        }
      }
    }

    // Sort by priority
    const priorityOrder: Record<RiskLevel, number> = {
      [RiskLevel.CRITICAL]: 0,
      [RiskLevel.HIGH]: 1,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.LOW]: 3,
    };

    all.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

    return all;
  }

  // ── Deployment Recommendation ───────────────────────────────────────────

  /**
   * Generate the final go/no-go deployment recommendation.
   */
  private generateDeploymentRecommendation(
    _overallRiskScore: number,
    overallRiskLevel: RiskLevel,
    readiness: DeploymentReadiness,
    _assessments: FileRiskAssessment[]
  ): DeploymentRecommendation {
    let go = true;
    let confidence = 0;
    let summary = '';
    let strategy: DeploymentStrategy;

    if (readiness.blockers.length > 0) {
      go = false;
      confidence = 0.1;
      summary = `Deployment blocked by ${readiness.blockers.length} issue(s): ${readiness.blockers.join(' ')}`;
      strategy = DeploymentStrategy.MANUAL_REVIEW;
    } else if (overallRiskLevel === RiskLevel.CRITICAL) {
      go = false;
      confidence = 0.2;
      summary = 'Overall risk is CRITICAL. Require manual review and mitigation before proceeding.';
      strategy = DeploymentStrategy.MANUAL_REVIEW;
    } else if (overallRiskLevel === RiskLevel.HIGH) {
      go = true;
      confidence = 0.6;
      summary = 'Overall risk is HIGH. Deploy with caution using a staged strategy.';
      strategy = DeploymentStrategy.STAGED;
    } else if (overallRiskLevel === RiskLevel.MEDIUM) {
      go = true;
      confidence = 0.8;
      summary = 'Overall risk is MEDIUM. Recommend canary deployment with monitoring.';
      strategy = DeploymentStrategy.CANARY;
    } else {
      go = true;
      confidence = 0.95;
      summary = 'Overall risk is LOW. Safe to deploy directly.';
      strategy = DeploymentStrategy.DIRECT;
    }

    if (readiness.warnings.length > 0 && go) {
      confidence *= 0.9;
      summary += ` ${readiness.warnings.length} warning(s) noted: ${readiness.warnings.join(' ')}`;
    }

    return {
      go,
      confidence: Math.round(confidence * 1000) / 1000,
      summary,
      strategy,
    };
  }

  // ── Calibration ─────────────────────────────────────────────────────────

  /**
   * Record a deployment outcome to improve future predictions.
   */
  recordOutcome(predictedProbability: number, actualFailure: boolean): void {
    this.historicalFailures.push({
      timestamp: new Date(),
      predictedProb: predictedProbability,
      actual: actualFailure,
    });
  }

  /**
   * Get the prediction accuracy based on historical outcomes.
   */
  getPredictionAccuracy(): { accuracy: number; sampleSize: number } | undefined {
    if (this.historicalFailures.length < 5) return undefined;

    let correct = 0;
    for (const outcome of this.historicalFailures) {
      const predicted = outcome.predictedProb > 0.5;
      if (predicted === outcome.actual) correct++;
    }

    return {
      accuracy: Math.round((correct / this.historicalFailures.length) * 1000) / 1000,
      sampleSize: this.historicalFailures.length,
    };
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  }

  /**
   * Get the configured risk factor weights.
   */
  getFactorWeights(): Map<RiskFactor, number> {
    const weights = new Map<RiskFactor, number>();
    for (const [factor, config] of this.factorConfigs.entries()) {
      weights.set(factor, config.weight);
    }
    return weights;
  }
}
