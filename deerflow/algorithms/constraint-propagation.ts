/**
 * @module constraint-propagation
 * @description Constraint propagation algorithm for detecting cascading impacts
 * across file dependencies. Implements AC-3 arc consistency, forward checking,
 * circular dependency detection via topological sort, and constraint satisfaction
 * for coordinating multi-file edits within the Deerflow Agent Framework.
 */

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * Represents a single constraint between two variables (files) in the CSP.
 */
export interface Constraint {
  /** Unique identifier for this constraint. */
  id: string;
  /** The source variable (file) that this constraint originates from. */
  source: string;
  /** The target variable (file) that this constraint applies to. */
  target: string;
  /** Human-readable description of the constraint. */
  description: string;
  /** Type of constraint relationship. */
  type: ConstraintType;
  /** Optional validation function that checks if the constraint is satisfied. */
  validator?: (sourceValue: unknown, targetValue: unknown) => boolean;
  /** Priority level — higher priority constraints are propagated first. */
  priority: number;
  /** Whether this constraint is currently active. */
  active: boolean;
}

/**
 * The kinds of constraints supported by the solver.
 */
export enum ConstraintType {
  /** The source must be edited before the target. */
  ORDERING = 'ORDERING',
  /** Both variables must change together or neither. */
  CO_CHANGE = 'CO_CHANGE',
  /** The source and target must remain compatible. */
  COMPATIBILITY = 'COMPATIBILITY',
  /** The source must not introduce an API break for the target. */
  API_STABILITY = 'API_STABILITY',
  /** The target depends on a specific version of the source. */
  VERSION_PIN = 'VERSION_PIN',
  /** Custom user-defined constraint. */
  CUSTOM = 'CUSTOM',
}

/**
 * A variable (file) in the constraint satisfaction problem.
 */
export interface Variable<T = unknown> {
  /** File path or identifier. */
  id: string;
  /** Current value / state of the variable. */
  value: T | undefined;
  /** The set of permissible values (domain). */
  domain: T[];
  /** Whether this variable has been assigned a value. */
  assigned: boolean;
  /** Human-readable label. */
  label?: string;
}

/**
 * Result of a propagation cycle.
 */
export interface PropagationResult {
  /** Whether propagation completed without inconsistencies. */
  consistent: boolean;
  /** Variables whose domains were reduced during propagation. */
  reducedVariables: string[];
  /** Constraints that were violated. */
  violatedConstraints: string[];
  /** Number of arcs processed. */
  arcsProcessed: number;
  /** Total wall-clock time spent propagating (ms). */
  durationMs: number;
}

/**
 * Result of impact analysis for a changed file.
 */
export interface ImpactAnalysisResult {
  /** The file that changed. */
  changedFile: string;
  /** Files directly affected. */
  directImpacts: string[];
  /** Files transitively affected (including direct). */
  transitiveImpacts: string[];
  /** Constraints that are now at risk of violation. */
  atRiskConstraints: Constraint[];
  /** Recommended action order for safe propagation. */
  recommendedOrder: string[];
  /** Detected circular dependency chains. */
  circularChains: string[][];
  /** Severity of the overall impact (0-1). */
  severityScore: number;
}

/**
 * Configuration options for the solver.
 */
export interface SolverConfig {
  /** Maximum number of arc-revision iterations before giving up. */
  maxIterations?: number;
  /** Whether to detect and report circular dependencies eagerly. */
  detectCycles?: boolean;
  /** Enable verbose logging for debugging. */
  verbose?: boolean;
  /** Maximum depth for transitive impact analysis. */
  maxImpactDepth?: number;
  /** Whether forward checking is enabled. */
  forwardChecking?: boolean;
}

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<SolverConfig> = {
  maxIterations: 10000,
  detectCycles: true,
  verbose: false,
  maxImpactDepth: 10,
  forwardChecking: true,
};

// ─── Constraint Graph ────────────────────────────────────────────────────────

/**
 * Directed constraint graph that maps variables to their constrained neighbors.
 *
 * Each node is a variable id and each edge represents a constraint. The graph
 * supports efficient neighbor lookup for arc consistency propagation.
 */
export class ConstraintGraph {
  private adjacency: Map<string, Constraint[]> = new Map();
  private reverseAdjacency: Map<string, Constraint[]> = new Map();

