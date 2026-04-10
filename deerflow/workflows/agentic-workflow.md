# Deerflow Agentic Workflow

> **The 7-Phase Agent Execution Cycle**
> Every agent in the Deerflow framework MUST follow this workflow for every non-trivial task.
> This document defines the mandatory execution cycle, phase transitions, checkpoints,
> rollback procedures, and quality metrics that govern all agent behavior.

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: UNDERSTAND](#phase-1-understand)
3. [Phase 2: PLAN](#phase-2-plan)
4. [Phase 3: VERIFY](#phase-3-verify)
5. [Phase 4: IMPLEMENT](#phase-4-implement)
6. [Phase 5: TEST](#phase-5-test)
7. [Phase 6: REVIEW](#phase-6-review)
8. [Phase 7: DEPLOY](#phase-7-deploy)
9. [Mandatory Checkpoints](#mandatory-checkpoints)
10. [Rollback Procedures](#rollback-procedures)
11. [Phase Skip Rules](#phase-skip-rules)
12. [Time Estimates](#time-estimates)
13. [Quality Metrics](#quality-metrics)
14. [Appendix: Decision Trees](#appendix-decision-trees)

---

## Overview

The Deerflow Agentic Workflow is a strict 7-phase cycle designed to ensure that every
code change, feature addition, bug fix, or architectural modification passes through
a rigorous, repeatable process before reaching production.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  UNDERSTAND  │────▶│    PLAN     │────▶│   VERIFY    │
│   Phase 1    │     │   Phase 2   │     │   Phase 3   │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
       ┌────────────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DEPLOY    │◀────│   REVIEW    │◀────│    TEST     │
│   Phase 7   │     │   Phase 6   │     │   Phase 5   │
└─────────────┘     └─────────────┘     └─────────────┘
                                                ▲
                                                │
                                         ┌─────────────┐
                                         │  IMPLEMENT  │
                                         │   Phase 4   │
                                         └─────────────┘
```

### Core Principles

- **No phase may be skipped** for any non-trivial change (see [Phase Skip Rules](#phase-skip-rules)).
- **Each phase has explicit entry and exit criteria** — agents must prove exit criteria before advancing.
- **Checkpoints between phases** act as hard gates; failure blocks forward progress.
- **Rollback is always possible** at every phase boundary.
- **All phase transitions must be logged** to the task lifecycle system.

---

## Phase 1: UNDERSTAND

### Purpose
Parse the user's intent, ask clarifying questions, identify constraints, and establish
a shared understanding of the task requirements before any work begins.

### Entry Criteria
- A new task has been assigned or a user request has been received.
- The agent has access to relevant project context (codebase, documentation, prior tasks).

### Activities

1. **Intent Parsing**
   - Classify the request: bug fix, feature, refactoring, documentation, or configuration.
   - Extract the core user goal (what they want to achieve, not just what they said).
   - Identify implicit requirements that the user may not have stated.

2. **Clarification**
   - Generate a list of clarifying questions (max 5) for ambiguous requirements.
   - Present questions to the user; do NOT guess when uncertainty exists.
   - Document all answers in the task context.

3. **Constraint Identification**
   - Identify technical constraints (framework versions, language limitations, APIs).
   - Identify business constraints (deadlines, budget, regulatory requirements).
   - Identify compatibility constraints (browser support, OS targets, backward compatibility).
   - Identify performance constraints (response time, throughput, memory limits).

4. **Scope Definition**
   - Define what is explicitly IN scope.
   - Define what is explicitly OUT of scope.
   - Identify edge cases and boundary conditions.
   - List known unknowns and risks.

5. **Success Criteria Definition**
   - Define measurable success criteria in collaboration with the user.
   - Establish acceptance criteria for the final deliverable.
   - Identify how the user will verify the task is complete.

### Exit Criteria
- [ ] User intent is clearly documented.
- [ ] All clarifying questions have been asked and answered (or noted as accepted assumptions).
- [ ] Constraints are documented and validated.
- [ ] Scope boundary is explicitly defined.
- [ ] Success criteria are agreed upon with the user.
- [ ] Task classification (bug/feature/refactor/etc.) is recorded.

### Time Estimate
- Simple requests: 2-5 minutes
- Medium requests: 5-15 minutes
- Complex requests: 15-30 minutes

### Quality Metrics
- Clarification question relevance rate: target ≥ 80%
- Constraint identification completeness: target 100% of known constraints captured
- Scope definition precision: zero out-of-scope work should occur after this phase

---

## Phase 2: PLAN

### Purpose
Design the solution architecture, identify files to modify, create a detailed task
breakdown, and produce a step-by-step execution plan.

### Entry Criteria
- Phase 1 exit criteria are met.
- All constraints and success criteria are documented.

### Activities

1. **Solution Architecture Design**
   - Select the appropriate design pattern(s) for the problem.
   - Define the component/module structure.
   - Identify data flow and state management approach.
   - Create a mental or explicit diagram of the solution architecture.
   - Evaluate at least 2 alternative approaches and document trade-offs.

2. **File Identification**
   - List all files that need to be created.
   - List all files that need to be modified.
   - List all files that may be affected by side effects.
   - Identify configuration files requiring changes (tsconfig, eslint, package.json, etc.).
   - Identify test files that need to be created or updated.

3. **Task Breakdown**
   - Decompose the solution into atomic, ordered subtasks.
   - Each subtask should be completable in a single focused session.
   - Assign complexity ratings: Trivial / Low / Medium / High / Critical.
   - Identify subtask dependencies (which must complete before others start).
   - Estimate time for each subtask.

4. **Dependency Analysis**
   - Check for required external packages; list installation commands.
   - Verify internal module dependencies exist and are compatible.
   - Identify potential version conflicts.
   - Plan for any database schema changes or migrations.
   - Plan for any API contract changes.

5. **Risk Assessment**
   - Identify risks for each subtask.
   - Assign risk levels: Low / Medium / High / Critical.
   - Create mitigation strategies for High and Critical risks.
   - Document rollback points for high-risk changes.

6. **Execution Plan Generation**
   - Produce an ordered, numbered step-by-step plan.
   - Include git commit points between logical groups of changes.
   - Include verification steps after each major change.

### Exit Criteria
- [ ] Solution architecture is documented with at least 2 alternatives considered.
- [ ] All files to create/modify are listed.
- [ ] Task breakdown is complete with dependency ordering.
- [ ] All external dependencies are identified with installation commands.
- [ ] Risk assessment is complete with mitigation strategies.
- [ ] Step-by-step execution plan is produced and reviewed.
- [ ] User has approved the plan (for significant changes).

### Time Estimate
- Simple tasks: 5-10 minutes
- Medium tasks: 10-30 minutes
- Complex tasks: 30-60 minutes

### Quality Metrics
- Plan accuracy: target ≥ 85% of planned steps executed without re-planning
- File identification completeness: target 100% (no surprise file modifications)
- Risk prediction accuracy: target ≥ 70% of predicted risks materializing (ensures honest assessment)

---

## Phase 3: VERIFY

### Purpose
Check existing code, verify dependencies, validate approach feasibility, and confirm
the planned changes will integrate cleanly before writing any new code.

### Entry Criteria
- Phase 2 exit criteria are met.
- Execution plan is approved.

### Activities

1. **Existing Code Review**
   - Read all files that will be modified; understand current implementation.
   - Verify assumptions made during planning match reality.
   - Check for recently changed files that might conflict.
   - Identify any code smells or pre-existing issues in target files.

2. **Dependency Verification**
   - Verify all external packages are available at required versions.
   - Run `npm ls` or equivalent to check for dependency conflicts.
   - Verify internal imports/exports will work with planned changes.
   - Check that peer dependency requirements are satisfied.
   - Verify TypeScript/ESLint/Prettier configurations support planned changes.

3. **Build Verification**
   - Run the existing build to confirm the codebase is in a clean state.
   - Run existing tests to confirm a green baseline.
   - Document any pre-existing failures (these are NOT caused by our changes).
   - Verify CI/CD pipeline status if applicable.

4. **Approach Feasibility Validation**
   - Create a minimal proof-of-concept for high-risk components.
   - Verify the proposed approach does not violate any architectural constraints.
   - Test API compatibility if integrating with external services.
   - Verify database schema changes are backward compatible or have migration plans.
   - Check for framework-specific limitations that might block the approach.

5. **Environment Check**
   - Verify the development environment matches requirements (Node version, etc.).
   - Check that required environment variables are available or documented.
   - Verify file system permissions for all planned operations.
   - Check network access for any required external resources.

### Exit Criteria
- [ ] All target files have been read and understood.
- [ ] All dependencies are verified available and compatible.
- [ ] Baseline build passes (or pre-existing failures are documented).
- [ ] Baseline tests pass (or pre-existing failures are documented).
- [ ] Approach feasibility is confirmed (PoC if needed).
- [ ] Environment is ready for implementation.

### Time Estimate
- Simple tasks: 5-10 minutes
- Medium tasks: 10-20 minutes
- Complex tasks: 20-45 minutes

### Quality Metrics
- Dependency conflict detection rate: target 100%
- Build baseline accuracy: must capture ALL pre-existing failures
- Feasibility validation: zero "surprise blockers" during implementation phase

---

## Phase 4: IMPLEMENT

### Purpose
Write code following all Deerflow standards, making incremental commits with clear
messages, and adhering to the approved execution plan.

### Entry Criteria
- Phase 3 exit criteria are met.
- Clean build and test baseline is confirmed.

### Activities

1. **Implementation Execution**
   - Follow the step-by-step execution plan from Phase 2 in order.
   - Write code following all Deerflow coding standards (see rules/02-coding-standards.md).
   - Implement type safety first; avoid `any` types.
   - Follow the established naming conventions.
   - Implement error handling at every potential failure point.

2. **Incremental Commits**
   - Make logical commits at natural break points (NOT one massive commit).
   - Each commit must pass linting and type checking independently.
   - Use conventional commit format: `type(scope): description`.
     - `feat`: new feature
     - `fix`: bug fix
     - `refactor`: code restructuring without behavior change
     - `docs`: documentation changes
     - `test`: test additions or modifications
     - `chore`: maintenance tasks
   - Include issue/task reference in commit messages.

3. **Code Quality Standards**
   - Maximum file length: 300 lines (split if exceeded).
   - Maximum function length: 50 lines (extract if exceeded).
   - Cyclomatic complexity: ≤ 10 per function.
   - All public APIs must have JSDoc/TSDoc comments.
   - All parameters must be typed; no implicit `any`.
   - No `console.log` statements in production code (use logger).

4. **Safety Practices**
   - Never modify files outside the planned scope without re-entering Phase 2.
   - Never delete code without confirming it is unused (check for imports).
   - Never change shared types/interfaces without impact analysis.
   - Create backup references for files being significantly refactored.
   - Run type checking after every file modification.

5. **Progress Tracking**
   - Update task status after each subtask completion.
   - Log any deviations from the plan with justification.
   - Track actual time vs. estimated time.
   - Flag any emerging risks or blockers immediately.

### Exit Criteria
- [ ] All planned subtasks are complete.
- [ ] All files pass linting (`eslint` / `biome`).
- [ ] All files pass type checking (`tsc --noEmit`).
- [ ] Code follows all Deerflow coding standards.
- [ ] Incremental commits are clean and well-formatted.
- [ ] No `console.log` or debug statements remain.
- [ ] All new code has corresponding documentation comments.

### Time Estimate
- Simple tasks: 10-30 minutes
- Medium tasks: 30-90 minutes
- Complex tasks: 90-240 minutes

### Quality Metrics
- Lint violation rate: target 0 on final output
- Type safety: target 0 `any` types introduced
- Plan adherence: target ≥ 90% of planned steps executed as described
- Commit granularity: target 1 commit per logical change unit

---

## Phase 5: TEST

### Purpose
Run unit, integration, and E2E tests, fix all failures, and verify test coverage
meets project requirements.

### Entry Criteria
- Phase 4 exit criteria are met.
- All code compiles without errors.

### Activities

1. **Unit Testing**
   - Write unit tests for all new functions and methods.
   - Achieve ≥ 80% line coverage on new code (≥ 90% for critical paths).
   - Test all edge cases identified in Phase 1.
   - Test all error paths (every `catch` block, every error return).
   - Use descriptive test names: `should [expected behavior] when [condition]`.

2. **Integration Testing**
   - Write integration tests for component interactions.
   - Test API endpoints with realistic request/response payloads.
   - Test database operations including transaction rollback scenarios.
   - Test external service integrations (with mocks where appropriate).
   - Verify state management flows end-to-end.

3. **E2E Testing**
   - Run existing E2E test suite to verify no regressions.
   - Add E2E tests for new user-facing features.
   - Test critical user journeys affected by the change.
   - Verify cross-browser behavior for UI changes.

4. **Test Execution & Fix Cycle**
   - Run the full test suite.
   - Fix all failing tests (prioritize regressions first).
   - If a test failure reveals a bug in the implementation, fix the implementation.
   - Re-run tests after each fix to prevent cascading failures.
   - Continue until ALL tests pass with zero failures.

5. **Coverage Verification**
   - Generate coverage report.
   - Verify new code meets coverage thresholds.
   - Identify and test any uncovered branches.
   - Document any intentionally uncovered code with justification.

### Exit Criteria
- [ ] All unit tests pass (0 failures).
- [ ] All integration tests pass (0 failures).
- [ ] All E2E tests pass (0 failures).
- [ ] New code coverage ≥ 80% (≥ 90% for critical paths).
- [ ] No regressions in existing test suite.
- [ ] Edge cases from Phase 1 are all tested.
- [ ] Error paths are all tested.

### Time Estimate
- Simple tasks: 10-20 minutes
- Medium tasks: 20-60 minutes
- Complex tasks: 60-120 minutes

### Quality Metrics
- Test pass rate: target 100%
- Coverage on new code: target ≥ 80%
- Regression rate: target 0 new test failures
- Bug detection rate: target ≥ 90% of introduced bugs caught by tests

---

## Phase 6: REVIEW

### Purpose
Perform a comprehensive self-review, cross-component impact analysis, dependency
verification, and build validation before deployment.

### Entry Criteria
- Phase 5 exit criteria are met.
- All tests pass with required coverage.

### Activities

1. **Self-Review Checklist** (see workflows/review-pipeline.md for full list)
   - Code correctness and logic verification.
   - Naming convention compliance.
   - Error handling completeness.
   - Performance considerations.
   - Security review.
   - Accessibility compliance (for UI changes).
   - Documentation completeness.

2. **Cross-Component Impact Analysis**
   - Trace all imports of modified files/modules.
   - Verify no downstream breakages from interface changes.
   - Check that shared state changes are backward compatible.
   - Verify API contract changes do not break consumers.
   - Check that configuration changes do not affect other modules.

3. **Dependency Check**
   - Verify no unnecessary dependencies were introduced.
   - Verify dependency versions are pinned appropriately.
   - Check for known vulnerabilities in new/updated dependencies.
   - Verify `package-lock.json` / `yarn.lock` is updated if dependencies changed.
   - Run `npm audit` or equivalent.

4. **Build Verification**
   - Run production build (`npm run build`).
   - Verify build output has no warnings.
   - Verify build output size is reasonable (no unexpected bloat).
   - Run lint-staged if configured.
   - Verify bundle analysis if applicable.

5. **Documentation Update**
   - Update README if user-facing behavior changed.
   - Update API documentation if endpoints or interfaces changed.
   - Update CHANGELOG with appropriate entries.
   - Update inline code comments for complex logic.
   - Update architecture documentation if structure changed.

6. **Final Verification**
   - Re-run full test suite one final time.
   - Verify git history is clean and well-organized.
   - Verify no leftover TODO comments without issue references.
   - Verify no commented-out code blocks remain.

### Exit Criteria
- [ ] Self-review checklist is 100% complete (all items checked).
- [ ] Cross-component impact analysis shows no breakages.
- [ ] No known vulnerabilities in dependencies.
- [ ] Production build succeeds with zero warnings.
- [ ] Documentation is updated for all changes.
- [ ] Full test suite passes one final time.
- [ ] Git history is clean.

### Time Estimate
- Simple tasks: 10-20 minutes
- Medium tasks: 20-45 minutes
- Complex tasks: 45-90 minutes

### Quality Metrics
- Self-review completeness: target 100% checklist items verified
- Impact analysis coverage: target 100% of affected components identified
- Build warning count: target 0
- Documentation update rate: target 100% of changes documented

---

## Phase 7: DEPLOY

### Purpose
Execute final quality gates, update documentation, and perform the deployment
following the established deployment checklist.

### Entry Criteria
- Phase 6 exit criteria are met.
- All review items are resolved.

### Activities

1. **Final Quality Gates**
   - Run the full deployment checklist (see workflows/deployment-checklist.md).
   - Verify all environment-specific configurations are correct.
   - Verify database migrations are ready (if applicable).
   - Verify monitoring and alerting are configured for new features.
   - Verify rollback procedures are documented and tested.

2. **Documentation Finalization**
   - Verify all documentation links are valid.
   - Verify migration guides exist for breaking changes.
   - Verify API versioning is correctly updated.
   - Verify README quickstart instructions are accurate.
   - Verify deployment documentation is current.

3. **Deployment Execution**
   - Follow the project-specific deployment procedure.
   - Deploy to staging environment first (if applicable).
   - Run smoke tests on staging.
   - Get stakeholder approval for production deployment.
   - Deploy to production.
   - Run post-deployment verification tests.
   - Monitor for errors for the first 30 minutes.

4. **Post-Deployment**
   - Verify the deployment is healthy in production.
   - Confirm monitoring dashboards show normal metrics.
   - Confirm error rates are within acceptable thresholds.
   - Notify stakeholders of successful deployment.
   - Archive the task with final summary.

5. **Task Closure**
   - Update task status to `completed`.
   - Record final time spent vs. estimated.
   - Document any lessons learned.
   - Update knowledge base with new patterns or gotchas discovered.

### Exit Criteria
- [ ] Deployment checklist is 100% complete.
- [ ] Staging deployment verified (if applicable).
- [ ] Production deployment successful.
- [ ] Post-deployment smoke tests pass.
- [ ] Monitoring shows healthy system.
- [ ] Task is archived with complete documentation.

### Time Estimate
- Simple tasks: 5-15 minutes
- Medium tasks: 15-30 minutes
- Complex tasks: 30-60 minutes

### Quality Metrics
- Deployment success rate: target 100%
- Post-deployment error rate: target ≤ 0.1% increase from baseline
- Rollback frequency: target ≤ 5% of deployments
- Stakeholder satisfaction: target ≥ 90%

---

## Mandatory Checkpoints

Checkpoints are hard gates between phases. An agent MUST NOT proceed past a checkpoint
until all criteria are met.

### Checkpoint 1: After UNDERSTAND → PLAN
```
CHECKPOINT_1:
  - User intent documented and confirmed
  - Constraints validated
  - Scope boundary approved
  PASS → proceed to PLAN
  FAIL → return to UNDERSTAND
```

### Checkpoint 2: After PLAN → VERIFY
```
CHECKPOINT_2:
  - Execution plan reviewed and approved
  - All files identified
  - Dependencies verified
  PASS → proceed to VERIFY
  FAIL → return to PLAN
```

### Checkpoint 3: After VERIFY → IMPLEMENT
```
CHECKPOINT_3:
  - Baseline build green
  - Baseline tests green
  - Feasibility confirmed
  PASS → proceed to IMPLEMENT
  FAIL → return to PLAN (re-architect if needed)
```

### Checkpoint 4: After IMPLEMENT → TEST
```
CHECKPOINT_4:
  - All code compiles
  - Linting passes
  - Type checking passes
  - Commits are clean
  PASS → proceed to TEST
  FAIL → return to IMPLEMENT (fix violations)
```

### Checkpoint 5: After TEST → REVIEW
```
CHECKPOINT_5:
  - All tests pass (0 failures)
  - Coverage thresholds met
  - No regressions
  PASS → proceed to REVIEW
  FAIL → return to IMPLEMENT (fix bugs) or TEST (add tests)
```

### Checkpoint 6: After REVIEW → DEPLOY
```
CHECKPOINT_6:
  - Self-review 100% complete
  - Build succeeds
  - Documentation updated
  - Impact analysis clean
  PASS → proceed to DEPLOY
  FAIL → return to IMPLEMENT (fix issues) or REVIEW (complete items)
```

### Checkpoint 7: After DEPLOY (Task Complete)
```
CHECKPOINT_7:
  - Production healthy
  - Monitoring normal
  - Stakeholders notified
  - Task archived
  PASS → task complete
  FAIL → execute rollback, return to IMPLEMENT
```

---

## Rollback Procedures

Each phase maintains the ability to roll back to the previous state. Rollback must
be safe, complete, and not leave the system in a partially-updated state.

### Phase 1 Rollback (to task start)
- Clear all task context and notes.
- Return task to `pending` state.
- Notify user that the task was abandoned with reason.

### Phase 2 Rollback (to UNDERSTAND)
- Discard current plan and task breakdown.
- Retain understanding and constraint documentation.
- Re-enter UNDERSTAND to refine requirements.

### Phase 3 Rollback (to PLAN)
- Retain feasibility findings.
- Return to PLAN to revise architecture or approach.
- Document what was learned during verification.

### Phase 4 Rollback (to VERIFY)
- **Git rollback**: `git reset --soft <baseline-commit>` to undo all implementation commits.
- Discard all code changes.
- Retain the execution plan.
- Re-enter VERIFY with updated knowledge.

### Phase 5 Rollback (to IMPLEMENT)
- **Git rollback**: `git reset --soft <last-implementation-commit>` to undo test-only commits.
- Retain implementation code.
- Return to IMPLEMENT to fix issues identified during testing.

### Phase 6 Rollback (to TEST or IMPLEMENT)
- **To TEST**: Discard review notes; re-run test suite.
- **To IMPLEMENT**: `git reset --soft <baseline-commit>`; re-plan implementation.
- Review findings should inform the re-implementation.

### Phase 7 Rollback (to REVIEW or IMPLEMENT)
- **Immediate rollback**: Execute pre-documented rollback plan.
- **Revert deployment**: Reverse deployment actions (database migration rollback, etc.).
- **Git rollback**: `git revert` all commits (preserve history).
- Return to REVIEW or IMPLEMENT based on failure severity.
- **Post-mortem required** for any production rollback.

### Rollback Safety Rules
1. NEVER use `git push --force` on shared branches.
2. ALWAYS preserve git history via `git revert` for deployed changes.
3. ALWAYS verify rollback completeness (no partial states).
4. ALWAYS notify stakeholders immediately when rolling back.
5. ALWAYS document the rollback reason and timeline.

---

## Phase Skip Rules

### Default: NEVER skip any phase.

Phases exist for a reason. Skipping phases leads to bugs, regressions, technical debt,
and deployment failures.

### Exception: Trivial Changes

A change is considered "trivial" ONLY if ALL of the following are true:

1. **Typo fix**: Correcting spelling or grammar in comments/docs only.
2. **Formatting only**: Code formatting changes with no logic modification.
3. **Single-line config**: Changing a single boolean or string in configuration.
4. **No logic change**: The change cannot possibly affect runtime behavior.
5. **No new files**: No files are created or deleted.
6. **No dependencies**: No packages added, removed, or version-changed.

### Allowed skips for trivial changes:

| Trivial Change Type        | UNDERSTAND | PLAN  | VERIFY | IMPLEMENT | TEST  | REVIEW | DEPLOY |
|---------------------------|:----------:|:-----:|:------:|:---------:|:-----:|:------:|:------:|
| Comment typo              |    YES     | YES   | YES    | Cond.     | YES   | YES    | Cond.  |
| Formatting only           |    YES     | YES   | Cond.  | Cond.     | YES   | YES    | Cond.  |
| Single config value       |    Cond.   | YES   | Cond.  | Cond.     | Cond. | YES    | Cond.  |

> **Cond. = Conditional**: May skip if the agent can quickly verify the change is safe.
> A quick verification means reading the file and confirming no side effects.

### Skip Accountability
- Every phase skip MUST be logged with justification.
- Format: `[PHASE_SKIP] {phase}: {justification}`
- If ANY doubt exists, do NOT skip the phase.

---

## Time Estimates

Estimated times are per-task and depend on complexity classification:

### Simple Tasks (typo fixes, minor CSS tweaks, single-function changes)
| Phase      | Min  | Max  |
|------------|------|------|
| UNDERSTAND | 2m   | 5m   |
| PLAN       | 5m   | 10m  |
| VERIFY     | 5m   | 10m  |
| IMPLEMENT  | 10m  | 30m  |
| TEST       | 10m  | 20m  |
| REVIEW     | 10m  | 20m  |
| DEPLOY     | 5m   | 15m  |
| **Total**  | **47m** | **110m** |

### Medium Tasks (feature additions, bug fixes, refactoring)
| Phase      | Min  | Max  |
|------------|------|------|
| UNDERSTAND | 5m   | 15m  |
| PLAN       | 10m  | 30m  |
| VERIFY     | 10m  | 20m  |
| IMPLEMENT  | 30m  | 90m  |
| TEST       | 20m  | 60m  |
| REVIEW     | 20m  | 45m  |
| DEPLOY     | 15m  | 30m  |
| **Total**  | **110m** | **290m** |

### Complex Tasks (architecture changes, multi-component features, migrations)
| Phase      | Min  | Max  |
|------------|------|------|
| UNDERSTAND | 15m  | 30m  |
| PLAN       | 30m  | 60m  |
| VERIFY     | 20m  | 45m  |
| IMPLEMENT  | 90m  | 240m |
| TEST       | 60m  | 120m |
| REVIEW     | 45m  | 90m  |
| DEPLOY     | 30m  | 60m  |
| **Total**  | **290m** | **645m** |

---

## Quality Metrics

### Per-Phase Quality Targets

| Phase      | Primary Metric                    | Target    |
|------------|-----------------------------------|-----------|
| UNDERSTAND | Constraint capture completeness  | 100%      |
| PLAN       | Plan accuracy                     | ≥ 85%     |
| VERIFY     | Blocker prediction accuracy       | 100%      |
| IMPLEMENT  | Lint/type-check violations        | 0         |
| TEST       | Test pass rate                    | 100%      |
| REVIEW     | Checklist completion              | 100%      |
| DEPLOY     | Deployment success rate           | 100%      |

### Aggregate Quality Targets

| Metric                        | Target          |
|-------------------------------|-----------------|
| First-deploy success rate     | ≥ 95%           |
| Post-deployment rollback rate | ≤ 5%            |
| Test coverage (new code)      | ≥ 80%           |
| Regression rate               | 0 new failures  |
| Stakeholder satisfaction      | ≥ 90%           |
| Estimated vs actual time      | Within ± 30%    |

### Quality Gate Escalation

If any quality metric falls below target for 3 consecutive tasks:
1. **Level 1**: Review the workflow execution for process violations.
2. **Level 2**: Adjust time estimates and planning approach.
3. **Level 3**: Escalate to framework maintainers for workflow revision.

---

## Appendix: Decision Trees

### Should I re-enter a previous phase?

```
Did I encounter a blocking issue?
├── YES
│   ├── Can I fix it in the current phase?
│   │   ├── YES → Fix it, continue current phase
│   │   └── NO → Re-enter the earliest phase where the root cause originated
│   └── Do I need to change the plan?
│       ├── YES → Re-enter PLAN (Phase 2)
│       └── NO → Fix in current phase
└── NO → Continue to next phase
```

### Should I ask the user a question?

```
Is the requirement ambiguous?
├── YES → ALWAYS ask. Never guess.
├── NO → Do I have enough context to proceed?
│   ├── YES → Proceed
│   └── NO → Ask for missing context
└── Am I about to make an assumption?
    ├── Is it a safe assumption (e.g., naming convention)?
    │   ├── YES → Proceed, document assumption
    │   └── NO → Ask the user
    └── Could the assumption cause a wrong implementation?
        ├── YES → ALWAYS ask
        └── NO → Document and proceed
```

---

*This workflow document is a core component of the Deerflow Agent Framework.
All agents must follow this workflow. Deviations require explicit justification
and logging. For questions or improvements, consult the framework maintainers.*
