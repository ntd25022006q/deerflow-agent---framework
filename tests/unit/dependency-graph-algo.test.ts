import { describe, it, expect, beforeEach } from 'vitest';
import {
  DependencyType,
  DependencyGraph,
} from '../../deerflow/algorithms/dependency-graph.js';
import type {
  DependencyEdge,
  DependencyNode,
  CycleDetectionResult,
  TopologicalSortResult,
  CriticalPathResult,
  PruningResult,
  ImpactRadiusResult,
} from '../../deerflow/algorithms/dependency-graph.js';

describe('dependency-graph (algorithm)', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  // ── DependencyType enum ──────────────────────────────────────────────────
  describe('DependencyType enum', () => {
    it('should expose exactly 7 members', () => {
      const values = Object.values(DependencyType);
      expect(values).toHaveLength(7);
    });

    it('should have correct string values', () => {
      expect(DependencyType.IMPORT).toBe('IMPORT');
      expect(DependencyType.RE_EXPORT).toBe('RE_EXPORT');
      expect(DependencyType.TYPE_IMPORT).toBe('TYPE_IMPORT');
      expect(DependencyType.DYNAMIC_IMPORT).toBe('DYNAMIC_IMPORT');
      expect(DependencyType.PEER).toBe('PEER');
      expect(DependencyType.DEV).toBe('DEV');
      expect(DependencyType.CUSTOM).toBe('CUSTOM');
    });
  });

  // ── Node operations ──────────────────────────────────────────────────────
  describe('node operations', () => {
    it('should start with zero nodes', () => {
      expect(graph.nodeCount).toBe(0);
    });

    it('should add a node and make it findable', () => {
      graph.addNode({ id: 'app.ts' });
      expect(graph.nodeCount).toBe(1);
      expect(graph.hasNode('app.ts')).toBe(true);
    });

    it('should be a no-op when adding a duplicate node', () => {
      graph.addNode({ id: 'app.ts', label: 'Original' });
      graph.addNode({ id: 'app.ts', label: 'Ignored' });
      expect(graph.nodeCount).toBe(1);
      expect(graph.getNode('app.ts')!.label).toBe('Original');
    });

    it('should store optional metadata on a node', () => {
      graph.addNode({ id: 'mod', metadata: { lang: 'ts', size: 42 } });
      const node = graph.getNode('mod')!;
      expect(node!.metadata).toEqual({ lang: 'ts', size: 42 });
    });

    it('should getNode return undefined for nonexistent id', () => {
      expect(graph.getNode('ghost')).toBeUndefined();
    });

    it('should remove a node and return true', () => {
      graph.addNode({ id: 'app.ts' });
      expect(graph.removeNode('app.ts')).toBe(true);
      expect(graph.nodeCount).toBe(0);
      expect(graph.hasNode('app.ts')).toBe(false);
    });

    it('should return false when removing a nonexistent node', () => {
      expect(graph.removeNode('ghost')).toBe(false);
    });

    it('should remove all connected edges when removing a node', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'c', to: 'a', type: DependencyType.IMPORT });
      expect(graph.edgeCount).toBe(2);
      graph.removeNode('a');
      expect(graph.edgeCount).toBe(0);
    });

    it('should getAllNodeIds return all node ids', () => {
      graph.addNode({ id: 'a' });
      graph.addNode({ id: 'b' });
      graph.addNode({ id: 'c' });
      const ids = graph.getAllNodeIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });

    it('should getEntryPoints return only isEntry nodes', () => {
      graph.addNode({ id: 'entry', isEntry: true });
      graph.addNode({ id: 'util', isEntry: false });
      graph.addNode({ id: 'index', isEntry: true });
      const entries = graph.getEntryPoints();
      expect(entries).toHaveLength(2);
      expect(entries.every((n) => n.isEntry)).toBe(true);
    });
  });

  // ── Edge operations ──────────────────────────────────────────────────────
  describe('edge operations', () => {
    it('should start with zero edges', () => {
      expect(graph.edgeCount).toBe(0);
    });

    it('should add an edge and make it findable', () => {
      graph.addEdge({ from: 'app.ts', to: 'utils.ts', type: DependencyType.IMPORT });
      expect(graph.edgeCount).toBe(1);
      expect(graph.hasEdge('app.ts', 'utils.ts')).toBe(true);
    });

    it('should auto-create nodes when adding edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      expect(graph.nodeCount).toBe(2);
      expect(graph.hasNode('a')).toBe(true);
      expect(graph.hasNode('b')).toBe(true);
    });

    it('should update an existing edge in-place', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT, weight: 1 });
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT, weight: 5 });
      expect(graph.edgeCount).toBe(1);
      expect(graph.getEdge('a', 'b')!.weight).toBe(5);
    });

    it('should remove an edge and return true', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      expect(graph.removeEdge('a', 'b')).toBe(true);
      expect(graph.edgeCount).toBe(0);
    });

    it('should return false when removing a nonexistent edge', () => {
      expect(graph.removeEdge('a', 'b')).toBe(false);
    });

    it('should getEdge return undefined for nonexistent edge', () => {
      expect(graph.getEdge('x', 'y')).toBeUndefined();
    });

    it('should store optional weight and metadata on edge', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT, weight: 7, metadata: { tag: 'core' } });
      const edge = graph.getEdge('a', 'b')!;
      expect(edge.weight).toBe(7);
      expect(edge.metadata).toEqual({ tag: 'core' });
    });

    it('should getOutgoingEdges return edges from a node', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.RE_EXPORT });
      expect(graph.getOutgoingEdges('a')).toHaveLength(2);
      expect(graph.getOutgoingEdges('b')).toHaveLength(0);
    });

    it('should getIncomingEdges return edges to a node', () => {
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      expect(graph.getIncomingEdges('c')).toHaveLength(2);
    });

    it('should getAllEdges return every edge', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.RE_EXPORT });
      graph.addEdge({ from: 'c', to: 'd', type: DependencyType.DEV });
      expect(graph.getAllEdges()).toHaveLength(3);
    });
  });

  // ── Topological sort (Kahn's algorithm) ──────────────────────────────────
  describe('topologicalSort', () => {
    it('should produce correct order for a linear chain', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      const result: TopologicalSortResult = graph.topologicalSort();
      expect(result.success).toBe(true);
      expect(result.order).toEqual(['a', 'b', 'c']);
      expect(result.cycles).toHaveLength(0);
    });

    it('should handle a diamond dependency graph', () => {
      // a -> b -> d
      // a -> c -> d
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'd', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'c', to: 'd', type: DependencyType.IMPORT });
      const result = graph.topologicalSort();
      expect(result.success).toBe(true);
      expect(result.order.indexOf('a')).toBeLessThan(result.order.indexOf('b'));
      expect(result.order.indexOf('a')).toBeLessThan(result.order.indexOf('c'));
      expect(result.order.indexOf('b')).toBeLessThan(result.order.indexOf('d'));
      expect(result.order.indexOf('c')).toBeLessThan(result.order.indexOf('d'));
    });

    it('should detect cycles and report success=false', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'c', to: 'a', type: DependencyType.IMPORT });
      const result = graph.topologicalSort();
      expect(result.success).toBe(false);
      expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle disconnected nodes', () => {
      graph.addNode({ id: 'x' });
      graph.addNode({ id: 'y' });
      const result = graph.topologicalSort();
      expect(result.success).toBe(true);
      expect(result.order).toHaveLength(2);
    });

    it('should skip stale edges in ordering', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      // Mark the type-import edge stale; 'a' and 'b' are no longer constrained
      graph.markTypeOnlyEdgesStale();
      const result = graph.topologicalSort();
      expect(result.success).toBe(true);
      // a should appear independently of b now
      expect(result.order).toContain('a');
    });
  });

  // ── Cycle detection (DFS) ────────────────────────────────────────────────
  describe('detectCycles', () => {
    it('should return no cycles for a DAG', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      const result: CycleDetectionResult = graph.detectCycles();
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.nodesInCycles).toHaveLength(0);
    });

    it('should detect a simple two-node cycle', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.IMPORT });
      const result: CycleDetectionResult = graph.detectCycles();
      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should identify all nodes participating in cycles', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.IMPORT });
      graph.addNode({ id: 'standalone' });
      const result = graph.detectCycles();
      expect(result.nodesInCycles).toContain('a');
      expect(result.nodesInCycles).toContain('b');
      expect(result.nodesInCycles).not.toContain('standalone');
    });

    it('should skip stale edges in cycle detection', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.TYPE_IMPORT });
      graph.markTypeOnlyEdgesStale();
      const result = graph.detectCycles();
      expect(result.hasCycles).toBe(false);
    });

    it('should detect a self-loop', () => {
      graph.addEdge({ from: 'a', to: 'a', type: DependencyType.IMPORT });
      const result = graph.detectCycles();
      expect(result.hasCycles).toBe(true);
    });
  });

  // ── Critical path analysis ───────────────────────────────────────────────
  describe('criticalPathAnalysis', () => {
    it('should compute total weight as sum of edge weights along longest path', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT, weight: 3 });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT, weight: 2 });
      const result: CriticalPathResult = graph.criticalPathAnalysis();
      expect(result.totalWeight).toBe(5);
      expect(result.path).toContain('a');
      expect(result.path).toContain('b');
      expect(result.path).toContain('c');
    });

    it('should compute earliest start times correctly', () => {
      graph.addEdge({ from: 'start', to: 'mid', type: DependencyType.IMPORT, weight: 5 });
      graph.addEdge({ from: 'mid', to: 'end', type: DependencyType.IMPORT, weight: 3 });
      const result = graph.criticalPathAnalysis();
      expect(result.earliestStart.get('start')).toBe(0);
      expect(result.earliestStart.get('mid')).toBe(5);
      expect(result.earliestStart.get('end')).toBe(8);
    });

    it('should compute slack and latest start times', () => {
      graph.addEdge({ from: 'start', to: 'task1', type: DependencyType.IMPORT, weight: 4 });
      graph.addEdge({ from: 'start', to: 'task2', type: DependencyType.IMPORT, weight: 2 });
      graph.addEdge({ from: 'task1', to: 'finish', type: DependencyType.IMPORT, weight: 1 });
      graph.addEdge({ from: 'task2', to: 'finish', type: DependencyType.IMPORT, weight: 1 });
      const result = graph.criticalPathAnalysis();
      expect(result.totalWeight).toBe(5); // start->task1->finish
      expect(result.slack.get('task2')).toBeGreaterThan(0); // task2 has float
      expect(result.slack.get('task1')).toBe(0); // task1 is on critical path
    });

    it('should throw for cyclic graph', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.IMPORT });
      expect(() => graph.criticalPathAnalysis()).toThrow('contains cycles');
    });

    it('should default edge weight to 1 when not specified', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      const result = graph.criticalPathAnalysis();
      expect(result.totalWeight).toBe(2);
    });
  });

  // ── Dependency pruning ───────────────────────────────────────────────────
  describe('pruneUnusedDependencies', () => {
    it('should remove unreachable nodes from entry points', () => {
      graph.addNode({ id: 'entry', isEntry: true });
      graph.addNode({ id: 'used' });
      graph.addNode({ id: 'unused' });
      graph.addEdge({ from: 'entry', to: 'used', type: DependencyType.IMPORT });
      const result: PruningResult = graph.pruneUnusedDependencies();
      expect(result.removedNodes).toContain('unused');
      expect(result.remainingNodeCount).toBe(2);
    });

    it('should keep all nodes when no entry points are defined', () => {
      graph.addNode({ id: 'a' });
      graph.addNode({ id: 'b' });
      graph.addNode({ id: 'c' });
      const result = graph.pruneUnusedDependencies();
      expect(result.removedNodes).toHaveLength(0);
      expect(result.remainingNodeCount).toBe(3);
    });

    it('should remove edges to and from pruned nodes', () => {
      graph.addNode({ id: 'entry', isEntry: true });
      graph.addNode({ id: 'used' });
      graph.addNode({ id: 'dead' });
      graph.addEdge({ from: 'entry', to: 'used', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'dead', to: 'used', type: DependencyType.IMPORT });
      const result = graph.pruneUnusedDependencies();
      expect(result.removedEdges.length).toBeGreaterThanOrEqual(1);
      expect(graph.edgeCount).toBe(1); // only entry->used remains
    });

    it('should transitively remove deeply unreachable nodes', () => {
      graph.addNode({ id: 'entry', isEntry: true });
      graph.addNode({ id: 'orphan' });
      graph.addNode({ id: 'orphanChild' });
      graph.addEdge({ from: 'orphan', to: 'orphanChild', type: DependencyType.IMPORT });
      const result = graph.pruneUnusedDependencies();
      expect(result.removedNodes).toContain('orphan');
      expect(result.removedNodes).toContain('orphanChild');
    });
  });

  // ── Edge staleness ───────────────────────────────────────────────────────
  describe('markTypeOnlyEdgesStale', () => {
    it('should mark TYPE_IMPORT edges as stale and return count', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      const count = graph.markTypeOnlyEdgesStale();
      expect(count).toBe(1);
      expect(graph.getEdge('a', 'b')!.stale).toBe(true);
      expect(graph.getEdge('a', 'c')!.stale).toBeUndefined();
    });

    it('should return 0 when no TYPE_IMPORT edges exist', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.DEV });
      expect(graph.markTypeOnlyEdgesStale()).toBe(0);
    });

    it('should mark multiple TYPE_IMPORT edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.TYPE_IMPORT });
      graph.addEdge({ from: 'c', to: 'd', type: DependencyType.TYPE_IMPORT });
      expect(graph.markTypeOnlyEdgesStale()).toBe(3);
    });
  });

  // ── Distance computation ─────────────────────────────────────────────────
  describe('computeDistances', () => {
    it('should compute BFS distances from source', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      const distances = graph.computeDistances('a');
      expect(distances.get('a')).toBe(0);
      expect(distances.get('b')).toBe(1);
      expect(distances.get('c')).toBe(2);
    });

    it('should not include unreachable nodes', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addNode({ id: 'isolated' });
      const distances = graph.computeDistances('a');
      expect(distances.has('isolated')).toBe(false);
    });

    it('should skip stale edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.markTypeOnlyEdgesStale();
      const distances = graph.computeDistances('a');
      expect(distances.has('b')).toBe(false);
    });

    it('should throw for nonexistent source node', () => {
      expect(() => graph.computeDistances('ghost')).toThrow('not found');
    });
  });

  // ── Impact radius computation ────────────────────────────────────────────
  describe('computeImpactRadius', () => {
    it('should compute direct and transitive dependents via reverse traversal', () => {
      // b -> a, c -> a, d -> c   (b and c depend on a, d depends on c)
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'c', to: 'a', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'd', to: 'c', type: DependencyType.IMPORT });
      const result: ImpactRadiusResult = graph.computeImpactRadius('a');
      expect(result.source).toBe('a');
      expect(result.directDependents).toContain('b');
      expect(result.directDependents).toContain('c');
      expect(result.transitiveDependents).toContain('d');
      expect(result.maxDistance).toBeGreaterThanOrEqual(2);
      expect(result.radius).toBe(result.maxDistance);
    });

    it('should return zero radius for a node with no dependents', () => {
      graph.addNode({ id: 'leaf' });
      graph.addEdge({ from: 'leaf', to: 'dep', type: DependencyType.IMPORT });
      const result = graph.computeImpactRadius('leaf');
      expect(result.directDependents).toHaveLength(0);
      expect(result.maxDistance).toBe(0);
    });

    it('should throw for nonexistent source', () => {
      expect(() => graph.computeImpactRadius('ghost')).toThrow('not found');
    });

    it('should include distance map for all affected nodes', () => {
      graph.addEdge({ from: 'b', to: 'a', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'c', to: 'a', type: DependencyType.IMPORT });
      const result = graph.computeImpactRadius('a');
      expect(result.distances.get('a')).toBe(0);
      expect(result.distances.get('b')).toBe(1);
      expect(result.distances.get('c')).toBe(1);
    });
  });

  // ── Distance helper ──────────────────────────────────────────────────────
  describe('distance', () => {
    it('should return the shortest path length between two nodes', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      expect(graph.distance('a', 'c')).toBe(2);
    });

    it('should return 0 for distance from node to itself', () => {
      graph.addNode({ id: 'a' });
      expect(graph.distance('a', 'a')).toBe(0);
    });

    it('should return -1 when no path exists', () => {
      graph.addNode({ id: 'a' });
      graph.addNode({ id: 'z' });
      expect(graph.distance('a', 'z')).toBe(-1);
    });

    it('should return 1 for directly connected nodes', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      expect(graph.distance('a', 'b')).toBe(1);
    });
  });

  // ── Graph statistics ─────────────────────────────────────────────────────
  describe('graph statistics', () => {
    it('should inDegreeMap count incoming non-stale edges', () => {
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'b', to: 'c', type: DependencyType.IMPORT });
      const inDeg = graph.inDegreeMap();
      expect(inDeg.get('c')).toBe(2);
      expect(inDeg.get('a')).toBe(0);
      expect(inDeg.get('b')).toBe(0);
    });

    it('should outDegreeMap count outgoing non-stale edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      const outDeg = graph.outDegreeMap();
      expect(outDeg.get('a')).toBe(2);
      expect(outDeg.get('b')).toBe(0);
    });

    it('should getLeafNodes return nodes with no outgoing edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      graph.addEdge({ from: 'a', to: 'c', type: DependencyType.IMPORT });
      const leaves = graph.getLeafNodes();
      expect(leaves).toContain('b');
      expect(leaves).toContain('c');
      expect(leaves).not.toContain('a');
    });

    it('should getRootNodes return nodes with no incoming edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      const roots = graph.getRootNodes();
      expect(roots).toContain('a');
      expect(roots).not.toContain('b');
    });

    it('should exclude stale edges from degree computation', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      graph.markTypeOnlyEdgesStale();
      const outDeg = graph.outDegreeMap();
      expect(outDeg.get('a')).toBe(0);
    });
  });

  // ── DOT export ───────────────────────────────────────────────────────────
  describe('toDot', () => {
    it('should export graph in valid DOT format', () => {
      graph.addNode({ id: 'app.ts', label: 'App' });
      graph.addEdge({ from: 'app.ts', to: 'utils.ts', type: DependencyType.IMPORT });
      const dot = graph.toDot();
      expect(dot).toContain('digraph dependencies');
      expect(dot).toContain('app.ts');
      expect(dot).toContain('utils.ts');
      expect(dot).toContain('->');
      expect(dot).toContain('{');
      expect(dot).toContain('}');
    });

    it('should mark entry nodes with shape=box', () => {
      graph.addNode({ id: 'entry', isEntry: true });
      const dot = graph.toDot();
      expect(dot).toContain('shape=box');
    });

    it('should use dashed style for TYPE_IMPORT edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.TYPE_IMPORT });
      const dot = graph.toDot();
      expect(dot).toContain('style=dashed');
    });

    it('should not use dashed style for regular IMPORT edges', () => {
      graph.addEdge({ from: 'a', to: 'b', type: DependencyType.IMPORT });
      const dot = graph.toDot();
      expect(dot).not.toContain('style=dashed');
    });
  });
});