  /** Add a constraint to the graph. */
  addConstraint(constraint: Constraint): void {
    if (!this.adjacency.has(constraint.source)) {
      this.adjacency.set(constraint.source, []);
    }
    if (!this.reverseAdjacency.has(constraint.target)) {
      this.reverseAdjacency.set(constraint.target, []);
    }
    this.adjacency.get(constraint.source)!.push(constraint);
    this.reverseAdjacency.get(constraint.target)!.push(constraint);
  }

  /** Remove a constraint by id. */
  removeConstraint(constraintId: string): boolean {
    for (const [_source, constraints] of this.adjacency) {
      const idx = constraints.findIndex((c) => c.id === constraintId);
      if (idx !== -1) {
        constraints.splice(idx, 1);
      }
    }
    for (const [_target, constraints] of this.reverseAdjacency) {
      const idx = constraints.findIndex((c) => c.id === constraintId);
      if (idx !== -1) {
        constraints.splice(idx, 1);
      }
    }
    return true;
  }

  /** Get outgoing constraints from a variable. */
  getOutgoing(variableId: string): Constraint[] {
    return this.adjacency.get(variableId) ?? [];
  }

  /** Get incoming constraints to a variable. */
  getIncoming(variableId: string): Constraint[] {
    return this.reverseAdjacency.get(variableId) ?? [];
  }

  /** Get all variable ids in the graph. */
  getAllVariables(): string[] {
    const vars = new Set<string>();
    for (const key of this.adjacency.keys()) vars.add(key);
    for (const key of this.reverseAdjacency.keys()) vars.add(key);
    return Array.from(vars);
  }

  /** Total number of constraints. */
  get constraintCount(): number {
    let total = 0;
    for (const constraints of this.adjacency.values()) {
      total += constraints.length;
    }
    return total;
  }
}

// ─── AC-3 Arc Consistency ────────────────────────────────────────────────────

/**
 * Represents a directed arc between two variables in the CSP.
 */
interface Arc {
  source: string;
  target: string;
  constraint: Constraint;
}

/**
 * Revision result from a single arc revision.
 */
interface RevisionResult {
  /** Whether the target domain was revised (reduced). */
  revised: boolean;
  /** Number of values removed from the target domain. */
  valuesRemoved: number;
}

// ─── Main Solver ─────────────────────────────────────────────────────────────

/**
 * ConstraintPropagationSolver implements a full constraint satisfaction solver
 * with AC-3 arc consistency, forward checking, impact analysis, cycle detection,
 * and multi-file edit coordination.
 *
 * @typeParam T - The domain type for variables (defaults to `string`).
 *
 * @example
 * ```ts
 * const solver = new ConstraintPropagationSolver<string>();
 * solver.addVariable({ id: 'a.ts', domain: ['ok', 'error'], assigned: false });
 * solver.addVariable({ id: 'b.ts', domain: ['ok', 'error'], assigned: false });
 * solver.addConstraint({
 *   id: 'c1', source: 'a.ts', target: 'b.ts',
 *   type: ConstraintType.ORDERING, priority: 1, active: true,
 *   description: 'a must compile before b',
 * });
 * const result = solver.propagate();
 * console.log(result.consistent); // true
 * ```
 */
export class ConstraintPropagationSolver<T = string> {
  private variables: Map<string, Variable<T>> = new Map();
  private graph: ConstraintGraph = new ConstraintGraph();
  private constraints: Map<string, Constraint> = new Map();
  private config: Required<SolverConfig>;
  private revisionHistory: Array<{ arc: Arc; result: RevisionResult }> = [];

