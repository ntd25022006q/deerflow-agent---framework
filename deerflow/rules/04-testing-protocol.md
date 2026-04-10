# Deerflow Agent Framework — 04: Testing Protocol

> **Status:** Core Rule
> **Priority:** P1 (High — Untested code is broken code)
> **Applies to:** All test creation, modification, and execution

---

## 1. Overview

Testing is not optional — it is a fundamental requirement for any code produced by
a Deerflow agent. This protocol defines the minimum testing standards, the testing
pyramid distribution, test isolation requirements, and the conventions that all
tests must follow.

---

## 2. Minimum 80% Code Coverage

### 2.1 Rules

- **RULE 2.1.1** — All projects must maintain a minimum of 80% code coverage for
  business logic files (services, utilities, controllers, hooks).
- **RULE 2.1.2** — Coverage is measured by line coverage. Branch coverage is
  preferred but line coverage is the minimum metric.
- **RULE 2.1.3** — Configuration files, type definitions, and constants are
  excluded from the coverage requirement.
- **RULE 2.1.4** — The agent must run the coverage report after adding or modifying
  tests to verify the coverage threshold is met.
- **RULE 2.1.5** — If coverage drops below 80% after a change, the agent must add
  tests to bring it back above the threshold before considering the change complete.
- **RULE 2.1.6** — Coverage reports should be generated in a machine-readable
  format (JSON, LCOV) for CI integration.

### 2.2 Coverage Thresholds by File Type

| File Type | Minimum Coverage | Notes |
|-----------|-----------------|-------|
| Services / Business Logic | 90% | Core logic must be thoroughly tested |
| API Controllers / Routes | 85% | Happy path and error paths |
| Hooks (React) | 85% | All branches and edge cases |
| Utility Functions | 95% | Pure functions, every branch |
| Components (React) | 70% | Visual components, key interactions |
| Types / Interfaces | 0% | No runtime code to test |
| Constants / Config | 0% | No runtime code to test |

---

## 3. Unit Tests for All Business Logic

### 3.1 Rules

- **RULE 3.1.1** — Every function in a service, utility, or business logic module
  must have at least one unit test.
- **RULE 3.1.2** — Unit tests must test the function in isolation — no network
  calls, database access, or filesystem access.
- **RULE 3.1.3** — External dependencies must be mocked or stubbed at the module
  boundary, not within the function.
- **RULE 3.1.4** — Unit tests must be fast. A single unit test should complete in
  under 50ms. The full unit test suite should complete in under 30 seconds.
- **RULE 3.1.5** — Each unit test should test one behavior. Use descriptive test
  names to document the expected behavior.

### 3.2 Examples

```typescript
// DO: Isolated unit test with clear behavior description
describe('formatCurrency', () => {
  it('formats a positive number with USD currency symbol', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('formats negative numbers with parentheses', () => {
    expect(formatCurrency(-100, 'USD')).toBe('($100.00)');
  });

  it('throws TypeError for non-number input', () => {
    expect(() => formatCurrency('100' as unknown as number, 'USD'))
      .toThrow(TypeError);
  });
});

// DON'T: Testing multiple behaviors in one test
describe('formatCurrency', () => {
  it('works correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    expect(formatCurrency(-100, 'USD')).toBe('($100.00)');
    // Which assertion failed? Hard to tell from the test output.
  });
});
```

---

## 4. Integration Tests for API Endpoints

### 4.1 Rules

- **RULE 4.1.1** — Every API endpoint must have at least one integration test that
  tests the full request-response cycle.
- **RULE 4.1.2** — Integration tests must test:
  - Successful requests (2xx responses)
  - Validation errors (400 responses)
  - Authentication/authorization failures (401, 403 responses)
  - Not found errors (404 responses)
  - Server errors (500 responses)
- **RULE 4.1.3** — Integration tests should use a test database or in-memory
  database, never the production database.
- **RULE 4.1.4** — Integration tests must clean up after themselves (rollback
  transactions, clear test data).
- **RULE 4.1.5** — Integration tests may be slower than unit tests (up to 500ms
  per test is acceptable).

### 4.2 Examples

```typescript
describe('POST /api/users', () => {
  it('creates a new user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('returns 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John Doe' }) // missing email
      .expect(400);

    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ field: 'email' })
    );
  });

  it('returns 409 for duplicate email', async () => {
    await createTestUser({ email: 'existing@example.com' });

    await request(app)
      .post('/api/users')
      .send({ name: 'Jane Doe', email: 'existing@example.com' })
      .expect(409);
  });
});
```

