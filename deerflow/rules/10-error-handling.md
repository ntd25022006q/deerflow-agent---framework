# Deerflow Agent Framework — 10: Error Handling

> **Status:** Core Rule
> **Priority:** P2 (Operational — Essential for system reliability)
> **Applies to:** All error handling, recovery, and resilience patterns

---

## 1. Overview

Robust error handling is the difference between a system that degrades gracefully
and one that crashes catastrophically. This rule defines the error handling patterns
that every Deerflow agent must implement to ensure reliability, debuggability, and
user satisfaction.

---

## 2. Try-Catch for All Async Operations

### 2.1 Rules

- **RULE 2.1.1** — Every `async` function that performs an I/O operation
  (network request, database query, file system access) must be wrapped in
  try-catch.
- **RULE 2.1.2** — The catch block must handle the error appropriately:
  - Log the error with context
  - Convert to a domain-specific error if applicable
  - Re-throw if the caller needs to handle it
  - Return a fallback value if appropriate
- **RULE 2.1.3** — Never use empty catch blocks. Every catch must either handle
  the error or re-throw it with additional context.
- **RULE 2.1.4** — Use `finally` blocks for cleanup operations (closing connections,
  releasing resources).

### 2.2 Examples

```typescript
// DO: Comprehensive async error handling
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const response = await apiClient.get<UserProfile>(`/users/${userId}/profile`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user profile', { userId, error });
    throw new UserProfileFetchError(
      `Unable to fetch profile for user ${userId}`,
      { cause: error }
    );
  }
}

// DON'T: Empty catch block
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const response = await apiClient.get<UserProfile>(`/users/${userId}/profile`);
    return response.data;
  } catch {
    // Silent failure — no logging, no error propagation, no fallback
  }
}

// DON'T: Catching and ignoring with a fallback return (without logging)
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await apiClient.get<UserProfile>(`/users/${userId}/profile`);
    return response.data;
  } catch {
    return null; // Why did it fail? We'll never know.
  }
}
```

---

## 3. Custom Error Classes

### 3.1 Rules

- **RULE 3.1.1** — Define custom error classes for domain-specific errors. This
  enables type-safe error handling and clearer error communication.
- **RULE 3.1.2** — Custom error classes must extend the native `Error` class.
- **RULE 3.1.3** — Custom error classes must include:
  - A descriptive `message` parameter
  - An optional `cause` parameter (for error chaining)
  - A `code` property for programmatic identification
  - Relevant metadata (e.g., `userId`, `resourceId`)
- **RULE 3.1.4** — Custom error classes should be organized in an `errors/`
  directory.

### 3.2 Base Error Class

```typescript
/**
 * Base error class for all application-specific errors.
 * Provides error chaining, error codes, and metadata.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode?: number;
      isOperational?: boolean;
      cause?: Error;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.metadata = options.metadata;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 3.3 Domain-Specific Error Examples

```typescript
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, {
      code: 'NOT_FOUND',
      statusCode: 404,
      metadata: { resource, id },
    });
  }
}

export class ValidationError extends AppError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      metadata: { errors },
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      metadata: { retryAfter },
    });
  }
}
```

---

## 4. Error Boundary in React Components

### 4.1 Rules

- **RULE 4.1.1** — All React applications must have at least one top-level error
  boundary that catches unhandled rendering errors.
- **RULE 4.1.2** — Error boundaries must display a user-friendly error UI with:
  - A clear message explaining what happened (without technical details)
  - A "Try Again" button that attempts to recover
  - A "Go Home" button as a fallback navigation
- **RULE 4.1.3** — Error boundaries should be placed at strategic boundaries:
  - Around the entire application (catches all rendering errors)
  - Around complex components (isolates failures to specific sections)
  - Around lazy-loaded routes (prevents route failures from crashing the app)
- **RULE 4.1.4** — Error boundaries must log the error to an error monitoring
  service (Sentry, Rollbar, etc.).

### 4.2 Error Boundary Example

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Error boundary caught an error', { error, errorInfo });
    errorMonitoringService.reportError(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="error-fallback">
            <h2>Something went wrong</h2>
            <p>We're sorry, an unexpected error occurred.</p>
            <button onClick={this.handleRetry}>Try Again</button>
            <button onClick={() => window.location.href = '/'}>Go Home</button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## 5. Graceful Degradation

### 5.1 Rules

- **RULE 5.1.1** — When a non-critical feature fails, the application should
  continue to function with reduced functionality rather than crashing entirely.
- **RULE 5.1.2** — Graceful degradation must be implemented for:
  - Third-party API failures (show cached data or a placeholder)
  - Feature flag failures (default to the safe option)
  - Optional service failures (disable the feature, show a notice)
  - CDN/asset loading failures (fallback fonts, placeholder images)
- **RULE 5.1.3** — Critical features (authentication, data integrity, payment
  processing) must NOT gracefully degrade — they must fail explicitly with
  clear error messages.

### 5.2 Examples

```typescript
// DO: Graceful degradation for non-critical feature
async function loadRecommendations(userId: string): Promise<Recommendation[]> {
  try {
    return await recommendationService.getForUser(userId);
  } catch (error) {
    logger.warn('Recommendation service unavailable, showing popular items', { error });
    return await recommendationService.getPopular(); // Fallback to popular items
  }
}

