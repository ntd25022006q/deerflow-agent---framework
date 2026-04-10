import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConstraintType,
  ConstraintGraph,
  ConstraintPropagationSolver,
} from '../../deerflow/algorithms/constraint-propagation.js';
import type { Constraint, Variable, PropagationResult, ImpactAnalysisResult } from '../../deerflow/algorithms/constraint-propagation.js';

describe('constraint-propagation', () => {
  // ── ConstraintType enum ──────────────────────────────────────────────────
  describe('ConstraintType enum', () => {
    it('should expose exactly 6 members', () => {
      const values = Object.values(ConstraintType);
      expect(values).toHaveLength(6);
    });

    it('should have correct string values', () => {
      expect(ConstraintType.ORDERING).toBe('ORDERING');
      expect(ConstraintType.CO_CHANGE).toBe('CO_CHANGE');
      expect(ConstraintType.COMPATIBILITY).toBe('COMPATIBILITY');
      expect(ConstraintType.API_STABILITY).toBe('API_STABILITY');
      expect(ConstraintType.VERSION_PIN).toBe('VERSION_PIN');
      expect(ConstraintType.CUSTOM).toBe('CUSTOM');
    });
  });

  // ── ConstraintGraph ──────────────────────────────────────────────────────
  describe('ConstraintGraph', () => {
    it('should start with zero constraints', () => {
      const graph = new ConstraintGraph();
      expect(graph.constraintCount).toBe(0);
    });

    it('should return empty array from getAllVariables initially', () => {
      const graph = new ConstraintGraph();
      expect(graph.getAllVariables()).toEqual([]);
    });

    it('should return empty array for getOutgoing on unknown variable', () => {
      const graph = new ConstraintGraph();
      expect(graph.getOutgoing('unknown')).toEqual([]);
    });

    it('should return empty array for getIncoming on unknown variable', () => {
      const graph = new ConstraintGraph();
      expect(graph.getIncoming('unknown')).toEqual([]);
    });

    it('should add constraint and track both source and target variables', () => {
      const graph = new ConstraintGraph();
      const c: Constraint = {
        id: 'c1', source: 'a.ts', target: 'b.ts',
        description: 'a before b', type: ConstraintType.ORDERING,
        priority: 1, active: true,
      };
      graph.addConstraint(c);
      expect(graph.constraintCount).toBe(1);
      const vars = graph.getAllVariables();
      expect(vars).toContain('a.ts');
      expect(vars).toContain('b.ts');
    });

    it('should getOutgoing return only constraints from that source', () => {
      const graph = new ConstraintGraph();
      graph.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      graph.addConstraint({ id: 'c2', source: 'c', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(graph.getOutgoing('a')).toHaveLength(1);
      expect(graph.getOutgoing('b')).toHaveLength(0);
      expect(graph.getIncoming('b')).toHaveLength(2);
    });

    it('should removeConstraint reduce count', () => {
      const graph = new ConstraintGraph();
      graph.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(graph.removeConstraint('c1')).toBe(true);
      expect(graph.constraintCount).toBe(0);
    });

    it('should handle multiple constraints correctly', () => {
      const graph = new ConstraintGraph();
      graph.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      graph.addConstraint({ id: 'c2', source: 'a', target: 'c', description: '', type: ConstraintType.ORDERING, priority: 2, active: true });
      graph.addConstraint({ id: 'c3', source: 'b', target: 'c', description: '', type: ConstraintType.CO_CHANGE, priority: 3, active: true });
      expect(graph.constraintCount).toBe(3);
      expect(graph.getOutgoing('a')).toHaveLength(2);
      expect(graph.getIncoming('c')).toHaveLength(2);
    });
  });

  // ── Solver: creation & variable management ────────────────────────────────
  describe('ConstraintPropagationSolver — variable management', () => {
    let solver: ConstraintPropagationSolver<string>;

    beforeEach(() => {
      solver = new ConstraintPropagationSolver<string>();
    });

    it('should start with zero variables and constraints', () => {
      expect(solver.variableCount).toBe(0);
      expect(solver.activeConstraintCount).toBe(0);
    });

    it('should add a variable and increment count', () => {
      solver.addVariable({ id: 'a.ts', domain: ['ok', 'error'], assigned: false, value: undefined });
      expect(solver.variableCount).toBe(1);
    });

    it('should throw when adding a duplicate variable id', () => {
      solver.addVariable({ id: 'a.ts', domain: ['ok'], assigned: false, value: undefined });
      expect(() => solver.addVariable({ id: 'a.ts', domain: ['ok'], assigned: false, value: undefined })).toThrow('already exists');
    });

    it('should getVariable return the variable or undefined', () => {
      solver.addVariable({ id: 'a.ts', domain: ['ok', 'err'], assigned: false, value: undefined });
      const v = solver.getVariable('a.ts');
      expect(v).toBeDefined();
      expect(v!.id).toBe('a.ts');
      expect(v!.domain).toEqual(['ok', 'err']);
      expect(solver.getVariable('nonexistent')).toBeUndefined();
    });

    it('should removeVariable and its associated constraints', () => {
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.removeVariable('a');
      expect(solver.variableCount).toBe(1);
      expect(solver.activeConstraintCount).toBe(0);
    });

    it('should throw when removing a nonexistent variable', () => {
      expect(() => solver.removeVariable('ghost')).toThrow('not found');
    });

    it('should assign a value and shrink domain to single element', () => {
      solver.addVariable({ id: 'a.ts', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.assign('a.ts', 'ok');
      const v = solver.getVariable('a.ts')!;
      expect(v.assigned).toBe(true);
      expect(v.value).toBe('ok');
      expect(v.domain).toEqual(['ok']);
    });

    it('should throw when assigning a nonexistent variable', () => {
      expect(() => solver.assign('ghost', 'x')).toThrow('not found');
    });

    it('should resetVariable restore unassigned state', () => {
      solver.addVariable({ id: 'a.ts', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.assign('a.ts', 'ok');
      solver.resetVariable('a.ts', ['ok', 'error', 'warn']);
      const v = solver.getVariable('a.ts')!;
      expect(v.assigned).toBe(false);
      expect(v.value).toBeUndefined();
      expect(v.domain).toEqual(['ok', 'error', 'warn']);
    });

    it('should throw when resetting a nonexistent variable', () => {
      expect(() => solver.resetVariable('ghost', [])).toThrow('not found');
    });

    it('should getAllVariableIds return all ids', () => {
      solver.addVariable({ id: 'x', domain: ['a'], assigned: false, value: undefined });
      solver.addVariable({ id: 'y', domain: ['b'], assigned: false, value: undefined });
      const ids = solver.getAllVariableIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('x');
      expect(ids).toContain('y');
    });
  });

  // ── Solver: constraint management ────────────────────────────────────────
  describe('ConstraintPropagationSolver — constraint management', () => {
    let solver: ConstraintPropagationSolver<string>;

    beforeEach(() => {
      solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
    });

    it('should add constraint and increment activeConstraintCount', () => {
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(solver.activeConstraintCount).toBe(1);
    });

    it('should throw when adding constraint with nonexistent source', () => {
      expect(() => solver.addConstraint({
        id: 'c1', source: 'ghost', target: 'b',
        description: '', type: ConstraintType.ORDERING, priority: 1, active: true,
      })).toThrow('Source variable');
    });

    it('should throw when adding constraint with nonexistent target', () => {
      expect(() => solver.addConstraint({
        id: 'c1', source: 'a', target: 'ghost',
        description: '', type: ConstraintType.ORDERING, priority: 1, active: true,
      })).toThrow('Target variable');
    });

    it('should throw when adding duplicate constraint id', () => {
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(() => solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true })).toThrow('already exists');
    });

    it('should remove constraint and decrement count', () => {
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.removeConstraint('c1');
      expect(solver.activeConstraintCount).toBe(0);
      expect(solver.getConstraint('c1')).toBeUndefined();
    });

    it('should throw when removing nonexistent constraint', () => {
      expect(() => solver.removeConstraint('ghost')).toThrow('not found');
    });

    it('should setConstraintActive toggle constraint participation', () => {
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.setConstraintActive('c1', false);
      expect(solver.activeConstraintCount).toBe(0);
      solver.setConstraintActive('c1', true);
      expect(solver.activeConstraintCount).toBe(1);
    });

    it('should throw when setting active on nonexistent constraint', () => {
      expect(() => solver.setConstraintActive('ghost', true)).toThrow('not found');
    });

    it('should getAllConstraints return all constraints', () => {
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(solver.getAllConstraints()).toHaveLength(1);
    });

    it('should support all constraint types', () => {
      const types = [
        ConstraintType.ORDERING,
        ConstraintType.CO_CHANGE,
        ConstraintType.COMPATIBILITY,
        ConstraintType.API_STABILITY,
        ConstraintType.VERSION_PIN,
        ConstraintType.CUSTOM,
      ];
      const c = solver.addConstraint.bind(solver);
      types.forEach((type) => {
        c({ id: `c-${type}`, source: 'a', target: 'b', description: '', type, priority: 1, active: true });
      });
      expect(solver.getAllConstraints()).toHaveLength(6);
    });
  });

  // ── AC-3 propagation ────────────────────────────────────────────────────
  describe('ConstraintPropagationSolver — AC-3 propagation', () => {
    it('should return consistent with no constraints', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['x'], assigned: false, value: undefined });
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
      expect(result.reducedVariables).toEqual([]);
      expect(result.violatedConstraints).toEqual([]);
      expect(result.arcsProcessed).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent for simple CSP without validators', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
      expect(result.arcsProcessed).toBeGreaterThan(0);
    });

    it('should reduce target domain via validator', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: 'match',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
      expect(result.reducedVariables).toContain('b');
      expect(solver.getVariable('b')!.domain).toEqual(['ok']);
    });

    it('should detect inconsistency on domain wipeout', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: 'must match',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      const result = solver.propagate();
      expect(result.consistent).toBe(false);
      expect(result.violatedConstraints).toContain('c1');
      expect(result.reducedVariables).toContain('b');
    });

    it('should skip inactive constraints during propagation', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: false,
        validator: (s, t) => s === t,
      });
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
    });

    it('should propagate bidirectionally for COMPATIBILITY constraints', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      // COMPATIBILITY adds reverse arc, so both a->b and b->a are enqueued
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
      expect(result.arcsProcessed).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Forward checking ─────────────────────────────────────────────────────
  describe('ConstraintPropagationSolver — forward checking', () => {
    it('should prune neighbors after assignment', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      solver.assign('a', 'ok');
      const result = solver.forwardCheck('a');
      expect(result.consistent).toBe(true);
      expect(solver.getVariable('b')!.domain).toEqual(['ok']);
    });

    it('should detect inconsistency when forward check causes wipeout', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      solver.assign('a', 'error');
      const result = solver.forwardCheck('a');
      expect(result.consistent).toBe(false);
      expect(result.violatedConstraints).toContain('c1');
    });

    it('should throw when forward checking an unassigned variable', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      expect(() => solver.forwardCheck('a')).toThrow('not assigned');
    });

    it('should throw when forward checking a nonexistent variable', () => {
      const solver = new ConstraintPropagationSolver<string>();
      expect(() => solver.forwardCheck('ghost')).toThrow('not assigned');
    });
  });

  // ── Circular dependency detection ────────────────────────────────────────
  describe('ConstraintPropagationSolver — circular dependency detection', () => {
    it('should return empty array for a DAG', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(solver.detectCircularDependencies()).toHaveLength(0);
    });

    it('should detect a simple two-node cycle', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'a', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const cycles = solver.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect a three-node cycle', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'c', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'c', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c3', source: 'c', target: 'a', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const cycles = solver.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore inactive constraints in cycle detection', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'a', description: '', type: ConstraintType.ORDERING, priority: 1, active: false });
      expect(solver.detectCircularDependencies()).toHaveLength(0);
    });
  });

  // ── Topological sort ─────────────────────────────────────────────────────
  describe('ConstraintPropagationSolver — topological sort', () => {
    it('should return deterministic order for DAG', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const sorted = solver.topologicalSort();
      expect(sorted).toEqual(['a', 'b']);
    });

    it('should sort three-node chain correctly', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'c', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'c', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const sorted = solver.topologicalSort();
      expect(sorted).toEqual(['a', 'b', 'c']);
    });

    it('should throw for cyclic graph', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'a', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      expect(() => solver.topologicalSort()).toThrow('Circular dependencies');
    });

    it('should handle independent variables', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'x', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'y', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'z', domain: ['ok'], assigned: false, value: undefined });
      const sorted = solver.topologicalSort();
      // All should be present; sorted alphabetically since all have in-degree 0
      expect(sorted).toEqual(['x', 'y', 'z']);
    });
  });

  // ── Impact analysis ──────────────────────────────────────────────────────
  describe('ConstraintPropagationSolver — impact analysis', () => {
    it('should return correct ImpactAnalysisResult structure', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'c', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'c', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const result: ImpactAnalysisResult = solver.analyzeImpact('a');
      expect(result.changedFile).toBe('a');
      expect(result.directImpacts).toContain('b');
      expect(result.transitiveImpacts).toContain('b');
      expect(result.transitiveImpacts).toContain('c');
      expect(result.severityScore).toBeGreaterThanOrEqual(0);
      expect(result.severityScore).toBeLessThanOrEqual(1);
      expect(result.atRiskConstraints.length).toBeGreaterThan(0);
      expect(result.recommendedOrder.length).toBeGreaterThan(0);
      expect(result.circularChains).toEqual([]);
    });

    it('should throw for nonexistent variable in analyzeImpact', () => {
      const solver = new ConstraintPropagationSolver<string>();
      expect(() => solver.analyzeImpact('ghost')).toThrow('not found');
    });

    it('should reflect higher severity for larger impact radius', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'c', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'd', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c2', source: 'b', target: 'c', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      solver.addConstraint({ id: 'c3', source: 'c', target: 'd', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const result = solver.analyzeImpact('a');
      // 3 transitive impacts out of 3 other variables = 100% impact factor
      expect(result.transitiveImpacts).toHaveLength(3);
      expect(result.severityScore).toBeGreaterThan(0.5);
    });
  });

  // ── Solve with backtracking ──────────────────────────────────────────────
  describe('ConstraintPropagationSolver — solve', () => {
    it('should find solution for consistent CSP', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      const solution = solver.solve();
      expect(solution).not.toBeNull();
      expect(solution!.get('a')).toBe('ok');
      expect(solution!.get('b')).toBe('ok');
    });

    it('should return null for inconsistent CSP', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      const solution = solver.solve();
      expect(solution).toBeNull();
    });

    it('should solve CSP with multiple unassigned variables', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['1', '2'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['1', '2'], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => s === t,
      });
      const solution = solver.solve();
      expect(solution).not.toBeNull();
      expect(solution!.get('a')).toBe(solution!.get('b'));
    });

    it('should solve without constraints (any assignment works)', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['x'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['y'], assigned: false, value: undefined });
      const solution = solver.solve();
      expect(solution).not.toBeNull();
      expect(solution!.get('a')).toBe('x');
      expect(solution!.get('b')).toBe('y');
    });
  });

  // ── Reset and dumpState ──────────────────────────────────────────────────
  describe('ConstraintPropagationSolver — reset and dumpState', () => {
    it('should reset clear all assignments', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.assign('a', 'ok');
      solver.assign('b', 'ok');
      solver.reset();
      expect(solver.getVariable('a')!.assigned).toBe(false);
      expect(solver.getVariable('b')!.assigned).toBe(false);
    });

    it('should dumpState return correct structure', () => {
      const solver = new ConstraintPropagationSolver<string>();
      solver.addVariable({ id: 'a', domain: ['ok', 'error'], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: ['ok'], assigned: false, value: undefined });
      solver.addConstraint({ id: 'c1', source: 'a', target: 'b', description: '', type: ConstraintType.ORDERING, priority: 1, active: true });
      const state = solver.dumpState();
      expect(state.variables).toHaveLength(2);
      expect(state.constraints).toBe(1);
      expect(state.variables[0]!.id).toBe('a');
    });

    it('should accept SolverConfig for custom max iterations', () => {
      const solver = new ConstraintPropagationSolver<string>({ maxIterations: 100 });
      solver.addVariable({ id: 'a', domain: ['ok'], assigned: false, value: undefined });
      const result = solver.propagate();
      expect(result.consistent).toBe(true);
    });

    it('should support numeric generic type variables', () => {
      const solver = new ConstraintPropagationSolver<number>();
      solver.addVariable({ id: 'a', domain: [1, 2, 3], assigned: false, value: undefined });
      solver.addVariable({ id: 'b', domain: [1, 2, 3], assigned: false, value: undefined });
      solver.addConstraint({
        id: 'c1', source: 'a', target: 'b', description: '',
        type: ConstraintType.COMPATIBILITY, priority: 1, active: true,
        validator: (s, t) => (s as number) <= (t as number),
      });
      const solution = solver.solve();
      expect(solution).not.toBeNull();
      expect(solution!.get('a')!).toBeLessThanOrEqual(solution!.get('b')!);
    });
  });
});
