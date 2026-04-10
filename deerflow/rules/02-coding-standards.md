# Deerflow Agent Framework — 02: Coding Standards

> **Status:** Core Rule
> **Priority:** P1 (High — Code quality is non-negotiable)
> **Applies to:** All TypeScript, JavaScript, and any code generated or modified by agents

---

## 1. Overview

This rule establishes the coding standards that every Deerflow agent must follow
when writing, modifying, or reviewing code. These standards ensure consistency,
maintainability, and reliability across all codebases touched by Deerflow agents.

---

## 2. TypeScript Strictness

### 2.1 No TypeScript Errors Tolerated

- **RULE 2.1.1** — All code must compile with zero TypeScript errors (`tsc --noEmit`).
- **RULE 2.1.2** — Zero warnings are the goal. If warnings exist, they must have an
  accepted justification documented in a code comment.
- **RULE 2.1.3** — The agent must run `tsc --noEmit` after every significant code
  change to verify compilation succeeds.
- **RULE 2.1.4** — If a pre-existing error is encountered, do not introduce
  additional errors. Fix the pre-existing error if possible.

### 2.2 No `any` Types (Strict Mode)

- **RULE 2.2.1** — The `any` type is prohibited in all new code. Use `unknown` and
  narrow the type with type guards.
- **RULE 2.2.2** — If interfacing with untyped third-party code, create a type
  definition that describes the expected shape rather than using `any`.
- **RULE 2.2.3** — Existing `any` types encountered in the codebase should be flagged
  and replaced with proper types when the surrounding code is modified.
- **RULE 2.2.4** — Exception: `any` is acceptable in test files for mocking purposes,
  but `unknown` is still preferred.

### 2.3 All Functions Must Have Return Types

- **RULE 2.3.1** — Every function must have an explicit return type annotation. Relying
  on type inference for return types hides the contract and makes refactoring fragile.
- **RULE 2.3.2** — Arrow functions in JSX callbacks may omit return types if the type
  is trivially inferrable from context (e.g., `onClick={() => setOpen(true)}`).
- **RULE 2.3.3** — Public API functions must have return types regardless of context.

### 2.4 Examples

```typescript
// DO: Explicit return types, no 'any', proper typing
interface User {
  id: string;
  name: string;
  email: string;
}

function findUserById(id: string): User | null {
  // implementation
}

// DO: Use 'unknown' and type guards instead of 'any'
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value
  );
}

// DON'T: No return type, uses 'any'
function findUser(id) {  // Missing types
  return db.find(id);     // Implicit any return
}

// DON'T: Using 'any' for JSON parsing
function parseJSON(input: string): any {  // Prohibited
  return JSON.parse(input);
}
```

---

## 3. No Unused Imports

### 3.1 Rules

- **RULE 3.1.1** — Every import must be used. Unused imports are dead code that
  clutters the file and confuses readers.
- **RULE 3.1.2** — Before finalizing any file, verify all imports are referenced in
  the code.
- **RULE 3.1.3** — Re-exports (e.g., `export { something } from 'module'`) are
  considered "used" and are acceptable.
- **RULE 3.1.4** — Type-only imports should use the `import type` syntax to enable
  tree-shaking and clarify intent.

### 3.2 Examples

```typescript
// DO: All imports are used
import type { User } from './types';
import { formatName } from './utils';
import { useAuth } from '../hooks/use-auth';

function UserCard({ user }: { user: User }): JSX.Element {
  const { isAuthenticated } = useAuth();
  const displayName = formatName(user.name);
  return <div>{displayName}</div>;
}

// DON'T: Unused import
import { useState, useEffect, useCallback } from 'react';
//         ^^^^^^^^^^ unused

function Counter(): JSX.Element {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

---

## 4. JSDoc on All Public Functions

### 4.1 Rules

- **RULE 4.1.1** — Every exported function, class, and interface must have a JSDoc
  comment that describes its purpose, parameters, and return value.
- **RULE 4.1.2** — JSDoc must use the `@param`, `@returns`, and `@throws` tags
  where applicable.
- **RULE 4.1.3** — Internal (non-exported) functions should have JSDoc if their
  behavior is not obvious from the function name alone.
- **RULE 4.1.4** — JSDoc should describe **why**, not **what**. The code already
  shows what; the JSDoc should explain the intent and context.

### 4.2 Examples

```typescript
// DO: Comprehensive JSDoc
/**
 * Validates an email address against RFC 5322 simplified pattern.
 *
 * This validator checks for the presence of an @ symbol, a valid domain,
 * and rejects obviously malformed addresses. It is not a complete RFC 5322
 * implementation — use a dedicated email validation library for production
 * systems that require strict compliance.
 *
 * @param email - The email address string to validate.
 * @returns `true` if the email address is valid, `false` otherwise.
 * @throws {TypeError} If the input is not a string.
 *
 * @example
 * ```typescript
 * isValidEmail('user@example.com'); // true
 * isValidEmail('not-an-email');     // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  // implementation
}

// DON'T: Useless JSDoc that restates the function name
/**
 * Returns the user name.
 */
