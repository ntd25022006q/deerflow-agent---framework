import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  FileOperationType,
  ChangeLogger,
  BackupManager,
  AtomicWriteOperation,
  ScopeValidator,
  DeletionConfirmProtocol,
  RollbackManager,
  FileSafetyGuard,
} from '../../deerflow/core/file-safety-guard';
import type {
  FileOperationRecord,
  ScopeRules,
} from '../../deerflow/core/file-safety-guard';

describe('file-safety-guard', () => {
  let baseDir: string;
  let logDir: string;
  let backupDir: string;
  let projectDir: string;

  beforeEach(() => {
    const unique = `deerflow-fsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    baseDir = path.join(os.tmpdir(), unique);
    logDir = path.join(baseDir, 'logs');
    backupDir = path.join(baseDir, 'backups');
    projectDir = path.join(baseDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  // ── FileOperationType enum ──────────────────────────────────────────────

  describe('FileOperationType enum', () => {
    it('should export all five operation types', () => {
      expect(FileOperationType.Write).toBe('write');
      expect(FileOperationType.Delete).toBe('delete');
      expect(FileOperationType.Rename).toBe('rename');
      expect(FileOperationType.Copy).toBe('copy');
      expect(FileOperationType.Create).toBe('create');
    });
  });

  // ── ChangeLogger ───────────────────────────────────────────────────────

  describe('ChangeLogger', () => {
    it('should log a single record and increment count', () => {
      const logger = new ChangeLogger(logDir);
      const record: FileOperationRecord = {
        id: 'op-1', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/test/file.ts', checksum: 'abc123', success: true,
      };
      logger.log(record);
      expect(logger.count).toBe(1);
    });

    it('should log multiple records and retrieve all', () => {
      const logger = new ChangeLogger(logDir);
      for (let i = 0; i < 5; i++) {
        logger.log({
          id: `op-${i}`, type: FileOperationType.Write, timestamp: new Date(),
          filePath: `/test/f${i}.ts`, checksum: `${i}`, success: true,
        });
      }
      expect(logger.getRecords()).toHaveLength(5);
      expect(logger.count).toBe(5);
    });

    it('should filter records by type', () => {
      const logger = new ChangeLogger(logDir);
      logger.log({
        id: 'w1', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/a.ts', checksum: 'a', success: true,
      });
      logger.log({
        id: 'd1', type: FileOperationType.Delete, timestamp: new Date(),
        filePath: '/b.ts', checksum: 'b', success: true,
      });
      logger.log({
        id: 'w2', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/c.ts', checksum: 'c', success: true,
      });
      expect(logger.getRecords({ type: FileOperationType.Write })).toHaveLength(2);
      expect(logger.getRecords({ type: FileOperationType.Delete })).toHaveLength(1);
    });

    it('should filter records by filePath', () => {
      const logger = new ChangeLogger(logDir);
      logger.log({
        id: 'r1', type: FileOperationType.Rename, timestamp: new Date(),
        filePath: '/old.ts', destinationPath: '/new.ts', checksum: 'r', success: true,
      });
      logger.log({
        id: 'w1', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/other.ts', checksum: 'o', success: true,
      });
      // Should match filePath and destinationPath
      expect(logger.getRecords({ filePath: '/new.ts' })).toHaveLength(1);
      expect(logger.getRecords({ filePath: '/old.ts' })).toHaveLength(1);
    });

    it('should getRecentRecords return most recent first with limit', () => {
      const logger = new ChangeLogger(logDir);
      for (let i = 0; i < 10; i++) {
        logger.log({
          id: `op-${i}`, type: FileOperationType.Write, timestamp: new Date(),
          filePath: `/f${i}.ts`, checksum: `${i}`, success: true,
        });
      }
      const recent = logger.getRecentRecords(3);
      expect(recent).toHaveLength(3);
      expect(recent[0]!.id).toBe('op-9');
      expect(recent[1]!.id).toBe('op-8');
      expect(recent[2]!.id).toBe('op-7');
    });

    it('should clear all in-memory records', () => {
      const logger = new ChangeLogger(logDir);
      logger.log({
        id: 'op-1', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/test.ts', checksum: 'c', success: true,
      });
      logger.log({
        id: 'op-2', type: FileOperationType.Delete, timestamp: new Date(),
        filePath: '/test.ts', checksum: 'c', success: true,
      });
      logger.clear();
      expect(logger.count).toBe(0);
      expect(logger.getRecords()).toHaveLength(0);
    });

    it('should persist log entries to disk', () => {
      const logger = new ChangeLogger(logDir);
      logger.log({
        id: 'persist-1', type: FileOperationType.Write, timestamp: new Date(),
        filePath: '/disk.ts', checksum: 'd', success: true,
      });
      const logFile = path.join(logDir, 'file-operations.jsonl');
      expect(fs.existsSync(logFile)).toBe(true);
      const content = fs.readFileSync(logFile, 'utf-8').trim();
      expect(content).toContain('persist-1');
    });
  });

  // ── BackupManager ──────────────────────────────────────────────────────

  describe('BackupManager', () => {
    it('should create a backup of an existing file', () => {
      const bm = new BackupManager(backupDir);
      const filePath = path.join(projectDir, 'important.txt');
      fs.writeFileSync(filePath, 'important data');
      const backupPath = bm.createBackup(filePath);
      expect(backupPath).not.toBeNull();
      expect(fs.existsSync(backupPath!)).toBe(true);
      expect(fs.readFileSync(backupPath!, 'utf-8')).toBe('important data');
    });

    it('should return null when backing up a non-existent file', () => {
      const bm = new BackupManager(backupDir);
      expect(bm.createBackup('/nonexistent/file.txt')).toBeNull();
    });

    it('should restore a file from backup to original content', () => {
      const bm = new BackupManager(backupDir);
      const filePath = path.join(projectDir, 'data.txt');
      fs.writeFileSync(filePath, 'original content');
      const backupPath = bm.createBackup(filePath);
      // Modify the file
      fs.writeFileSync(filePath, 'modified content');
      // Restore from backup
      const restored = bm.restoreFromBackup(backupPath!, filePath);
      expect(restored).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original content');
    });

    it('should restore to a new target path', () => {
      const bm = new BackupManager(backupDir);
      const srcFile = path.join(projectDir, 'src.txt');
      const targetFile = path.join(projectDir, 'restored.txt');
      fs.writeFileSync(srcFile, 'source content');
      const backupPath = bm.createBackup(srcFile);
      expect(bm.restoreFromBackup(backupPath!, targetFile)).toBe(true);
      expect(fs.readFileSync(targetFile, 'utf-8')).toBe('source content');
    });

    it('should return false when restoring from non-existent backup', () => {
      const bm = new BackupManager(backupDir);
      expect(bm.restoreFromBackup('/no/such/backup', '/target')).toBe(false);
    });

    it('should list all created backups', () => {
      const bm = new BackupManager(backupDir);
      for (let i = 0; i < 3; i++) {
        const f = path.join(projectDir, `file${i}.txt`);
        fs.writeFileSync(f, `content ${i}`);
        bm.createBackup(f);
      }
      const list = bm.listBackups();
      expect(list.length).toBeGreaterThanOrEqual(3);
    });

    it('should delete a specific backup', () => {
      const bm = new BackupManager(backupDir);
      const filePath = path.join(projectDir, 'f.txt');
      fs.writeFileSync(filePath, 'data');
      const backupPath = bm.createBackup(filePath);
      expect(fs.existsSync(backupPath!)).toBe(true);
      expect(bm.deleteBackup(backupPath!)).toBe(true);
      expect(fs.existsSync(backupPath!)).toBe(false);
    });

    it('should return false when deleting non-existent backup', () => {
      const bm = new BackupManager(backupDir);
      expect(bm.deleteBackup('/no/such/backup')).toBe(false);
    });
  });

  // ── AtomicWriteOperation ───────────────────────────────────────────────

  describe('AtomicWriteOperation', () => {
    it('should write content atomically to a file', () => {
      const filePath = path.join(projectDir, 'atomic.txt');
      AtomicWriteOperation.write(filePath, 'atomic content');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('atomic content');
    });

    it('should create intermediate directories when writing', () => {
      const filePath = path.join(projectDir, 'a', 'b', 'c', 'nested.txt');
      AtomicWriteOperation.write(filePath, 'deeply nested');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('deeply nested');
    });

    it('should overwrite an existing file', () => {
      const filePath = path.join(projectDir, 'overwrite.txt');
      fs.writeFileSync(filePath, 'old content');
      AtomicWriteOperation.write(filePath, 'new content');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
    });

    it('should write with a custom encoding', () => {
      const filePath = path.join(projectDir, 'encoded.txt');
      AtomicWriteOperation.write(filePath, 'UTF-16 test', 'utf-8');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('UTF-16 test');
    });

    it('should not leave temp files after successful write', () => {
      const filePath = path.join(projectDir, 'clean.txt');
      AtomicWriteOperation.write(filePath, 'content');
      const dir = path.dirname(filePath);
      const files = fs.readdirSync(dir);
      const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  // ── ScopeValidator ─────────────────────────────────────────────────────

  describe('ScopeValidator', () => {
    it('should allow paths within the project root', () => {
      const sv = new ScopeValidator({ projectRoot: projectDir });
      expect(sv.validate(path.join(projectDir, 'src', 'app.ts')).allowed).toBe(true);
      expect(sv.validate(projectDir).allowed).toBe(true);
    });

    it('should reject paths outside the project root', () => {
      const sv = new ScopeValidator({ projectRoot: projectDir });
      const result = sv.validate('/etc/passwd');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('outside project root');
    });

    it('should reject paths in deniedPaths', () => {
      const sv = new ScopeValidator({
        projectRoot: projectDir,
        deniedPaths: ['secret', 'private'],
      });
      const result = sv.validate(path.join(projectDir, 'secret', 'keys.txt'));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied path');
    });

    it('should reject paths matching deniedPatterns', () => {
      const sv = new ScopeValidator({
        projectRoot: projectDir,
        deniedPatterns: ['*.env', '*.secret'],
      });
      expect(sv.validate(path.join(projectDir, '.env')).allowed).toBe(false);
      expect(sv.validate(path.join(projectDir, 'config.secret')).allowed).toBe(false);
    });

    it('should reject hidden files and directories by default', () => {
      const sv = new ScopeValidator({ projectRoot: projectDir });
      expect(sv.validate(path.join(projectDir, '.hidden', 'file.ts')).allowed).toBe(false);
      expect(sv.validate(path.join(projectDir, 'src', '.gitignore')).allowed).toBe(false);
    });

    it('should allow hidden files when allowHidden is true', () => {
      const sv = new ScopeValidator({ projectRoot: projectDir, allowHidden: true });
      expect(sv.validate(path.join(projectDir, '.env')).allowed).toBe(true);
      expect(sv.validate(path.join(projectDir, '.github', 'workflows')).allowed).toBe(true);
    });

    it('should allow paths explicitly in allowedPaths', () => {
      const sv = new ScopeValidator({
        projectRoot: projectDir,
        deniedPaths: ['secret'],
        allowedPaths: ['secret/allowed'],
      });
      // deniedPaths takes precedence over the absence in allowedPaths
      const result = sv.validate(path.join(projectDir, 'secret', 'allowed', 'ok.txt'));
      expect(result.allowed).toBe(false);
    });
  });

  // ── DeletionConfirmProtocol ────────────────────────────────────────────

  describe('DeletionConfirmProtocol', () => {
    const testRecord: FileOperationRecord = {
      id: 'del-1', type: FileOperationType.Delete, timestamp: new Date(),
      filePath: '/test/file.ts', checksum: '', success: true,
    };

    it('should default to rejecting deletions (fail-safe)', async () => {
      const protocol = new DeletionConfirmProtocol();
      expect(await protocol.confirm('/test/file.ts', testRecord)).toBe(false);
    });

    it('should accept with a custom handler that returns true', async () => {
      const protocol = new DeletionConfirmProtocol((_fp, _rec) => true);
      expect(await protocol.confirm('/test/file.ts', testRecord)).toBe(true);
    });

    it('should setHandler replace the default handler', async () => {
      const protocol = new DeletionConfirmProtocol();
      protocol.setHandler((_fp, _rec) => true);
      expect(await protocol.confirm('/test/file.ts', testRecord)).toBe(true);
    });

    it('should setHandler to rejecting handler', async () => {
      const protocol = new DeletionConfirmProtocol((_fp, _rec) => true);
      protocol.setHandler((_fp, _rec) => false);
      expect(await protocol.confirm('/test/file.ts', testRecord)).toBe(false);
    });

    it('should support async confirmation handlers', async () => {
      const protocol = new DeletionConfirmProtocol(async (_fp, _rec) => {
        return Promise.resolve(true);
      });
      expect(await protocol.confirm('/test/file.ts', testRecord)).toBe(true);
    });
  });

  // ── RollbackManager ────────────────────────────────────────────────────

  describe('RollbackManager', () => {
    it('should rollback a write operation to original content', async () => {
      const logger = new ChangeLogger(logDir);
      const bm = new BackupManager(backupDir);
      const rm = new RollbackManager(logger, bm);

      const filePath = path.join(projectDir, 'rollback.txt');
      fs.writeFileSync(filePath, 'original');
      const backupPath = bm.createBackup(filePath);

      // Simulate writing new content
      fs.writeFileSync(filePath, 'modified');
      logger.log({
        id: 'rb-1', type: FileOperationType.Write, timestamp: new Date(),
        filePath, previousContent: 'original', backupPath: backupPath ?? undefined,
        checksum: 'new', success: true,
      });

      const rolledBack = await rm.rollback(1);
      expect(rolledBack).toBe(1);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
    });

    it('should rollback a create operation by deleting the file', async () => {
      const logger = new ChangeLogger(logDir);
      const bm = new BackupManager(backupDir);
      const rm = new RollbackManager(logger, bm);

      const filePath = path.join(projectDir, 'created.txt');
      fs.writeFileSync(filePath, 'newly created');

      logger.log({
        id: 'rb-2', type: FileOperationType.Create, timestamp: new Date(),
        filePath, checksum: 'c', success: true,
      });

      const rolledBack = await rm.rollback(1);
      expect(rolledBack).toBe(1);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should rollback a rename operation by reversing the rename', async () => {
      const logger = new ChangeLogger(logDir);
      const bm = new BackupManager(backupDir);
      const rm = new RollbackManager(logger, bm);

      const oldPath = path.join(projectDir, 'old-name.txt');
      const newPath = path.join(projectDir, 'new-name.txt');
      fs.writeFileSync(oldPath, 'content');

      // Perform the rename
      fs.renameSync(oldPath, newPath);
      logger.log({
        id: 'rb-3', type: FileOperationType.Rename, timestamp: new Date(),
        filePath: oldPath, destinationPath: newPath, checksum: 'c', success: true,
      });

      const rolledBack = await rm.rollback(1);
      expect(rolledBack).toBe(1);
      expect(fs.existsSync(oldPath)).toBe(true);
      expect(fs.existsSync(newPath)).toBe(false);
    });

    it('should rollbackById find and revert a specific operation', () => {
      const logger = new ChangeLogger(logDir);
      const bm = new BackupManager(backupDir);
      const rm = new RollbackManager(logger, bm);

      const filePath = path.join(projectDir, 'specific.txt');
      fs.writeFileSync(filePath, 'before');
      const backupPath = bm.createBackup(filePath);
      fs.writeFileSync(filePath, 'after');

      logger.log({
        id: 'rb-specific', type: FileOperationType.Write, timestamp: new Date(),
        filePath, previousContent: 'before', backupPath: backupPath ?? undefined,
        checksum: 'after', success: true,
      });

      const result = rm.rollbackById('rb-specific');
      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('before');
    });

    it('should return false when rollbackById finds no matching record', () => {
      const logger = new ChangeLogger(logDir);
      const bm = new BackupManager(backupDir);
      const rm = new RollbackManager(logger, bm);
      expect(rm.rollbackById('nonexistent')).toBe(false);
    });
  });

  // ── FileSafetyGuard ───────────────────────────────────────────────────

  describe('FileSafetyGuard', () => {
    function createGuard(): FileSafetyGuard {
      return new FileSafetyGuard(
        { projectRoot: projectDir },
        logDir,
        backupDir,
      );
    }

    it('should create files with writeFile', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const filePath = path.join(projectDir, 'new-file.ts');
      const result = await guard.writeFile(filePath, 'export const x = 42;');
      expect(result.success).toBe(true);
      expect(result.operationId).toMatch(/^op-/);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('export const x = 42;');
    });

    it('should reject writeFile for paths outside scope', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const result = await guard.writeFile('/etc/evil.ts', 'hack');
      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project root');
    });

    it('should create a backup when writing to an existing file', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const filePath = path.join(projectDir, 'existing.txt');
      fs.writeFileSync(filePath, 'original');
      const result = await guard.writeFile(filePath, 'updated');
      expect(result.success).toBe(true);
      const backups = guard.backups.listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject deleteFile without explicit confirmation', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const filePath = path.join(projectDir, 'delete-me.txt');
      fs.writeFileSync(filePath, 'content');
      const result = await guard.deleteFile(filePath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not confirmed');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should deleteFile when confirmation handler approves', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      guard.setDeletionHandler((_fp, _rec) => true);
      const filePath = path.join(projectDir, 'ok-to-delete.txt');
      fs.writeFileSync(filePath, 'doomed');
      const result = await guard.deleteFile(filePath);
      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should reject deleteFile for non-existent file', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const result = await guard.deleteFile(path.join(projectDir, 'ghost.txt'));
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should reject deleteFile for path outside scope', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const result = await guard.deleteFile('/tmp/outside.txt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project root');
    });

    it('should renameFile successfully for valid paths', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const oldPath = path.join(projectDir, 'original.txt');
      const newPath = path.join(projectDir, 'renamed.txt');
      fs.writeFileSync(oldPath, 'content');
      const result = await guard.renameFile(oldPath, newPath);
      expect(result.success).toBe(true);
      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(oldPath)).toBe(false);
    });

    it('should reject renameFile for non-existent source', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const result = await guard.renameFile(
        path.join(projectDir, 'nonexistent.txt'),
        path.join(projectDir, 'target.txt'),
      );
      expect(result.success).toBe(false);
    });

    it('should expose logger, backups, and rollback accessors', () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      expect(guard.logger).toBeInstanceOf(ChangeLogger);
      expect(guard.backups).toBeInstanceOf(BackupManager);
      expect(guard.rollback).toBeInstanceOf(RollbackManager);
    });

    it('should log every operation to the change logger', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      await guard.writeFile(path.join(projectDir, 'a.ts'), 'a');
      await guard.writeFile(path.join(projectDir, 'b.ts'), 'b');
      expect(guard.logger.count).toBe(2);
    });

    it('should reject operations on hidden files by default', async () => {
      const guard = new FileSafetyGuard({ projectRoot: projectDir }, logDir, backupDir);
      const result = await guard.writeFile(path.join(projectDir, '.hidden', 'x'), 'data');
      expect(result.success).toBe(false);
      expect(result.error).toContain('hidden');
    });
  });
});