  constructor(config?: SolverConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Variable Management ──────────────────────────────────────────────────

  /** Add a variable to the solver. */
  addVariable(variable: Variable<T>): void {
    if (this.variables.has(variable.id)) {
      throw new Error(`Variable '${variable.id}' already exists in the solver.`);
    }
    this.variables.set(variable.id, { ...variable });
  }

  /** Remove a variable and all its associated constraints. */
  removeVariable(variableId: string): void {
    if (!this.variables.has(variableId)) {
      throw new Error(`Variable '${variableId}' not found.`);
    }
    const outgoing = this.graph.getOutgoing(variableId);
    const incoming = this.graph.getIncoming(variableId);
    for (const c of [...outgoing, ...incoming]) {
      this.constraints.delete(c.id);
    }
    this.variables.delete(variableId);
  }

  /** Get a variable by id. */
  getVariable(variableId: string): Variable<T> | undefined {
    return this.variables.get(variableId);
  }

  /** Assign a value to a variable, shrinking its domain. */
  assign(variableId: string, value: T): void {
    const variable = this.variables.get(variableId);
    if (!variable) {
      throw new Error(`Variable '${variableId}' not found.`);
    }
    variable.value = value;
    variable.domain = [value];
    variable.assigned = true;
  }

  /** Reset a variable to its original unassigned state with the given domain. */
  resetVariable(variableId: string, domain: T[]): void {
    const variable = this.variables.get(variableId);
    if (!variable) {
      throw new Error(`Variable '${variableId}' not found.`);
    }
    variable.value = undefined;
    variable.domain = domain;
    variable.assigned = false;
  }

  /** Get all variable ids. */
  getAllVariableIds(): string[] {
    return Array.from(this.variables.keys());
  }

  // ── Constraint Management ────────────────────────────────────────────────

  /** Add a constraint between two variables. */
  addConstraint(constraint: Constraint): void {
    if (!this.variables.has(constraint.source)) {
      throw new Error(`Source variable '${constraint.source}' not found.`);
    }
    if (!this.variables.has(constraint.target)) {
      throw new Error(`Target variable '${constraint.target}' not found.`);
    }
    if (this.constraints.has(constraint.id)) {
      throw new Error(`Constraint '${constraint.id}' already exists.`);
    }
    this.constraints.set(constraint.id, constraint);
    this.graph.addConstraint(constraint);
  }

  /** Remove a constraint by id. */
  removeConstraint(constraintId: string): void {
    if (!this.constraints.has(constraintId)) {
      throw new Error(`Constraint '${constraintId}' not found.`);
    }
    this.graph.removeConstraint(constraintId);
    this.constraints.delete(constraintId);
  }

  /** Activate or deactivate a constraint. */
  setConstraintActive(constraintId: string, active: boolean): void {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      throw new Error(`Constraint '${constraintId}' not found.`);
    }
    constraint.active = active;
  }

  /** Get a constraint by id. */
  getConstraint(constraintId: string): Constraint | undefined {
    return this.constraints.get(constraintId);
  }

  /** Get all constraints. */
  getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  // ── AC-3 Arc Consistency ─────────────────────────────────────────────────

  /**
   * Build the initial work queue of arcs from all active constraints.
   */
  private buildWorkQueue(): Arc[] {
    const queue: Arc[] = [];
    for (const constraint of this.constraints.values()) {
      if (!constraint.active) continue;
      queue.push({ source: constraint.source, target: constraint.target, constraint });
      // Add reverse arc for bidirectional propagation
      if (constraint.type === ConstraintType.COMPATIBILITY || constraint.type === ConstraintType.CO_CHANGE) {
        queue.push({ source: constraint.target, target: constraint.source, constraint });
      }
    }
    return queue;
  }

  /**
   * Revise a single arc, removing values from the target domain that have
   * no supporting value in the source domain.
   */
  private revise(sourceVar: Variable<T>, targetVar: Variable<T>, constraint: Constraint): RevisionResult {
    let valuesRemoved = 0;
    const newDomain: T[] = [];

    for (const targetValue of targetVar.domain) {
      let hasSupport = false;
      for (const sourceValue of sourceVar.domain) {
        if (constraint.validator) {
          if (constraint.validator(sourceValue, targetValue)) {
            hasSupport = true;
            break;
          }
        } else {
          // Default: any pair is consistent if both are non-empty
          hasSupport = true;
          break;
        }
      }
      if (hasSupport) {
        newDomain.push(targetValue);
      } else {
        valuesRemoved++;
      }
    }

    if (valuesRemoved > 0) {
      targetVar.domain = newDomain;
    }

    return { revised: valuesRemoved > 0, valuesRemoved };
  }