export function getUserName(): string {
  // implementation
}
```

---

## 5. SOLID Principles

### 5.1 Single Responsibility Principle (SRP)

- **RULE 5.1.1** — A class or module should have only one reason to change.
- **RULE 5.1.2** — If a function does more than one thing, split it into smaller
  functions, each with a single responsibility.
- **RULE 5.1.3** — A file should contain closely related code. If a file contains
  unrelated exports, consider splitting it.

### 5.2 Open/Closed Principle (OCP)

- **RULE 5.2.1** — Design modules to be open for extension but closed for
  modification. Use interfaces, abstract classes, and dependency injection.
- **RULE 5.2.2** — Avoid deep `if/else` or `switch` chains. Use strategy patterns,
  maps, or polymorphism instead.

### 5.3 Liskov Substitution Principle (LSP)

- **RULE 5.3.1** — Subtypes must be substitutable for their base types without
  altering the correctness of the program.
- **RULE 5.3.2** — Avoid narrowing parameter types or widening return types in
  subclasses.

### 5.4 Interface Segregation Principle (ISP)

- **RULE 5.4.1** — Prefer many small, focused interfaces over one large interface.
- **RULE 5.4.2** — Clients should not be forced to depend on methods they do not use.
- **RULE 5.4.3** — When defining props for components, split large prop interfaces
  into composition of smaller ones.

### 5.5 Dependency Inversion Principle (DIP)

- **RULE 5.5.1** — High-level modules should not depend on low-level modules. Both
  should depend on abstractions.
- **RULE 5.5.2** — Use dependency injection to invert control flow.
- **RULE 5.5.3** — Define interfaces for external service dependencies rather than
  importing concrete implementations directly.

### 5.6 Examples

```typescript
// DO: Interface segregation — small, focused interfaces
interface Readable {
  read(id: string): Promise<Document | null>;
}

interface Writable {
  create(data: CreateDocumentDTO): Promise<Document>;
  update(id: string, data: Partial<CreateDocumentDTO>): Promise<Document>;
}

interface Deletable {
  delete(id: string): Promise<void>;
}

// A read-only service depends only on Readable
class DocumentViewer {
  constructor(private readonly repository: Readable) {}
  async view(id: string): Promise<Document | null> {
    return this.repository.read(id);
  }
}

// DON'T: Fat interface forcing clients to implement methods they don't need
interface DocumentRepository {
  read(id: string): Promise<Document | null>;
  create(data: CreateDocumentDTO): Promise<Document>;
  update(id: string, data: Partial<CreateDocumentDTO>): Promise<Document>;
  delete(id: string): Promise<void>;
  audit(action: string): Promise<void>;
  export(format: string): Promise<Blob>;
}

// A read-only viewer is forced to implement delete, create, etc.
class DocumentViewer implements DocumentRepository {
  async read(id: string) { /* ... */ }
  async create() { throw new Error('Not supported'); }
  async update() { throw new Error('Not supported'); }
  async delete() { throw new Error('Not supported'); }
  async audit() { throw new Error('Not supported'); }
  async export() { throw new Error('Not supported'); }
}
```

---

## 6. DRY Principle (Don't Repeat Yourself)

### 6.1 Rules

- **RULE 6.1.1** — If the same logic appears in three or more places, extract it
  into a shared utility function.
- **RULE 6.1.2** — If two pieces of code are similar but not identical, analyze
  whether they can be unified with parameterization before abstracting.
- **RULE 6.1.3** — Do not over-abstract. Premature abstraction creates indirection
  that makes code harder to understand. The Rule of Three applies: wait until a
  pattern appears three times before abstracting.

### 6.2 Anti-Pattern: Over-Abstraction

```typescript
// DON'T: Over-abstracted configuration with unclear intent
function createConfig<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T>,
  env: Partial<T>
): T {
  return { ...defaults, ...overrides, ...env } as T;
}

// DO: Concrete, clear configuration merging
interface AppConfig {
  apiUrl: string;
  timeout: number;
  retries: number;
}

