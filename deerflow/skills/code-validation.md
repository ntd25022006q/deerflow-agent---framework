# Code Validation Agent Skill

> **Skill ID:** code-validation
> **Version:** 1.0.0
> **Category:** Quality Assurance
> **Priority:** CRITICAL — Must be applied to all code before it is committed, merged, or deployed.

---

## Purpose

This skill defines a comprehensive code validation framework that ensures every piece
of code produced by Deerflow agents meets strict quality, security, performance, and
maintainability standards. Validation is not optional — it is a mandatory gate that
all code must pass.

---

## Validation Philosophy

### The Three Gate Principle

Every code artifact must pass through three validation gates:

```
Gate 1: STATIC ANALYSIS    → Automated tooling catches structural issues
Gate 2: DYNAMIC ANALYSIS   → Runtime testing catches behavioral issues
Gate 3: MANUAL REVIEW       → Human/machine judgment catches design issues
```

No code may bypass any gate. If a gate fails, the code must be revised and re-validated.

### Validation Scope

| Validation Type | When Applied | Scope |
|----------------|--------------|-------|
| Pre-commit | Before every commit | Changed files |
| Pull Request | Before merge to main | All changed files + integration |
| Release | Before deployment | Full codebase |
| Ad-hoc | On demand | Specified files/modules |

---

## Static Analysis Requirements

### Linting Configuration

All projects MUST have linting configured with zero warnings tolerated:

```jsonc
// ESLint Configuration Standards
{
  "extends": ["strict"],
  "rules": {
    "no-unused-vars": "error",
    "no-implicit-any": "error",
    "no-explicit-any": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "no-throw-literal": "error",
    "no-return-await": "error",
    "require-await": "error",
    "no-shadow": "error",
    "no-dupe-class-members": "error",
    "no-duplicate-imports": "error",
    "no-empty-function": "error",
    "no-empty-pattern": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-proto": "error",
    "no-with": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts"],
      "rules": {
        "no-explicit-any": "off"
      }
    }
  ]
}
```

### Code Formatting

Automated formatting MUST be enforced:

```yaml
# Prettier Configuration Standards
semi: true
singleQuote: true
trailingComma: "all"
printWidth: 100
tabWidth: 2
bracketSpacing: true
arrowParens: "always"
endOfLine: "lf"
```

### Static Analysis Tools by Language

| Language | Primary Tool | Secondary Tool | Security Scanner |
|----------|-------------|----------------|-----------------|
| TypeScript | ESLint | Biome | SonarQube |
| Python | Ruff | Pylint | Bandit |
| Rust | Clippy | rustfmt | cargo-audit |
| Go | golangci-lint | go vet | gosec |
| Java | Checkstyle | SpotBugs | SpotBugs + OWASP |
| Ruby | RuboCop | StandardRB | Brakeman |

---

## Type Checking Strictness Levels

### Level 1: Permissive (Development Only)

```jsonc
// tsconfig.dev.json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false
  }
}
```

**Allowed only for:** Prototyping, spike solutions, proof-of-concept code.
**NEVER allowed for:** Production code, library code, API boundaries.

### Level 2: Standard (Minimum for Production)