  /**
   * Run the AC-3 algorithm to establish arc consistency across all constraints.
   *
   * Returns a PropagationResult indicating whether the CSP is consistent and
   * which variables had their domains reduced.
   */
  propagate(): PropagationResult {
    const startTime = Date.now();
    let queue = this.buildWorkQueue();
    let iterations = 0;
    let arcsProcessed = 0;
    const reducedVariables = new Set<string>();
    const violatedConstraints: string[] = [];
    this.revisionHistory = [];

    while (queue.length > 0 && iterations < this.config.maxIterations) {
      iterations++;
      const arc = queue.shift()!;
      arcsProcessed++;

      const sourceVar = this.variables.get(arc.source);
      const targetVar = this.variables.get(arc.target);
      if (!sourceVar || !targetVar) continue;
      if (targetVar.domain.length === 0) continue;

      const result = this.revise(sourceVar, targetVar, arc.constraint);
      this.revisionHistory.push({ arc, result });

      if (result.revised) {
        reducedVariables.add(arc.target);

        // Domain wipeout — CSP is inconsistent
        if (targetVar.domain.length === 0) {
          violatedConstraints.push(arc.constraint.id);
          return {
            consistent: false,
            reducedVariables: Array.from(reducedVariables),
            violatedConstraints,
            arcsProcessed,
            durationMs: Date.now() - startTime,
          };
        }

        // Re-enqueue all arcs whose target is the revised variable
        const incoming = this.graph.getIncoming(arc.target);
        for (const constraint of incoming) {
          if (!constraint.active) continue;
          queue.push({
            source: constraint.source,
            target: constraint.target,
            constraint,
          });
        }
      }
    }

    return {
      consistent: true,
      reducedVariables: Array.from(reducedVariables),
      violatedConstraints,
      arcsProcessed,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Forward Checking ─────────────────────────────────────────────────────

  /**
   * Perform forward checking after assigning a value to a variable.
   *
   * Forward checking prunes the domains of unassigned neighbors to only values
   * that are consistent with the new assignment. Returns early if any domain
   * is wiped out.
   */
  forwardCheck(variableId: string): PropagationResult {
    const startTime = Date.now();
    const variable = this.variables.get(variableId);
    if (!variable || !variable.assigned) {
      throw new Error(`Variable '${variableId}' is not assigned.`);
    }

    const reducedVariables: string[] = [];
    const violatedConstraints: string[] = [];
    let arcsProcessed = 0;

    // Check outgoing constraints (this var affects neighbors)
    const outgoing = this.graph.getOutgoing(variableId);
    for (const constraint of outgoing) {
      if (!constraint.active) continue;
      const targetVar = this.variables.get(constraint.target);
      if (!targetVar || targetVar.assigned) continue;

      const result = this.revise(variable, targetVar, constraint);
      arcsProcessed++;
      if (result.revised) {
        reducedVariables.push(constraint.target);
      }
      if (targetVar.domain.length === 0) {
        violatedConstraints.push(constraint.id);
      }
    }

    // Check incoming constraints (neighbors affect this var)
    const incoming = this.graph.getIncoming(variableId);
    for (const constraint of incoming) {
      if (!constraint.active) continue;
      const sourceVar = this.variables.get(constraint.source);
      if (!sourceVar || sourceVar.assigned) continue;

      const result = this.revise(sourceVar, variable, constraint);
      arcsProcessed++;
      if (result.revised) {
        reducedVariables.push(variableId);
      }
      if (variable.domain.length === 0) {
        violatedConstraints.push(constraint.id);
      }
    }

    return {
      consistent: violatedConstraints.length === 0,
      reducedVariables,
      violatedConstraints,
      arcsProcessed,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Circular Dependency Detection ────────────────────────────────────────

  /**
   * Detect circular dependency chains using topological sort (Kahn's algorithm).
   *
   * Returns an array of cycles, where each cycle is a list of variable ids
   * forming a strongly connected component.
   */
  detectCircularDependencies(): string[][] {
    const inDegree = new Map<string, number>();
    const allVars = this.getAllVariableIds();

    for (const v of allVars) {
      inDegree.set(v, 0);
    }

    for (const constraint of this.constraints.values()) {
      if (!constraint.active) continue;
      inDegree.set(constraint.target, (inDegree.get(constraint.target) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [v, degree] of inDegree) {
      if (degree === 0) queue.push(v);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const constraint of this.graph.getOutgoing(current)) {
        if (!constraint.active) continue;
        inDegree.set(constraint.target, (inDegree.get(constraint.target) ?? 1) - 1);
        if (inDegree.get(constraint.target) === 0) {
          queue.push(constraint.target);
        }
      }
    }

    // Nodes not in the sorted list are part of cycles
    const cycleNodes = allVars.filter((v) => !sorted.includes(v));
    if (cycleNodes.length === 0) return [];

    // Extract individual cycle chains using DFS
    const visited = new Set<string>();
    const cycles: string[][] = [];

    for (const startNode of cycleNodes) {
      if (visited.has(startNode)) continue;

      const path: string[] = [];
      const pathSet = new Set<string>();
      const dfsStack: string[] = [startNode];

      while (dfsStack.length > 0) {
        const node = dfsStack.pop()!;
        if (pathSet.has(node)) {
          // Found a cycle
          const cycleStart = path.indexOf(node);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
          continue;
        }
        if (visited.has(node)) continue;

        path.push(node);
        pathSet.add(node);

        for (const constraint of this.graph.getOutgoing(node)) {
          if (!constraint.active) continue;
          if (cycleNodes.includes(constraint.target)) {
            dfsStack.push(constraint.target);
          }
        }
      }

      for (const node of path) visited.add(node);
    }

    return cycles;
  }

  /**
   * Perform a topological sort of all variables respecting constraint ordering.
   *
   * Throws if circular dependencies are detected (unless `detectCycles` is off).
   */
  topologicalSort(): string[] {
    if (this.config.detectCycles) {
      const cycles = this.detectCircularDependencies();
      if (cycles.length > 0) {
        throw new Error(
          `Circular dependencies detected: ${cycles.map((c) => c.join(' -> ')).join('; ')}`
        );
      }
    }

    const inDegree = new Map<string, number>();
    const allVars = this.getAllVariableIds();

    for (const v of allVars) inDegree.set(v, 0);

    for (const constraint of this.constraints.values()) {
      if (!constraint.active) continue;
      inDegree.set(constraint.target, (inDegree.get(constraint.target) ?? 0) + 1);
    }

    // Sort initial zero-degree nodes for deterministic output
    const queue = allVars
      .filter((v) => inDegree.get(v) === 0)
      .sort();

    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      const neighbors = this.graph
        .getOutgoing(current)
        .filter((c) => c.active)
        .map((c) => c.target)
        .filter((t, i, arr) => arr.indexOf(t) === i)
        .sort();
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
          queue.sort();
        }
      }
    }

    return result;
  }

  // ── Impact Analysis ──────────────────────────────────────────────────────

  /**
   * Analyze the cascading impact of a file change across the constraint graph.
   *
   * Uses BFS traversal from the changed file to identify directly and
   * transitively affected files, assess at-risk constraints, and compute
   * a severity score.
   */
  analyzeImpact(changedFile: string): ImpactAnalysisResult {
    const startTime = Date.now();

    if (!this.variables.has(changedFile)) {
      throw new Error(`Variable '${changedFile}' not found in the solver.`);
    }

    const directImpacts: string[] = [];
    const transitiveImpacts: string[] = [];
    const atRiskConstraints: Constraint[] = [];
    const visited = new Set<string>([changedFile]);
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: changedFile, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (depth > this.config.maxImpactDepth) continue;

      const outgoing = this.graph.getOutgoing(nodeId);
      const incoming = this.graph.getIncoming(nodeId);

      for (const constraint of [...outgoing, ...incoming]) {
        if (!constraint.active) continue;
        const neighborId = constraint.source === nodeId ? constraint.target : constraint.source;

        atRiskConstraints.push(constraint);

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          transitiveImpacts.push(neighborId);

          if (depth === 0) {
            directImpacts.push(neighborId);
          }

          queue.push({ nodeId: neighborId, depth: depth + 1 });
        }
      }
    }

    // Compute severity: based on number of impacts, constraint priority, and cycles
    const cycles = this.detectCircularDependencies();
    const hasCyclicImpact = cycles.some((cycle) =>
      cycle.includes(changedFile)
    );

    let severityScore = 0;
    const impactFactor = Math.min(transitiveImpacts.length / Math.max(this.variables.size - 1, 1), 1);
    const constraintFactor = Math.min(atRiskConstraints.length / Math.max(this.constraints.size, 1), 1);
    severityScore = (impactFactor * 0.5 + constraintFactor * 0.4 + (hasCyclicImpact ? 0.1 : 0));

    // Determine recommended order via topological sort
    let recommendedOrder: string[] = [];
    try {
      recommendedOrder = this.topologicalSort().filter((id) => transitiveImpacts.includes(id));
      if (!recommendedOrder.includes(changedFile)) {
        recommendedOrder.unshift(changedFile);
      }
    } catch {
      // If topo sort fails due to cycles, use BFS order
      recommendedOrder = transitiveImpacts;
    }

    this.log(`Impact analysis for '${changedFile}' completed in ${Date.now() - startTime}ms`);

    return {
      changedFile,
      directImpacts,
      transitiveImpacts,
      atRiskConstraints,
      recommendedOrder,
      circularChains: cycles,
      severityScore: Math.round(severityScore * 1000) / 1000,
    };
  }