---

## 5. E2E Tests for Critical Paths

### 5.1 Rules

- **RULE 5.1.1** — Critical user paths must have end-to-end tests:
  - User registration and login
  - Core feature workflows (e.g., checkout, data submission)
  - Error recovery flows
- **RULE 5.1.2** — E2E tests should use a browser automation tool (Playwright,
  Cypress, or similar).
- **RULE 5.1.3** — E2E tests are expensive and slow. Limit them to the most
  critical paths — do not attempt to cover every feature with E2E tests.
- **RULE 5.1.4** — E2E tests must be idempotent — they must produce the same
  result regardless of how many times they are run.
- **RULE 5.1.5** — E2E tests should use realistic but anonymized test data.

### 5.2 Critical Path Identification

```text
Authentication flows:
  → Sign up, sign in, sign out, password reset, token refresh

Core business flows:
  → Primary feature creation/editing/deletion
  → Payment/transaction flows
  → Data export/import

Error recovery:
  → Network failure handling
  → Session expiration handling
  → Invalid input recovery
```

---

## 6. No Mock Data in Tests — Use Fixtures

### 6.1 Rules

- **RULE 6.1.1** — Test data must be defined in fixture files, not inline in test
  files. Fixtures provide reusable, consistent test data.
- **RULE 6.1.2** — Fixture files should be stored in a `__fixtures__/` or
  `test/fixtures/` directory.
- **RULE 6.1.3** — Fixtures must represent realistic data, not minimal stubs.
  Realistic fixtures catch more edge cases than minimal data.
- **RULE 6.1.4** — Fixtures should be typed (TypeScript interfaces) to catch
  schema drift.
- **RULE 6.1.5** — Sensitive data (real emails, passwords, API keys) must never
  appear in fixtures. Use clearly fake data (e.g., `test@example.com`).

### 6.2 Fixture Examples

```typescript
// __fixtures__/users.ts
import type { User, CreateUserDTO } from '@/types';

export const testUsers: User[] = [
  {
    id: 'usr_01',
    name: 'Alice Johnson',
    email: 'alice.test@example.com',
    role: 'admin',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'usr_02',
    name: 'Bob Smith',
    email: 'bob.test@example.com',
    role: 'user',
    createdAt: new Date('2025-01-15'),
  },
];

export const validCreateUserDTO: CreateUserDTO = {
  name: 'Charlie Brown',
  email: 'charlie.test@example.com',
  password: 'SecureTestPassword123!',
};
```

---

## 7. Test Naming Convention

### 7.1 Rules

- **RULE 7.1.1** — Use `describe` blocks to group related tests. The `describe`
  block name should describe the unit under test.
- **RULE 7.1.2** — Use `it` (or `test`) blocks for individual test cases. The
  `it` block name should describe the expected behavior.
- **RULE 7.1.3** — Test names should read as a specification:
  - "it formats the date in ISO 8601 format"
  - "it throws when the input is empty"
  - "it returns null when the user is not found"
- **RULE 7.1.4** — Avoid vague test names like "it works," "it should work,"
  "it doesn't break." These names provide no information about what is being tested.

### 7.2 Naming Patterns

```typescript
// DO: Descriptive test names
describe('UserService.create', () => {
  it('creates a user with valid input and returns the user object');
  it('hashes the password before storing');
  it('throws ValidationError when email is invalid');
  it('throws ConflictError when email already exists');
  it('sends a welcome email after successful creation');
});

// DON'T: Vague test names
describe('UserService', () => {
  it('works');
  it('should create user');
  it('handles errors');
});
```

---

## 8. AAA Pattern (Arrange, Act, Assert)

### 8.1 Rules

- **RULE 8.1.1** — Every test must follow the Arrange-Act-Assert pattern:
  - **Arrange**: Set up the test data and preconditions.
  - **Act**: Execute the function or action being tested.
  - **Assert**: Verify the result matches expectations.
- **RULE 8.1.2** — The three sections should be clearly separated with blank lines
  or comments.
- **RULE 8.1.3** — Each test should have only one Act step. Multiple Act steps
  indicate the test is testing multiple behaviors and should be split.

### 8.2 Examples