```jsonc
// tsconfig.json — MINIMUM for production
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Level 3: Maximum (Recommended for Libraries and Critical Systems)

```jsonc
// tsconfig.max.json — RECOMMENDED
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedSideEffectImports": true
  }
}
```

### Level 4: Paranoid (Financial, Security, Safety-Critical)

```jsonc
// tsconfig.paranoid.json — For critical systems
{
  "extends": "./tsconfig.max.json",
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Type Checking Requirements by Context

| Context | Minimum Level | Recommended Level |
|---------|--------------|-------------------|
| Application code | Level 2 | Level 3 |
| Library code | Level 3 | Level 3 |
| API boundary code | Level 3 | Level 4 |
| Security-critical code | Level 4 | Level 4 |
| Database queries | Level 3 | Level 3 |
| Test utilities | Level 2 | Level 2 |
| Configuration files | Level 2 | Level 3 |
| Script/tooling code | Level 2 | Level 3 |

---

## Code Smell Detection Patterns

### Structural Smells

```yaml
structural_smells:
  long_function:
    threshold: 30 lines
    fix: Extract into smaller, named functions
    severity: warning

  long_parameter_list:
    threshold: 4 parameters
    fix: Use options object pattern
    severity: warning

  deep_nesting:
    threshold: 3 levels
    fix: Early returns, guard clauses, extract functions
    severity: error

  large_file:
    threshold: 300 lines
    fix: Split into modules
    severity: warning

  large_class_module:
    threshold: 500 lines
    fix: Single responsibility decomposition
    severity: error

  god_object:
    indicators:
      - More than 10 public methods
      - More than 5 dependencies injected
      - Handles unrelated responsibilities
    severity: critical
```

### Logic Smells

```yaml
logic_smells:
  boolean_parameter:
    description: "Boolean parameters indicate function does two things"
    fix: "Split into two functions"
    severity: warning

  flag_arguments:
    description: "Arguments that switch function behavior"
    fix: "Use strategy pattern or separate functions"
    severity: warning

  primitive_obsession:
    description: "Using primitives instead of domain types"
    fix: "Create value objects / branded types"
    severity: warning

  shotgun_surgery:
    description: "One change requires edits across many files"
    fix: "Consolidate related logic, reduce coupling"
    severity: error

  feature_envy:
    description: "Method uses data from other classes more than its own"
    fix: "Move method to the class it envies"
    severity: warning

  dead_code:
    description: "Unreachable or unused code"
    fix: "Remove immediately"
    severity: error

  commented_out_code:
    description: "Code in comments"
    fix: "Remove — version control preserves history"
    severity: error

  magic_numbers:
    description: "Unnamed numeric literals"
    fix: "Extract to named constants"
    severity: warning
    exception: "0, 1, -1 are acceptable in context"
```

### Naming Smells

```yaml
naming_smells:
  single_letter_variables:
    exception: "Loop counters (i, j, k), coordinates (x, y, z)"
    severity: warning

  generic_names:
    blacklist: ["data", "info", "result", "item", "temp", "obj", "manager", "handler"]
    severity: warning

  misleading_names:
    examples: ["isAdmin() returns string instead of boolean", "getList() returns single item"]
    severity: error

  inconsistent_naming:
    description: "Mixing conventions in same codebase"
    fix: "Enforce consistent naming convention project-wide"
    severity: error

  abbreviation_overuse:
    description: "Excessive abbreviations reduce readability"
    examples: ["usrMgmtSvcProc instead of userManagerServiceProcessor"]
    severity: warning
```

---

## Performance Anti-Patterns

### Memory Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Unbounded array growth
const cache: any[] = [];
function process(items: Item[]) {
  items.forEach(item => cache.push(transform(item)));
}

// ✅ CORRECT: Bounded cache with eviction
const cache = new LRUCache<string, Item>({ max: 1000 });

// ❌ ANTI-PATTERN: Closure memory leak
function createHandler() {
  const hugeData = loadHugeDataset(); // Captured in closure forever
  return () => hugeData.slice(0, 10);
}

// ✅ CORRECT: Release reference when not needed
function createHandler() {
  let hugeData = loadHugeDataset();
  const result = hugeData.slice(0, 10);
  hugeData = null; // Release
  return () => result;
}

// ❌ ANTI-PATTERN: Event listener accumulation
function attachListeners(element: HTMLElement) {
  element.addEventListener('click', handler); // New listener every call
}

// ✅ CORRECT: Clean up listeners
function attachListeners(element: HTMLElement) {
  const handler = () => { /* ... */ };
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}

// ❌ ANTI-PATTERN: String concatenation in loops
let result = '';
for (const item of items) {
  result += process(item); // Creates new string each iteration
}

// ✅ CORRECT: Array join
const parts = items.map(process);
const result = parts.join('');
```

### CPU Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Synchronous work in hot path
function handleRequest(req: Request) {
  const data = fs.readFileSync(req.url); // Blocks event loop
  return transform(data);
}

// ✅ CORRECT: Asynchronous I/O
async function handleRequest(req: Request) {
  const data = await fs.promises.readFile(req.url);
  return transform(data);
}

// ❌ ANTI-PATTERN: N+1 query pattern
async function getUsersWithPosts() {
  const users = await db.user.findMany();
  return Promise.all(users.map(async user => ({
    ...user,
    posts: await db.post.findMany({ where: { userId: user.id } })
  })));
}

// ✅ CORRECT: Eager loading
async function getUsersWithPosts() {
  return db.user.findMany({
    include: { posts: true }
  });
}

// ❌ ANTI-PATTERN: Unnecessary re-computation
function render(items: Item[]) {
  const processed = items.map(expensiveTransform);
  return processed.map(format);
}

// ✅ CORRECT: Memoize expensive computations
const render = memoize((items: Item[]) => {
  const processed = items.map(expensiveTransform);
  return processed.map(format);
});
```

### Database Anti-Patterns

```typescript
// ❌ ANTI-PATTERN: Missing index hint (implicit full scan)
const user = await db.user.findFirst({
  where: { email: userEmail }  // Ensure email is indexed
});

// ❌ ANTI-PATTERN: Selecting all columns when few are needed
const users = await db.user.findMany(); // SELECT *

// ✅ CORRECT: Select only needed columns
const users = await db.user.findMany({
  select: { id: true, name: true, email: true }
});

// ❌ ANTI-PATTERN: No pagination
const allOrders = await db.order.findMany();

// ✅ CORRECT: Cursor-based pagination
const orders = await db.order.findMany({
  take: 50,
  cursor: { id: lastSeenId },
  orderBy: { createdAt: 'desc' }
});
```

---

## Security Vulnerability Patterns

### Injection Prevention

```typescript
// ❌ VULNERABLE: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE name = '${userName}'`;

// ✅ SECURE: Parameterized queries
const query = 'SELECT * FROM users WHERE name = $1';
const result = await db.query(query, [userName]);

// ❌ VULNERABLE: XSS via innerHTML
element.innerHTML = userInput;

// ✅ SECURE: textContent or sanitization
element.textContent = userInput;
// or
element.innerHTML = DOMPurify.sanitize(userInput);

// ❌ VULNERABLE: Command injection
exec(`convert ${filename} output.png`);

// ✅ SECURE: Safe API with arguments array
execFile('convert', [validatedFilename, 'output.png']);

// ❌ VULNERABLE: Path traversal
const filePath = `/uploads/${req.params.filename}`;
fs.readFile(filePath);

// ✅ SECURE: Path validation and sanitization
const safePath = path.join('/uploads', path.basename(req.params.filename));
fs.readFile(safePath);
```

### Authentication & Authorization Patterns

```yaml
security_checks:
  authentication:
    - password_hashing: "Use bcrypt/scrypt/argon2 — NEVER MD5/SHA1"
    - token_storage: "Use httpOnly, secure, sameSite cookies — NEVER localStorage"
    - session_management: "Use short TTL, rotate tokens, invalidate on logout"
    - mfa: "Implement TOTP or WebAuthn for sensitive operations"

  authorization:
    - check_every_endpoint: "NEVER skip auth checks for 'internal' endpoints"
    - principle_of_least_privilege: "Grant minimum permissions needed"
    - resource_level_auth: "Check ownership, not just authentication"
    - role_hierarchy: "Validate role hierarchy, not just role existence"

  data_protection:
    - encryption_at_rest: "Encrypt sensitive data (PII, credentials)"
    - encryption_in_transit: "TLS 1.2+ for all communications"
    - key_management: "Use KMS, never hardcode keys"
    - data_masking: "Mask sensitive data in logs and responses"
```

### Dependency Security

```bash
# MANDATORY: Run before every release
npm audit --production          # Check for known vulnerabilities
npx snyk test                   # Advanced vulnerability scanning
npm outdated                    # Check for outdated dependencies
npx license-checker --summary   # Verify license compatibility

# Python equivalent
pip-audit                       # Check for known vulnerabilities
safety check --full-report      # Advanced scanning
pip list --outdated             # Check for outdated packages
```

---

## Automated Validation Pipeline

### Pipeline Configuration

```yaml
# deerflow-validation-pipeline.yml
validation_pipeline:
  stages:
    - name: lint
      tools: [eslint, prettier --check]
      fail_on: [error]
      parallel: true

    - name: type-check
      tools: [tsc --noEmit]
      fail_on: [error]

    - name: static-security
      tools: [npm audit, snyk test]
      fail_on: [high, critical]
      allow_warnings: [low, medium]

    - name: unit-tests
      tools: [vitest run --coverage]
      fail_on: [test-failure]
      thresholds:
        statements: 80
        branches: 75
        functions: 80
        lines: 80

    - name: integration-tests
      tools: [vitest run --config vitest.integration.ts]
      fail_on: [test-failure]

    - name: build
      tools: [tsc, vite build]
      fail_on: [error]

    - name: bundle-analysis
      tools: [rollup-plugin-visualizer]
      thresholds:
        max_size_kb: 500
        max_gzip_kb: 150

  parallel_groups:
    - [lint, type-check, static-security]  # Run in parallel
    - [unit-tests, integration-tests]      # Run after first group
    - [build, bundle-analysis]             # Run after tests
```

### Quality Gates

```yaml
quality_gates:
  merge_to_main:
    - lint: PASS
    - type_check: PASS
    - unit_tests: PASS
    - integration_tests: PASS
    - code_review: APPROVED
    - no_critical_vulnerabilities: true

  release:
    - merge_to_main: PASS
    - e2e_tests: PASS
    - performance_tests: PASS
    - security_audit: PASS
    - changelog_updated: true
    - version_bumped: true
    - documentation_updated: true
```

---

## Manual Review Checklist

### Code Readability

- [ ] Can a new team member understand this code within 10 minutes?
- [ ] Are variable and function names self-documenting?
- [ ] Is the control flow easy to follow (no excessive branching)?
- [ ] Are there appropriate comments for complex logic?
- [ ] Is the file short enough to understand in one screen (< 300 lines)?
- [ ] Are side effects clearly documented?

### Error Handling

- [ ] Are all error paths handled?
- [ ] Are errors propagated correctly to callers?
- [ ] Are error messages helpful for debugging?
- [ ] Are errors logged with sufficient context?
- [ ] Are retries implemented for transient failures?
- [ ] Are timeouts set for all external calls?
- [ ] Are errors typed (not caught as generic `any` or `unknown` without narrowing)?

### Testing

- [ ] Are there tests for the happy path?
- [ ] Are there tests for error paths?
- [ ] Are there tests for edge cases (empty input, null, undefined)?
- [ ] Are tests independent (no shared mutable state)?
- [ ] Do tests use descriptive names?
- [ ] Are test assertions specific (not just `expect(true).toBe(true)`)?

### Design

- [ ] Does this follow SOLID principles?
- [ ] Is the abstraction level appropriate (not over/under-engineered)?
- [ ] Is there unnecessary coupling between modules?
- [ ] Would this code be easy to test in isolation?
- [ ] Is the code DRY without being overly abstract?
- [ ] Are business rules clearly separated from infrastructure?

---

## Common Validation Mistakes and How to Avoid Them

### Mistake 1: Trusting Type Assertions

```typescript
// ❌ WRONG: Type assertion bypasses type checking
const user = data as User;
console.log(user.name); // Runtime error if data doesn't have .name

// ✅ CORRECT: Runtime validation
const user = userSchema.parse(data); // Zod validates at runtime
```

### Mistake 2: Ignoring Return Values

```typescript
// ❌ WRONG: Ignoring Promise rejection
fetch('/api/data').then(res => res.json());

// ✅ CORRECT: Handle errors
try {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
} catch (error) {
  logger.error('Failed to fetch data', { error });
  throw error;
}
```

### Mistake 3: Testing Implementation, Not Behavior

```typescript
// ❌ WRONG: Testing internal implementation
test('calls transform function', () => {
  const mock = vi.fn();
  processItems(items, mock);
  expect(mock).toHaveBeenCalledTimes(3);
});

// ✅ CORRECT: Testing observable behavior
test('returns processed items', () => {
  const result = processItems(items);
  expect(result).toEqual([expected1, expected2, expected3]);
});
```

### Mistake 4: Incomplete Error Handling

```typescript
// ❌ WRONG: Catching all errors silently
try {
  await riskyOperation();
} catch (e) {
  // Silently swallowed
}

// ✅ CORRECT: Specific error handling with logging
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network error, retrying', { error });
    return retryOperation();
  }
  logger.error('Unexpected error in riskyOperation', { error });
  throw error;
}
```

### Mistake 5: Skipping Validation in "Simple" Code

```typescript
// ❌ WRONG: "This function is simple, no validation needed"
function calculateDiscount(price: number, discount: number) {
  return price - (price * discount); // What if discount > 1? Or negative?
}