  // ── Constraint Satisfaction for Multi-File Edits ─────────────────────────

  /**
   * Attempt to find a satisfying assignment for all variables using
   * backtracking search with constraint propagation.
   *
   * @returns An array of variable assignments if a solution exists, or `null`.
   */
  solve(): Map<string, T> | null {
    this.log('Starting constraint satisfaction solve...');

    // First establish arc consistency
    const propResult = this.propagate();
    if (!propResult.consistent) {
      this.log('Propagation detected inconsistency — no solution possible.');
      return null;
    }

    // Backtracking search
    const assignment = new Map<string, T>();
    const unassigned = this.getAllVariableIds().filter((id) => {
      const v = this.variables.get(id)!;
      return !v.assigned;
    });

    // Sort by domain size (MRV heuristic)
    unassigned.sort((a, b) => {
      const va = this.variables.get(a)!;
      const vb = this.variables.get(b)!;
      return va.domain.length - vb.domain.length;
    });

    if (this.backtrack(assignment, unassigned, 0)) {
      this.log('Solution found!');
      return assignment;
    }

    this.log('No satisfying assignment found.');
    return null;
  }

  /**
   * Recursive backtracking with forward checking.
   */
  private backtrack(
    assignment: Map<string, T>,
    unassigned: string[],
    index: number
  ): boolean {
    if (index >= unassigned.length) return true;

    const varId = unassigned[index]!;
    const variable = this.variables.get(varId)!;

    const savedDomain = [...variable.domain];

    for (const value of savedDomain) {
      assignment.set(varId, value!);
      variable.value = value;
      variable.assigned = true;
      variable.domain = [value];

      // Forward check
      if (this.config.forwardChecking) {
        // Snapshot all domains before forward check
        const domainSnapshot = new Map<string, T[]>();
        for (const [vid, v] of this.variables.entries()) {
          domainSnapshot.set(vid, [...v.domain]);
        }

        const fcResult = this.forwardCheck(varId!);
        if (!fcResult.consistent) {
          // Restore domains from snapshot
          for (const [vid, dom] of domainSnapshot) {
            this.variables.get(vid)!.domain = dom;
          }
          variable.assigned = false;
          variable.value = undefined;
          assignment.delete(varId);
          continue;
        }
      }

      if (this.backtrack(assignment, unassigned, index + 1)) {
        return true;
      }

      // Undo assignment: restore domain from snapshot if available
      variable.assigned = false;
      variable.value = undefined;
      assignment.delete(varId);
      variable.domain = [...savedDomain];
    }

    return false;
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /** Reset all variables to unassigned and restore original domains. */
  reset(): void {
    for (const variable of this.variables.values()) {
      variable.assigned = false;
      variable.value = undefined;
    }
    this.revisionHistory = [];
  }

  /** Get the number of variables. */
  get variableCount(): number {
    return this.variables.size;
  }

  /** Get the number of active constraints. */
  get activeConstraintCount(): number {
    let count = 0;
    for (const c of this.constraints.values()) {
      if (c.active) count++;
    }
    return count;
  }

  /** Dump current state for debugging. */
  dumpState(): { variables: Array<{ id: string; domain: T[]; assigned: boolean }>; constraints: number } {
    return {
      variables: Array.from(this.variables.values()).map((v) => ({
        id: v.id,
        domain: v.domain,
        assigned: v.assigned,
      })),
      constraints: this.constraints.size,
    };
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ConstraintPropagationSolver] ${message}`);
    }
  }
}
