# Deerflow Agent Framework — 01: File Safety Operations

> **Status:** Core Rule
> **Priority:** P1 (High — File operations are irreversible)
> **Applies to:** All file read, write, modify, delete, and move operations

---

## 1. Overview

File operations are among the most consequential actions an agent can take. A single
incorrect file modification or deletion can cause cascading failures that are
difficult or impossible to recover from. This rule establishes strict safety
protocols for all file operations to prevent data loss, corruption, and unintended
side effects.

---

## 2. Never Delete Without Explicit User Confirmation

### 2.1 Principle

Deletion is permanent in most version control workflows and absolutely permanent on
the filesystem level. An agent must never delete a file, directory, or significant
portion of a file without the user's explicit, informed consent.

### 2.2 Rules

- **RULE 2.2.1** — Before deleting any file, the agent must:
  1. Inform the user which file(s) will be deleted.
  2. Explain why deletion is necessary.
  3. Describe what the consequences of deletion will be.
  4. Wait for explicit user confirmation (e.g., "yes," "delete it," "go ahead").

- **RULE 2.2.2** — The agent must never batch-delete files as part of a refactoring
  without listing every file that will be affected and getting confirmation for the
  complete list.

- **RULE 2.2.3** — "Implicit confirmation" (e.g., the user asked to "clean up unused
  files") is NOT sufficient. The agent must still list the specific files and get
  confirmation.

- **RULE 2.2.4** — If a file is tracked by git, suggest `git rm` instead of direct
  filesystem deletion to preserve version control history.

- **RULE 2.2.5** — Before deleting a directory, list all files recursively and confirm
  the user understands the full scope of the deletion.

- **RULE 2.2.6** — Never delete files matching patterns like `*`, `**/*`, or any
  wildcard pattern without explicit file-by-file confirmation.

### 2.3 Examples

```text
DO:   "I found 5 unused imports across 3 files. Here they are:
      - src/utils.ts: unused import 'lodash'
      - src/api.ts: unused imports 'axios', 'moment'
      - src/components.ts: unused imports 'react-router', 'classnames'
      Shall I remove all 5 unused imports?"

DON'T: "I'll clean up all unused imports across the project." (proceeds without listing)
```

```text
DO:   "The file src/legacy/auth-old.ts appears to be replaced by src/auth/index.ts.
      Deleting it will remove 240 lines of code. Shall I proceed?"

DON'T: "I'll remove the old auth file since it's not imported anywhere." (deletes immediately)
```

---

## 3. Always Create Backup Before Modification

### 3.1 Principle

Any modification to an existing file carries risk. Creating a backup ensures that
the original state can be restored if the modification causes problems.

### 3.2 Rules

- **RULE 3.2.1** — Before modifying any file, create a backup copy. The backup must
  be stored in a predictable location (see Section 3.3).

- **RULE 3.2.2** — The backup must be a complete copy of the original file, not a
  diff, patch, or partial copy.

- **RULE 3.2.3** — If the project is under version control (git), commit the current
  state before making significant modifications. This serves as the backup.

- **RULE 3.2.4** — For non-version-controlled files, create a backup with a clear
  naming convention (see Section 7).

- **RULE 3.2.5** — Backups must be cleaned up after successful modification and
  verification. Stale backups clutter the project.

- **RULE 3.2.6** — If a modification fails (compilation error, test failure), offer
  to restore the backup immediately.

### 3.3 Backup Location Convention

```text
For version-controlled projects:
  → Use git commits as backups (preferred)
  → Example: git commit -am "backup: before refactoring auth module"

For non-version-controlled projects:
  → Use .deerflow/backups/<timestamp>/<original-path>
  → Example: .deerflow/backups/2025-01-15T10-30-00/src/auth.ts
```

### 3.4 Backup Lifecycle

```text
1. CREATE  — Before modification
2. MODIFY  — Apply changes to original file
3. VERIFY  — Confirm changes compile and tests pass
4. CLEANUP — Remove backup if verification succeeds
5. RESTORE — If verification fails, restore from backup
```

---

## 4. Atomic Write Operations

### 4.1 Principle

File writes must be atomic — they must either complete entirely or not at all. A
partial write (e.g., due to a crash or interruption) must not leave the file in an
inconsistent state.

### 4.2 Rules

- **RULE 4.2.1** — When writing a file, write the complete content in a single
  operation. Never write a file in multiple sequential appends unless the format
  specifically requires it (e.g., log files).

- **RULE 4.2.2** — For critical files (configuration, database schemas, build
  scripts), use a write-then-rename strategy:
  1. Write to a temporary file (e.g., `filename.tmp`).
  2. Verify the temporary file is valid.
  3. Rename the temporary file to the target filename.

- **RULE 4.2.3** — Never leave partially written files in the project directory.
  If a write is interrupted, clean up the partial file.

- **RULE 4.2.4** — When modifying a file, ensure the entire modified content is
  valid before writing. Do not write "half-finished" content and plan to complete
  it in a subsequent step.

- **RULE 4.2.5** — Verify file encoding (UTF-8 by default) is preserved during
  writes.

### 4.3 Examples

```text
DO:   Write the complete modified file in a single Write tool invocation.
DON'T: Write the first half of a file, then write the second half separately.
```

```text
DO:   For config files, write to config.tmp first, verify, then rename.
DON'T: Directly overwrite config.json — if the write fails mid-way, the config is corrupted.
```

---

## 5. Project Scope Boundaries

### 5.1 Principle

An agent must operate strictly within the boundaries of the project it was assigned
to work on. Accessing, modifying, or reading files outside the project scope is
prohibited unless explicitly authorized by the user.

### 5.2 Rules

- **RULE 5.2.1** — Identify the project root directory at the start of each session
  (look for `package.json`, `.git/`, or other project markers).

- **RULE 5.2.2** — Never read or modify files outside the project root unless
  explicitly asked by the user.

- **RULE 5.2.3** — When working with monorepos, respect package boundaries. Do not
  modify files in one package as a side effect of working on another package.

- **RULE 5.2.4** — Never modify system files (`/etc/`, `~/.bashrc`, etc.) unless
  explicitly asked and the implications are clearly explained.

- **RULE 5.2.5** — Never access or modify other users' files or projects.

- **RULE 5.2.6** — Before accessing `node_modules/`, `.git/`, or other generated
  directories, consider whether the information is available from a cleaner source
  (e.g., `package.json` instead of reading `node_modules/`).

- **RULE 5.2.7** — When the user asks to work on a specific file or directory,
  confirm the path is within the project scope before proceeding.

### 5.3 Scope Detection

```text
Project Root Indicators (in order of priority):
  1. Explicit user specification
  2. `.git/` directory presence
  3. `package.json` presence
  4. `Cargo.toml` / `pyproject.toml` / `go.mod` presence
  5. Nearest parent directory with a known project marker
```

---

## 6. Audit Trail Requirements

### 6.1 Principle

Every file operation must be logged to maintain a complete audit trail. This enables
accountability, debugging, and rollback.

### 6.2 Rules

- **RULE 6.2.1** — Log every file read, write, modify, delete, and move operation
  with:
  - Timestamp (ISO 8601 format)
  - File path (relative to project root)
  - Operation type (READ, WRITE, MODIFY, DELETE, MOVE)
  - Agent identifier
  - Reason for the operation
  - Result (SUCCESS, FAILURE, SKIPPED)

- **RULE 6.2.2** — The audit trail must be stored in `deerflow/audit-log.md` or
  appended to `deerflow/context.md`.

- **RULE 6.2.3** — The audit trail must never be modified after the fact. Only
  append operations are allowed.

- **RULE 6.2.4** — At the end of each session, summarize the audit trail:
  - Total files modified
  - Total files created
  - Total files deleted
  - Total files read

### 6.3 Audit Log Entry Format

```markdown
### [2025-01-15T10:30:00Z] MODIFY — src/auth/service.ts
- **Agent:** deerflow-agent
- **Reason:** Add refresh token rotation logic
- **Changes:** Added `rotateRefreshToken()` method (45 lines)
- **Result:** SUCCESS
- **Backup:** .deerflow/backups/2025-01-15T10-30-00/src/auth/service.ts
```

---

## 7. Recovery Procedures

### 7.1 Principle

When file operations fail or produce unexpected results, the agent must have a
clear recovery procedure to restore the system to a known-good state.

### 7.2 Rules

- **RULE 7.2.1** — If a file modification causes a compilation error, the agent
  must immediately:
  1. Identify the error.
  2. Restore the file from backup (if available).
  3. Analyze what went wrong.
  4. Propose a corrected approach.

- **RULE 7.2.2** — If a file modification causes a test failure, the agent must:
  1. Identify which tests failed.
  2. Determine if the tests need updating or the code needs fixing.
  3. If the code is wrong, restore from backup and retry.
  4. If the tests need updating, explain why.

- **RULE 7.2.3** — If a file is accidentally deleted, attempt recovery in this order:
  1. Restore from `.deerflow/backups/` (if backup exists).
  2. Restore from git (`git checkout <file>`) (if version-controlled).
  3. Inform the user that recovery is not possible and apologize.

- **RULE 7.2.4** — Never silently recover from an error. Always inform the user
  about what went wrong and what was done to fix it.

- **RULE 7.2.5** — After recovery, verify the system is in a valid state by running
  compilation and tests.

### 7.3 Recovery Priority Order

```text
1. Restore from explicit backup (.deerflow/backups/)
2. Restore from version control (git checkout, git revert)
3. Reconstruct from audit trail + context
4. Manual reconstruction (last resort)
5. User notification if recovery is impossible
```

---

## 8. File Naming Conventions

### 8.1 Principle

Consistent file naming prevents conflicts, improves searchability, and reduces
cognitive overhead when navigating a project.

### 8.2 Rules

- **RULE 8.2.1** — Use kebab-case for file names: `user-auth-service.ts`,
  `api-response-handler.ts`.

- **RULE 8.2.2** — Use descriptive names that clearly indicate the file's purpose.
  Avoid abbreviations unless they are universally understood (e.g., `util`, `config`).

- **RULE 8.2.3** — Index files (`index.ts`, `index.tsx`) should only re-export from
  sibling modules. They should not contain implementation logic.

- **RULE 8.2.4** — Test files should mirror the source file name with a `.test.` or
  `.spec.` suffix: `user-auth-service.test.ts`.

- **RULE 8.2.5** — Type definition files should use the `.types.ts` or `.d.ts`
  suffix.

- **RULE 8.2.6** — Configuration files should be named after what they configure:
  `eslint.config.js`, `tailwind.config.ts`, `jest.config.ts`.

- **RULE 8.2.7** — Never use spaces, special characters, or uppercase letters in
  file names.

### 8.3 Naming Patterns

```text
Component:      button.tsx, user-profile-card.tsx
Service:        user-auth-service.ts, payment-processor.ts
Utility:        format-date.ts, validate-email.ts
Type:           user.types.ts, api-response.types.ts
Test:           user-auth-service.test.ts
Config:         database.config.ts, app.config.ts
Hook:           use-auth.ts, use-debounce.ts
Store:          auth-store.ts, cart-store.ts
```

---

## 9. Directory Structure Preservation

### 9.1 Principle

The existing directory structure of a project reflects architectural decisions that
may not be immediately obvious. Agents must respect and preserve the existing
structure unless explicitly asked to reorganize.

### 9.2 Rules

- **RULE 9.2.1** — Before creating a new file, check if there is an existing
  directory where it logically belongs. Place it there.

- **RULE 9.2.2** — Follow the existing directory pattern. If the project uses
  `src/modules/<module-name>/`, do not create `src/features/<feature-name>/`.

- **RULE 9.2.3** — Never create deeply nested directories (more than 5 levels)
  without a clear justification.

- **RULE 9.2.4** — If a directory becomes too large (more than 15 files), suggest
  splitting it, but do not reorganize without user confirmation.

- **RULE 9.2.5** — Never move or rename directories as a side effect of other
  changes. Directory moves affect every import in the project and are high-risk.

- **RULE 9.2.6** — When adding files to an existing directory, match the existing
  naming convention even if it differs from the agent's preference.

### 9.3 Common Directory Patterns

```text
Feature-based:
  src/features/auth/
    components/
    hooks/
    services/
    types/
    tests/

Layer-based:
  src/controllers/
  src/services/
  src/repositories/
  src/models/
  src/middleware/

Module-based:
  src/modules/user/
    user.controller.ts
    user.service.ts
    user.model.ts
    user.routes.ts
```

---

## 10. File Content Safety

### 10.1 Principle

The content of files must be handled with care to prevent data corruption, encoding
issues, and unintended modifications.

### 10.2 Rules

- **RULE 10.2.1** — Always read a file before modifying it. Never assume file
  contents based on the filename or prior knowledge.

- **RULE 10.2.2** — Preserve the file's original encoding (typically UTF-8).
  Never change encoding as a side effect of modification.

- **RULE 10.2.3** — Preserve the file's line ending style (LF or CRLF). Detect it
  from the original file and maintain it.

- **RULE 10.2.4** — Preserve trailing newlines. Most text files should end with a
  single newline character.

- **RULE 10.2.5** — When modifying only part of a file, preserve the rest of the
  file exactly as-is, including whitespace, indentation, and comments.

- **RULE 10.2.6** — Never modify binary files (images, fonts, compiled artifacts).
  Only modify text-based files.

- **RULE 10.2.7** — Be cautious with auto-generated files (e.g., `*.generated.ts`,
  `*.lock.json`). Understand the generation process before modifying.

### 10.3 File Types and Safety Levels

| Safety Level | File Type | Modification Risk |
|-------------|-----------|-------------------|
| **Critical** | Database schemas, migration files | Data loss |
| **High** | Config files, build scripts | Build breakage |
| **Medium** | Source code, test files | Bugs, test failures |
| **Low** | Documentation, README | Typographical errors |
| **No Touch** | Binary files, lock files, generated files | Corruption |

---

## 11. Batch Operations

### 11.1 Principle

When performing multiple file operations, batch them logically and ensure each
operation in the batch is verified before proceeding to the next.

### 11.2 Rules

- **RULE 11.2.1** — When modifying multiple files as part of a single task, plan
  all modifications before executing any of them.

- **RULE 11.2.2** — Execute batch modifications in dependency order: modify
  shared types first, then consumers of those types.

- **RULE 11.2.3** — After each file modification in a batch, verify it compiles
  before moving to the next file. This limits the blast radius of errors.

- **RULE 11.2.4** — If any file modification in a batch fails, halt the batch,
  assess the situation, and decide whether to continue or roll back.

- **RULE 11.2.5** — Never modify more than 20 files in a single batch without
  user checkpointing.

- **RULE 11.2.6** — After a batch is complete, run the full test suite to verify
  all changes work together.

---

## 12. Summary

File safety is the foundation of reliable agent behavior. Every file operation
carries risk, and these rules exist to minimize that risk while enabling productive
work. The key principles are: confirm before deleting, backup before modifying,
write atomically, stay within scope, log everything, and always have a recovery plan.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-001*
