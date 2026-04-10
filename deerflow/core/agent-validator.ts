/**
 * @module agent-validator
 * @description Validates AI agent behavior during code-generation sessions.
 * Monitors for hallucination, token waste, incomplete tasks, and behavioral
 * violations. Produces a composite AgentScore rating performance.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Severity of an agent violation */
export enum ViolationSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/** A recorded violation of agent behavior rules */
export interface Violation {
  readonly id: string;
  readonly type: ViolationType;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: string;
  readonly details?: Record<string, unknown>;
}

/** Categorised types of violations */
export enum ViolationType {
  Hallucination = 'hallucination',
  TokenWaste = 'token-waste',
  IncompleteTask = 'incomplete-task',
  RepeatedMistake = 'repeated-mistake',
  ScopeViolation = 'scope-violation',
  IgnoredConstraints = 'ignored-constraints',
  ExcessiveRetries = 'excessive-retries',
  UnverifiedOutput = 'unverified-output',
}

/** Metrics composing the agent's performance score */
export interface AgentMetrics {
  /** 0-100: accuracy of generated content (no hallucinations) */
  accuracy: number;
  /** 0-100: efficient token usage (minimal waste) */
  efficiency: number;
  /** 0-100: task completion rate */
  completion: number;
  /** 0-100: adherence to constraints and rules */
  compliance: number;
  /** Overall composite score (weighted average) */
  overall: number;
}

/** A snapshot of the agent's performance at a point in time */
export interface AgentScore {
  readonly metrics: AgentMetrics;
  readonly violations: Violation[];
  readonly evaluatedAt: Date;
  readonly sessionId: string;
}

/** Represents a single action taken by the agent */
export interface AgentAction {
  readonly type: 'code_generation' | 'file_operation' | 'shell_command' | 'explanation' | 'correction';
  readonly content: string;
  readonly timestamp: Date;
  readonly tokensUsed: number;
  readonly filePath?: string;
  readonly success: boolean;
}

