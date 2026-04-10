/**
 * @module file-safety-guard
 * @description File operation safety system for the Deerflow Agent Framework.
 * Provides backup-before-write, atomic writes, scope validation, deletion
 * confirmation protocols, change logging, and rollback capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Supported file operation types */
export enum FileOperationType {
  Write = 'write',
  Delete = 'delete',
  Rename = 'rename',
  Copy = 'copy',
  Create = 'create',
}

/** A single logged file operation */
export interface FileOperationRecord {
  readonly id: string;
  readonly type: FileOperationType;
  readonly timestamp: Date;
  readonly filePath: string;
  readonly destinationPath?: string; // for rename / copy
  readonly content?: string;
  readonly previousContent?: string;
  readonly backupPath?: string;
  readonly checksum: string;
  readonly previousChecksum?: string;
  readonly success: boolean;
  readonly error?: string;
}

/** Result of a guarded operation */
export interface GuardedOperationResult {
  readonly success: boolean;
  readonly operationId: string;
  readonly error?: string;
}

/** Scope rules for the file safety guard */
export interface ScopeRules {
  /** Root directory — all operations must be within this tree */
  projectRoot: string;
  /** Explicit allowed paths (relative to projectRoot or absolute) */
  allowedPaths?: string[];
  /** Explicit denied paths (relative to projectRoot or absolute) */
  deniedPaths?: string[];
  /** Patterns to deny (e.g. ['.env', '*.secret']) */
  deniedPatterns?: string[];
  /** Whether to allow operations on hidden files/dirs (default: false) */
  allowHidden?: boolean;
}

/** Deletion confirmation handler — must return `true` to proceed */
export type DeletionConfirmationHandler = (
  filePath: string,
  record: FileOperationRecord,
) => boolean | Promise<boolean>;

// ─────────────────────────────────────────────────────────────────────────────
// Change Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maintains an audit trail of all file operations performed by the guard.
 */
export class ChangeLogger {
  private records: FileOperationRecord[] = [];
  private logFilePath: string;

