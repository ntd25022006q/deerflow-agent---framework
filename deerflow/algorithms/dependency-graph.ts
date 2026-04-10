/**
 * @module dependency-graph
 * @description Dependency graph analysis and management for the Deerflow Agent
 * Framework. Provides topological sorting (Kahn's algorithm), DFS-based cycle
 * detection, critical path analysis, dependency pruning, distance calculation,
 * and impact radius computation to help agents reason about code structure.
 */

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * Represents a directed edge (dependency relationship) between two nodes.
 */
export interface DependencyEdge {
  /** The dependent node (consumer). */
  from: string;
  /** The dependency node (provider). */
  to: string;
  /** Type of dependency. */
  type: DependencyType;
  /** Optional weight for critical-path analysis. */
  weight?: number;
  /** Whether this edge is marked for removal. */
  stale?: boolean;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Types of dependencies the graph can represent.
 */
export enum DependencyType {
  /** Standard import/require dependency. */
  IMPORT = 'IMPORT',
  /** Re-export dependency. */
  RE_EXPORT = 'RE_EXPORT',
  /** Type-only import. */
  TYPE_IMPORT = 'TYPE_IMPORT',
  /** Runtime dynamic import. */
  DYNAMIC_IMPORT = 'DYNAMIC_IMPORT',
  /** Peer dependency (optional at runtime). */
  PEER = 'PEER',
  /** Dev dependency (build-time only). */
  DEV = 'DEV',
  /** Custom user-defined dependency. */
  CUSTOM = 'CUSTOM',
}

/**
 * A node in the dependency graph.
 */
export interface DependencyNode {
  /** Unique identifier (typically a file path or module name). */
  id: string;
  /** Display label. */
  label?: string;
  /** Node metadata. */
  metadata?: Record<string, unknown>;
  /** Whether this node is an entry point. */
  isEntry?: boolean;
}

/**
 * Result of cycle detection.
 */
export interface CycleDetectionResult {
  /** Whether any cycles were found. */
  hasCycles: boolean;
  /** List of cycles, each being an array of node ids. */
  cycles: string[][];
  /** All nodes that participate in at least one cycle. */
  nodesInCycles: string[];
}

/**
 * Result of topological sort.
 */
export interface TopologicalSortResult {
  /** Ordered list of node ids. */
  order: string[];
  /** Whether the sort succeeded (false if cycles exist). */
  success: boolean;
  /** Cycles that prevented a full sort, if any. */
  cycles: string[][];
}

/**
 * Critical path analysis result.
 */
export interface CriticalPathResult {
  /** The critical path (longest weighted path from any entry to any exit). */
  path: string[];
  /** Total weight of the critical path. */
  totalWeight: number;
  /** Earliest start times for each node. */
  earliestStart: Map<string, number>;
  /** Latest start times for each node. */
  latestStart: Map<string, number>;
  /** Slack (float) time for each node. Nodes with 0 slack are on the critical path. */
  slack: Map<string, number>;
}

/**
 * Result of pruning unused dependencies.
 */
export interface PruningResult {
  /** Nodes that were removed. */
  removedNodes: string[];
  /** Edges that were removed. */
  removedEdges: DependencyEdge[];
  /** Remaining node count. */
  remainingNodeCount: number;
  /** Remaining edge count. */
  remainingEdgeCount: number;
}

/**
 * Result of impact radius computation.
 */
export interface ImpactRadiusResult {
  /** The node that was the source of the change. */
  source: string;
  /** Nodes directly depending on the source (immediate consumers). */
  directDependents: string[];
  /** All transitively dependent nodes (full fan-out). */
  transitiveDependents: string[];
  /** The dependency distance to each affected node. */
  distances: Map<string, number>;
  /** Maximum distance from source to any affected node. */
  maxDistance: number;
  /** The full dependency fan-out radius. */
  radius: number;
}

// ─── Main Class ───────────────────────────────────────────────────────────────

/**
 * DependencyGraph provides a comprehensive directed graph structure for modeling
 * and analyzing file/module dependencies.
 *
 * The graph is backed by an adjacency list and supports:
 * - Kahn's algorithm topological sort
 * - DFS-based cycle detection
 * - Critical path analysis with weighted edges
 * - Dependency pruning (dead-code elimination)
 * - Distance calculation and impact radius
 *
 * @example
 * ```ts
 * const graph = new DependencyGraph();
 * graph.addNode({ id: 'app.ts', isEntry: true });
 * graph.addNode({ id: 'utils.ts' });
 * graph.addEdge({ from: 'app.ts', to: 'utils.ts', type: DependencyType.IMPORT, weight: 1 });
 * const topo = graph.topologicalSort();
 * console.log(topo.order); // ['utils.ts', 'app.ts']
 * ```
 */
export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private outEdges: Map<string, DependencyEdge[]> = new Map();
  private inEdges: Map<string, DependencyEdge[]> = new Map();
  private edgeIndex: Map<string, DependencyEdge> = new Map();

