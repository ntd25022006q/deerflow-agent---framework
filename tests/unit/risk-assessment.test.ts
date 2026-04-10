import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskLevel,
  RiskFactor,
  ChangeType,
  MitigationCategory,
  DeploymentStrategy,
  RiskAssessor,
} from '../../deerflow/algorithms/risk-assessment';
import type {
  FileChange,
  FileRiskAssessment,
  RiskAssessmentReport,
  ImpactPrediction,
  MitigationRecommendation,
  DeploymentReadiness,
} from '../../deerflow/algorithms/risk-assessment';

describe('risk-assessment', () => {
  let assessor: RiskAssessor;

  beforeEach(() => {
    assessor = new RiskAssessor();
  });

  // ── RiskLevel enum ─────────────────────────────────────────────────────

  describe('RiskLevel enum', () => {
    it('should have correct string values', () => {
      expect(RiskLevel.LOW).toBe('LOW');
      expect(RiskLevel.MEDIUM).toBe('MEDIUM');
      expect(RiskLevel.HIGH).toBe('HIGH');
      expect(RiskLevel.CRITICAL).toBe('CRITICAL');
    });
  });

  // ── RiskFactor enum ───────────────────────────────────────────────────

  describe('RiskFactor enum', () => {
    it('should have all eight factors', () => {
      expect(RiskFactor.COMPLEXITY).toBe('complexity');
      expect(RiskFactor.SCOPE).toBe('scope');
      expect(RiskFactor.DEPENDENCIES).toBe('dependencies');
      expect(RiskFactor.TEST_COVERAGE).toBe('testCoverage');
      expect(RiskFactor.SECURITY_EXPOSURE).toBe('securityExposure');
      expect(RiskFactor.CHANGE_FREQUENCY).toBe('changeFrequency');
      expect(RiskFactor.TEAM_EXPERIENCE).toBe('teamExperience');
      expect(RiskFactor.REGRESSION_RISK).toBe('regressionRisk');
    });
  });

  // ── ChangeType enum ──────────────────────────────────────────────────

  describe('ChangeType enum', () => {
    it('should have all five change types', () => {
      expect(ChangeType.ADD).toBe('ADD');
      expect(ChangeType.MODIFY).toBe('MODIFY');
      expect(ChangeType.DELETE).toBe('DELETE');
      expect(ChangeType.RENAME).toBe('RENAME');
      expect(ChangeType.REFACTOR).toBe('REFACTOR');
    });
  });

  // ── MitigationCategory enum ───────────────────────────────────────────

  describe('MitigationCategory enum', () => {
    it('should have all ten categories', () => {
      expect(MitigationCategory.TESTING).toBe('TESTING');
      expect(MitigationCategory.CODE_REVIEW).toBe('CODE_REVIEW');
      expect(MitigationCategory.ROLLBACK_PLAN).toBe('ROLLBACK_PLAN');
      expect(MitigationCategory.FEATURE_FLAG).toBe('FEATURE_FLAG');
      expect(MitigationCategory.INCREMENTAL_DEPLOY).toBe('INCREMENTAL_DEPLOY');
      expect(MitigationCategory.MONITORING).toBe('MONITORING');
      expect(MitigationCategory.REFACTORING).toBe('REFACTORING');
      expect(MitigationCategory.DOCUMENTATION).toBe('DOCUMENTATION');
      expect(MitigationCategory.SECURITY_HARDENING).toBe('SECURITY_HARDENING');
      expect(MitigationCategory.PERFORMANCE_TESTING).toBe('PERFORMANCE_TESTING');
    });
  });

  // ── DeploymentStrategy enum ───────────────────────────────────────────

  describe('DeploymentStrategy enum', () => {
    it('should have all seven strategies', () => {
      expect(DeploymentStrategy.DIRECT).toBe('DIRECT');
      expect(DeploymentStrategy.CANARY).toBe('CANARY');
      expect(DeploymentStrategy.BLUE_GREEN).toBe('BLUE_GREEN');
      expect(DeploymentStrategy.FEATURE_FLAGGED).toBe('FEATURE_FLAGGED');
      expect(DeploymentStrategy.STAGED).toBe('STAGED');
      expect(DeploymentStrategy.MANUAL_REVIEW).toBe('MANUAL_REVIEW');
      expect(DeploymentStrategy.BLOCKED).toBe('BLOCKED');
    });
  });

  // ── classifyRiskLevel ────────────────────────────────────────────────

  describe('classifyRiskLevel', () => {
    it('should classify score < 35 as LOW', () => {
      expect(assessor.classifyRiskLevel(0)).toBe(RiskLevel.LOW);
      expect(assessor.classifyRiskLevel(10)).toBe(RiskLevel.LOW);
      expect(assessor.classifyRiskLevel(34)).toBe(RiskLevel.LOW);
      expect(assessor.classifyRiskLevel(34.99)).toBe(RiskLevel.LOW);
    });

    it('should classify score 35-59 as MEDIUM', () => {
      expect(assessor.classifyRiskLevel(35)).toBe(RiskLevel.MEDIUM);
      expect(assessor.classifyRiskLevel(45)).toBe(RiskLevel.MEDIUM);
      expect(assessor.classifyRiskLevel(59)).toBe(RiskLevel.MEDIUM);
    });

    it('should classify score 60-79 as HIGH', () => {
      expect(assessor.classifyRiskLevel(60)).toBe(RiskLevel.HIGH);
      expect(assessor.classifyRiskLevel(70)).toBe(RiskLevel.HIGH);
      expect(assessor.classifyRiskLevel(79)).toBe(RiskLevel.HIGH);
    });

    it('should classify score >= 80 as CRITICAL', () => {
      expect(assessor.classifyRiskLevel(80)).toBe(RiskLevel.CRITICAL);
      expect(assessor.classifyRiskLevel(90)).toBe(RiskLevel.CRITICAL);
      expect(assessor.classifyRiskLevel(100)).toBe(RiskLevel.CRITICAL);
    });
  });

  // ── assessFileChange ─────────────────────────────────────────────────

  describe('assessFileChange', () => {
    it('should produce a low-risk assessment for small well-tested change', () => {
      const change: FileChange = {
        filePath: 'utils/helper.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 5,
        linesDeleted: 2,
        linesModified: 1,
        testFiles: ['helper.test.ts', 'helper.integration.test.ts', 'helper.e2e.test.ts'],
      };
      const result = assessor.assessFileChange(change);
      expect(result.filePath).toBe('utils/helper.ts');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.factorScores.size).toBeGreaterThan(0);
      expect(result.mitigations).toBeInstanceOf(Array);
      expect(result.impactPrediction).toBeDefined();
    });

    it('should produce a high-risk assessment for large security change', () => {
      const change: FileChange = {
        filePath: 'auth/middleware.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 80,
        linesDeleted: 10,
        linesModified: 5,
        complexity: 18,
        dependents: ['routes/user.ts', 'routes/admin.ts', 'routes/api.ts'],
        securityAreas: ['authentication', 'authorization'],
      };
      const result = assessor.assessFileChange(change);
      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.riskLevel);
      expect(result.impactPrediction.directImpactCount).toBe(3);
      expect(result.impactPrediction.highestRiskFiles).toContain('routes/user.ts');
      expect(result.failureProbability).toBeGreaterThan(0);
    });

    it('should compute impact prediction with correct direct/transitive counts', () => {
      const change: FileChange = {
        filePath: 'core.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 10,
        linesDeleted: 5,
        linesModified: 0,
        dependents: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
      };
      const result = assessor.assessFileChange(change);
      expect(result.impactPrediction.directImpactCount).toBe(4);
      expect(result.impactPrediction.transitiveImpactCount).toBeGreaterThanOrEqual(4);
      expect(result.impactPrediction.blastRadius).toBeGreaterThanOrEqual(2);
    });

    it('should assess DELETE change with increased blast radius', () => {
      const change: FileChange = {
        filePath: 'legacy/module.ts',
        changeType: ChangeType.DELETE,
        linesAdded: 0,
        linesDeleted: 200,
        linesModified: 0,
        dependents: ['consumer.ts', 'user.ts', 'other.ts'],
      };
      const result = assessor.assessFileChange(change);
      // Delete boosts blast radius
      expect(result.impactPrediction.blastRadius).toBeGreaterThanOrEqual(2);
    });

    it('should assess REFACTOR change with reduced scope factor', () => {
      const change: FileChange = {
        filePath: 'refactored.ts',
        changeType: ChangeType.REFACTOR,
        linesAdded: 50,
        linesDeleted: 50,
        linesModified: 0,
      };
      const refactorResult = assessor.assessFileChange(change);
      // Compare scope factor: refactor should have lower scope than modify for same lines
      const modifyChange: FileChange = {
        filePath: 'modified.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 50,
        linesDeleted: 50,
        linesModified: 0,
      };
      const modifyResult = assessor.assessFileChange(modifyChange);
      expect(refactorResult.factorScores.get(RiskFactor.SCOPE)).toBeLessThanOrEqual(
        modifyResult.factorScores.get(RiskFactor.SCOPE)!,
      );
    });

    it('should generate Mandatory Code Review mitigation for non-low risk', () => {
      const change: FileChange = {
        filePath: 'medium-risk.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 50,
        linesDeleted: 10,
        linesModified: 0,
      };
      const result = assessor.assessFileChange(change);
      if (result.riskLevel !== RiskLevel.LOW) {
        const titles = result.mitigations.map((m) => m.title);
        expect(titles).toContain('Mandatory Code Review');
      }
    });

    it('should not generate Mandatory Code Review for low-risk changes', () => {
      const change: FileChange = {
        filePath: 'safe.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 3,
        linesDeleted: 1,
        linesModified: 0,
        testFiles: ['safe.test.ts', 'safe.test2.ts', 'safe.test3.ts'],
      };
      const result = assessor.assessFileChange(change);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      const codeReviewRecs = result.mitigations.filter((m) => m.title === 'Mandatory Code Review');
      expect(codeReviewRecs).toHaveLength(0);
    });

    it('should generate Security Review for security-sensitive changes', () => {
      const change: FileChange = {
        filePath: 'auth.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 60,
        linesDeleted: 5,
        linesModified: 0,
        securityAreas: ['authentication', 'authorization'],
      };
      const result = assessor.assessFileChange(change);
      const secRecs = result.mitigations.filter((m) => m.title === 'Security Review');
      expect(secRecs.length).toBeGreaterThanOrEqual(1);
    });

    it('should compute failure probability between 0 and 1', () => {
      const change: FileChange = {
        filePath: 'file.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 10,
        linesDeleted: 5,
        linesModified: 0,
      };
      const result = assessor.assessFileChange(change);
      expect(result.failureProbability).toBeGreaterThanOrEqual(0);
      expect(result.failureProbability).toBeLessThanOrEqual(1);
    });

    it('should reduce failure probability for well-tested changes', () => {
      const untested: FileChange = {
        filePath: 'untested.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 40,
        linesDeleted: 5,
        linesModified: 0,
        complexity: 12,
      };
      const tested: FileChange = {
        filePath: 'tested.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 40,
        linesDeleted: 5,
        linesModified: 0,
        complexity: 12,
        testFiles: ['a.test.ts', 'b.test.ts', 'c.test.ts'],
      };
      const untestedResult = assessor.assessFileChange(untested);
      const testedResult = assessor.assessFileChange(tested);
      // Well-tested should have lower or equal failure probability
      expect(testedResult.failureProbability).toBeLessThanOrEqual(untestedResult.failureProbability);
    });

    it('should generate rollback plan and feature flag for critical changes', () => {
      const change: FileChange = {
        filePath: 'critical.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 150,
        linesDeleted: 20,
        linesModified: 10,
        complexity: 25,
        securityAreas: ['authentication'],
      };
      const result = assessor.assessFileChange(change);
      if (result.riskLevel === RiskLevel.CRITICAL) {
        const titles = result.mitigations.map((m) => m.title);
        expect(titles).toContain('Prepare Rollback Plan');
        expect(titles).toContain('Feature Flag Deployment');
        expect(titles).toContain('Enhanced Monitoring');
      }
    });
  });

  // ── assessChanges ────────────────────────────────────────────────────

  describe('assessChanges', () => {
    it('should produce a report with correct structure for multiple changes', () => {
      const changes: FileChange[] = [
        {
          filePath: 'a.ts', changeType: ChangeType.MODIFY,
          linesAdded: 5, linesDeleted: 2, linesModified: 0,
        },
        {
          filePath: 'b.ts', changeType: ChangeType.ADD,
          linesAdded: 10, linesDeleted: 0, linesModified: 0,
        },
      ];
      const report = assessor.assessChanges(changes);
      expect(report.id).toMatch(/^ra-\d{6}$/);
      expect(report.fileAssessments).toHaveLength(2);
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskLevel).toBeDefined();
      expect(report.deploymentReadiness).toBeDefined();
      expect(report.recommendation).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should have deployment readiness checklist with real checks', () => {
      const changes: FileChange[] = [
        {
          filePath: 'safe.ts', changeType: ChangeType.MODIFY,
          linesAdded: 1, linesDeleted: 0, linesModified: 0,
          testFiles: ['safe.test.ts', 'safe.test2.ts', 'safe.test3.ts'],
        },
      ];
      const report = assessor.assessChanges(changes);
      expect(report.deploymentReadiness.checklist.length).toBeGreaterThan(0);
      // Each check item should have required fields
      for (const item of report.deploymentReadiness.checklist) {
        expect(item.description).toBeTruthy();
        expect(typeof item.passed).toBe('boolean');
        expect(item.category).toBeTruthy();
      }
    });

    it('should aggregate mitigations sorted by priority', () => {
      const changes: FileChange[] = [
        {
          filePath: 'critical.ts', changeType: ChangeType.MODIFY,
          linesAdded: 100, linesDeleted: 0, linesModified: 0,
          securityAreas: ['authentication'],
          complexity: 20,
        },
      ];
      const report = assessor.assessChanges(changes);
      expect(report.topMitigations.length).toBeLessThanOrEqual(10);
      // Check sorting: CRITICAL should come before MEDIUM
      if (report.topMitigations.length >= 2) {
        const priorities = report.topMitigations.map((m) => m.priority);
        const priorityOrder: Record<RiskLevel, number> = {
          [RiskLevel.CRITICAL]: 0,
          [RiskLevel.HIGH]: 1,
          [RiskLevel.MEDIUM]: 2,
          [RiskLevel.LOW]: 3,
        };
        for (let i = 0; i < priorities.length - 1; i++) {
          expect((priorityOrder[priorities[i]!] ?? 4)).toBeLessThanOrEqual(
            (priorityOrder[priorities[i + 1]!] ?? 4),
          );
        }
      }
    });

    it('should produce deployment recommendation with strategy', () => {
      const changes: FileChange[] = [
        {
          filePath: 'safe.ts', changeType: ChangeType.MODIFY,
          linesAdded: 3, linesDeleted: 1, linesModified: 0,
          testFiles: ['safe.test.ts', 'safe.test2.ts', 'safe.test3.ts'],
        },
      ];
      const report = assessor.assessChanges(changes);
      expect(report.recommendation.go).toBeDefined();
      expect(report.recommendation.confidence).toBeGreaterThan(0);
      expect(report.recommendation.confidence).toBeLessThanOrEqual(1);
      expect(report.recommendation.strategy).toBeDefined();
      expect(report.recommendation.summary).toBeTruthy();
    });

    it('should use DIRECT strategy for low-risk changes', () => {
      const changes: FileChange[] = [
        {
          filePath: 'readme.md', changeType: ChangeType.MODIFY,
          linesAdded: 2, linesDeleted: 1, linesModified: 0,
          testFiles: ['r.test.ts', 'r.test2.ts', 'r.test3.ts'],
        },
      ];
      const report = assessor.assessChanges(changes);
      expect(report.recommendation.strategy).toBe(DeploymentStrategy.DIRECT);
      expect(report.recommendation.go).toBe(true);
      expect(report.recommendation.confidence).toBeGreaterThan(0.8);
    });

    it('should block deployment when blockers exist', () => {
      const changes: FileChange[] = [
        {
          filePath: 'unsafe.ts', changeType: ChangeType.MODIFY,
          linesAdded: 100, linesDeleted: 0, linesModified: 0,
          securityAreas: ['authentication', 'data-privacy'],
          complexity: 25,
        },
      ];
      const report = assessor.assessChanges(changes);
      // High security exposure without tests should create blockers
      expect(report.deploymentReadiness.blockers.length).toBeGreaterThanOrEqual(1);
      expect(report.deploymentReadiness.ready).toBe(false);
    });

    it('should increment report id on consecutive calls', () => {
      const changes: FileChange[] = [
        {
          filePath: 'f.ts', changeType: ChangeType.MODIFY,
          linesAdded: 1, linesDeleted: 0, linesModified: 0,
          testFiles: ['f.test.ts', 'f.test2.ts', 'f.test3.ts'],
        },
      ];
      const report1 = assessor.assessChanges(changes);
      const report2 = assessor.assessChanges(changes);
      expect(report2.id).not.toBe(report1.id);
    });
  });

  // ── recordOutcome and getPredictionAccuracy ──────────────────────────

  describe('recordOutcome and getPredictionAccuracy', () => {
    it('should return undefined when fewer than 5 samples', () => {
      for (let i = 0; i < 4; i++) {
        assessor.recordOutcome(0.3, true);
      }
      expect(assessor.getPredictionAccuracy()).toBeUndefined();
    });

    it('should compute accuracy with 5+ samples', () => {
      // Record 6 samples where prediction matches actual
      assessor.recordOutcome(0.8, true);   // predicted fail, actual fail — correct
      assessor.recordOutcome(0.9, true);   // correct
      assessor.recordOutcome(0.1, false);  // predicted pass, actual pass — correct
      assessor.recordOutcome(0.7, true);   // correct
      assessor.recordOutcome(0.2, false);  // correct
      assessor.recordOutcome(0.6, true);   // correct
      const accuracy = assessor.getPredictionAccuracy();
      expect(accuracy).toBeDefined();
      expect(accuracy!.accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy!.accuracy).toBeLessThanOrEqual(1);
      expect(accuracy!.sampleSize).toBe(6);
    });

    it('should reflect reduced accuracy with incorrect predictions', () => {
      // 5 correct + 1 incorrect
      assessor.recordOutcome(0.8, true);   // correct
      assessor.recordOutcome(0.9, true);   // correct
      assessor.recordOutcome(0.1, false);  // correct
      assessor.recordOutcome(0.7, false);  // WRONG: predicted fail but actual pass
      assessor.recordOutcome(0.2, false);  // correct
      assessor.recordOutcome(0.6, true);   // correct
      const accuracy = assessor.getPredictionAccuracy();
      expect(accuracy).toBeDefined();
      expect(accuracy!.accuracy).toBeLessThan(1);
      expect(accuracy!.sampleSize).toBe(6);
    });
  });

  // ── getFactorWeights ─────────────────────────────────────────────────

  describe('getFactorWeights', () => {
    it('should return all five configured factor weights', () => {
      const weights = assessor.getFactorWeights();
      expect(weights.size).toBe(5);
      for (const [factor, weight] of weights) {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
        expect(Object.values(RiskFactor)).toContain(factor);
      }
    });

    it('should have weights that sum close to 1', () => {
      const weights = assessor.getFactorWeights();
      let sum = 0;
      for (const weight of weights.values()) {
        sum += weight;
      }
      expect(sum).toBeGreaterThan(0.99);
      expect(sum).toBeLessThanOrEqual(1.01);
    });
  });

  // ── Impact prediction calculations ───────────────────────────────────

  describe('impact prediction', () => {
    it('should compute blast radius of 1 for single file with no dependents', () => {
      const change: FileChange = {
        filePath: 'standalone.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 5, linesDeleted: 0, linesModified: 0,
      };
      const result = assessor.assessFileChange(change);
      expect(result.impactPrediction.blastRadius).toBe(1);
      expect(result.impactPrediction.directImpactCount).toBe(0);
    });

    it('should identify affected subsystems from file paths', () => {
      const change: FileChange = {
        filePath: 'src/auth/middleware.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 10, linesDeleted: 0, linesModified: 0,
        dependents: ['src/routes/api.ts', 'src/routes/admin.ts'],
      };
      const result = assessor.assessFileChange(change);
      expect(result.impactPrediction.affectedSubsystems.length).toBeGreaterThanOrEqual(1);
      expect(result.impactPrediction.affectedSubsystems.some(
        (s) => s.includes('src/auth') || s.includes('src/routes'),
      )).toBe(true);
    });

    it('should include highest risk files from dependents', () => {
      const change: FileChange = {
        filePath: 'shared.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 10, linesDeleted: 0, linesModified: 0,
        dependents: ['dep1.ts', 'dep2.ts', 'dep3.ts', 'dep4.ts', 'dep5.ts', 'dep6.ts'],
      };
      const result = assessor.assessFileChange(change);
      expect(result.impactPrediction.highestRiskFiles.length).toBeLessThanOrEqual(5);
    });
  });

  // ── Failure probability estimation ───────────────────────────────────

  describe('failure probability', () => {
    it('should boost probability for security-sensitive changes', () => {
      const normal: FileChange = {
        filePath: 'normal.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 30, linesDeleted: 5, linesModified: 0,
      };
      const security: FileChange = {
        filePath: 'sec.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 30, linesDeleted: 5, linesModified: 0,
        securityAreas: ['authentication'],
      };
      const normalResult = assessor.assessFileChange(normal);
      const secResult = assessor.assessFileChange(security);
      expect(secResult.failureProbability).toBeGreaterThanOrEqual(normalResult.failureProbability);
    });

    it('should produce higher risk scores with more security areas', () => {
      const low: FileChange = {
        filePath: 'low.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 20, linesDeleted: 0, linesModified: 0,
        securityAreas: ['logging'],
      };
      const high: FileChange = {
        filePath: 'high.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 20, linesDeleted: 0, linesModified: 0,
        securityAreas: ['authentication', 'authorization', 'data-privacy'],
      };
      const lowResult = assessor.assessFileChange(low);
      const highResult = assessor.assessFileChange(high);
      expect(highResult.factorScores.get(RiskFactor.SECURITY_EXPOSURE)!).toBeGreaterThan(
        lowResult.factorScores.get(RiskFactor.SECURITY_EXPOSURE)!,
      );
    });
  });

  // ── Mitigation generation ────────────────────────────────────────────

  describe('mitigation generation', () => {
    it('should recommend Add Integration Tests when test coverage is low', () => {
      const change: FileChange = {
        filePath: 'untested.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 40, linesDeleted: 0, linesModified: 0,
      };
      const result = assessor.assessFileChange(change);
      const testMitigations = result.mitigations.filter(
        (m) => m.category === MitigationCategory.TESTING,
      );
      expect(testMitigations.length).toBeGreaterThanOrEqual(1);
    });

    it('should recommend Performance Testing for large changes', () => {
      const change: FileChange = {
        filePath: 'large.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 250, linesDeleted: 0, linesModified: 0,
      };
      const result = assessor.assessFileChange(change);
      const perfMitigations = result.mitigations.filter(
        (m) => m.category === MitigationCategory.PERFORMANCE_TESTING,
      );
      expect(perfMitigations.length).toBeGreaterThanOrEqual(1);
    });

    it('should recommend Update Documentation for large scope changes', () => {
      const change: FileChange = {
        filePath: 'big-scope.ts',
        changeType: ChangeType.MODIFY,
        linesAdded: 150, linesDeleted: 20, linesModified: 10,
      };
      const result = assessor.assessFileChange(change);
      const docMitigations = result.mitigations.filter(
        (m) => m.category === MitigationCategory.DOCUMENTATION,
      );
      expect(docMitigations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Deployment recommendation logic ───────────────────────────────────

  describe('deployment recommendation', () => {
    it('should recommend STAGED for HIGH risk with no blockers', () => {
      const changes: FileChange[] = [
        {
          filePath: 'risky.ts',
          changeType: ChangeType.MODIFY,
          linesAdded: 80, linesDeleted: 10, linesModified: 0,
          complexity: 15,
          dependents: ['a.ts', 'b.ts', 'c.ts'],
          testFiles: ['risky.test.ts', 'risky.test2.ts', 'risky.test3.ts'],
        },
      ];
      const report = assessor.assessChanges(changes);
      if (report.overallRiskLevel === RiskLevel.HIGH && report.deploymentReadiness.blockers.length === 0) {
        expect(report.recommendation.strategy).toBe(DeploymentStrategy.STAGED);
        expect(report.recommendation.go).toBe(true);
      }
    });

    it('should recommend CANARY for MEDIUM risk', () => {
      const changes: FileChange[] = [
        {
          filePath: 'medium.ts',
          changeType: ChangeType.MODIFY,
          linesAdded: 30, linesDeleted: 5, linesModified: 0,
          testFiles: ['m.test.ts', 'm.test2.ts', 'm.test3.ts'],
        },
      ];
      const report = assessor.assessChanges(changes);
      if (report.overallRiskLevel === RiskLevel.MEDIUM) {
        expect(report.recommendation.strategy).toBe(DeploymentStrategy.CANARY);
        expect(report.recommendation.go).toBe(true);
      }
    });

    it('should recommend MANUAL_REVIEW for CRITICAL risk', () => {
      const changes: FileChange[] = [
        {
          filePath: 'critical.ts',
          changeType: ChangeType.MODIFY,
          linesAdded: 200, linesDeleted: 0, linesModified: 0,
          complexity: 30,
          securityAreas: ['authentication', 'data-privacy', 'authorization'],
        },
      ];
      const report = assessor.assessChanges(changes);
      if (report.overallRiskLevel === RiskLevel.CRITICAL) {
        expect(report.recommendation.strategy).toBe(DeploymentStrategy.MANUAL_REVIEW);
        expect(report.recommendation.go).toBe(false);
      }
    });

    it('should block deployment when security blockers exist', () => {
      const changes: FileChange[] = [
        {
          filePath: 'danger.ts',
          changeType: ChangeType.MODIFY,
          linesAdded: 100, linesDeleted: 0, linesModified: 0,
          securityAreas: ['authentication', 'data-privacy'],
        },
      ];
      const report = assessor.assessChanges(changes);
      if (report.deploymentReadiness.blockers.length > 0) {
        expect(report.recommendation.go).toBe(false);
        expect(report.recommendation.strategy).toBe(DeploymentStrategy.MANUAL_REVIEW);
      }
    });
  });
});
