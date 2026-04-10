/**
 * @module context-manager
 * @description Context window management for the Deerflow Agent Framework.
 * Tracks token usage across a conversation, persists state across sessions,
 * and auto-summarizes when approaching capacity limits to prevent knowledge loss.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Priority levels for context items */
export enum ContextPriority {
  Critical = 0,
  High = 1,
  Medium = 2,
  Low = 3,
}

/** A single item stored in the context window */
export interface ContextItem {
  /** Unique id for this item */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Approximate token count */
  tokenCount: number;
  /** Priority for eviction ordering */
  priority: ContextPriority;
  /** When the item was added */
  readonly addedAt: Date;
  /** The actual content payload */
  content: string;
  /** Whether this item has been pinned and cannot be evicted */
  pinned: boolean;
}

/** Current task state tracking */
export interface TaskState {
  /** Human-readable task description */
  taskDescription: string;
  /** Current phase (e.g. 'planning', 'implementation', 'testing') */
  phase: string;
  /** Files that have been modified during this task */
  filesModified: string[];
  /** When this task started */
  startedAt: Date;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** A saved checkpoint that can be restored */
export interface ContextCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly createdAt: Date;
  readonly items: ContextItem[];
  readonly taskState: TaskState | null;
  readonly totalTokensUsed: number;
}

