import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ContextPriority,
  ContextManager,
  estimateTokens,
} from '../../deerflow/core/context-manager.js';
import type { ContextItem, TaskState, ContextCheckpoint } from '../../deerflow/core/context-manager.js';

function makeTempDir(): string {
  return path.join(os.tmpdir(), 'deerflow-ctx-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

describe('context-manager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* already gone */ }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Constructor defaults
  // ─────────────────────────────────────────────────────────────────────────────
  describe('constructor defaults', () => {
    it('should default maxTokens to 128 000', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.maxTokens).toBe(128_000);
    });

    it('should default totalTokensUsed to 0', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.totalTokensUsed).toBe(0);
    });

    it('should default itemCount to 0', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.itemCount).toBe(0);
    });

    it('should default usageFraction to 0', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.usageFraction).toBe(0);
    });

    it('should create the persistence directory if it does not exist', () => {
      new ContextManager({ persistenceDir: tmpDir });
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    it('should accept custom maxTokens', () => {
      const cm = new ContextManager({ maxTokens: 500, persistenceDir: tmpDir });
      expect(cm.maxTokens).toBe(500);
    });

    it('should accept custom summarizationThreshold', () => {
      const cm = new ContextManager({ summarizationThreshold: 0.5, persistenceDir: tmpDir });
      cm.addItem('x', 'z'.repeat(800)); // 200 tokens — 200/128000 is below 0.8 but with small maxTokens we test threshold
      // We verify it's stored by creating a second CM with same config and relying on same threshold
      const cm2 = new ContextManager({ summarizationThreshold: 0.5, maxTokens: 200, persistenceDir: makeTempDir() });
      cm2.addItem('big', 'a'.repeat(400)); // 100 tokens = 50% usage >= 0.5 threshold
      expect(cm2.shouldSummarize).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ContextPriority enum
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ContextPriority enum', () => {
    it('should have Critical = 0, High = 1, Medium = 2, Low = 3', () => {
      expect(ContextPriority.Critical).toBe(0);
      expect(ContextPriority.High).toBe(1);
      expect(ContextPriority.Medium).toBe(2);
      expect(ContextPriority.Low).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // estimateTokens
  // ─────────────────────────────────────────────────────────────────────────────
  describe('estimateTokens', () => {
    it('should return 0 for an empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should use the default tokensPerChar of 0.25', () => {
      const text = 'a'.repeat(100);
      expect(estimateTokens(text)).toBe(Math.ceil(100 * 0.25)); // 25
    });

    it('should use a custom tokensPerChar', () => {
      expect(estimateTokens('abcd', 1.0)).toBe(4);
      expect(estimateTokens('ab', 2.0)).toBe(4);
    });

    it('should round up with Math.ceil', () => {
      // 1 char * 0.25 = 0.25 → ceil → 1
      expect(estimateTokens('a')).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // addItem & token counting
  // ─────────────────────────────────────────────────────────────────────────────
  describe('addItem and token counting', () => {
    it('should return a ContextItem with the correct label and content', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('my-label', 'hello world');
      expect(item.label).toBe('my-label');
      expect(item.content).toBe('hello world');
    });

    it('should assign an id matching ctx-<number>', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('a', 'b');
      expect(item.id).toMatch(/^ctx-\d+$/);
    });

    it('should track unique ids across multiple adds', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(cm.addItem(`item-${i}`, `content-${i}`).id);
      }
      expect(ids.size).toBe(10);
    });

    it('should use default priority Medium when not specified', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.addItem('x', 'y').priority).toBe(ContextPriority.Medium);
    });

    it('should accept a custom priority', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.addItem('x', 'y', ContextPriority.Critical).priority).toBe(ContextPriority.Critical);
    });

    it('should default pinned to false', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.addItem('x', 'y').pinned).toBe(false);
    });

    it('should accept pinned = true', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.addItem('x', 'y', ContextPriority.Low, true).pinned).toBe(true);
    });

    it('should increment totalTokensUsed by the estimated token count', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('test', 'a'.repeat(100));
      expect(cm.totalTokensUsed).toBe(Math.ceil(100 * 0.25));
    });

    it('should increment itemCount on every add', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.itemCount).toBe(0);
      cm.addItem('a', 'a');
      expect(cm.itemCount).toBe(1);
      cm.addItem('b', 'b');
      expect(cm.itemCount).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAllItems — priority-based sorting
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getAllItems priority-based sorting', () => {
    it('should return items sorted by priority ascending (Critical first)', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('low', 'l', ContextPriority.Low);
      cm.addItem('high', 'h', ContextPriority.High);
      cm.addItem('critical', 'c', ContextPriority.Critical);
      cm.addItem('medium', 'm', ContextPriority.Medium);

      const items = cm.getAllItems();
      expect(items.map((i) => i.label)).toEqual(['critical', 'high', 'medium', 'low']);
    });

    it('should sort items with the same priority by addedAt ascending', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('first', 'a', ContextPriority.Low);
      cm.addItem('second', 'b', ContextPriority.Low);
      const items = cm.getAllItems().filter((i) => i.priority === ContextPriority.Low);
      expect(items[0]!.label).toBe('first');
      expect(items[1]!.label).toBe('second');
    });

    it('should return an empty array when there are no items', () => {
      expect(new ContextManager({ persistenceDir: tmpDir }).getAllItems()).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Pinned items not evicted
  // ─────────────────────────────────────────────────────────────────────────────
  describe('pinned items not evicted', () => {
    it('should never evict a pinned item even when capacity is exceeded', () => {
      const cm = new ContextManager({ maxTokens: 30, persistenceDir: tmpDir });
      const pinned = cm.addItem('pinned', 'x'.repeat(200), ContextPriority.Low, true); // ~50 tokens
      cm.addItem('evictable-1', 'y'.repeat(200), ContextPriority.Low); // ~50 tokens
      cm.addItem('evictable-2', 'z'.repeat(200), ContextPriority.Low); // ~50 tokens

      // The pinned item must still be present
      expect(cm.getItem(pinned.id)).toBeDefined();
      expect(cm.getItem(pinned.id)!.pinned).toBe(true);
    });

    it('should evict the lowest-priority unpinned item first', () => {
      const cm = new ContextManager({ maxTokens: 30, persistenceDir: tmpDir });
      const critical = cm.addItem('critical', 'c'.repeat(200), ContextPriority.Critical, true);
      const low = cm.addItem('low', 'l'.repeat(200), ContextPriority.Low, false);
      const high = cm.addItem('high', 'h'.repeat(200), ContextPriority.High, false);

      // Critical is pinned so it stays. The evictable items are low and high;
      // the lowest-priority evictable (Low) should be evicted first.
      // Since capacity is 30 and each is ~50 tokens, only one can remain.
      // After evicting low, total = 50 (critical pinned) + 50 (high) = 100 > 30 → evict high too.
      // But critical is pinned, so nothing else to evict — overflow accepted.
      expect(cm.getItem(critical.id)).toBeDefined();
      // low should have been evicted
      expect(cm.getItem(low.id)).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updateItem recalculates tokens
  // ─────────────────────────────────────────────────────────────────────────────
  describe('updateItem recalculates tokens', () => {
    it('should update content and recalculate token count', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('test', 'short');
      const tokensBefore = cm.totalTokensUsed;

      const ok = cm.updateItem(item.id, 'a'.repeat(1000));
      expect(ok).toBe(true);
      expect(cm.totalTokensUsed).toBeGreaterThan(tokensBefore);
      expect(cm.getItem(item.id)!.content).toBe('a'.repeat(1000));
    });

    it('should return false for a non-existent id', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.updateItem('nope', 'new')).toBe(false);
    });

    it('should correctly decrease totalTokensUsed when content shrinks', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('test', 'a'.repeat(1000));
      const bigTokens = cm.totalTokensUsed;

      cm.updateItem(item.id, 'tiny');
      expect(cm.totalTokensUsed).toBeLessThan(bigTokens);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // setPinned
  // ─────────────────────────────────────────────────────────────────────────────
  describe('setPinned', () => {
    it('should pin an unpinned item', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('x', 'y');
      expect(cm.setPinned(item.id, true)).toBe(true);
      expect(cm.getItem(item.id)!.pinned).toBe(true);
    });

    it('should unpin a pinned item', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('x', 'y', ContextPriority.Low, true);
      cm.setPinned(item.id, false);
      expect(cm.getItem(item.id)!.pinned).toBe(false);
    });

    it('should return false for a non-existent id', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.setPinned('ghost', true)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // removeItem
  // ─────────────────────────────────────────────────────────────────────────────
  describe('removeItem', () => {
    it('should remove an existing item and return true', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('x', 'y');
      expect(cm.removeItem(item.id)).toBe(true);
      expect(cm.itemCount).toBe(0);
      expect(cm.getItem(item.id)).toBeUndefined();
    });

    it('should subtract token count from totalTokensUsed', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const item = cm.addItem('x', 'a'.repeat(100));
      const before = cm.totalTokensUsed;
      cm.removeItem(item.id);
      expect(cm.totalTokensUsed).toBe(0);
      expect(before).toBeGreaterThan(0);
    });

    it('should return false for a non-existent id', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.removeItem('nothing')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // usageFraction and shouldSummarize
  // ─────────────────────────────────────────────────────────────────────────────
  describe('usageFraction and shouldSummarize', () => {
    it('usageFraction should be 0 when nothing is added', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.usageFraction).toBe(0);
    });

    it('shouldSummarize should be false when below threshold', () => {
      const cm = new ContextManager({ maxTokens: 128_000, persistenceDir: tmpDir });
      cm.addItem('tiny', 'hi');
      expect(cm.shouldSummarize).toBe(false);
    });

    it('shouldSummarize should be true when usage >= summarizationThreshold', () => {
      const cm = new ContextManager({ maxTokens: 100, summarizationThreshold: 0.8, persistenceDir: tmpDir });
      cm.addItem('big', 'x'.repeat(400)); // ~100 tokens = 100% >= 80%
      expect(cm.shouldSummarize).toBe(true);
    });

    it('usageFraction should equal totalTokensUsed / maxTokens', () => {
      const cm = new ContextManager({ maxTokens: 200, persistenceDir: tmpDir });
      cm.addItem('content', 'a'.repeat(400)); // ~100 tokens
      expect(cm.usageFraction).toBeCloseTo(cm.totalTokensUsed / cm.maxTokens, 10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Task lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  describe('task lifecycle', () => {
    it('startTask should set the task description with default phase "planning"', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('Build auth module');
      const state = cm.getTaskState()!;
      expect(state.taskDescription).toBe('Build auth module');
      expect(state.phase).toBe('planning');
      expect(state.filesModified).toEqual([]);
    });

    it('startTask should accept a custom phase', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('Refactor DB', 'implementation');
      expect(cm.getTaskState()!.phase).toBe('implementation');
    });

    it('setPhase should update the current phase', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('t');
      cm.setPhase('testing');
      expect(cm.getTaskState()!.phase).toBe('testing');
    });

    it('setPhase should be a no-op when there is no active task', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(() => cm.setPhase('whatever')).not.toThrow();
      expect(cm.getTaskState()).toBeNull();
    });

    it('recordFileModification should add unique file paths', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('t');
      cm.recordFileModification('/src/a.ts');
      cm.recordFileModification('/src/b.ts');
      cm.recordFileModification('/src/a.ts'); // duplicate — should be ignored
      expect(cm.getTaskState()!.filesModified).toEqual(['/src/a.ts', '/src/b.ts']);
    });

    it('recordFileModification should be a no-op without an active task', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(() => cm.recordFileModification('/x.ts')).not.toThrow();
    });

    it('getTaskState should return null before a task is started', () => {
      expect(new ContextManager({ persistenceDir: tmpDir }).getTaskState()).toBeNull();
    });

    it('getTaskState should return a snapshot that does not mutate internal state', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('t');
      const snapshot = cm.getTaskState()!;
      snapshot.filesModified.push('/should-not-appear.ts');
      expect(cm.getTaskState()!.filesModified).not.toContain('/should-not-appear.ts');
    });

    it('clearTask should remove the active task', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('t');
      cm.clearTask();
      expect(cm.getTaskState()).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Checkpoint save / restore / delete
  // ─────────────────────────────────────────────────────────────────────────────
  describe('checkpoints', () => {
    it('saveCheckpoint should return a ContextCheckpoint with the correct label', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('data', 'payload');
      const ckpt = cm.saveCheckpoint('alpha');
      expect(ckpt.label).toBe('alpha');
      expect(ckpt.id).toMatch(/^ckpt-/);
      expect(ckpt.items).toHaveLength(1);
      expect(ckpt.totalTokensUsed).toBe(cm.totalTokensUsed);
    });

    it('saveCheckpoint should capture the current task state', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.startTask('my task', 'implementation');
      cm.recordFileModification('/src/app.ts');
      const ckpt = cm.saveCheckpoint('snap');
      expect(ckpt.taskState).not.toBeNull();
      expect(ckpt.taskState!.taskDescription).toBe('my task');
      expect(ckpt.taskState!.filesModified).toEqual(['/src/app.ts']);
    });

    it('restoreCheckpoint should restore items and task state', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('keep-me', 'important');
      cm.startTask('task-1');
      const ckpt = cm.saveCheckpoint('save-point');

      cm.reset();
      expect(cm.itemCount).toBe(0);
      expect(cm.getTaskState()).toBeNull();

      expect(cm.restoreCheckpoint(ckpt.id)).toBe(true);
      expect(cm.itemCount).toBe(1);
      expect(cm.getItem('keep-me')).toBeUndefined(); // original IDs are preserved
      // The restored item has the same id from when it was added
      const all = cm.getAllItems();
      expect(all).toHaveLength(1);
      expect(all[0]!.label).toBe('keep-me');
    });

    it('restoreCheckpoint should return false for a non-existent id', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.restoreCheckpoint('ghost')).toBe(false);
    });

    it('listCheckpoints should return checkpoints sorted by createdAt descending', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.saveCheckpoint('first');
      cm.saveCheckpoint('second');
      const list = cm.listCheckpoints();
      expect(list).toHaveLength(2);
      // Most recent first
      expect(list[0]!.label).toBe('second');
      expect(list[1]!.label).toBe('first');
    });

    it('deleteCheckpoint should remove the checkpoint from the list', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const ckpt = cm.saveCheckpoint('temp');
      expect(cm.listCheckpoints()).toHaveLength(1);
      expect(cm.deleteCheckpoint(ckpt.id)).toBe(true);
      expect(cm.listCheckpoints()).toHaveLength(0);
    });

    it('deleteCheckpoint should also remove the on-disk file', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const ckpt = cm.saveCheckpoint('disk-ckpt');
      const filePath = path.resolve(tmpDir, `${ckpt.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      cm.deleteCheckpoint(ckpt.id);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('deleteCheckpoint should return false for a non-existent id', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.deleteCheckpoint('nope')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Session persist / restore
  // ─────────────────────────────────────────────────────────────────────────────
  describe('session persist and restore', () => {
    it('persistSession should write session.json to disk', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('data', 'hello');
      cm.persistSession();
      expect(fs.existsSync(path.resolve(tmpDir, 'session.json'))).toBe(true);
    });

    it('restoreSession should reload items and task state from disk', () => {
      const cm1 = new ContextManager({ persistenceDir: tmpDir });
      cm1.addItem('persisted-item', 'content here');
      cm1.startTask('persistent task', 'testing');
      cm1.recordFileModification('/src/main.ts');
      cm1.persistSession();

      // New instance, same directory
      const cm2 = new ContextManager({ persistenceDir: tmpDir });
      expect(cm2.restoreSession()).toBe(true);
      expect(cm2.itemCount).toBe(1);
      const restoredItem = cm2.getAllItems()[0]!;
      expect(restoredItem.label).toBe('persisted-item');
      expect(restoredItem.content).toBe('content here');
      expect(cm2.getTaskState()!.taskDescription).toBe('persistent task');
      expect(cm2.getTaskState()!.filesModified).toEqual(['/src/main.ts']);
    });

    it('restoreSession should return false when no session file exists', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      expect(cm.restoreSession()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // autoSummarize
  // ─────────────────────────────────────────────────────────────────────────────
  describe('autoSummarize', () => {
    it('should return null when shouldSummarize is false', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('small', 'hi');
      expect(cm.autoSummarize()).toBeNull();
    });

    it('should return null when there are no evictable items even if above threshold', () => {
      const cm = new ContextManager({ maxTokens: 30, persistenceDir: tmpDir });
      cm.addItem('pinned-only', 'x'.repeat(200), ContextPriority.Low, true);
      // Above threshold but everything is pinned
      expect(cm.shouldSummarize).toBe(true);
      expect(cm.autoSummarize()).toBeNull();
    });

    it('should condense evictable items into a single pinned Auto-summary', () => {
      const cm = new ContextManager({ maxTokens: 50, persistenceDir: tmpDir });
      cm.addItem('item-a', 'a'.repeat(100), ContextPriority.Low);
      cm.addItem('item-b', 'b'.repeat(100), ContextPriority.Low);

      const summary = cm.autoSummarize();
      expect(summary).not.toBeNull();
      expect(summary!.label).toBe('Auto-summary');
      expect(summary!.pinned).toBe(true);
      expect(summary!.priority).toBe(ContextPriority.High);
    });

    it('should remove the evicted items after summarization', () => {
      // Use summarizationThreshold=0.4 so that 25 tokens / 50 max = 50% >= 40%
      const cm = new ContextManager({ maxTokens: 50, summarizationThreshold: 0.4, persistenceDir: tmpDir });
      const item = cm.addItem('remove-me', 'x'.repeat(100), ContextPriority.Low);
      const summary = cm.autoSummarize();
      expect(summary).not.toBeNull();
      expect(cm.getItem(item.id)).toBeUndefined();
      // The original item should no longer be in the items map
      expect(cm.getAllItems().every((i) => i.label !== 'remove-me')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reset
  // ─────────────────────────────────────────────────────────────────────────────
  describe('reset', () => {
    it('should clear all items, task state, and token counter', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.addItem('x', 'y');
      cm.startTask('task');
      cm.reset();
      expect(cm.itemCount).toBe(0);
      expect(cm.totalTokensUsed).toBe(0);
      expect(cm.getTaskState()).toBeNull();
    });

    it('should preserve checkpoints when clearCheckpoints is false (default)', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.saveCheckpoint('keep');
      cm.reset();
      expect(cm.listCheckpoints()).toHaveLength(1);
    });

    it('should remove checkpoints when clearCheckpoints is true', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      cm.saveCheckpoint('erase-me');
      cm.reset(true);
      expect(cm.listCheckpoints()).toHaveLength(0);
    });

    it('should remove checkpoint files from disk when clearCheckpoints is true', () => {
      const cm = new ContextManager({ persistenceDir: tmpDir });
      const ckpt = cm.saveCheckpoint('on-disk');
      const filePath = path.resolve(tmpDir, `${ckpt.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      cm.reset(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Capacity eviction behavior
  // ─────────────────────────────────────────────────────────────────────────────
  describe('capacity eviction behavior', () => {
    it('should evict the lowest-priority oldest unpinned item when capacity is exceeded', () => {
      // maxTokens=50: each 200-char item ≈ 50 tokens
      const cm = new ContextManager({ maxTokens: 50, persistenceDir: tmpDir });
      const low1 = cm.addItem('low-1', 'l1'.repeat(200), ContextPriority.Low, false); // fits (50 <= 50)
      const low2 = cm.addItem('low-2', 'l2'.repeat(200), ContextPriority.Low, false); // would be 100 > 50 → evict low1
      const high = cm.addItem('high-pri', 'h'.repeat(200), ContextPriority.High, false); // would be 100 > 50 → evict low2

      // low1 was evicted when low2 was added (oldest lowest-priority)
      expect(cm.getItem(low1.id)).toBeUndefined();
      // low2 was evicted when high was added (only remaining unpinned item)
      expect(cm.getItem(low2.id)).toBeUndefined();
      // high-pri survives
      expect(cm.getItem(high.id)).toBeDefined();
    });

    it('should evict older items before newer items at the same priority', () => {
      const cm = new ContextManager({ maxTokens: 50, persistenceDir: tmpDir });
      const older = cm.addItem('older', 'o'.repeat(200), ContextPriority.Low, false); // fits (50 <= 50)
      const newer = cm.addItem('newer', 'n'.repeat(200), ContextPriority.Low, false); // would be 100 > 50 → evict older
      // Both are low priority; older should be evicted first.
      expect(cm.getItem(older.id)).toBeUndefined();
      expect(cm.getItem(newer.id)).toBeDefined();
    });

    it('should stop evicting when all remaining items are pinned and capacity is still exceeded', () => {
      const cm = new ContextManager({ maxTokens: 10, persistenceDir: tmpDir });
      cm.addItem('pinned', 'p'.repeat(100), ContextPriority.Low, true);
      // Capacity is 10, item is ~25 tokens. Nothing to evict (all pinned).
      // No crash expected — overflow accepted.
      expect(cm.itemCount).toBe(1);
      expect(cm.totalTokensUsed).toBeGreaterThan(cm.maxTokens);
    });

    it('should handle many small items correctly without premature eviction', () => {
      const cm = new ContextManager({ maxTokens: 10_000, persistenceDir: tmpDir });
      for (let i = 0; i < 50; i++) {
        cm.addItem(`item-${i}`, `content-${i}`);
      }
      // Each item is ~10 chars → ~3 tokens. 50 items ≈ 150 tokens, well within 10 000.
      expect(cm.itemCount).toBe(50);
    });
  });
});