  constructor(logDir: string = '.deerflow/logs') {
    const absDir = path.resolve(logDir);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }
    this.logFilePath = path.join(absDir, 'file-operations.jsonl');
  }

  /** Log a single file operation */
  log(record: FileOperationRecord): void {
    this.records.push(record);
    try {
      fs.appendFileSync(this.logFilePath, JSON.stringify(record) + '\n', 'utf-8');
    } catch (err) {
      console.error('[ChangeLogger] Failed to persist log entry:', err);
    }
  }

  /** Get all records, optionally filtered by type or path */
  getRecords(filter?: { type?: FileOperationType; filePath?: string }): FileOperationRecord[] {
    let results = [...this.records];
    if (filter?.type) {
      results = results.filter((r) => r.type === filter.type);
    }
    if (filter?.filePath) {
      results = results.filter((r) => r.filePath === filter.filePath || r.destinationPath === filter.filePath);
    }
    return results;
  }

  /** Get records in reverse chronological order */
  getRecentRecords(limit: number = 50): FileOperationRecord[] {
    return this.records.slice(-limit).reverse();
  }

  /** Clear in-memory log (does not delete the file) */
  clear(): void {
    this.records = [];
  }

  /** Total number of logged operations */
  get count(): number {
    return this.records.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates backups of files before any destructive operation.
 * Backups are stored in a `.deerflow/backups` directory with timestamps.
 */
export class BackupManager {
  private backupDir: string;

  constructor(backupDir: string = '.deerflow/backups') {
    this.backupDir = path.resolve(backupDir);
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a backup of the file at `filePath`.
   * @returns The absolute path to the backup file, or `null` if the file doesn't exist.
   */
  createBackup(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const relPath = path.relative(path.resolve('.'), filePath);
    const backupName = `${timestamp}--${relPath.replace(/[\\/]/g, '--')}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      const dir = path.dirname(backupPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch (err) {
      console.error(`[BackupManager] Failed to back up ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Restore a file from a backup.
   */
  restoreFromBackup(backupPath: string, targetPath: string): boolean {
    if (!fs.existsSync(backupPath)) return false;
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(backupPath, targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /** List all available backups */
  listBackups(): string[] {
    if (!fs.existsSync(this.backupDir)) return [];
    return this.walkDir(this.backupDir);
  }

  /** Delete a specific backup */
  deleteBackup(backupPath: string): boolean {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private walkDir(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Atomic Write Operation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Performs file writes atomically by writing to a temporary file first
 * and then renaming. This prevents partial writes on crash.
 */
export class AtomicWriteOperation {
  /**
   * Write content to `filePath` atomically.
   */
  static write(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = `${filePath}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    try {
      fs.writeFileSync(tmpPath, content, encoding);
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      // Clean up temp file on failure
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that file operations stay within the configured project scope.
 */
export class ScopeValidator {
  private rules: ScopeRules;

  constructor(rules: ScopeRules) {
    this.rules = {
      allowHidden: false,
      deniedPatterns: [],
      ...rules,
    };
  }

  /**
   * Check whether an operation on `filePath` is allowed by scope rules.
   * @returns `true` if allowed, with a reason string if denied.
   */
  validate(filePath: string): { allowed: boolean; reason?: string } {
    const absPath = path.resolve(filePath);
    const rootPath = path.resolve(this.rules.projectRoot);

    // Must be within project root
    if (!absPath.startsWith(rootPath + path.sep) && absPath !== rootPath) {
      return { allowed: false, reason: `Path "${filePath}" is outside project root "${this.rules.projectRoot}"` };
    }

    // Check denied paths
    if (this.rules.deniedPaths) {
      for (const denied of this.rules.deniedPaths) {
        const absDenied = path.resolve(this.rules.projectRoot, denied);
        if (absPath.startsWith(absDenied + path.sep) || absPath === absDenied) {
          return { allowed: false, reason: `Path "${filePath}" is in denied path "${denied}"` };
        }
      }
    }

    // Check denied patterns
    if (this.rules.deniedPatterns) {
      for (const pattern of this.rules.deniedPatterns) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(absPath) || regex.test(path.basename(absPath))) {
          return { allowed: false, reason: `Path "${filePath}" matches denied pattern "${pattern}"` };
        }
      }
    }

    // Hidden files
    if (!this.rules.allowHidden) {
      const parts = absPath.split(path.sep);
      for (const part of parts) {
        if (part.startsWith('.')) {
          return { allowed: false, reason: `Path "${filePath}" contains hidden directory/file "${part}"` };
        }
      }
    }

    return { allowed: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deletion Confirm Protocol
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps file deletion operations with an explicit confirmation step.
 * Supports both synchronous and asynchronous confirmation handlers.
 */
export class DeletionConfirmProtocol {
  private handler: DeletionConfirmationHandler;

  constructor(handler?: DeletionConfirmationHandler) {
    this.handler = handler ?? ((_filePath: string, _record: FileOperationRecord) => {
      // Default: auto-reject (fail-safe)
      console.warn(`[DeletionConfirm] Deletion of "${_filePath}" was not explicitly confirmed. Denied.`);
      return false;
    });
  }

  /** Set a custom confirmation handler */
  setHandler(handler: DeletionConfirmationHandler): void {
    this.handler = handler;
  }

  /**
   * Request confirmation for a deletion.
   * @returns `true` if confirmed, `false` otherwise.
   */
  async confirm(filePath: string, record: FileOperationRecord): Promise<boolean> {
    return this.handler(filePath, record);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rollback Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can revert file operations using the backup trail maintained by ChangeLogger
 * and BackupManager. Operations are rolled back in reverse order.
 */
export class RollbackManager {
  constructor(
    private readonly changeLogger: ChangeLogger,
    private readonly backupManager: BackupManager,
  ) {}

  /**
   * Roll back the most recent N operations (or all if count is not specified).
   * @returns Number of operations successfully rolled back.
   */
  async rollback(count?: number): Promise<number> {
    const records = this.changeLogger.getRecentRecords(count ?? Infinity);
    let rolledBack = 0;

    for (const record of records) {
      const success = this.rollbackOne(record);
      if (success) rolledBack++;
    }

    return rolledBack;
  }

  /**
   * Roll back a single specific operation by id.
   */
  rollbackById(operationId: string): boolean {
    const record = this.changeLogger.getRecords().find((r) => r.id === operationId);
    if (!record) return false;
    return this.rollbackOne(record);
  }

  private rollbackOne(record: FileOperationRecord): boolean {
    switch (record.type) {
      case FileOperationType.Write:
      case FileOperationType.Create:
        // Restore previous content or delete if file was newly created
        if (record.backupPath && fs.existsSync(record.backupPath)) {
          return this.backupManager.restoreFromBackup(record.backupPath, record.filePath);
        } else if (record.previousContent !== undefined) {
          try {
            fs.writeFileSync(record.filePath, record.previousContent, 'utf-8');
            return true;
          } catch {
            return false;
          }
        } else {
          // File was newly created — delete it
          try {
            fs.unlinkSync(record.filePath);
            return true;
          } catch {
            return false;
          }
        }

      case FileOperationType.Delete:
        // Restore from backup
        if (record.backupPath && fs.existsSync(record.backupPath)) {
          return this.backupManager.restoreFromBackup(record.backupPath, record.filePath);
        }
        return false;

      case FileOperationType.Rename:
        // Reverse the rename
        if (record.destinationPath && fs.existsSync(record.destinationPath)) {
          try {
            fs.renameSync(record.destinationPath, record.filePath);
            return true;
          } catch {
            return false;
          }
        }
        return false;

      case FileOperationType.Copy:
        // Delete the copy
        if (record.destinationPath && fs.existsSync(record.destinationPath)) {
          try {
            fs.unlinkSync(record.destinationPath);
            return true;
          } catch {
            return false;
          }
        }
        return false;

      default:
        return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// File Safety Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level guard that orchestrates all file safety subsystems:
 * scope validation, backup creation, atomic writes, deletion confirmation,
 * change logging, and rollback support.
 */
export class FileSafetyGuard {
  private scopeValidator: ScopeValidator;
  private changeLogger: ChangeLogger;
  private backupManager: BackupManager;
  private deletionProtocol: DeletionConfirmProtocol;
  private rollbackManager: RollbackManager;
  private nextOpId = 0;

  constructor(scopeRules: ScopeRules, logDir?: string, backupDir?: string) {
    this.scopeValidator = new ScopeValidator(scopeRules);
    this.changeLogger = new ChangeLogger(logDir);
    this.backupManager = new BackupManager(backupDir);
    this.deletionProtocol = new DeletionConfirmProtocol();
    this.rollbackManager = new RollbackManager(this.changeLogger, this.backupManager);
  }

  // ── Public Operations ────────────────────────────────────────────────────

  /**
   * Write content to a file with full safety guarantees.
   */
  async writeFile(filePath: string, content: string): Promise<GuardedOperationResult> {
    const scopeCheck = this.scopeValidator.validate(filePath);
    if (!scopeCheck.allowed) {
      return this.failResult(scopeCheck.reason!);
    }

    const absPath = path.resolve(filePath);
    const previousContent = this.readSafe(absPath);
    const previousChecksum = previousContent !== null ? this.checksum(previousContent) : undefined;
    const backupPath = previousContent !== null ? this.backupManager.createBackup(absPath) : undefined;

    try {
      AtomicWriteOperation.write(absPath, content);
      const record = this.buildRecord(FileOperationType.Write, absPath, content, previousContent, backupPath, previousChecksum);
      this.changeLogger.log(record);
      return { success: true, operationId: record.id };
    } catch (err) {
      return this.failResult(`Write failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Delete a file with confirmation protocol.
   */
  async deleteFile(filePath: string): Promise<GuardedOperationResult> {
    const scopeCheck = this.scopeValidator.validate(filePath);
    if (!scopeCheck.allowed) {
      return this.failResult(scopeCheck.reason!);
    }

    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      return this.failResult(`File does not exist: ${filePath}`);
    }

    const previousContent = this.readSafe(absPath);
    const previousChecksum = previousContent !== null ? this.checksum(previousContent) : undefined;
    const backupPath = this.backupManager.createBackup(absPath);

    const record = this.buildRecord(FileOperationType.Delete, absPath, undefined, previousContent, backupPath, previousChecksum);

    const confirmed = await this.deletionProtocol.confirm(absPath, record);
    if (!confirmed) {
      return this.failResult('Deletion not confirmed');
    }

    try {
      fs.unlinkSync(absPath);
      this.changeLogger.log({ ...record, success: true });
      return { success: true, operationId: record.id };
    } catch (err) {
      this.changeLogger.log({ ...record, success: false, error: String(err) });
      return this.failResult(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Rename a file with backup.
   */
  async renameFile(oldPath: string, newPath: string): Promise<GuardedOperationResult> {
    const scopeOld = this.scopeValidator.validate(oldPath);
    const scopeNew = this.scopeValidator.validate(newPath);
    if (!scopeOld.allowed) return this.failResult(scopeOld.reason!);
    if (!scopeNew.allowed) return this.failResult(scopeNew.reason!);

    const absOld = path.resolve(oldPath);
    const absNew = path.resolve(newPath);

    if (!fs.existsSync(absOld)) {
      return this.failResult(`Source file does not exist: ${oldPath}`);
    }

    const backupPath = this.backupManager.createBackup(absOld);
    const previousContent = this.readSafe(absOld);
    const previousChecksum = previousContent !== null ? this.checksum(previousContent) : undefined;

    try {
      const dir = path.dirname(absNew);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(absOld, absNew);
      const record = this.buildRecord(FileOperationType.Rename, absOld, undefined, previousContent, backupPath, previousChecksum);
      this.changeLogger.log({ ...record, destinationPath: absNew, success: true });
      return { success: true, operationId: record.id };
    } catch (err) {
      return this.failResult(`Rename failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  get logger(): ChangeLogger {
    return this.changeLogger;
  }

  get backups(): BackupManager {
    return this.backupManager;
  }

  get rollback(): RollbackManager {
    return this.rollbackManager;
  }

  /** Set a custom deletion confirmation handler */
  setDeletionHandler(handler: DeletionConfirmationHandler): void {
    this.deletionProtocol.setHandler(handler);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private readSafe(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private checksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  private buildRecord(
    type: FileOperationType,
    filePath: string,
    content: string | undefined,
    previousContent: string | null,
    backupPath: string | null | undefined,
    previousChecksum: string | undefined,
  ): FileOperationRecord {
    return {
      id: `op-${++this.nextOpId}-${Date.now()}`,
      type,
      timestamp: new Date(),
      filePath,
      content,
      previousContent: previousContent ?? undefined,
      backupPath: backupPath ?? undefined,
      checksum: content ? this.checksum(content) : '',
      previousChecksum,
      success: true,
    };
  }

  private failResult(error: string): GuardedOperationResult {
    return { success: false, operationId: `op-failed-${++this.nextOpId}`, error };
  }
}