/** Configuration for the context manager */
export interface ContextManagerConfig {
  /** Maximum token capacity of the context window (default: 128 000) */
  maxTokens: number;
  /** Fraction of capacity at which auto-summarization triggers (default: 0.8) */
  summarizationThreshold: number;
  /** Path to the persistence directory (default: .deerflow/context) */
  persistenceDir: string;
  /** Approximate tokens per character (default: 0.25 for English prose) */
  tokensPerChar: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rough token estimator. For production use, integrate with a proper tokenizer.
 */
export function estimateTokens(text: string, tokensPerChar: number = 0.25): number {
  return Math.ceil(text.length * tokensPerChar);
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages the agent's context window. Supports adding/removing items with
 * priority-based eviction, checkpointing, auto-summarization, and persistence.
 */
export class ContextManager {
  private items: Map<string, ContextItem> = new Map();
  private checkpoints: Map<string, ContextCheckpoint> = new Map();
  private currentTask: TaskState | null = null;
  private _totalTokensUsed: number = 0;
  private config: ContextManagerConfig;
  private nextId = 0;

  constructor(config?: Partial<ContextManagerConfig>) {
    this.config = {
      maxTokens: 128_000,
      summarizationThreshold: 0.8,
      persistenceDir: '.deerflow/context',
      tokensPerChar: 0.25,
      ...config,
    };

    // Ensure persistence directory exists
    const absDir = path.resolve(this.config.persistenceDir);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }
  }

  // ── Item Management ──────────────────────────────────────────────────────

  /**
   * Add an item to the context window. If capacity would be exceeded,
   * lower-priority unpinned items are evicted first.
   */
  addItem(label: string, content: string, priority: ContextPriority = ContextPriority.Medium, pinned: boolean = false): ContextItem {
    const id = `ctx-${++this.nextId}`;
    const tokenCount = estimateTokens(content, this.config.tokensPerChar);

    // Evict if necessary
    this.ensureCapacity(tokenCount);

    const item: ContextItem = {
      id,
      label,
      tokenCount,
      priority,
      addedAt: new Date(),
      content,
      pinned,
    };

    this.items.set(id, item);
    this._totalTokensUsed += tokenCount;
    return item;
  }

  /** Remove an item by id */
  removeItem(id: string): boolean {
    const item = this.items.get(id);
    if (item) {
      this._totalTokensUsed -= item.tokenCount;
      this.items.delete(id);
      return true;
    }
    return false;
  }

  /** Get an item by id */
  getItem(id: string): ContextItem | undefined {
    return this.items.get(id);
  }

  /** Get all items, sorted by priority then by date added (oldest first) */
  getAllItems(): ContextItem[] {
    return Array.from(this.items.values()).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.addedAt.getTime() - b.addedAt.getTime();
    });
  }

  /** Update an existing item's content (recalculates tokens) */
  updateItem(id: string, newContent: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this._totalTokensUsed -= item.tokenCount;
    item.content = newContent;
    item.tokenCount = estimateTokens(newContent, this.config.tokensPerChar);
    this._totalTokensUsed += item.tokenCount;

    // Evict if the update pushed us over capacity
    this.ensureCapacity(0);
    return true;
  }

  /** Pin or unpin an item */
  setPinned(id: string, pinned: boolean): boolean {
    const item = this.items.get(id);
    if (item) {
      item.pinned = pinned;
      return true;
    }
    return false;
  }

  // ── Token Management ─────────────────────────────────────────────────────

  /** Current total tokens used */
  get totalTokensUsed(): number {
    return this._totalTokensUsed;
  }

  /** Maximum token capacity */
  get maxTokens(): number {
    return this.config.maxTokens;
  }

  /** Fraction of capacity currently used (0–1) */
  get usageFraction(): number {
    return this._totalTokensUsed / this.config.maxTokens;
  }

  /** Whether auto-summarization should be triggered */
  get shouldSummarize(): boolean {
    return this.usageFraction >= this.config.summarizationThreshold;
  }

  /** Number of context items */
  get itemCount(): number {
    return this.items.size;
  }

  // ── Eviction ─────────────────────────────────────────────────────────────

  /**
   * Ensure there is room for `additionalTokens`. Evicts low-priority
   * unpinned items until enough space is available.
   */
  private ensureCapacity(additionalTokens: number): void {
    while (this._totalTokensUsed + additionalTokens > this.config.maxTokens) {
      const candidate = this.findEvictionCandidate();
      if (!candidate) break; // Nothing left to evict — accept overflow
      this.removeItem(candidate.id);
    }
  }

  /** Find the lowest-priority, oldest, unpinned item */
  private findEvictionCandidate(): ContextItem | null {
    let best: ContextItem | null = null;
    for (const item of this.items.values()) {
      if (item.pinned) continue;
      if (!best || item.priority > best.priority || (item.priority === best.priority && item.addedAt < best.addedAt)) {
        best = item;
      }
    }
    return best;
  }

  // ── Summarization ─────────────────────────────────────────────────────────

  /**
   * Auto-summarize: condense all non-pinned items into a single summary
   * to reclaim context space. Returns the new summary item.
   */
  autoSummarize(): ContextItem | null {
    if (!this.shouldSummarize) return null;

    const evictable = this.getAllItems().filter((i) => !i.pinned);
    if (evictable.length === 0) return null;

    // Build a summary string from evictable items
    const summaryParts = evictable.map((item) => {
      const preview = item.content.length > 200 ? item.content.slice(0, 200) + '…' : item.content;
      return `[${item.label}] ${preview}`;
    });

    const summaryContent = `Context summary (${evictable.length} items condensed):\n${summaryParts.join('\n')}`;

    // Remove evictable items
    for (const item of evictable) {
      this.removeItem(item.id);
    }

    // Add the summary as a high-priority item
    return this.addItem('Auto-summary', summaryContent, ContextPriority.High, true);
  }

  // ── Task State ────────────────────────────────────────────────────────────

  /** Start tracking a new task */
  startTask(description: string, phase: string = 'planning'): void {
    this.currentTask = {
      taskDescription: description,
      phase,
      filesModified: [],
      startedAt: new Date(),
    };
  }

  /** Update the current task phase */
  setPhase(phase: string): void {
    if (this.currentTask) {
      this.currentTask.phase = phase;
    }
  }

  /** Record a file modification */
  recordFileModification(filePath: string): void {
    if (this.currentTask) {
      if (!this.currentTask.filesModified.includes(filePath)) {
        this.currentTask.filesModified.push(filePath);
      }
    }
  }

  /** Get the current task state (readonly snapshot) */
  getTaskState(): TaskState | null {
    return this.currentTask ? { ...this.currentTask, filesModified: [...this.currentTask.filesModified] } : null;
  }

  /** Clear the current task */
  clearTask(): void {
    this.currentTask = null;
  }

  // ── Checkpoints ──────────────────────────────────────────────────────────

  /**
   * Save a checkpoint of the current context window and task state.
   */
  saveCheckpoint(label: string): ContextCheckpoint {
    const id = `ckpt-${++this.nextId}-${Date.now()}`;
    const checkpoint: ContextCheckpoint = {
      id,
      label,
      createdAt: new Date(),
      items: this.getAllItems().map((i) => ({ ...i, addedAt: new Date(i.addedAt) })),
      taskState: this.currentTask ? { ...this.currentTask, filesModified: [...this.currentTask.filesModified], startedAt: new Date(this.currentTask.startedAt) } : null,
      totalTokensUsed: this._totalTokensUsed,
    };
    this.checkpoints.set(id, checkpoint);

    // Persist to disk
    this.persistCheckpoint(checkpoint);
    return checkpoint;
  }

  /**
   * Restore from a previously saved checkpoint.
   */
  restoreCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id) ?? this.loadCheckpoint(id);
    if (!checkpoint) return false;

    this.items.clear();
    this._totalTokensUsed = 0;

    for (const item of checkpoint.items) {
      const restored: ContextItem = { ...item, addedAt: new Date(item.addedAt) };
      this.items.set(restored.id, restored);
      this._totalTokensUsed += restored.tokenCount;
    }

    this.currentTask = checkpoint.taskState;
    return true;
  }

  /** List all available checkpoints */
  listCheckpoints(): ContextCheckpoint[] {
    return Array.from(this.checkpoints.values()).sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
  }

  /** Delete a checkpoint */
  deleteCheckpoint(id: string): boolean {
    const deleted = this.checkpoints.delete(id);
    if (deleted) {
      const filePath = this.checkpointFilePath(id);
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
    return deleted;
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private checkpointFilePath(id: string): string {
    return path.resolve(this.config.persistenceDir, `${id}.json`);
  }

  private persistCheckpoint(checkpoint: ContextCheckpoint): void {
    try {
      const filePath = this.checkpointFilePath(checkpoint.id);
      fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[ContextManager] Failed to persist checkpoint ${checkpoint.id}:`, err);
    }
  }

  private loadCheckpoint(id: string): ContextCheckpoint | null {
    const filePath = this.checkpointFilePath(id);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as ContextCheckpoint;
    } catch {
      return null;
    }
  }

  /**
   * Persist the current full session state so it can be restored later.
   */
  persistSession(): void {
    const sessionData = {
      items: Array.from(this.items.entries()),
      currentTask: this.currentTask,
      totalTokensUsed: this._totalTokensUsed,
      savedAt: new Date().toISOString(),
    };
    try {
      const filePath = path.resolve(this.config.persistenceDir, 'session.json');
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ContextManager] Failed to persist session:', err);
    }
  }

  /**
   * Restore a previously persisted session.
   */
  restoreSession(): boolean {
    const filePath = path.resolve(this.config.persistenceDir, 'session.json');
    if (!fs.existsSync(filePath)) return false;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      this.items.clear();
      this._totalTokensUsed = 0;

      for (const [id, item] of data.items) {
        const restored = item as ContextItem;
        this.items.set(id, { ...restored, addedAt: new Date(restored.addedAt) });
        this._totalTokensUsed += restored.tokenCount;
      }

      this.currentTask = data.currentTask;
      return true;
    } catch {
      return false;
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  /** Clear all items, task state, and optionally checkpoints */
  reset(clearCheckpoints: boolean = false): void {
    this.items.clear();
    this._totalTokensUsed = 0;
    this.currentTask = null;
    if (clearCheckpoints) {
      this.checkpoints.clear();
      try {
        const dir = path.resolve(this.config.persistenceDir);
        if (fs.existsSync(dir)) {
          for (const file of fs.readdirSync(dir)) {
            fs.unlinkSync(path.join(dir, file));
          }
        }
      } catch { /* ignore */ }
    }
  }
}