// ✅ CORRECT: Always validate inputs at boundaries
function calculateDiscount(price: number, discount: number): number {
  if (price < 0) throw new RangeError('Price cannot be negative');
  if (discount < 0 || discount > 1) throw new RangeError('Discount must be between 0 and 1');
  return price - (price * discount);
}
```

### Mistake 6: Over-Reliance on Static Analysis

Static analysis catches patterns, not semantics. These pass all linters but are wrong:

```typescript
// Passes ESLint, but semantically wrong
const isUserLoggedIn = user.token !== undefined; // Should check expiry too

// Passes type checking, but logically wrong
if (response.status === 200 || response.status === 201) {
  // What about 204? 206? What if it's a redirect?
}
```

**Always combine static analysis with dynamic testing and manual review.**

---

## Validation Reporting Format

```markdown
## Code Validation Report

**File:** src/modules/payment/service.ts
**Author:** Agent-ID-001
**Date:** 2024-01-15
**Gate:** Merge to Main

### Results Summary

| Check | Status | Details |
|-------|--------|---------|
| ESLint | ✅ PASS | 0 errors, 0 warnings |
| Type Check | ✅ PASS | strict mode, no errors |
| Unit Tests | ✅ PASS | 12/12 passed, 94% coverage |
| Integration Tests | ✅ PASS | 5/5 passed |
| Security Audit | ✅ PASS | No vulnerabilities |
| Code Smells | ⚠️ WARNING | 1 long function (32 lines) |
| Manual Review | ✅ APPROVED | Minor naming suggestion |

### Issues Found

1. **WARNING** (Code Smell): `processPayment` is 32 lines (threshold: 30)
   - Suggestion: Extract retry logic into `retryWithBackoff` helper
   - Severity: Low
   - Action: Fix recommended, not blocking

### Overall Status: ✅ APPROVED FOR MERGE
```

---

*Code validation is not a phase — it is a continuous practice. Every line of code
should be written with validation in mind from the moment it is conceived.*
