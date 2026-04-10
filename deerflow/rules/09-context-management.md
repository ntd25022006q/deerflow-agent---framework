# Deerflow Agent Framework — 09: Context Management

> **Status:** Core Rule
> **Priority:** P2 (Operational — Essential for multi-step task completion)
> **Applies to:** All context tracking, state management, and session continuity

---

## 1. Overview

Deerflow agents operate within a limited context window. Effective context
management is the difference between an agent that can complete complex, multi-step
tasks and one that loses track of its objectives midway. This rule defines how
agents must manage, preserve, and transfer context throughout a session and across
sessions.

---

## 2. Maintain deerflow/context.md

### 2.1 Rules

- **RULE 2.1.1** — The file `deerflow/context.md` is the single source of truth
  for the current session's state. It must be created at the start of every
  session and maintained throughout.
- **RULE 2.1.2** — The context file must be updated after every significant action
  (file modification, test run, build execution, error encountered).
- **RULE 2.1.3** — The context file must contain:
  - **Session ID** — Unique identifier for the session
  - **Started At** — Session start timestamp
  - **Current Task** — What the agent is currently working on
  - **User Intent** — The original user request
  - **Progress** — What has been completed so far
  - **Pending Items** — What remains to be done
  - **File Modifications** — List of all files modified in this session
  - **Errors Encountered** — Any errors and their resolutions
  - **Decisions Made** — Architectural and implementation decisions

### 2.2 Context File Template

```markdown
# Session Context

## Session Info
- **Session ID:** dfs-20250115-001
- **Started At:** 2025-01-15T10:00:00Z
- **Last Updated:** 2025-01-15T10:45:00Z

## User Intent
> "Add user authentication with JWT tokens and refresh token rotation to the API"

## Current Task
Implementing refresh token rotation in `src/auth/token.service.ts`

## Progress
- [x] Install JWT dependencies (jsonwebtoken, bcrypt)
- [x] Create User model with password hashing
- [x] Implement login endpoint with JWT generation
- [ ] Implement refresh token rotation (IN PROGRESS)
- [ ] Add token revocation middleware
- [ ] Write unit tests for auth service
- [ ] Update API documentation

## File Modifications
| File | Operation | Timestamp |
|------|-----------|-----------|
| src/auth/token.service.ts | CREATED | 10:15:00 |
| src/auth/auth.controller.ts | CREATED | 10:20:00 |
| src/models/user.model.ts | CREATED | 10:05:00 |
| package.json | MODIFIED | 10:02:00 |

## Errors Encountered
| Error | Resolution | Timestamp |
|-------|------------|-----------|
| TypeScript error: missing return type | Added explicit return type | 10:18:00 |

## Decisions Made
- Using bcrypt for password hashing (cost factor: 12)
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
```

---

## 3. Track Current Task State

### 3.1 Rules

- **RULE 3.1.1** — The agent must always know what it is currently working on.
  This must be explicitly stated in the context file.
- **RULE 3.1.2** — When the current task is completed, update the context file
  and move to the next task.
- **RULE 3.1.3** — If the agent encounters a blocking issue, it must pause the
  current task, document the blocker in the context file, and either:
  - Ask the user for guidance
  - Work on a different task from the pending list
  - Propose a workaround
- **RULE 3.1.4** — The current task must include enough context for the agent
  to resume if the session is interrupted.

### 3.2 Task State Machine

```text
States:
  PENDING     → Task is queued, not yet started
  IN_PROGRESS → Task is actively being worked on
  BLOCKED     → Task is waiting on a dependency or user input
  COMPLETED   → Task is finished and verified
  FAILED      → Task encountered an unrecoverable error

Transitions:
  PENDING → IN_PROGRESS  (start working)
  IN_PROGRESS → COMPLETED  (finish and verify)
  IN_PROGRESS → BLOCKED    (encounter blocker)
  BLOCKED → IN_PROGRESS    (blocker resolved)
  IN_PROGRESS → FAILED     (unrecoverable error)
```

---

## 4. Log All File Modifications

### 4.1 Rules

- **RULE 4.1.1** — Every file modification must be logged in the context file with:
  - File path (relative to project root)
  - Operation type (CREATED, MODIFIED, DELETED, RENAMED, MOVED)
  - Timestamp
  - Brief description of the change
- **RULE 4.1.2** — File modifications must be logged immediately after the
  operation, not deferred to the end of the session.
- **RULE 4.1.3** — The log must be append-only. Previous entries must not be
  modified.
- **RULE 4.1.4** — At the end of the session, provide a summary of all file
  modifications to the user.

---

## 5. Token Usage Monitoring

### 5.1 Rules

- **RULE 5.1.1** — The agent must monitor its token usage and proactively manage
  context before it becomes a constraint.