function loadAppConfig(): AppConfig {
  const defaults: AppConfig = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
  };
  return {
    ...defaults,
    apiUrl: process.env.API_URL ?? defaults.apiUrl,
    timeout: Number(process.env.TIMEOUT ?? defaults.timeout),
  };
}
```

---

## 7. Error Handling Patterns

### 7.1 Rules

- **RULE 7.1.1** — All async operations must be wrapped in try-catch blocks.
- **RULE 7.1.2** — Use custom error classes for domain-specific errors (see
  Rule 10: Error Handling).
- **RULE 7.1.3** — Never catch an error and silently swallow it. At minimum, log
  the error.
- **RULE 7.1.4** — Use `Result` types or error boundaries for predictable error
  propagation in complex flows.

### 7.2 Examples

```typescript
// DO: Proper async error handling
async function fetchUserData(userId: string): Promise<User> {
  try {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      throw new UserNotFoundError(userId);
    }
    throw new UserDataFetchError('Failed to fetch user data', { cause: error });
  }
}

// DON'T: Silent error swallowing
async function fetchUserData(userId: string): Promise<User> {
  try {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  } catch {
    return null; // Silent failure — WHY did it fail? We'll never know.
  }
}
```

---

## 8. Naming Conventions

### 8.1 Rules

- **RULE 8.1.1** — Variables and functions: `camelCase`
  - `userName`, `fetchData`, `isAuthenticated`
- **RULE 8.1.2** — Classes and interfaces: `PascalCase`
  - `UserService`, `HttpClient`, `ApiResponse`
- **RULE 8.1.3** — Constants: `UPPER_SNAKE_CASE`
  - `MAX_RETRIES`, `DEFAULT_TIMEOUT`, `API_BASE_URL`
- **RULE 8.1.4** — Private members: prefix with `#` (ECMAScript private) or `_`
  - `#cache`, `_internalState`
- **RULE 8.1.5** — Boolean variables: prefix with `is`, `has`, `should`, `can`
  - `isValid`, `hasPermission`, `shouldRetry`, `canEdit`
- **RULE 8.1.6** — Event handlers: prefix with `handle` or `on`
  - `handleClick`, `handleSubmit`, `onError`
- **RULE 8.1.7** — Type parameters: single uppercase letter or descriptive PascalCase
  - `T`, `TData`, `TResponse`, `TError`
- **RULE 8.1.8** — Files: `kebab-case` (see Rule 01, Section 8)
- **RULE 8.1.9** — Avoid abbreviations unless universally understood. Use `button`
  not `btn`, `message` not `msg`, `request` not `req`.

### 8.2 Naming Quality Checklist

```text
[ ] Name describes the intent, not the implementation
[ ] Name is pronounceable and memorable
[ ] Name is not ambiguous or overloaded
[ ] Name follows the convention for its category
[ ] Name is not abbreviated (unless universal)
```

---

## 9. Function and File Length Limits

### 9.1 Maximum Function Length: 50 Lines

- **RULE 9.1.1** — No function (including the function signature and body) should
  exceed 50 lines. If it does, it should be decomposed into smaller functions.
- **RULE 9.1.2** — This limit encourages single-responsibility functions that are
  easy to read, test, and maintain.
- **RULE 9.1.3** — Exception: Generated code, configuration objects, and lookup
  tables may exceed this limit if splitting them would reduce clarity.

### 9.2 Maximum File Length: 500 Lines

- **RULE 9.2.1** — No file should exceed 500 lines. If it does, it should be split
  into multiple files.
- **RULE 9.2.2** — Split files along logical boundaries: types, utilities, main
  logic, tests.
- **RULE 9.2.3** — If a file cannot be split without breaking its logical cohesion,
  it may be an indicator that the module itself is too large and should be
  decomposed at a higher level.

### 9.3 Cyclomatic Complexity Limit: 10

- **RULE 9.3.1** — No function should have a cyclomatic complexity greater than 10.
- **RULE 9.3.2** — Cyclomatic complexity is the number of linearly independent paths
  through a function's control flow. Each `if`, `else if`, `case`, `&&`, `||`, `? :`,
  `for`, `while`, and `catch` increments the count by 1.
- **RULE 9.3.3** — To reduce complexity: extract conditional logic into helper
  functions, use lookup tables instead of switch statements, and apply the strategy
  pattern for complex conditional behavior.

### 9.4 Examples