// DO: Critical feature fails explicitly
async function processPayment(paymentData: PaymentData): Promise<PaymentResult> {
  try {
    return await paymentService.charge(paymentData);
  } catch (error) {
    logger.error('Payment processing failed', { error });
    throw new PaymentError('Unable to process payment. Please try again or contact support.');
    // Do NOT silently fail or return a fake success
  }
}
```

---

## 6. Error Logging

### 6.1 Rules

- **RULE 6.1.1** — All errors must be logged with sufficient context to diagnose
  the issue:
  - Error message and stack trace
  - Timestamp (ISO 8601)
  - Request ID or correlation ID
  - Relevant parameters (but NOT secrets or PII)
  - Environment (development, staging, production)
- **RULE 6.1.2** — Use structured logging (JSON format) for machine-parseable
  logs. Avoid plain text logs in production.
- **RULE 6.1.3** — Log levels must be used correctly:
  - `error` — Unrecoverable errors requiring immediate attention
  - `warn` — Recoverable issues that may indicate problems
  - `info` — Significant events for operational visibility
  - `debug` — Detailed information for development debugging
- **RULE 6.1.4** — Integrate with an error monitoring service (Sentry, Rollbar,
  Datadog) for production error tracking.

### 6.2 Structured Logging Example

```typescript
logger.error('Database connection failed', {
  timestamp: new Date().toISOString(),
  requestId: req.headers['x-request-id'],
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack,
  },
  context: {
    host: config.database.host,        // NOT the full connection string
    database: config.database.name,    // NOT credentials
    attempt: retryCount,
  },
});
```

---

## 7. User-Friendly Error Messages

### 7.1 Rules

- **RULE 7.1.1** — Error messages shown to users must be clear, actionable, and
  non-technical.
- **RULE 7.1.2** — Error messages must:
  - Describe what happened (in plain language)
  - Explain why it happened (if possible and helpful)
  - Suggest what the user can do about it
- **RULE 7.1.3** — Never expose technical details (stack traces, SQL queries,
  internal paths, library names) to end users.
- **RULE 7.1.4** — Use consistent error message formatting throughout the
  application.

### 7.2 Error Message Templates

```typescript
// Map internal errors to user-friendly messages
const userFacingMessages: Record<string, string> = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  VALIDATION_ERROR: 'Please check the form for errors and try again.',
  AUTHENTICATION_ERROR: 'Your session has expired. Please sign in again.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  RATE_LIMIT_EXCEEDED: 'You are making too many requests. Please wait a moment and try again.',
  NOT_FOUND: 'The requested resource could not be found.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
};
```

---

## 8. Retry with Exponential Backoff

### 8.1 Rules

- **RULE 8.1.1** — Transient failures (network timeouts, rate limits, temporary
  service unavailability) should be retried with exponential backoff.
- **RULE 8.1.2** — Exponential backoff configuration:
  - Initial delay: 1 second
  - Maximum delay: 60 seconds
  - Backoff multiplier: 2x
  - Maximum retries: 3-5 (depending on criticality)
  - Jitter: ±500ms to prevent thundering herd
- **RULE 8.1.3** — Only retry idempotent operations. Non-idempotent operations
  (e.g., payment processing) must NOT be retried automatically.
- **RULE 8.1.4** — Do not retry on non-transient errors (400, 401, 403, 404, 422).

### 8.3 Implementation

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    shouldRetry = (error: unknown) =>
      error instanceof NetworkError || error instanceof RateLimitError,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const jitter = Math.random() * 500 - 250;
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error,
        nextAttempt: attempt + 2,
      });

      await sleep(delay + jitter);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError;
}
```

---

## 9. Circuit Breaker Pattern

### 9.1 Rules

- **RULE 9.1.1** — For operations that call external services, implement a circuit
  breaker to prevent cascading failures.
- **RULE 9.1.2** — Circuit breaker states:
  - **Closed** — Normal operation. Requests pass through.
  - **Open** — Service is considered down. Requests are rejected immediately.
  - **Half-Open** — Testing if the service has recovered. Allow limited requests.
- **RULE 9.1.3** — Circuit breaker thresholds (configurable):
  - Failure threshold: 5 consecutive failures to open the circuit
  - Recovery timeout: 30 seconds before transitioning to half-open
  - Half-open max requests: 1 request to test recovery
  - Success threshold: 1 success to close the circuit

### 9.2 Implementation

```typescript
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;

  constructor(options: { failureThreshold?: number; recoveryTimeoutMs?: number } = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 30_000;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime ?? 0) >= this.recoveryTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError('Service is temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

---

## 10. No Silent Failures

### 10.1 Rules

- **RULE 10.1.1** — Every error must be either handled explicitly (logged,
  reported to the user, converted to a domain error) or re-thrown.
- **RULE 10.1.2** — The following are considered silent failures and are
  prohibited:
  - Empty catch blocks
  - Catch blocks that only return `null` or `undefined` without logging
  - `Promise.allSettled` results that are never inspected
  - `fire-and-forget` async calls without error handling
  - `.catch(() => {})` or `.catch(() => undefined)`
- **RULE 10.1.3** — Even for "expected" errors (e.g., "user not found"), the
  error must be logged at an appropriate level (e.g., `info` or `warn`).

### 10.2 Examples

```typescript
// DON'T: Silent failure patterns
try { await riskyOperation(); } catch { /* intentionally empty */ }
Promise.all([task1(), task2()]).catch(() => undefined); // Ignores ALL errors
void backgroundTask(); // No error handling at all

// DO: Explicit error handling
try {
  await riskyOperation();
} catch (error) {
  logger.warn('Risky operation failed (non-critical)', { error });
  // Fallback behavior or error reporting
}

// DO: Handle Promise.allSettled results
const results = await Promise.allSettled([task1(), task2()]);
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    logger.error(`Task ${index} failed`, { error: result.reason });
  }
});
```

---

## 11. Summary

Error handling is the safety net of reliable software. These patterns ensure that
errors are caught, logged, communicated clearly, and recovered from gracefully.
By following these rules, agents build systems that fail well — providing useful
information instead of silent corruption.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-010*
