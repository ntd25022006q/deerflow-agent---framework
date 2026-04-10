# Deerflow Code Review Pipeline

> **Comprehensive Review Process for Quality Assurance**
> This document defines the multi-stage code review pipeline that every task
> must pass through before approval. The pipeline combines automated checks
> with structured manual reviews to ensure consistent code quality.

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Review Steps](#automated-review-steps)
3. [Self-Review Checklist](#self-review-checklist)
4. [Cross-Component Impact Analysis](#cross-component-impact-analysis)
5. [Breaking Change Detection](#breaking-change-detection)
6. [Performance Regression Checks](#performance-regression-checks)
7. [Security Review Checklist](#security-review-checklist)
8. [Documentation Completeness Check](#documentation-completeness-check)
9. [Review Approval Workflow](#review-approval-workflow)

---

## Overview

The Deerflow Code Review Pipeline is a structured, multi-layered review process
designed to catch issues before they reach production. It operates in two modes:

1. **Automated Pipeline**: Runs on every code change without human intervention.
2. **Structured Review**: A comprehensive checklist-driven review executed by the agent.

### Pipeline Flow

```
Code Change Submitted
        │
        ▼
┌─────────────────────┐
│  Stage 1: Automated │
│  ──────────────────  │
│  • Linting           │
│  • Type Checking     │
│  • Formatting        │
│  • Build Verification│
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  Stage 2: Testing   │
│  ──────────────────  │
│  • Unit Tests        │
│  • Integration Tests │
│  • Coverage Check    │
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  Stage 3: Analysis  │
│  ──────────────────  │
│  • Impact Analysis   │
│  • Breaking Changes  │
│  • Performance       │
│  • Security Scan     │
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  Stage 4: Self-     │
│  Review Checklist   │
│  (20+ items)        │
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  Stage 5: Docs &    │
│  Approval           │
└────────┬────────────┘
         │ PASS
         ▼
   APPROVED ✅
```

---

## Automated Review Steps

### Stage 1: Static Analysis

All automated checks must pass with zero errors. Warnings should be addressed
but may be deferred with documented justification.

#### 1.1 Linting

```bash
# Run the project's configured linter
npm run lint
# or
npx eslint . --ext .ts,.tsx,.js,.jsx
# or
npx biome lint .
```

**Pass Criteria**:
- Zero errors.
- Zero warnings (or warnings documented with justification).
- No new lint violations compared to baseline.

**Common Lint Rules to Enforce**:
- No unused variables or imports.
- No `any` type usage (strict TypeScript).
- No implicit returns where explicit is clearer.
- No console.log in production code.
- Consistent quote style (single or double, project-wide).
- Consistent semicolons (always or never, project-wide).

#### 1.2 Type Checking

```bash
npx tsc --noEmit --strict
```

**Pass Criteria**:
- Zero type errors.
- No use of `@ts-ignore` or `@ts-expect-error` without justification comment.
- No implicit `any` types.
- Strict null checks pass.

#### 1.3 Formatting

```bash
npx prettier --check .
# or
npx biome format .
```

**Pass Criteria**:
- All files pass formatting check.
- If formatting differs, run `--write` to auto-fix.

#### 1.4 Build Verification

```bash
npm run build
```

**Pass Criteria**:
- Build completes successfully.
- Zero build warnings (or documented exceptions).
- Output bundle size within acceptable limits (≤ 10% increase from baseline).

### Stage 2: Testing

#### 2.1 Unit Tests

```bash
npm run test -- --coverage
```

**Pass Criteria**:
- All tests pass (0 failures, 0 skipped unless justified).
- New code coverage ≥ 80% line coverage.
- Critical path coverage ≥ 90%.
- No decrease in overall project coverage.

#### 2.2 Integration Tests

```bash
npm run test:integration
```

**Pass Criteria**:
- All integration tests pass.
- Database operations tested (if applicable).
- API contracts verified.
- External service mocks return valid responses.

#### 2.3 E2E Tests (if available)

```bash
npm run test:e2e
```

**Pass Criteria**:
- All E2E tests pass.
- No flaky test failures (if flaky, re-run up to 2 times).
- User journeys affected by changes are verified.

---

## Self-Review Checklist

The following 25-item checklist MUST be completed for every task. Each item requires
an explicit "PASS" or "FAIL" determination. Any FAIL requires resolution before approval.

### Category 1: Code Correctness (Items 1-7)

| # | Item | Check | Notes |
|---|------|-------|-------|
| 1 | **Logic correctness**: Does the code do what the task requires? | ☐ | |
| 2 | **Edge case handling**: Are all identified edge cases covered? | ☐ | |
| 3 | **Null/undefined safety**: Are all nullable values properly handled? | ☐ | |
| 4 | **Error handling**: Are all potential errors caught and handled appropriately? | ☐ | |
| 5 | **Async/await correctness**: Are all promises properly awaited or returned? | ☐ | |
| 6 | **Off-by-one errors**: Are loop bounds and array indices correct? | ☐ | |
| 7 | **State management**: Is application state mutated safely (immutably)? | ☐ | |

### Category 2: Code Quality (Items 8-14)

| # | Item | Check | Notes |
|---|------|-------|-------|
| 8 | **Naming clarity**: Do variable/function/type names clearly convey intent? | ☐ | |
| 9 | **Function length**: Is every function ≤ 50 lines? | ☐ | |
| 10 | **File length**: Is every file ≤ 300 lines? | ☐ | |
| 11 | **DRY principle**: Is there no duplicated logic that should be extracted? | ☐ | |
| 12 | **Single responsibility**: Does each function/class have one clear purpose? | ☐ | |
| 13 | **Abstraction level**: Are abstractions at the right level (not too high/low)? | ☐ | |
| 14 | **Magic numbers/strings**: Are constants used instead of inline literals? | ☐ | |

### Category 3: Type Safety & Standards (Items 15-18)

| # | Item | Check | Notes |
|---|------|-------|-------|
| 15 | **No `any` types**: Are all types explicitly defined (no implicit/explicit `any`)? | ☐ | |
| 16 | **Interface completeness**: Do interfaces accurately describe data shapes? | ☐ | |
| 17 | **Generic usage**: Are generics used appropriately for reusable components? | ☐ | |
| 18 | **Enum/type consistency**: Are enums and union types used over magic strings? | ☐ | |

### Category 4: Performance & Resource Management (Items 19-21)

| # | Item | Check | Notes |
|---|------|-------|-------|
| 19 | **No unnecessary re-renders**: Are React components optimized (memo, useMemo, useCallback)? | ☐ | |
| 20 | **Memory management**: Are event listeners, subscriptions, and timers cleaned up? | ☐ | |
| 21 | **Algorithm efficiency**: Is the chosen algorithm appropriate for the data size? | ☐ | |

### Category 5: Security & Safety (Items 22-25)

| # | Item | Check | Notes |
|---|------|-------|-------|
| 22 | **Input sanitization**: Are all user inputs validated and sanitized? | ☐ | |
| 23 | **No secrets in code**: Are there no hardcoded API keys, passwords, or tokens? | ☐ | |
| 24 | **XSS prevention**: Is user-generated content properly escaped? | ☐ | |
| 25 | **Authorization checks**: Are protected operations properly guarded? | ☐ | |

### Self-Review Execution Protocol

1. **Systematic Review**: Go through items 1-25 in order. Do not skip.
2. **Evidence Required**: For each PASS, note the specific evidence (file, line, pattern).
3. **FAIL Resolution**: For each FAIL, describe the issue and the fix applied.
4. **Final Tally**: All 25 items must PASS before proceeding to approval.
5. **Time Log**: Record time spent on self-review.

---

## Cross-Component Impact Analysis

### Purpose
Verify that changes do not break other parts of the system that depend on the
modified modules, interfaces, or shared state.

### Impact Analysis Procedure

#### Step 1: Import Tracing

For each modified file, identify all files that import from it:

```bash
# Find all files importing a specific module
rg "from ['\"].*modified-module" --type ts --type tsx
rg "import.*modified-module" --type ts --type tsx
rg "require.*modified-module" --type ts --type tsx
```

**Document each importing file and assess impact**:

| Importing File | Import Type | Impact Level | Action Required |
|---------------|-------------|-------------|-----------------|
| `src/components/X.tsx` | Named import `useAuth` | None | No change needed |
| `src/services/Y.ts` | Type import `User` | Medium | Verify type compatibility |
| `src/pages/Z.tsx` | Default export `Dashboard` | High | Test full page |

#### Step 2: Interface Change Analysis

If any exported interface, type, or function signature changed:

- [ ] List all consumers of the changed interface.
- [ ] Verify each consumer is compatible with the new interface.
- [ ] If breaking, create migration plan or update all consumers.
- [ ] Document the interface change in CHANGELOG.

#### Step 3: Shared State Analysis

If any shared state (context, store, database schema) was modified:

- [ ] Identify all components that read from the modified state.
- [ ] Identify all components that write to the modified state.
- [ ] Verify state transitions remain valid.
- [ ] Test all affected component interactions.

#### Step 4: Configuration Impact

If any configuration file was modified:

- [ ] Verify no other module depends on the modified configuration.
- [ ] Verify environment-specific overrides still work.
- [ ] Verify default values are backward compatible.

#### Step 5: CSS/Style Impact

If any shared CSS, theme, or design token was modified:

- [ ] Identify all components using the modified styles.
- [ ] Verify visual consistency across all affected components.
- [ ] Check for style specificity conflicts.

### Impact Level Classification

| Level | Definition | Action |
|-------|-----------|--------|
| **None** | No observable effect on other components. | No action. |
| **Low** | Minor behavioral change, fully backward compatible. | Log, proceed. |
| **Medium** | Non-breaking change requiring consumer awareness. | Update docs, notify team. |
| **High** | Breaking change requiring consumer updates. | Update all consumers before merge. |
| **Critical** | System-wide impact affecting core functionality. | Full regression testing required. |

---

## Breaking Change Detection

### What Constitutes a Breaking Change

A change is considered "breaking" if it:

1. **Removes or renames** a public API (function, class, type, variable).
2. **Changes a function signature** (adds required parameters, changes return type).
3. **Modifies an interface** (removes fields, changes field types).
4. **Changes behavior** in a way that existing consumers depend on.
5. **Modifies data formats** (API response shapes, database schemas).
6. **Changes configuration** required for existing functionality.
7. **Updates a dependency** with breaking changes in a minor/patch version.

### Detection Methods

#### Automated Detection

```bash
# TypeScript: Check for export changes
npx tsc --noEmit  # Will fail if imports are broken

# API: Compare OpenAPI specs (if available)
# diff old-openapi.json new-openapi.json

# Package: Check for breaking dependency updates
npm audit
npx npm-check-updates --format group
```

#### Manual Detection Checklist

- [ ] Did any exported function signature change?
- [ ] Did any exported type/interface change?
- [ ] Did any public class method change?
- [ ] Did any configuration key change?
- [ ] Did any database column name or type change?
- [ ] Did any API endpoint request/response format change?
- [ ] Did any environment variable name change?
- [ ] Did any CLI command or flag change?
- [ ] Did any event name or payload format change?
- [ ] Did any file path or URL pattern change?

### Breaking Change Protocol

1. **Identify**: Document every breaking change found.
2. **Classify**: Rate severity (Major / Minor / Patch-level).
3. **Communicate**: Add breaking change note to CHANGELOG.
4. **Migrate**: Provide migration guide or codemod if possible.
5. **Version**: Bump major version number (semver).
6. **Notify**: Alert all downstream consumers before deployment.

### CHANGELOG Entry Format

```markdown
### BREAKING CHANGES

- **`module.function()`**: The `options` parameter is now required.
  Migration: Pass `{ timeout: 5000 }` as the second argument.
  See: docs/migration-guide.md#v2-to-v3

- **`User` interface**: The `name` field was split into `firstName` and `lastName`.
  Migration: Update all references to use the new field names.
```

---

## Performance Regression Checks

### Performance Review Checklist

- [ ] **No new O(n²) algorithms** where O(n) or O(n log n) would suffice.
- [ ] **No unnecessary loops** inside hot paths or render cycles.
- [ ] **No synchronous operations** in async contexts that could block the event loop.
- [ ] **No unbounded data structures** (arrays/maps that grow without limit).
- [ ] **No redundant API calls** (same data fetched multiple times).
- [ ] **No unnecessary re-computations** (memoize expensive calculations).
- [ ] **No blocking file I/O** in request handlers.
- [ ] **No large payload transfers** without pagination or streaming.

### Performance Measurement

For changes that could affect performance:

```bash
# Bundle size analysis (frontend)
npm run build -- --analyze
# or
npx vite-bundle-visualizer

# Lighthouse audit (frontend)
npx lighthouse http://localhost:3000 --output json --output-path ./lighthouse-report.json

# Node.js performance profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt
```

### Performance Thresholds

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| Bundle size increase | ≤ 10% from baseline | Investigate and optimize |
| Initial page load | ≤ 3 seconds (3G) | Optimize critical path |
| Time to Interactive | ≤ 5 seconds (3G) | Reduce JavaScript payload |
| API response time (p95) | ≤ 500ms | Add caching or optimize queries |
| Memory usage | ≤ 512MB baseline + 100MB | Check for memory leaks |
| Database query time (p95) | ≤ 200ms | Add indexes or optimize queries |

### React-Specific Performance Checks

- [ ] Components using `React.memo` where props rarely change.
- [ ] Expensive computations wrapped in `useMemo`.
- [ ] Callback functions wrapped in `useCallback` when passed as props.
- [ ] No inline object/array creation in JSX props.
- [ ] Lists using proper `key` props (not array index for mutable lists).
- [ ] Lazy loading for heavy components (`React.lazy` + `Suspense`).
- [ ] Virtualization for long lists (react-window, react-virtuoso).

---

## Security Review Checklist

### Input Validation

- [ ] All user inputs are validated on the server side (never trust client only).
- [ ] Input length limits are enforced.
- [ ] Input type/format validation is implemented (email, URL, date, etc.).
- [ ] File uploads have size limits and type restrictions.
- [ ] SQL/database queries use parameterized statements (no string concatenation).

### Authentication & Authorization

- [ ] Protected endpoints require authentication.
- [ ] Authorization checks are performed for every privileged operation.
- [ ] Session tokens are properly validated and expired.
- [ ] Password handling uses secure hashing (bcrypt, argon2).
- [ ] Rate limiting is applied to authentication endpoints.

### Data Protection

- [ ] Sensitive data is encrypted at rest (passwords, tokens, PII).
- [ ] Sensitive data is encrypted in transit (HTTPS/TLS).
- [ ] No sensitive data in URL parameters or query strings.
- [ ] No sensitive data in logs or error messages.
- [ ] PII is minimized (collect only what is necessary).

### Dependency Security

- [ ] `npm audit` shows zero high/critical vulnerabilities.
- [ ] No known vulnerable dependency versions.
- [ ] Lock file (`package-lock.json`) is committed and in sync.
- [ ] Subdependency tree reviewed for transitive vulnerabilities.

### Code Security Patterns

- [ ] No `eval()`, `new Function()`, or `innerHTML` usage.
- [ ] No `dangerouslySetInnerHTML` without sanitization.
- [ ] No hardcoded secrets, API keys, or passwords.
- [ ] Environment variables are used for all configuration secrets.
- [ ] Error messages do not leak stack traces or internal details to users.
- [ ] CORS is properly configured (not `*` for production).
- [ ] Content Security Policy headers are set.
- [ ] HTTP security headers are configured (X-Frame-Options, X-Content-Type-Options, etc.).

### Security Scanning

```bash
# npm audit
npm audit --production

# Check for known vulnerabilities
npx snyk test

# Check for secrets in code
npx gitleaks detect --source .

# Check for dependency vulnerabilities
npx audit-ci --moderate
```

---

## Documentation Completeness Check

### Documentation Requirements by Change Type

| Change Type | Required Documentation |
|-------------|----------------------|
| New feature | README, API docs, usage examples, migration guide if needed |
| Bug fix | Bug description, root cause, fix summary |
| Refactoring | Rationale for change, what was improved, impact assessment |
| API change | API docs, CHANGELOG, client migration guide |
| Config change | Updated .env.example, config documentation |
| Breaking change | Migration guide, CHANGELOG, version bump |

### Documentation Checklist

#### Code-Level Documentation
- [ ] All public functions have JSDoc/TSDoc with `@param`, `@returns`, `@throws`.
- [ ] All public classes/types have description comments.
- [ ] Complex algorithms have inline explanation comments.
- [ ] Non-obvious business logic has "why" comments (not "what" comments).
- [ ] TODO comments reference an issue/task ID.

#### Project-Level Documentation
- [ ] README.md is updated if user-facing behavior changed.
- [ ] CHANGELOG.md has an entry for this change.
- [ ] API documentation is updated (OpenAPI, GraphQL schema, etc.).
- [ ] Architecture documentation reflects any structural changes.
- [ ] Setup/installation instructions are still accurate.

#### Inline Quality
- [ ] No commented-out code blocks (remove dead code, use git history).
- [ ] No placeholder comments (`// TODO: implement`, `// FIXME` without issue ID).
- [ ] No misleading or outdated comments.
- [ ] Code is self-documenting; comments explain "why", not "what".

### Documentation Standards

```typescript
/**
 * Validates a user's email address format and domain availability.
 *
 * Performs RFC 5322 compliant format validation followed by optional
 * MX record verification for the email domain.
 *
 * @param email - The email address to validate
 * @param options - Configuration options
 * @param options.checkMx - Whether to verify MX records (default: false)
 * @param options.timeout - MX lookup timeout in milliseconds (default: 5000)
 * @returns Result object with validity status and detailed error message
 * @throws {ConfigurationError} If DNS resolution is not available
 *
 * @example
 * ```typescript
 * const result = await validateEmail('user@example.com', { checkMx: true });
 * if (result.valid) {
 *   console.log('Email is valid');
 * }
 * ```
 */
export async function validateEmail(
  email: string,
  options?: { checkMx?: boolean; timeout?: number }
): Promise<ValidationResult> {
  // implementation
}
```

---

## Review Approval Workflow

### Approval Stages

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Self-Review   │────▶│ Automated     │────▶│ Final         │
│ Complete      │     │ Checks Pass   │     │ Approval      │
│ (25 items)    │     │ (All stages)  │     │ Decision      │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                   │
                                        ┌──────────┴──────────┐
                                        │                     │
                                   APPROVED              CHANGES
                                   ◀──────────────────── REQUESTED
                                        │
                                        ▼
                                  ┌──────────────┐
                                  │ Address      │
                                  │ Feedback     │
                                  └──────┬───────┘
                                         │
                                  Return to
                                  IN_PROGRESS
```

### Approval Criteria

A task may be APPROVED when ALL of the following are true:

1. **All 25 self-review items** are marked PASS with documented evidence.
2. **All automated checks** pass (lint, type check, build, tests).
3. **No breaking changes** without proper migration documentation.
4. **No security vulnerabilities** (high or critical).
5. **No performance regressions** exceeding defined thresholds.
6. **Documentation is complete** per the change type requirements.
7. **Impact analysis** shows no unaddressed cross-component risks.

### Change Request Criteria

A change request is issued when ANY of the following are true:

1. One or more self-review items FAIL.
2. Automated checks produce errors.
3. Breaking changes lack migration documentation.
4. Security vulnerabilities are detected.
5. Performance regressions exceed thresholds.
6. Documentation is incomplete.
7. Impact analysis reveals unaddressed risks.

### Change Request Process

1. **Issue**: Identify the specific item(s) that need to be addressed.
2. **Categorize**: Classify as Critical (must fix), Major (should fix), or Minor (nice to fix).
3. **Document**: Provide clear, actionable feedback for each issue.
4. **Return**: Transition the task back to IN_PROGRESS.
5. **Verify**: After fixes, re-run the full review pipeline.

### Review Feedback Template

```markdown
## Review Feedback: {TASK_ID}

### Summary
{Overall assessment: Approved / Changes Requested / Blocked}

### Issues

#### [CRITICAL] Issue Title
- **Item**: Self-review item #X / Automated check name
- **File**: `{path/to/file}:{line}`
- **Description**: What is wrong and why it matters.
- **Suggestion**: How to fix it (code example preferred).
- **References**: Link to relevant rule, guideline, or documentation.

#### [MAJOR] Issue Title
- ...same format...

#### [MINOR] Issue Title
- ...same format...

### Positive Observations
- {What was done well}

### Overall Assessment
{Final decision and reasoning}
```

### Review Time Limits

| Priority | Review Turnaround |
|----------|------------------|
| P0 | Within 15 minutes |
| P1 | Within 1 hour |
| P2 | Within 4 hours |
| P3 | Within 24 hours |

### Review Metrics

| Metric | Target |
|--------|--------|
| First-pass approval rate | ≥ 70% |
| Critical issue detection rate | 100% |
| Average review time | ≤ 30 minutes |
| Feedback clarity score | ≥ 4/5 |
| Re-review cycle rate | ≤ 1.5 (average reviews per task) |

---

*This review pipeline document is a core component of the Deerflow Agent Framework.
Every task must pass through this pipeline before approval. No exceptions.*