```typescript
// DON'T: High cyclomatic complexity (complexity > 10)
function calculatePrice(item: Item, user: User, coupon: Coupon | null, season: Season): number {
  let price = item.basePrice;
  if (user.isPremium) price *= 0.9;
  if (season === 'winter') price *= 0.8;
  else if (season === 'summer') price *= 1.1;
  if (coupon) {
    if (coupon.type === 'percent') price *= (1 - coupon.value / 100);
    else if (coupon.type === 'fixed') price -= coupon.value;
    if (coupon.minPurchase && price < coupon.minPurchase) price = coupon.minPurchase;
    if (coupon.maxDiscount && price < item.basePrice - coupon.maxDiscount) {
      price = item.basePrice - coupon.maxDiscount;
    }
  }
  if (item.category === 'electronics' && price > 1000) price *= 0.95;
  if (user.loyaltyPoints > 1000) price -= 50;
  return Math.max(0, price);
}

// DO: Decomposed into low-complexity functions
function calculateBasePrice(item: Item, season: Season): number {
  const seasonalMultiplier = { winter: 0.8, spring: 1.0, summer: 1.1, fall: 1.0 };
  return item.basePrice * seasonalMultiplier[season];
}

function applyUserDiscounts(price: number, user: User): number {
  if (user.isPremium) price *= 0.9;
  if (user.loyaltyPoints > 1000) price -= 50;
  return price;
}

function applyCategoryDiscount(price: number, item: Item): number {
  if (item.category === 'electronics' && price > 1000) price *= 0.95;
  return price;
}

function applyCoupon(price: number, coupon: Coupon | null): number {
  if (!coupon) return price;
  return applyCouponDiscount(applyCouponValue(price, coupon), coupon);
}

function calculatePrice(item: Item, user: User, coupon: Coupon | null, season: Season): number {
  return Math.max(0, pipe(
    calculateBasePrice(item, season),
    (p) => applyCoupon(p, coupon),
    (p) => applyCategoryDiscount(p, item),
    (p) => applyUserDiscounts(p, user),
  ));
}
```

---

## 10. Code Organization

### 10.1 Rules

- **RULE 10.1.1** — Organize code in a consistent order within each file:
  1. Imports (grouped: external, internal, relative)
  2. Type definitions
  3. Constants
  4. Utility functions
  5. Main exports
  6. Default export (if applicable)

- **RULE 10.1.2** — Group imports with blank lines between groups:
  ```typescript
  // External
  import { Router } from 'express';

  // Internal
  import { logger } from '@/common/logger';
  import { validateRequest } from '@/middleware/validation';

  // Relative
  import { UserController } from './user.controller';
  import { userRoutes } from './user.routes';
  ```

- **RULE 10.1.3** — Avoid deep nesting. If indentation exceeds 4 levels, refactor
  using early returns, guard clauses, or extracting functions.

- **RULE 10.1.4** — Use consistent string quotes throughout the project (prefer
  single quotes `'` for non-JSX strings, double quotes `"` for JSX attributes).

- **RULE 10.1.5** — Use consistent semicolon usage throughout the project (prefer
  always using semicolons).

---

## 11. Modern TypeScript Features

### 11.1 Rules

- **RULE 11.1.1** — Prefer `const` over `let`. Use `let` only when reassignment is
  necessary.
- **RULE 11.1.2** — Use template literals over string concatenation.
- **RULE 11.1.3** — Use optional chaining (`?.`) and nullish coalescing (`??`)
  instead of manual null checks where appropriate.
- **RULE 11.1.4** — Use `async/await` over `.then()` chains for readability.
- **RULE 11.1.5** — Use `Map` and `Set` over plain objects for key-value and
  collection semantics when appropriate.
- **RULE 11.1.6** — Use destructuring for function parameters and variable
  assignment.
- **RULE 11.1.7** — Use `Object.freeze()` or `as const` for constant objects that
  should not be modified.

### 11.2 Examples

```typescript
// DO: Modern TypeScript
const displayName = user?.profile?.name ?? 'Anonymous';
const greeting = `Hello, ${displayName}!`;
const { id, name, email } = user;
const result = await fetchUserData(id);

// DON'T: Outdated patterns
const displayName = user && user.profile && user.profile.name || 'Anonymous';
const greeting = 'Hello, ' + displayName + '!';
const id = user.id;
const name = user.name;
const email = user.email;
fetchUserData(id).then(result => { ... });
```

---

## 12. Summary

These coding standards ensure that every line of code produced by a Deerflow agent
is type-safe, well-documented, well-organized, and maintainable. Consistent
adherence to these standards results in codebases that are easy to read, easy to
test, and easy to extend.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-002*