/** Configuration for the AgentValidator */
export interface AgentValidatorConfig {
  /** Session identifier for this validation run */
  sessionId: string;
  /** Minimum acceptable overall score (0-100, default: 70) */
  minimumScore: number;
  /** Maximum hallucination tolerance (default: 0) */
  maxHallucinations: number;
  /** Maximum retries per task before flagging (default: 3) */
  maxRetries: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hallucination Detector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flags potentially fabricated information in agent outputs.
 * Uses heuristic patterns to detect common hallucination indicators.
 */
export class HallucinationDetector {
  /** Patterns that suggest hallucinated content */
  private static readonly HALLUCINATION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
    // Fabricated API references
    { pattern: /\b(?:undocumented|unreleased|upcoming)\s+(?:API|method|feature|function|class)\b/i, label: 'Reference to undocumented/unreleased API' },
    // Vague authority claims without evidence
    { pattern: /\b(?:according to|as stated in|the docs say|documentation says)\b.*\b(?:but|however)\s+(?:I|we)\s+(?:can|could|should|will)\b/i, label: 'Contradictory documentation claim' },
    // Invented package names
    { pattern: /(?:import|require)\s*\(?\s*.+?['"](?:@deerflow|@runtime|@magic)[^'"]*['"]/, label: 'Import of non-existent package' },
    // Fabricated version numbers for well-known packages
    { pattern: /(?:version|v)\s+(?:99|100|999)\.\d+\.\d+/, label: 'Implausible version number' },
    // Overly confident statements about external state
    { pattern: /\b(?:all|every|always|never|guaranteed|definitely)\s+(?:works|supported|available|compatible)\b/i, label: 'Overly confident universal claim' },
    // Citation-like patterns without real references
    { pattern: /\[(?:ref|citation|source)[\s:]*(\d+|[a-z])\](?!\s*[(\[])/i, label: 'Citation placeholder without actual reference' },
  ];

  /**
   * Analyze a piece of agent output for hallucination indicators.
   * @returns Array of detected hallucination signals (empty if clean).
   */
  detect(content: string): Array<{ label: string; match: string }> {
    const signals: Array<{ label: string; match: string }> = [];

    for (const { pattern, label } of HallucinationDetector.HALLUCINATION_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        signals.push({ label, match: match[0] });
      }
    }

    return signals;
  }

  /** Check if content appears clean (no hallucination signals) */
  isClean(content: string): boolean {
    return this.detect(content).length === 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Efficiency Scorer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Measures how efficiently an agent uses tokens. Detects patterns of waste
 * such as repetitive content, excessive whitespace, and redundant explanations.
 */
export class TokenEfficiencyScorer {
  /**
   * Calculate an efficiency score (0-100) for a set of agent actions.
   * Higher is better.
   */
  score(actions: AgentAction[]): number {
    if (actions.length === 0) return 100;

    let totalTokens = 0;
    let wastedTokens = 0;
    let repetitiveCount = 0;
    let emptyContentCount = 0;

    const seenContents = new Set<string>();

    for (const action of actions) {
      totalTokens += action.tokensUsed;

      // Empty or near-empty content
      if (action.content.trim().length === 0) {
        wastedTokens += action.tokensUsed;
        emptyContentCount++;
        continue;
      }

      // Exact duplicate content (same response sent multiple times)
      const contentKey = action.content.trim();
      if (seenContents.has(contentKey)) {
        wastedTokens += action.tokensUsed;
        repetitiveCount++;
      } else {
        seenContents.add(contentKey);
      }

      // Excessive whitespace (> 30% whitespace)
      const whitespaceRatio = (action.content.match(/\s/g) ?? []).length / action.content.length;
      if (whitespaceRatio > 0.3) {
        wastedTokens += Math.floor(action.tokensUsed * (whitespaceRatio - 0.3));
      }

      // Failed actions consume tokens without producing results
      if (!action.success) {
        wastedTokens += action.tokensUsed;
      }
    }

    if (totalTokens === 0) return 100;

    const wasteRatio = wastedTokens / totalTokens;
    const repetitionPenalty = Math.min(repetitiveCount / actions.length, 1) * 20;
    const emptyPenalty = Math.min(emptyContentCount / actions.length, 1) * 30;

    const baseScore = 100 - (wasteRatio * 100) - repetitionPenalty - emptyPenalty;
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Completion Verifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the agent's stated task has actually been completed.
 * Looks for indicators of success versus abandonment.
 */
export class TaskCompletionVerifier {
  /**
   * Analyze a sequence of actions and the task description to determine
   * whether the task appears to have been completed.
   */
  verify(
    taskDescription: string,
    actions: AgentAction[],
    finalOutput?: string,
  ): { completed: boolean; confidence: number; issues: string[] } {
    const issues: string[] = [];
    let confidence = 50; // Start neutral

    // Check for final verification step
    const hasTestAction = actions.some(
      (a) => a.type === 'shell_command' && /(?:test|check|verify|lint|build)/i.test(a.content),
    );
    if (hasTestAction) {
      confidence += 15;
    } else {
      issues.push('No test or verification step performed');
    }

    // Check if last actions were successful
    const recentActions = actions.slice(-3);
    const allRecentSucceeded = recentActions.every((a) => a.success);
    if (allRecentSucceeded) {
      confidence += 15;
    } else {
      issues.push('Recent actions include failures');
    }

    // Check for task-abandonment patterns in final output
    if (finalOutput) {
      const abandonPatterns = [
        /\b(?:I can't|unable to|failed to)\s+(?:complete|finish|do|implement)/i,
        /\b(?:TODO|left as exercise|not implemented|stub)/i,
        /\b(?:incomplete|partial|work in progress)\b/i,
      ];
      for (const p of abandonPatterns) {
        if (p.test(finalOutput)) {
          confidence -= 20;
          issues.push('Final output contains task-abandonment language');
        }
      }
    }

    // Check for excessive corrections (sign of struggle)
    const corrections = actions.filter((a) => a.type === 'correction');
    if (corrections.length > 5) {
      confidence -= 15;
      issues.push(`Excessive corrections (${corrections.length} correction actions)`);
    }

    // Verify the task description keywords appear in actions
    const taskKeywords = taskDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10);
    const actionText = actions.map((a) => a.content.toLowerCase()).join(' ');
    const matchedKeywords = taskKeywords.filter((kw) => actionText.includes(kw));
    const keywordCoverage = taskKeywords.length > 0 ? matchedKeywords.length / taskKeywords.length : 1;
    confidence += Math.round(keywordCoverage * 15);

    if (keywordCoverage < 0.5) {
      issues.push('Task keywords are poorly represented in agent actions');
    }

    confidence = Math.max(0, Math.min(100, confidence));
    const completed = confidence >= 60;

    return { completed, confidence, issues };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Behavior Checker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Monitors agent behavioral patterns over time. Detects repeated mistakes,
  * scope violations, and constraint-ignoring behavior.
 */
export class BehaviorChecker {
  private actionHistory: AgentAction[] = [];
  private retryCount: number = 0;
  private previousErrors: Set<string> = new Set();
  private config: AgentValidatorConfig;

  constructor(config: AgentValidatorConfig) {
    this.config = config;
  }

  /**
   * Record an agent action and check for behavioral violations.
   */
  check(action: AgentAction): Violation[] {
    this.actionHistory.push(action);
    const violations: Violation[] = [];

    // Detect repeated mistakes
    if (!action.success) {
      const errorKey = action.content.slice(0, 100);
      if (this.previousErrors.has(errorKey)) {
        violations.push(this.createViolation(
          ViolationType.RepeatedMistake,
          ViolationSeverity.Medium,
          `Repeated error detected: "${errorKey}"`,
        ));
      }
      this.previousErrors.add(errorKey);
      this.retryCount++;
    } else {
      this.retryCount = 0;
    }

    // Detect excessive retries
    if (this.retryCount > this.config.maxRetries) {
      violations.push(this.createViolation(
        ViolationType.ExcessiveRetries,
        ViolationSeverity.High,
        `Agent has retried ${this.retryCount} times without success`,
      ));
    }

    // Detect unverified output (code generation without subsequent test)
    if (action.type === 'code_generation' && action.success) {
      const lastAction = this.actionHistory[this.actionHistory.length - 2];
      if (lastAction && lastAction.type === 'code_generation' && lastAction.success) {
        // Two consecutive code generations without test in between
        const recentTests = this.actionHistory
          .slice(-5)
          .filter((a) => a.type === 'shell_command' && /test/i.test(a.content));
        if (recentTests.length === 0) {
          violations.push(this.createViolation(
            ViolationType.UnverifiedOutput,
            ViolationSeverity.Low,
            'Code generated without recent test verification',
          ));
        }
      }
    }

    return violations;
  }

  /** Reset the behavior checker state */
  reset(): void {
    this.actionHistory = [];
    this.retryCount = 0;
    this.previousErrors.clear();
  }

  private createViolation(type: ViolationType, severity: ViolationSeverity, message: string): Violation {
    return {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collects, persists, and reports agent violations over time.
 */
export class ViolationLogger {
  private violations: Violation[] = [];

  /** Log a violation */
  log(violation: Violation): void {
    this.violations.push(violation);
  }

  /** Log multiple violations */
  logAll(violations: Violation[]): void {
    this.violations.push(...violations);
  }

  /** Get all violations, optionally filtered */
  getViolations(filter?: { type?: ViolationType; severity?: ViolationSeverity }): Violation[] {
    let results = [...this.violations];
    if (filter?.type) results = results.filter((v) => v.type === filter.type);
    if (filter?.severity) results = results.filter((v) => v.severity === filter.severity);
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /** Count violations by severity */
  countBySeverity(): Record<ViolationSeverity, number> {
    const counts: Record<ViolationSeverity, number> = {
      [ViolationSeverity.Low]: 0,
      [ViolationSeverity.Medium]: 0,
      [ViolationSeverity.High]: 0,
      [ViolationSeverity.Critical]: 0,
    };
    for (const v of this.violations) {
      counts[v.severity]++;
    }
    return counts;
  }

  /** Count violations by type */
  countByType(): Record<ViolationType, number> {
    const counts = {} as Record<ViolationType, number>;
    for (const v of this.violations) {
      counts[v.type] = (counts[v.type] ?? 0) + 1;
    }
    return counts;
  }

  /** Export violations as a structured report */
  generateReport(): string {
    const bySeverity = this.countBySeverity();
    const lines: string[] = [
      `Agent Violation Report — ${new Date().toISOString()}`,
      `Total violations: ${this.violations.length}`,
      `  Critical: ${bySeverity[ViolationSeverity.Critical]}`,
      `  High:     ${bySeverity[ViolationSeverity.High]}`,
      `  Medium:   ${bySeverity[ViolationSeverity.Medium]}`,
      `  Low:      ${bySeverity[ViolationSeverity.Low]}`,
      '',
    ];
    for (const v of this.getViolations()) {
      lines.push(`[${v.severity.toUpperCase()}] ${v.type.toUpperCase()}: ${v.message} (${v.timestamp.toISOString()})`);
    }
    return lines.join('\n');
  }

  /** Clear all logged violations */
  clear(): void {
    this.violations = [];
  }

  get totalViolations(): number {
    return this.violations.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level validator that orchestrates all sub-checkers to produce
 * a composite AgentScore rating the agent's performance.
 */
export class AgentValidator {
  private hallucinationDetector: HallucinationDetector;
  private efficiencyScorer: TokenEfficiencyScorer;
  private completionVerifier: TaskCompletionVerifier;
  private behaviorChecker: BehaviorChecker;
  private violationLogger: ViolationLogger;
  private actions: AgentAction[] = [];
  private config: AgentValidatorConfig;

  constructor(config?: Partial<AgentValidatorConfig>) {
    this.config = {
      sessionId: `session-${Date.now()}`,
      minimumScore: 70,
      maxHallucinations: 0,
      maxRetries: 3,
      ...config,
    };
    this.hallucinationDetector = new HallucinationDetector();
    this.efficiencyScorer = new TokenEfficiencyScorer();
    this.completionVerifier = new TaskCompletionVerifier();
    this.behaviorChecker = new BehaviorChecker(this.config);
    this.violationLogger = new ViolationLogger();
  }

  /**
   * Register an agent action for evaluation.
   */
  recordAction(action: AgentAction): void {
    this.actions.push(action);

    // Check behavior
    const violations = this.behaviorChecker.check(action);
    this.violationLogger.logAll(violations);

    // Check for hallucination in explanations and generated code
    if (action.type === 'explanation' || action.type === 'code_generation') {
      const hallucinations = this.hallucinationDetector.detect(action.content);
      if (hallucinations.length > 0) {
        for (const h of hallucinations) {
          this.violationLogger.log({
            id: `hall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: ViolationType.Hallucination,
            severity: ViolationSeverity.High,
            message: h.label,
            timestamp: new Date(),
            context: h.match,
          });
        }
      }
    }
  }

  /**
   * Evaluate the agent's performance and return a composite score.
   */
  evaluate(taskDescription: string, finalOutput?: string): AgentScore {
    // Accuracy: inverse of hallucination count
    const hallucinationCount = this.violationLogger
      .getViolations({ type: ViolationType.Hallucination }).length;
    const accuracy = Math.max(0, 100 - (hallucinationCount * 25));

    // Efficiency: token waste score
    const efficiency = this.efficiencyScorer.score(this.actions);

    // Completion: task completion check
    const completionResult = this.completionVerifier.verify(taskDescription, this.actions, finalOutput);
    const completion = completionResult.confidence;

    // Compliance: inverse of total violations (excluding low severity)
    const significantViolations = this.violationLogger
      .getViolations()
      .filter((v) => v.severity !== ViolationSeverity.Low).length;
    const compliance = Math.max(0, 100 - (significantViolations * 10));

    // Overall: weighted average
    const overall = Math.round(
      accuracy * 0.3 + efficiency * 0.2 + completion * 0.3 + compliance * 0.2,
    );

    const metrics: AgentMetrics = {
      accuracy,
      efficiency,
      completion,
      compliance,
      overall,
    };

    return {
      metrics,
      violations: this.violationLogger.getViolations(),
      evaluatedAt: new Date(),
      sessionId: this.config.sessionId,
    };
  }

  /**
   * Check if the agent's score meets the minimum threshold.
   */
  meetsMinimumThreshold(taskDescription: string, finalOutput?: string): boolean {
    const score = this.evaluate(taskDescription, finalOutput);
    return score.metrics.overall >= this.config.minimumScore;
  }

  /** Get the violation report */
  getReport(): string {
    return this.violationLogger.generateReport();
  }

  /** Get all logged violations */
  getViolations(): Violation[] {
    return this.violationLogger.getViolations();
  }

  /** Reset the validator for a new task */
  reset(): void {
    this.actions = [];
    this.violationLogger.clear();
    this.behaviorChecker.reset();
  }
}