```typescript
// DO: Clear AAA pattern with visual separation
it('calculates the total price with tax', () => {
  // Arrange
  const items = [
    { name: 'Widget', price: 10.00, quantity: 2 },
    { name: 'Gadget', price: 25.00, quantity: 1 },
  ];
  const taxRate = 0.08;

  // Act
  const total = calculateTotal(items, taxRate);

  // Assert
  expect(total).toBe(48.60); // (20 + 25) * 1.08
});

// DON'T: Mixed AAA — hard to read
it('calculates the total price with tax', () => {
  const items = [
    { name: 'Widget', price: 10.00, quantity: 2 },
    { name: 'Gadget', price: 25.00, quantity: 1 },
  ];
  const total = calculateTotal(items, 0.08);
  expect(total).toBe(48.60);
  // Where does setup end and action begin? Unclear.
});
```

---

## 9. Test Isolation

### 9.1 Rules

- **RULE 9.1.1** — Tests must not depend on each other. Each test must be able to
  run in isolation and produce the same result regardless of execution order.
- **RULE 9.1.2** — Tests must not share mutable state. Use `beforeEach` or
  `afterEach` to reset state between tests.
- **RULE 9.1.3** — Tests must not depend on the current date/time, random values,
  or other non-deterministic factors. Mock these values.
- **RULE 9.1.4** — Tests must clean up after themselves:
  - Close database connections
  - Clear mock call history
  - Remove temporary files
  - Reset environment variables
- **RULE 9.1.5** — Parallel test execution must be safe. If a test requires
  sequential execution, it must be documented and isolated in its own suite.

### 9.2 Isolation Checklist

```text
[ ] No shared mutable state between tests
[ ] beforeEach/afterEach used for setup/teardown
[ ] No dependency on test execution order
[ ] Dates/times mocked if relevant
[ ] Random values seeded or mocked
[ ] External services mocked
[ ] Filesystem operations in temp directories
[ ] Database transactions rolled back
```

---

## 10. Snapshot Testing Rules

### 10.1 Rules

- **RULE 10.1.1** — Snapshots are useful for detecting unintended changes in
  component rendering, but they must be used judiciously.
- **RULE 10.1.2** — Snapshot tests must have meaningful assertions in addition to
  the snapshot match. Do not rely on snapshots alone.
- **RULE 10.1.3** — When updating a snapshot, review the diff carefully to ensure
  the change is intentional. Never blindly update snapshots.
- **RULE 10.1.4** — Large snapshots (more than 50 lines) are a code smell. They
  indicate the component may need to be split or the test may need to be more
  specific.
- **RULE 10.1.5** — Inline snapshots are preferred over external snapshot files
  for small, focused assertions.
- **RULE 10.1.6** — Snapshot files must be committed to version control.

---

## 11. Performance Test Requirements

### 11.1 Rules

- **RULE 11.1.1** — Performance-sensitive code (API endpoints, data processing,
  rendering) should have performance benchmarks.
- **RULE 11.1.2** — Benchmarks should measure:
  - Execution time
  - Memory usage
  - Throughput (operations per second)
- **RULE 11.1.3** — Performance tests must be deterministic. Run them multiple
  times and compare results to identify variance.
- **RULE 11.1.4** — Establish baseline metrics and fail the test if performance
  degrades beyond a threshold (e.g., 20% slower than baseline).
- **RULE 11.1.5** — Performance tests should be run in CI with a dedicated
  performance testing workflow, not in the standard test suite.

### 11.2 Performance Test Example

```typescript
describe('parseCSV performance', () => {
  it('parses 10,000 rows in under 100ms', () => {
    const csv = generateCSV(10_000);
    const start = performance.now();
    parseCSV(csv);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

---

## 12. Test Environment

### 12.1 Rules

- **RULE 12.1.1** — Use a dedicated test environment configuration (`.env.test`)
  that points to test databases, test services, and test API keys.
- **RULE 12.1.2** — Never use production credentials or production endpoints in
  tests.
- **RULE 12.1.3** — Test environment variables must be clearly marked as test-only
  (e.g., `TEST_DATABASE_URL`).
- **RULE 12.1.4** — CI pipelines must set the `NODE_ENV=test` environment variable.

---

## 13. Summary

A comprehensive test suite is the safety net that allows confident code changes.
These rules ensure that tests are well-organized, reliable, and meaningful. A test
suite that follows these rules provides confidence, catches bugs early, and serves
as living documentation of the system's expected behavior.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-004*