- **RULE 5.1.2** — When approaching 80% context utilization, the agent must:
  1. Summarize non-essential information.
  2. Compress tool outputs (keep conclusions, discard raw data).
  3. Consider checkpointing and starting a new context if needed.
- **RULE 5.1.3** — Critical information (user intent, architectural decisions,
  security constraints) must never be discarded to save context space.
- **RULE 5.1.4** — The agent should prefer reading files on-demand rather than
  loading large file contents into context preemptively.

### 5.2 Context Utilization Thresholds

```text
0-60%:    Normal operation. No special action needed.
60-80%:   Caution. Start compressing non-essential information.
80-90%:   Warning. Summarize aggressively. Checkpoint if possible.
90-100%:  Critical. Create checkpoint immediately. Prepare for context overflow.
```

---

## 6. Checkpoint at 80% Context

### 6.1 Rules

- **RULE 6.1.1** — When context utilization reaches 80%, the agent must create a
  checkpoint.
- **RULE 6.1.2** — A checkpoint consists of:
  1. Updating `deerflow/context.md` with the current state.
  2. Summarizing all completed tasks.
  3. Listing all pending tasks with enough detail to resume.
  4. Documenting all file modifications.
  5. Noting any important context that must not be lost.
- **RULE 6.1.3** — The checkpoint must contain enough information for a fresh
  agent instance to continue the work without losing progress.
- **RULE 6.1.4** — After creating a checkpoint, the agent should notify the user
  and offer to continue or pause.

### 6.3 Checkpoint Example

```markdown
## CHECKPOINT — 2025-01-15T10:45:00Z
Context utilization: 82%

### Summary of Completed Work
1. Installed JWT dependencies (jsonwebtoken, bcrypt)
2. Created User model with password hashing (cost factor 12)
3. Implemented login endpoint with JWT generation (15min access, 7d refresh)
4. Started refresh token rotation implementation

### Remaining Work
1. Complete refresh token rotation in token.service.ts
   - Add token revocation to denylist
   - Issue new token pair on rotation
   - Validate old token before rotation
2. Add auth middleware to protected routes
3. Write unit tests (target: 90% coverage on auth service)
4. Update OpenAPI documentation

### Critical Context (Do Not Discard)
- JWT_SECRET must be loaded from env (NOT hardcoded)
- bcrypt cost factor is 12 (security requirement)
- Refresh tokens must be stored in HTTP-only cookies
- Token denylist uses Redis with TTL matching token expiry
```

---

## 7. Cross-Session State Transfer

### 7.1 Rules

- **RULE 7.1.1** — When a session ends (context overflow, user pause, timeout),
  the agent must ensure the context file is up-to-date and contains enough
  information for the next session to continue.
- **RULE 7.1.2** — The next session must read the context file before starting
  any new work.
- **RULE 7.1.3** — If the context file exists, the agent should ask the user
  whether to continue the previous session or start a new one.
- **RULE 7.1.4** — Context files from completed sessions should be archived
  (moved to `deerflow/archive/`) after a reasonable period.

### 7.2 Session Handoff Protocol

```text
End of Session (Current Agent):
  1. Save current state to deerflow/context.md
  2. Summarize completed and pending work
  3. List all file modifications
  4. Note any critical context
  5. Confirm the context file is saved

Start of Session (New Agent):
  1. Check for existing deerflow/context.md
  2. If found, read and understand the previous session state
  3. Ask user: "Continue previous session or start fresh?"
  4. If continuing, resume from the last checkpoint
  5. If starting fresh, archive the old context file
```

---

## 8. Priority-Based Context Retention

### 8.1 Rules

- **RULE 8.1.1** — When context space is limited, information must be retained
  based on priority. Higher priority information is kept, lower priority
  information is compressed or discarded.
- **RULE 8.1.2** — The priority hierarchy for context retention:

```text
Priority 1 — NEVER DISCARD (Preserve at all costs):
  • User's original intent and current request
  • Security constraints and requirements
  • Architectural decisions and their rationale
  • Current task state and what needs to happen next

Priority 2 — PRESERVE IF POSSIBLE (Compress if needed):
  • File modification history
  • Error logs and resolutions
  • Test results and coverage data
  • Build output summaries

Priority 3 — SUMMARIZE (Compress aggressively):
  • File contents already processed (keep conclusions, discard raw content)
  • Tool outputs (keep relevant parts, discard verbose output)
  • Intermediate calculations and reasoning steps

Priority 4 — SAFE TO DISCARD (First to go when space is needed):
  • Redundant information
  • Completed sub-task details (beyond the summary)
  • Verbose error stacks (keep the error type and message)
  • Full file reads that have already been acted upon
```

---

## 9. Summary

Effective context management is what enables an agent to complete complex,
multi-step tasks reliably. By maintaining a persistent context file, tracking
modifications, monitoring token usage, and creating checkpoints, the agent can
operate within its limits while making consistent progress toward the user's goals.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-009*
