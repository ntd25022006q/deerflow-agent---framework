# Deerflow Task Lifecycle Management

> **Complete Task Lifecycle for Agent Orchestration**
> This document defines how tasks are created, assigned, tracked, completed,
> and archived within the Deerflow Agent Framework. Every agent interaction
> with a user request follows this lifecycle.

---

## Table of Contents

1. [Overview](#overview)
2. [Task Creation and Assignment](#task-creation-and-assignment)
3. [Task State Machine](#task-state-machine)
4. [Task Priority System](#task-priority-system)
5. [Task Dependency Graph](#task-dependency-graph)
6. [Task Estimation and Time Tracking](#task-estimation-and-time-tracking)
7. [Task Handoff Protocol](#task-handoff-protocol)
8. [Task Completion Verification](#task-completion-verification)
9. [Task Rollback Procedures](#task-rollback-procedures)
10. [Task Metadata Schema](#task-metadata-schema)

---

## Overview

Every piece of work in the Deerflow framework is tracked as a **task**. Tasks are the
fundamental unit of work that flows through the agentic workflow. Proper lifecycle
management ensures accountability, traceability, and efficient agent coordination.

### Task Lifecycle Summary

```
                    ┌──────────┐
         ┌────────▶│ PENDING  │◀────────┐
         │         └────┬─────┘         │
         │              │               │
         │              ▼               │
         │      ┌──────────────┐        │
         │      │ IN_PROGRESS  │        │
         │      └──┬──────┬───┘        │
         │         │      │            │
         │         │      ▼            │
         │         │ ┌──────────┐      │
         │         │ │ BLOCKED  │      │
         │         │ └────┬─────┘      │
         │         │      │            │
         │         ▼      │            │
         │    ┌────────┐  │            │
         │    │ REVIEW │  │            │
         │    └──┬──┬──┘  │            │
         │       │  │     │            │
         │       │  ▼     │            │
         │       │ ┌──────────┐        │
         │       │ │REJECTED  │────────┘
         │       │ └──────────┘
         │       ▼
         │ ┌───────────┐
         │ │ COMPLETED │
         │ └─────┬─────┘
         │       │
         │       ▼
         │ ┌───────────┐
         └─│ ARCHIVED  │
           └───────────┘
```

---

## Task Creation and Assignment

### Task Creation Triggers

Tasks can be created from multiple sources:

1. **User Request**: Direct user interaction creates a new task.
2. **Subtask Decomposition**: A parent task generates child tasks during Phase 2 (PLAN).
3. **Bug Report**: Automated or manual bug reports create fix tasks.
4. **Technical Debt**: Identified during code review creates improvement tasks.
5. **Dependency Update**: Security alerts or version updates create maintenance tasks.

### Task Creation Process

1. **Capture the raw request** in the user's own words.
2. **Classify the task type**:
   - `feature` — New functionality
   - `bugfix` — Fixing an existing defect
   - `refactor` — Code restructuring without behavior change
   - `docs` — Documentation changes
   - `chore` — Maintenance, configuration, tooling
   - `test` — Test additions or improvements
   - `security` — Security-related changes
   - `performance` — Performance optimization
3. **Assign initial priority** based on task type and urgency.
4. **Assign to an agent** based on:
   - Agent specialization (frontend, backend, DevOps, etc.)
   - Current workload (prefer least-loaded agent)
   - Skill match (agent must have required capabilities)
   - Priority constraints (P0 tasks go to senior agents first)
5. **Generate a unique task ID** using format: `TASK-{YYYYMMDD}-{SEQUENCE}`.
6. **Record creation metadata** (timestamp, creator, source).

### Task Assignment Rules

| Rule | Description |
|------|-------------|
| Single Owner | Every task has exactly one responsible agent at any time. |
| Capacity Limit | An agent may hold at most 3 concurrent P1/P2 tasks. |
| P0 Exclusivity | An agent working on a P0 task should hold no other tasks. |
| Specialization Match | Tasks should be assigned to agents with matching expertise. |
| Load Balancing | Distribute tasks evenly across capable agents. |
| Reassignment | Tasks may be reassigned only during PENDING or BLOCKED states. |

### Task Creation Template

```typescript
interface TaskCreation {
  id: string;                    // TASK-20250101-0001
  title: string;                 // Short, descriptive summary
  description: string;           // Detailed description
  type: TaskType;                // feature | bugfix | refactor | ...
  priority: TaskPriority;        // P0 | P1 | P2 | P3
  assignee: string;              // Agent identifier
  reporter: string;              // User or system that created the task
  labels: string[];              // Categorization tags
  dependencies: string[];        // Task IDs this depends on
  estimatedEffort: number;       // In minutes
  dueDate?: string;              // Optional deadline
  createdAt: string;             // ISO timestamp
  workflowPhase: WorkflowPhase;  // Current phase in agentic workflow
}
```

---

## Task State Machine

### State Definitions

#### PENDING
- **Description**: Task has been created but work has not started.
- **Entry**: Task is created.
- **Exit**: Agent begins work (→ IN_PROGRESS), task is cancelled (→ ARCHIVED).
- **Duration Limit**: P0: 15 min, P1: 1 hour, P2: 4 hours, P3: 24 hours.
- **Actions Allowed**: Edit description, change priority, add dependencies, assign agent.

#### IN_PROGRESS
- **Description**: An agent is actively working on the task.
- **Entry**: Agent begins Phase 1 (UNDERSTAND) of the agentic workflow.
- **Exit**: Work completes (→ REVIEW), blocked (→ BLOCKED), abandoned (→ PENDING).
- **Duration Limit**: Based on estimated effort × 2.0 (200% buffer).
- **Actions Allowed**: Update progress, add comments, log time, update subtasks.
- **Requirements**: Must track current workflow phase.

#### BLOCKED
- **Description**: Work cannot proceed due to an external dependency or blocker.
- **Entry**: An unresolvable blocker is identified during IN_PROGRESS.
- **Exit**: Blocker resolved (→ IN_PROGRESS), cancelled (→ PENDING).
- **Duration Limit**: P0: 30 min, P1: 2 hours, P2: 24 hours, P3: 72 hours.
- **Actions Allowed**: Document blocker, notify stakeholders, escalate.
- **Requirements**: Must document blocker reason and expected resolution time.

#### REVIEW
- **Description**: Implementation is complete; awaiting quality verification.
- **Entry**: All 7 phases of the agentic workflow are complete.
- **Exit**: Approved (→ COMPLETED), changes needed (→ IN_PROGRESS), rejected (→ PENDING).
- **Duration Limit**: P0: 15 min, P1: 30 min, P2: 2 hours, P3: 24 hours.
- **Actions Allowed**: Review checklist execution, request changes, approve.

#### REJECTED
- **Description**: Task was attempted but the approach was rejected.
- **Entry**: Review phase determines the approach is fundamentally flawed.
- **Exit**: Re-planned (→ PENDING), permanently closed (→ ARCHIVED).
- **Duration Limit**: 1 hour before must transition to PENDING or ARCHIVED.
- **Actions Allowed**: Document rejection reason, provide guidance for re-attempt.
- **Requirements**: Must include detailed rejection rationale.

#### COMPLETED
- **Description**: Task is fully done, deployed, and verified.
- **Entry**: Review phase approves the completed work.
- **Exit**: Archived after cooldown period (→ ARCHIVED).
- **Duration Limit**: 24 hours (auto-archive after cooldown).
- **Actions Allowed**: Final documentation, lessons learned, time summary.

#### ARCHIVED
- **Description**: Task is no longer active; retained for historical reference.
- **Entry**: Completed task cooldown, cancelled task, rejected task.
- **Exit**: None (terminal state).
- **Actions Allowed**: Read-only access for metrics and reporting.

### State Transition Rules

```typescript
const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  pending:    ['in_progress', 'archived'],
  in_progress: ['review', 'blocked', 'pending'],
  blocked:    ['in_progress', 'pending', 'archived'],
  review:     ['completed', 'in_progress', 'pending'],
  rejected:   ['pending', 'archived'],
  completed:  ['archived'],
  archived:   [],  // terminal state
};
```

### State Transition Logging

Every state transition MUST be logged with:

```typescript
interface StateTransition {
  taskId: string;
  from: TaskState;
  to: TaskState;
  timestamp: string;          // ISO 8601
  agent: string;              // Who initiated the transition
  reason: string;             // Human-readable justification
  workflowPhase?: WorkflowPhase;  // Phase at time of transition
  metadata?: Record<string, unknown>;
}
```

---

## Task Priority System

### Priority Levels

#### P0 — CRITICAL
- **Response Time**: Immediate (start within 0 minutes)
- **Definition**: Production is down, data loss, security breach, or complete user-facing outage.
- **Examples**: Production server crash, authentication bypass, data corruption, payment processing failure.
- **Assignment**: Senior agent with domain expertise. All other tasks preempted.
- **Escalation**: Immediate notification to all stakeholders.
- **SLA**: Resolution within 1 hour.

#### P1 — HIGH
- **Response Time**: Start within 15 minutes
- **Definition**: Major feature broken, significant performance degradation, or important deadline at risk.
- **Examples**: Critical feature regression, API latency exceeding SLA, broken user onboarding flow.
- **Assignment**: Experienced agent. May preempt P2/P3 tasks.
- **Escalation**: Notify team lead if not started within 15 minutes.
- **SLA**: Resolution within 4 hours.

#### P2 — MEDIUM
- **Response Time**: Start within 2 hours
- **Definition**: Non-critical feature issue, minor performance impact, or improvement with business value.
- **Examples**: UI glitch on secondary page, non-critical unit test failure, minor API inconsistency.
- **Assignment**: Any capable agent based on availability.
- **Escalation**: Review if not started within 4 hours.
- **SLA**: Resolution within 24 hours.

#### P3 — LOW
- **Response Time**: Start within 24 hours
- **Definition**: Nice-to-have improvements, cosmetic changes, or long-term technical debt.
- **Examples**: Code style improvements, README updates, dependency version bumps, refactoring.
- **Assignment**: Any agent; batch similar tasks for efficiency.
- **Escalation**: Review during weekly backlog grooming.
- **SLA**: Resolution within 1 week.

### Priority Assignment Matrix

| Factor                  | P0        | P1          | P2            | P3              |
|-------------------------|-----------|-------------|---------------|-----------------|
| Production Impact       | Critical  | Significant | Minor         | None            |
| User Affected           | All users | Many users  | Some users    | No users        |
| Data Risk               | Loss      | Corruption  | Inconsistency | None            |
| Security Risk           | Active    | Potential   | Low           | None            |
| Revenue Impact          | Blocking  | Delaying    | Minimal       | None            |
| Deadline Pressure       | Past due  | Today       | This sprint   | No deadline     |

### Priority Modification Rules
- Priority may only be **increased** by the task reporter or a senior agent.
- Priority may be **decreased** by any agent with documented justification.
- Priority changes must trigger a state re-evaluation.
- P0 tasks cannot be deprioritized without stakeholder approval.

---

## Task Dependency Graph

### Dependency Types

```typescript
enum DependencyType {
  BLOCKS = 'blocks',           // A must complete before B can start
  BLOCKED_BY = 'blocked_by',   // B is blocked by A (inverse of BLOCKS)
  RELATES_TO = 'relates_to',   // A and B share context but no ordering
  DUPLICATES = 'duplicates',   // A and B are the same task
  SUBTASK_OF = 'subtask_of',   // A is a child of B
  PART_OF = 'part_of',         // A contributes to B (epic relationship)
}
```

### Dependency Rules

1. **No Circular Dependencies**: The dependency graph must be a Directed Acyclic Graph (DAG).
   - Detect cycles before creating any dependency link.
   - Reject dependency creation if it would create a cycle.

2. **Blocker Propagation**: If task A BLOCKS task B, and task A is BLOCKED, then task B
   is transitively blocked.
   - Propagate blocker status through the dependency graph.
   - Notify all transitively blocked tasks when a blocker is resolved.

3. **Priority Inheritance**: If a P0 task depends on a P2 task, the P2 task is
   automatically elevated to P1.
   - Priority is elevated by one level, not directly to the dependent's level.
   - Original priority is preserved and restored when dependency is resolved.

4. **Deletion Protection**: A task cannot be deleted if other tasks depend on it.
   - Must reassign or remove dependencies before deletion.

5. **Completion Cascade**: When a task completes, all tasks BLOCKED by it are
   notified and their blockers are re-evaluated.

### Dependency Graph Operations

```typescript
interface DependencyGraph {
  // Add a dependency link between two tasks
  addDependency(from: string, to: string, type: DependencyType): void;

  // Remove a dependency link
  removeDependency(from: string, to: string): void;

  // Get all tasks that block a given task
  getBlockers(taskId: string): string[];

  // Get all tasks blocked by a given task
  getDependents(taskId: string): string[];

  // Detect circular dependencies
  detectCycles(): string[][];

  // Get topological ordering for execution
  getExecutionOrder(): string[];

  // Get critical path (longest dependency chain)
  getCriticalPath(): string[];

  // Check if a task is transitively blocked
  isTransitivelyBlocked(taskId: string): boolean;
}
```

### Subtask Management

1. **Subtask Creation**: During Phase 2 (PLAN), parent tasks may spawn subtasks.
2. **Subtask Limit**: A parent task may have at most 20 direct subtasks.
3. **Subtask Depth**: Maximum nesting depth is 3 levels (parent → child → grandchild).
4. **Subtask Completion**: Parent task cannot enter REVIEW until all subtasks are COMPLETED.
5. **Subtask Rollback**: If a subtask is rolled back, the parent task re-enters IN_PROGRESS.

---

## Task Estimation and Time Tracking

### Estimation Method

Tasks are estimated using a modified three-point estimation:

```
E = (O + 4M + P) / 6

Where:
  E = Expected effort
  O = Optimistic estimate (best case)
  M = Most likely estimate
  P = Pessimistic estimate (worst case)
```

### Estimation Categories

| Category    | Range         | Example                                |
|-------------|---------------|----------------------------------------|
| Trivial     | 5-15 min      | Typo fix, config change                |
| Small       | 15-60 min     | Bug fix, simple component              |
| Medium      | 1-4 hours     | Feature addition, moderate refactor    |
| Large       | 4-16 hours    | Multi-component feature, architecture  |
| Epic        | 16+ hours     | Major initiative (should be decomposed)|

### Time Tracking

1. **Phase-Level Tracking**: Record time spent in each of the 7 workflow phases.
2. **Interruption Tracking**: Log interruptions and context switches.
3. **Actual vs. Estimated**: Compare actual time to estimated time at task completion.
4. **Velocity Tracking**: Track completed tasks per agent per time period.

```typescript
interface TimeEntry {
  taskId: string;
  phase: WorkflowPhase;
  startTime: string;     // ISO 8601
  endTime: string;       // ISO 8601
  duration: number;      // In minutes
  agent: string;
  interrupted: boolean;
  notes?: string;
}
```

### Estimation Accuracy Metrics

- **Estimation Error**: `|actual - estimated| / estimated × 100%`
- **Target**: Estimation error within ±30% for ≥ 80% of tasks.
- **Calibration**: Review estimation accuracy monthly; adjust multipliers if systematic bias exists.

---

## Task Handoff Protocol

### When Handoffs Occur

1. **Agent Reassignment**: Task is transferred from one agent to another.
2. **Shift Change**: Long-running task spans agent sessions.
3. **Specialization Need**: Task requires expertise beyond current agent's scope.
4. **Escalation**: Task is escalated to a more senior agent.

### Handoff Checklist

Before handing off a task, the outgoing agent MUST:

- [ ] Update task description with current state and progress.
- [ ] Record current workflow phase and phase-specific progress.
- [ ] Document any deviations from the original plan (and why).
- [ ] List any open questions or pending decisions.
- [ ] Summarize what was tried and what failed (with reasons).
- [ ] Ensure all code changes are committed with clear messages.
- [ ] Ensure the build is in a passing state (or document failures).
- [ ] Transfer all relevant context files and notes.
- [ ] Notify the incoming agent with a structured handoff summary.

### Handoff Summary Template

```markdown
## Task Handoff: {TASK_ID}

### Status
- **Current Phase**: {phase}
- **Overall Progress**: {percentage}%
- **Blockers**: {list or "None"}

### What Was Done
- {completed step 1}
- {completed step 2}
- ...

### What Remains
- {pending step 1}
- {pending step 2}
- ...

### Important Notes
- {note about a tricky implementation detail}
- {note about a dependency version constraint}
- ...

### Files Modified
- `{path/to/file}`: {what was changed and why}
- ...

### Open Questions
- {question 1}
- ...
```

### Handoff Acceptance

The incoming agent MUST:
1. Read the complete handoff summary.
2. Verify the current build state.
3. Review all modified files.
4. Confirm understanding of remaining work.
5. Formally accept the task (update assignee and transition state if needed).

---

## Task Completion Verification

### Verification Criteria

A task may only transition to COMPLETED when ALL of the following are verified:

#### 1. Workflow Completion
- [ ] All 7 phases of the agentic workflow have been executed.
- [ ] All phase exit criteria have been met.
- [ ] All checkpoints have been passed.

#### 2. Code Quality
- [ ] All code passes linting with zero warnings.
- [ ] All code passes type checking with zero errors.
- [ ] No `console.log`, `debugger`, or commented-out code remains.
- [ ] Code follows all Deerflow coding standards.
- [ ] File length limits are respected (≤ 300 lines).
- [ ] Function complexity limits are respected (≤ 10 cyclomatic).

#### 3. Test Coverage
- [ ] All new code has corresponding tests.
- [ ] All tests pass with zero failures.
- [ ] Coverage meets thresholds (≥ 80% line, ≥ 90% critical paths).
- [ ] Edge cases from Phase 1 are tested.
- [ ] Error paths are tested.

#### 4. Documentation
- [ ] Public APIs have JSDoc/TSDoc comments.
- [ ] README updated if user-facing behavior changed.
- [ ] CHANGELOG updated.
- [ ] Architecture docs updated if structure changed.

#### 5. Build and Deploy
- [ ] Production build succeeds with zero warnings.
- [ ] No known security vulnerabilities in dependencies.
- [ ] Deployment checklist complete (if applicable).

#### 6. Dependencies
- [ ] All subtasks are completed.
- [ ] All blocking dependencies are resolved.
- [ ] No circular dependencies introduced.

### Completion Sign-Off

```typescript
interface TaskCompletion {
  taskId: string;
  completedAt: string;
  completedBy: string;
  phaseTimeBreakdown: Record<WorkflowPhase, number>;  // minutes per phase
  totalTime: number;          // Total minutes
  estimatedTime: number;      // Original estimate
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  testsAdded: number;
  testsPassing: number;
  coveragePercentage: number;
  checklistPassed: boolean;   // All verification criteria met
  signOff: boolean;           // Agent confirms completion
}
```

---

## Task Rollback Procedures

### Rollback Triggers

A task may be rolled back when:

1. **Test Failures**: Critical tests cannot be fixed within time budget.
2. **Design Flaw**: The approach is fundamentally incompatible with the system.
3. **Blocker Unresolvable**: An external dependency cannot be satisfied.
4. **Scope Creep**: Requirements have changed beyond the original scope.
5. **Priority Change**: A higher-priority task preempts this work.

### Rollback Levels

#### Level 1: Phase Rollback
- Roll back to a specific phase of the agentic workflow.
- Applicable when the issue can be resolved by re-executing from an earlier phase.
- No code changes are lost; the agent re-enters the phase with updated knowledge.

#### Level 2: Code Rollback
- Use git to revert code changes to a known good state.
- Applicable when implementation introduced bugs or took a wrong approach.
- Git operations:
  - During development: `git reset --soft <baseline>` (preserve commits, discard changes).
  - After deployment: `git revert <commit-range>` (preserve history).

#### Level 3: Full Task Rollback
- Abandon the task entirely and return to PENDING.
- Applicable when the task should not have been started or is no longer relevant.
- All work is preserved in git history for reference.

### Rollback Execution Procedure

```
1. PAUSE: Stop all work on the task immediately.
2. ASSESS: Determine the appropriate rollback level.
3. COMMUNICATE: Notify stakeholders of the rollback.
4. EXECUTE: Perform the rollback using the appropriate git commands.
5. VERIFY: Confirm the system is in a clean state.
6. DOCUMENT: Record the rollback reason, level, and lessons learned.
7. TRANSITION: Update task state appropriately.
```

### Rollback Documentation

```typescript
interface TaskRollback {
  taskId: string;
  rollbackLevel: 1 | 2 | 3;
  reason: string;
  triggeredBy: string;          // Agent or system
  triggeredAt: string;          // ISO timestamp
  fromPhase: WorkflowPhase;
  toPhase: WorkflowPhase | null; // null for full rollback
  gitOperations: string[];      // List of git commands executed
  filesReverted: string[];
  lessonsLearned: string;
  preventionStrategy: string;   // How to prevent this in the future
}
```

### Post-Rollback Rules

1. **Analysis Required**: Every Level 2 or Level 3 rollback requires a post-mortem analysis.
2. **Pattern Detection**: Track rollback patterns; if the same type of rollback occurs
   3+ times, the workflow or estimation process must be revised.
3. **Knowledge Capture**: Document what was learned even from failed attempts.
4. **No Blame**: Rollbacks are learning opportunities, not failures.

---

## Task Metadata Schema

### Complete Task Schema

```typescript
interface Task {
  // Identity
  id: string;
  title: string;
  description: string;
  type: TaskType;
  
  // State
  state: TaskState;
  previousState: TaskState | null;
  
  // Priority & Scheduling
  priority: TaskPriority;
  assignee: string;
  reporter: string;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  
  // Workflow
  workflowPhase: WorkflowPhase;
  phaseHistory: Array<{
    phase: WorkflowPhase;
    enteredAt: string;
    exitedAt: string | null;
  }>;
  
  // Estimation
  estimatedEffort: number;
  optimisticEstimate: number;
  pessimisticEstimate: number;
  actualEffort: number;
  
  // Dependencies
  dependencies: Array<{
    taskId: string;
    type: DependencyType;
  }>;
  subtasks: string[];            // Child task IDs
  parentTask: string | null;     // Parent task ID
  
  // Tracking
  labels: string[];
  comments: Array<{
    author: string;
    content: string;
    timestamp: string;
  }>;
  timeEntries: TimeEntry[];
  
  // Verification
  verification: {
    lintPassing: boolean;
    typeCheckPassing: boolean;
    testsPassing: boolean;
    coveragePercentage: number;
    buildPassing: boolean;
    reviewCompleted: boolean;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;               // Incremented on every update
}
```

### Task Type Enum

```typescript
enum TaskType {
  FEATURE = 'feature',
  BUGFIX = 'bugfix',
  REFACTOR = 'refactor',
  DOCS = 'docs',
  CHORE = 'chore',
  TEST = 'test',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}
```

### Task Priority Enum

```typescript
enum TaskPriority {
  P0_CRITICAL = 'P0',
  P1_HIGH = 'P1',
  P2_MEDIUM = 'P2',
  P3_LOW = 'P3',
}
```

### Task State Enum

```typescript
enum TaskState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  REVIEW = 'review',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}
```

---

## Task Lifecycle Metrics

### Operational Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Task Throughput | Tasks completed per agent per day | ≥ 5 |
| Cycle Time | Average time from creation to completion | Varies by priority |
| Lead Time | Average time from creation to deployment | Varies by priority |
| Blocked Time | Average time spent in BLOCKED state | ≤ 10% of cycle time |
| Rework Rate | Tasks that re-enter IN_PROGRESS from REVIEW | ≤ 10% |
| Abandonment Rate | Tasks rolled back to PENDING | ≤ 5% |

### Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| First-Pass Yield | Tasks completing without re-entering IN_PROGRESS | ≥ 90% |
| Estimation Accuracy | Actual within 30% of estimate | ≥ 80% |
| Dependency Resolution | Dependency blockers resolved within SLA | ≥ 95% |
| Handoff Success | Tasks accepted without requiring clarification | ≥ 85% |

### Reporting

- **Daily**: Active task count, blocked tasks, P0/P1 status.
- **Weekly**: Throughput, cycle time trends, estimation accuracy.
- **Monthly**: Rework patterns, rollback analysis, process improvements.

---

*This task lifecycle document is a core component of the Deerflow Agent Framework.
All agents must follow these lifecycle rules for every task they handle.*