  // ── Node Operations ─────────────────────────────────────────────────────

  /**
   * Add a node to the graph. No-op if the node already exists.
   */
  addNode(node: DependencyNode): void {
    if (this.nodes.has(node.id)) {
      return;
    }
    this.nodes.set(node.id, node);
    this.outEdges.set(node.id, []);
    this.inEdges.set(node.id, []);
  }

  /**
   * Remove a node and all edges connected to it.
   */
  removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) {
      return false;
    }

    // Remove all outgoing edges
    const outgoing = this.outEdges.get(nodeId) ?? [];
    for (const edge of outgoing) {
      this.edgeIndex.delete(this.edgeKey(edge.from, edge.to));
      const targetIn = this.inEdges.get(edge.to);
      if (targetIn) {
        const idx = targetIn.findIndex((e) => e.from === nodeId && e.to === edge.to);
        if (idx !== -1) targetIn.splice(idx, 1);
      }
    }

    // Remove all incoming edges
    const incoming = this.inEdges.get(nodeId) ?? [];
    for (const edge of incoming) {
      this.edgeIndex.delete(this.edgeKey(edge.from, edge.to));
      const sourceOut = this.outEdges.get(edge.from);
      if (sourceOut) {
        const idx = sourceOut.findIndex((e) => e.to === nodeId && e.from === edge.from);
        if (idx !== -1) sourceOut.splice(idx, 1);
      }
    }

    this.nodes.delete(nodeId);
    this.outEdges.delete(nodeId);
    this.inEdges.delete(nodeId);
    return true;
  }

  /**
   * Check if a node exists.
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Get a node by id.
   */
  getNode(nodeId: string): DependencyNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all node ids.
   */
  getAllNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all entry point nodes.
   */
  getEntryPoints(): DependencyNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.isEntry);
  }

  // ── Edge Operations ─────────────────────────────────────────────────────

  /**
   * Add a directed edge (dependency) from `from` to `to`.
   * Automatically creates nodes if they do not exist.
   */
  addEdge(edge: DependencyEdge): void {
    this.addNode({ id: edge.from });
    this.addNode({ id: edge.to });

    const key = this.edgeKey(edge.from, edge.to);
    if (this.edgeIndex.has(key)) {
      // Update existing edge
      this.edgeIndex.set(key, edge);
      return;
    }

    this.edgeIndex.set(key, edge);
    this.outEdges.get(edge.from)!.push(edge);
    this.inEdges.get(edge.to)!.push(edge);
  }

  /**
   * Remove the edge from `from` to `to`.
   */
  removeEdge(from: string, to: string): boolean {
    const key = this.edgeKey(from, to);
    if (!this.edgeIndex.has(key)) return false;
    this.edgeIndex.delete(key);

    const outList = this.outEdges.get(from);
    if (outList) {
      const idx = outList.findIndex((e) => e.from === from && e.to === to);
      if (idx !== -1) outList.splice(idx, 1);
    }

    const inList = this.inEdges.get(to);
    if (inList) {
      const idx = inList.findIndex((e) => e.from === from && e.to === to);
      if (idx !== -1) inList.splice(idx, 1);
    }

    return true;
  }

  /**
   * Check if an edge exists from `from` to `to`.
   */
  hasEdge(from: string, to: string): boolean {
    return this.edgeIndex.has(this.edgeKey(from, to));
  }

  /**
   * Get all outgoing edges from a node.
   */
  getOutgoingEdges(nodeId: string): DependencyEdge[] {
    return this.outEdges.get(nodeId) ?? [];
  }

  /**
   * Get all incoming edges to a node.
   */
  getIncomingEdges(nodeId: string): DependencyEdge[] {
    return this.inEdges.get(nodeId) ?? [];
  }

  /**
   * Get all edges in the graph.
   */
  getAllEdges(): DependencyEdge[] {
    return Array.from(this.edgeIndex.values());
  }

  /**
   * Get the edge from `from` to `to`.
   */
  getEdge(from: string, to: string): DependencyEdge | undefined {
    return this.edgeIndex.get(this.edgeKey(from, to));
  }

  // ── Topological Sort (Kahn's Algorithm) ─────────────────────────────────

  /**
   * Compute a topological ordering of the graph using Kahn's algorithm.
   *
   * Returns an object with the ordering and a flag indicating success.
   * If cycles exist, `success` will be `false` and the order will include
   * only the nodes that could be sorted.
   */
  topologicalSort(): TopologicalSortResult {
    const inDegree = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const edge of this.edgeIndex.values()) {
      if (edge.stale) continue;
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    // Use a min-heap-like approach via sorted array for deterministic output
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }
    queue.sort();

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      const neighbors: string[] = [];
      for (const edge of this.outEdges.get(current) ?? []) {
        if (edge.stale) continue;
        neighbors.push(edge.to);
      }

      const uniqueNeighbors = [...new Set(neighbors)];
      for (const neighbor of uniqueNeighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
          queue.sort();
        }
      }
    }

    const success = order.length === this.nodes.size;
    const cycles: string[][] = [];
    if (!success) {
      const remaining = this.getAllNodeIds().filter((id) => !order.includes(id));
      cycles.push(...this.findCyclesInSubset(remaining));
    }

    return { order, success, cycles };
  }

  // ── Cycle Detection (DFS) ───────────────────────────────────────────────

  /**
   * Detect all cycles in the graph using iterative DFS with coloring.
   *
   * Color states:
   * - WHITE (0): Not visited
   * - GRAY  (1): Currently in the recursion stack
   * - BLACK (2): Fully explored
   */
  detectCycles(): CycleDetectionResult {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const color = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      color.set(nodeId, WHITE);
    }

    const cycles: string[][] = [];
    const nodesInCycles = new Set<string>();

    for (const startNode of this.nodes.keys()) {
      if (color.get(startNode) !== WHITE) continue;

      const stack: Array<{ nodeId: string; iterator: number; path: string[] }> = [
        { nodeId: startNode, iterator: 0, path: [] },
      ];
      color.set(startNode, GRAY);

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!;
        const outgoing = this.outEdges.get(frame.nodeId) ?? [];
        let foundNext = false;

        while (frame.iterator < outgoing.length) {
          const edge = outgoing[frame.iterator]!;
          frame.iterator++;

          if (edge.stale) continue;
          const neighbor = edge.to;
          const neighborColor = color.get(neighbor) ?? WHITE;

          if (neighborColor === GRAY) {
            // Back edge found — extract cycle (include current node)
            const cycleStart = frame.path.indexOf(neighbor);
            const cycle = cycleStart !== -1
              ? [...frame.path.slice(cycleStart), frame.nodeId, neighbor]
              : [frame.nodeId, neighbor];
            cycles.push(cycle);
            for (const node of cycle) nodesInCycles.add(node);
          } else if (neighborColor === WHITE) {
            color.set(neighbor, GRAY);
            stack.push({
              nodeId: neighbor,
              iterator: 0,
              path: [...frame.path, frame.nodeId],
            });
            foundNext = true;
            break;
          }
        }

        if (!foundNext) {
          color.set(frame.nodeId, BLACK);
          stack.pop();
        }
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
      nodesInCycles: Array.from(nodesInCycles),
    };
  }

  /**
   * Find cycles restricted to a subset of nodes.
   */
  private findCyclesInSubset(nodeIds: string[]): string[][] {
    const subset = new Set(nodeIds);
    const visited = new Set<string>();
    const cycles: string[][] = [];

    for (const startNode of nodeIds) {
      if (visited.has(startNode)) continue;

      const path: string[] = [];
      const pathSet = new Set<string>();
      const stack: Array<{ nodeId: string; edgeIdx: number }> = [{ nodeId: startNode, edgeIdx: 0 }];

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!;
        const outgoing = (this.outEdges.get(frame.nodeId) ?? []).filter(
          (e) => subset.has(e.to) && !e.stale
        );

        if (frame.edgeIdx === 0) {
          path.push(frame.nodeId);
          pathSet.add(frame.nodeId);
        }

        let advanced = false;
        while (frame.edgeIdx < outgoing.length) {
          const edge = outgoing[frame.edgeIdx]!;
          frame.edgeIdx++;

          if (pathSet.has(edge.to)) {
            const cycleStart = path.indexOf(edge.to);
            if (cycleStart !== -1) {
              cycles.push([...path.slice(cycleStart), edge.to]);
            }
          } else if (!visited.has(edge.to)) {
            stack.push({ nodeId: edge.to, edgeIdx: 0 });
            advanced = true;
            break;
          }
        }

        if (!advanced) {
          path.pop();
          pathSet.delete(frame.nodeId);
          visited.add(frame.nodeId);
          stack.pop();
        }
      }
    }

    return cycles;
  }

  // ── Critical Path Analysis ──────────────────────────────────────────────

  /**
   * Compute the critical path through the graph using a modified longest-path
   * algorithm (equivalent to the PERT/CPM method).
   *
   * The critical path is the longest weighted path from any entry point to any
   * node in the graph. Nodes on the critical path have zero slack time.
   */
  criticalPathAnalysis(): CriticalPathResult {
    const defaultWeight = 1;

    // Compute topological order
    const topoResult = this.topologicalSort();
    if (!topoResult.success) {
      throw new Error('Cannot compute critical path: graph contains cycles.');
    }
    const order = topoResult.order;

    const earliestStart = new Map<string, number>();
    for (const nodeId of order) {
      earliestStart.set(nodeId, 0);
    }

    // Forward pass: compute earliest start times
    for (const nodeId of order) {
      const incoming = (this.inEdges.get(nodeId) ?? []).filter((e) => !e.stale);
      for (const edge of incoming) {
        const edgeWeight = edge.weight ?? defaultWeight;
        const candidate = (earliestStart.get(edge.from) ?? 0) + edgeWeight;
        if (candidate > (earliestStart.get(nodeId) ?? 0)) {
          earliestStart.set(nodeId, candidate);
        }
      }
    }

    // Find the maximum earliest start (project duration)
    const projectDuration = Math.max(0, ...Array.from(earliestStart.values()));

    // Backward pass: compute latest start times
    const latestStart = new Map<string, number>();
    for (const nodeId of order) {
      latestStart.set(nodeId, projectDuration);
    }

    for (let i = order.length - 1; i >= 0; i--) {
      const nodeId = order[i]!;
      const outgoing = (this.outEdges.get(nodeId) ?? []).filter((e) => !e.stale);
      for (const edge of outgoing) {
        const edgeWeight = edge.weight ?? defaultWeight;
        const candidate = (latestStart.get(edge.to) ?? projectDuration) - edgeWeight;
        if (candidate < (latestStart.get(nodeId) ?? projectDuration)) {
          latestStart.set(nodeId, candidate);
        }
      }
    }

    // Compute slack
    const slack = new Map<string, number>();
    for (const nodeId of order) {
      slack.set(nodeId, (latestStart.get(nodeId) ?? 0) - (earliestStart.get(nodeId) ?? 0));
    }

    // Extract critical path (nodes with zero slack)
    const criticalNodes = order.filter((id) => (slack.get(id) ?? 0) === 0);

    return {
      path: criticalNodes,
      totalWeight: projectDuration,
      earliestStart,
      latestStart,
      slack,
    };
  }

  // ── Dependency Pruning ──────────────────────────────────────────────────

  /**
   * Remove nodes and edges that are not reachable from any entry point.
   * This is analogous to dead-code elimination for dependency graphs.
   */
  pruneUnusedDependencies(): PruningResult {
    const entryPoints = this.getEntryPoints();
    if (entryPoints.length === 0) {
      // If no entry points defined, treat all nodes as entry points
      return {
        removedNodes: [],
        removedEdges: [],
        remainingNodeCount: this.nodes.size,
        remainingEdgeCount: this.edgeIndex.size,
      };
    }

    const reachable = new Set<string>();
    const queue: string[] = entryPoints.map((ep) => ep.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      for (const edge of this.outEdges.get(current) ?? []) {
        if (!edge.stale && !reachable.has(edge.to)) {
          queue.push(edge.to);
        }
      }
    }

    const removedNodes: string[] = [];
    const removedEdges: DependencyEdge[] = [];

    for (const nodeId of this.getAllNodeIds()) {
      if (!reachable.has(nodeId)) {
        removedNodes.push(nodeId);
      }
    }

    for (const edge of this.edgeIndex.values()) {
      if (!reachable.has(edge.from) || !reachable.has(edge.to)) {
        removedEdges.push(edge);
      }
    }

    // Perform the removal
    for (const nodeId of removedNodes) {
      this.removeNode(nodeId);
    }
    for (const edge of removedEdges) {
      this.removeEdge(edge.from, edge.to);
    }

    return {
      removedNodes,
      removedEdges,
      remainingNodeCount: this.nodes.size,
      remainingEdgeCount: this.edgeIndex.size,
    };
  }

  /**
   * Mark edges that only carry type-import dependencies as candidates for pruning.
   * Does not remove them — just marks them as `stale`.
   */
  markTypeOnlyEdgesStale(): number {
    let count = 0;
    for (const edge of this.edgeIndex.values()) {
      if (edge.type === DependencyType.TYPE_IMPORT) {
        edge.stale = true;
        count++;
      }
    }
    return count;
  }

  // ── Distance & Impact Radius ────────────────────────────────────────────

  /**
   * Compute the shortest (unweighted) distance from a source node to all
   * other reachable nodes using BFS.
   */
  computeDistances(source: string): Map<string, number> {
    if (!this.nodes.has(source)) {
      throw new Error(`Node '${source}' not found in the graph.`);
    }

    const distances = new Map<string, number>();
    distances.set(source, 0);
    const queue: string[] = [source];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current) ?? 0;

      for (const edge of this.outEdges.get(current) ?? []) {
        if (edge.stale) continue;
        if (!distances.has(edge.to)) {
          distances.set(edge.to, currentDist + 1);
          queue.push(edge.to);
        }
      }
    }

    return distances;
  }

  /**
   * Compute the impact radius for a change originating at `source`.
   *
   * The impact radius is the maximum dependency distance from the source to
   * any affected node, considering both forward (dependents) and reverse
   * (dependencies) edges.
   */
  computeImpactRadius(source: string): ImpactRadiusResult {
    if (!this.nodes.has(source)) {
      throw new Error(`Node '${source}' not found in the graph.`);
    }

    // Forward: who depends on source (reverse edges)
    const directDependents: string[] = [];
    const transitiveDependents: string[] = [];
    const distances = new Map<string, number>();
    distances.set(source, 0);

    // BFS on reverse edges (incoming to find dependents)
    const queue: string[] = [source];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current) ?? 0;

      // Find nodes that depend on current (reverse traversal)
      const incomingToCurrent = (this.inEdges.get(current) ?? []).filter(
        (e) => !e.stale && e.to === current
      );
      for (const edge of incomingToCurrent) {
        if (!visited.has(edge.from)) {
          visited.add(edge.from);
          const newDist = currentDist + 1;
          distances.set(edge.from, newDist);
          transitiveDependents.push(edge.from);
          if (newDist === 1) {
            directDependents.push(edge.from);
          }
          queue.push(edge.from);
        }
      }
    }

    const maxDistance = distances.size > 1
      ? Math.max(...Array.from(distances.values()).filter((d) => d > 0))
      : 0;

    return {
      source,
      directDependents,
      transitiveDependents,
      distances,
      maxDistance,
      radius: maxDistance,
    };
  }

  /**
   * Compute the distance between two specific nodes.
   *
   * Returns the shortest path length or -1 if no path exists.
   */
  distance(from: string, to: string): number {
    const distances = this.computeDistances(from);
    return distances.get(to) ?? -1;
  }

  // ── Graph Statistics ────────────────────────────────────────────────────

  /** Total number of nodes. */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /** Total number of edges. */
  get edgeCount(): number {
    return this.edgeIndex.size;
  }

  /**
   * Compute the in-degree (number of dependents) for each node.
   */
  inDegreeMap(): Map<string, number> {
    const result = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      result.set(nodeId, (this.inEdges.get(nodeId) ?? []).filter((e) => !e.stale).length);
    }
    return result;
  }

  /**
   * Compute the out-degree (number of dependencies) for each node.
   */
  outDegreeMap(): Map<string, number> {
    const result = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      result.set(nodeId, (this.outEdges.get(nodeId) ?? []).filter((e) => !e.stale).length);
    }
    return result;
  }

  /**
   * Find leaf nodes (nodes with no outgoing edges).
   */
  getLeafNodes(): string[] {
    return this.getAllNodeIds().filter(
      (id) => (this.outEdges.get(id) ?? []).filter((e) => !e.stale).length === 0
    );
  }

  /**
   * Find root nodes (nodes with no incoming edges).
   */
  getRootNodes(): string[] {
    return this.getAllNodeIds().filter(
      (id) => (this.inEdges.get(id) ?? []).filter((e) => !e.stale).length === 0
    );
  }

  /**
   * Export the graph as a DOT format string for visualization.
   */
  toDot(): string {
    const lines: string[] = ['digraph dependencies {'];
    for (const node of this.nodes.values()) {
      const label = node.label ?? node.id;
      const attrs = node.isEntry ? ' [shape=box, color=blue]' : '';
      lines.push(`  "${node.id}" [label="${label}"]${attrs};`);
    }
    for (const edge of this.edgeIndex.values()) {
      const style = edge.type === DependencyType.TYPE_IMPORT ? ' [style=dashed]' : '';
      lines.push(`  "${edge.from}" -> "${edge.to}"${style};`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  private edgeKey(from: string, to: string): string {
    return `${from}::${to}`;
  }
}
