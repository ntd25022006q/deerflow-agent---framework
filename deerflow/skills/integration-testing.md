# Integration Testing Agent Skill

> **Skill ID:** integration-testing
> **Version:** 1.0.0
> **Category:** Testing & Quality Assurance
> **Priority:** HIGH — Must be applied to all code that interacts with external systems,
> databases, APIs, or third-party services.

---

## Purpose

This skill defines the standards, patterns, and best practices for writing integration
tests in the Deerflow Agent Framework. Integration tests verify that individual components
work correctly together, including interactions with databases, external APIs, message
queues, file systems, and other services.

---

## Integration Testing Philosophy

### The Testing Pyramid (Revised for AI-Generated Code)

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲           Few, slow, expensive
                 ╱────────╲
                ╱ Integ.   ╲        Moderate, medium speed
               ╱─────────────╲
              ╱  Unit Tests   ╲     Many, fast, cheap
             ╱─────────────────╲
```

### Key Principles

1. **Test behavior, not implementation** — Tests should survive refactoring
2. **Isolate from external dependencies** — Use proper test doubles, not live services
3. **Make tests deterministic** — Same input always produces same output
4. **Keep tests independent** — No shared mutable state between tests
5. **Test realistic scenarios** — Use production-like data shapes and volumes
6. **Make tests fast** — Slow integration tests get skipped or ignored
7. **Make tests readable** — Test code IS production code — maintain it

---

## Integration Test Design Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

Every test MUST follow this structure:

```typescript
describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should create a charge and update order status', async () => {
      // ARRANGE — Set up preconditions
      const orderId = 'order-123';
      const paymentInput = { amount: 99.99, currency: 'USD' };
      const existingOrder = createTestOrder({ id: orderId, status: 'PENDING' });
      await seedDatabase([existingOrder]);

      // ACT — Execute the system under test
      const result = await paymentService.processPayment(orderId, paymentInput);

      // ASSERT — Verify the outcome
      expect(result.status).toBe('COMPLETED');
      const updatedOrder = await orderRepository.findById(orderId);
      expect(updatedOrder?.status).toBe('PAID');
      expect(updatedOrder?.paidAt).toBeInstanceOf(Date);
    });
  });
});
```

### Pattern 2: Given-When-Then (BDD Style)

```typescript
describe('User Registration Flow', () => {
  it('allows a new user to register with valid credentials', async () => {
    // GIVEN — The system is in a known state
    await givenUserDoesNotExist('newuser@example.com');

    // WHEN — An action is performed
    const response = await whenUserRegisters({
      email: 'newuser@example.com',
      password: 'SecureP@ss123!',
    });

    // THEN — The expected outcome is verified
    thenResponseShouldBe201(response);
    thenUserShouldExistInDatabase('newuser@example.com');
    thenWelcomeEmailShouldBeSent('newuser@example.com');
  });
});
```

### Pattern 3: Test Fixture Factory

```typescript
// test/factories/user.factory.ts
interface CreateUserOptions {
  overrides?: Partial<User>;
  withProfile?: boolean;
  withSettings?: boolean;
  verified?: boolean;
}

function createTestUser(options: CreateUserOptions = {}): User {
  const base: User = {
    id: generateId(),
    email: `user-${Date.now()}@test.example.com`,
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options.overrides,
  };

  if (options.withProfile) {
    base.profile = createTestProfile({ userId: base.id });
  }

  if (options.withSettings) {
    base.settings = createTestSettings({ userId: base.id });
  }

  if (options.verified) {
    base.emailVerifiedAt = new Date();
  }

  return base;
}

// Usage in tests
const adminUser = createTestUser({
  overrides: { role: 'ADMIN', email: 'admin@test.com' },
  withSettings: true,
  verified: true,
});
```

### Pattern 4: Shared Test Context

```typescript
// test/helpers/test-context.ts
class TestContext {
  private _userId: string | null = null;

  async createAuthenticatedUser(): Promise<{ token: string; userId: string }> {
    const user = createTestUser({ verified: true });
    const saved = await userRepository.save(user);
    this._userId = saved.id;
    const token = generateTestToken(saved.id);
    return { token, userId: saved.id };
  }

  get userId(): string {
    if (!this._userId) throw new Error('No user created in this context');
    return this._userId;
  }

  async cleanup(): Promise<void> {
    if (this._userId) {
      await userRepository.delete(this._userId);
    }
  }
}

// Usage in test suite
describe('Order API', () => {
  const ctx = new TestContext();

  beforeEach(async () => {
    await ctx.createAuthenticatedUser();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });
});
```

---

## API Endpoint Testing

### REST API Test Template

```typescript
describe('POST /api/v1/orders', () => {
  const baseUrl = 'http://localhost:3000/api/v1';

  it('creates an order with valid input', async () => {
    // Arrange
    const token = await getAuthToken({ role: 'CUSTOMER' });
    const payload = {
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
      },
    };

    // Act
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // Assert
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toMatch(/^order-/);
    expect(body.items).toHaveLength(2);
    expect(body.total).toBeGreaterThan(0);
    expect(body.status).toBe('PENDING');
    expect(body.createdAt).toBeDefined();
  });

  it('returns 401 without authentication', async () => {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 422 with invalid input', async () => {
    const token = await getAuthToken({ role: 'CUSTOMER' });
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: 'invalid' }),
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors.items).toBeDefined();
  });

  it('returns 400 when product is out of stock', async () => {
    const token = await getAuthToken({ role: 'CUSTOMER' });
    const outOfStockProduct = await seedProduct({ id: 'prod-oos', stock: 0 });
    const payload = {
      items: [{ productId: 'prod-oos', quantity: 1 }],
      shippingAddress: createTestAddress(),
    };

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('OUT_OF_STOCK');
  });
});
```

### GraphQL API Test Template

```typescript
describe('GraphQL: orders query', () => {
  const query = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        status
        items {
          productId
          quantity
          unitPrice
        }
        total
        createdAt
      }
    }
  `;

  it('returns an order by ID', async () => {
    const order = await seedOrder({ id: 'order-1', status: 'PAID' });
    const token = await getAuthToken({ userId: order.userId });

    const response = await graphqlRequest({
      query,
      variables: { id: 'order-1' },
      token,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data.order.id).toBe('order-1');
    expect(response.data.order.status).toBe('PAID');
    expect(response.data.order.items).toHaveLength(order.items.length);
  });

  it('returns null for non-existent order', async () => {
    const token = await getAuthToken({ userId: 'user-1' });

    const response = await graphqlRequest({
      query,
      variables: { id: 'non-existent' },
      token,
    });

    expect(response.errors).toBeUndefined();
    expect(response.data.order).toBeNull();
  });

  it('returns error when user does not own the order', async () => {
    await seedOrder({ id: 'order-owned', userId: 'user-A' });
    const otherUserToken = await getAuthToken({ userId: 'user-B' });

    const response = await graphqlRequest({
      query,
      variables: { id: 'order-owned' },
      token: otherUserToken,
    });

    expect(response.errors).toBeDefined();
    expect(response.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});
```

---

## Database Integration Testing

### Database Test Setup

```typescript
// test/helpers/database.ts
import { PrismaClient } from '@prisma/client';

// Use a separate test database
const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const prisma = new PrismaClient({
  datasources: {
    db: { url: testDatabaseUrl },
  },
});

// Database cleanup between tests
async function cleanDatabase(): Promise<void> {
  const tables = ['OrderItem', 'Order', 'Product', 'UserProfile', 'User', 'Session'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

// Global setup
beforeAll(async () => {
  await prisma.$connect();
  await runMigrations(testDatabaseUrl);
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});
```

### Transaction-Based Test Isolation

```typescript
describe('UserService', () => {
  let transactionClient: Prisma.TransactionClient;

  beforeEach(async () => {
    transactionClient = await prisma.$begin();
  });

  afterEach(async () => {
    await transactionClient.$rollback(); // Rollback after each test
  });

  it('creates a user within a transaction', async () => {
    // Uses transactionClient instead of prisma
    const user = await userService.createUser(
      { email: 'test@example.com', name: 'Test' },
      transactionClient
    );

    expect(user.id).toBeDefined();

    // Verify within the same transaction
    const found = await transactionClient.user.findUnique({
      where: { id: user.id },
    });
    expect(found).not.toBeNull();
  });
});
```

### Database Seed Helpers

```typescript
// test/helpers/seed.ts
interface SeedOrderOptions {
  id?: string;
  userId: string;
  status?: OrderStatus;
  items?: Array<{ productId: string; quantity: number; unitPrice: number }>;
  createdAt?: Date;
}

async function seedOrder(options: SeedOrderOptions): Promise<Order> {
  const order = await prisma.order.create({
    data: {
      id: options.id ?? generateId(),
      userId: options.userId,
      status: options.status ?? 'PENDING',
      total: 0,
      createdAt: options.createdAt ?? new Date(),
      items: {
        create: (options.items ?? []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  // Recalculate total
  const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return prisma.order.update({
    where: { id: order.id },
    data: { total },
    include: { items: true },
  });
}
```

---

## Third-Party Service Mocking

### The Mocking Hierarchy

```
Level 0: NO MOCKING (Live calls)
  → Only for smoke tests in staging environments
  → NEVER in CI/CD pipelines

Level 1: RECORD/REPLAY (VCR pattern)
  → Record real responses, replay in tests
  → Best for complex API interactions

Level 2: CONTRACT-BASED MOCKING (Mock server with real schemas)
  → Mock server that validates request/response shapes
  → Best for API integration testing

Level 3: BEHAVIORAL MOCKING (Mock functions)
  → Mock individual functions/methods
  → Best for unit and focused integration tests

Level 4: STUB MOCKING (Hardcoded responses)
  → Return fixed values
  → Acceptable only for trivial cases
```

### Level 2: Contract-Based Mocking with Mock Service Worker (MSW)

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// Define handlers based on ACTUAL API contracts (not fabricated)
export const stripeHandlers = [
  http.post('https://api.stripe.com/v1/payment_intents', async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);

    // Validate required parameters match Stripe's actual API
    const amount = params.get('amount');
    const currency = params.get('currency');

    if (!amount || !currency) {
      return HttpResponse.json(
        { error: { type: 'invalid_request_error', message: 'Missing required params' } },
        { status: 400 }
      );
    }

    // Return response matching Stripe's actual response shape
    return HttpResponse.json({
      id: 'pi_test_1234567890',
      object: 'payment_intent',
      amount: parseInt(amount),
      currency,
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      metadata: {},
    });
  }),

  http.post('https://api.stripe.com/v1/refunds', async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paymentIntent = params.get('payment_intent');

    return HttpResponse.json({
      id: 're_test_1234567890',
      object: 'refund',
      amount: 9999,
      payment_intent: paymentIntent,
      status: 'succeeded',
    });
  }),
];

// test/setup.ts
import { setupServer } from 'msw/node';
import { stripeHandlers } from './mocks/handlers';

export const server = setupServer(...stripeHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Level 1: Record/Replay with Polly.js

```typescript
// test/setup-polly.ts
import { Polly } from '@pollyjs/core';
import NodeHTTPAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';

Polly.register(NodeHTTPAdapter);
Polly.register(FSPersister);

export function setupPolly(context: MochaContext | VitestContext) {
  return new Polly(`recording-${context.test.name}`, {
    adapters: ['node-http'],
    persister: 'fs',
    persisterOptions: {
      fs: {
        recordingsDir: './test/recordings',
      },
    },
    matchRequestsBy: {
      method: true,
      headers: false,
      body: true,
      order: false,
      url: {
        protocol: true,
        username: false,
        password: false,
        hostname: true,
        port: false,
        pathname: true,
        query: true,
        hash: true,
      },
    },
    recordIfMissing: process.env.RECORD === 'true',
    recordFailedRequests: true,
  });
}
```

---

## Test Environment Management

### Environment Configuration

```typescript
// test/environments/test.config.ts
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL!,
    poolSize: 5,
  },
  redis: {
    url: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1',
    keyPrefix: 'test:',
  },
  api: {
    baseUrl: process.env.TEST_API_URL ?? 'http://localhost:3000',
    port: parseInt(process.env.TEST_API_PORT ?? '3000'),
  },
  externalServices: {
    stripe: {
      mode: (process.env.STRIPE_TEST_MODE ?? 'mock') as 'mock' | 'live',
      mockPort: 12111,
    },
    sendgrid: {
      mode: (process.env.SENDGRID_TEST_MODE ?? 'mock') as 'mock' | 'live',
    },
    aws: {
      mode: (process.env.AWS_TEST_MODE ?? 'localstack') as 'mock' | 'localstack' | 'live',
      localstackEndpoint: 'http://localhost:4566',
    },
  },
  timeouts: {
    default: 10000,
    database: 5000,
    api: 5000,
    external: 15000,
  },
};
```

### Docker Compose Test Environment

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: deerflow_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5433:5432'
    tmpfs:
      - /var/lib/postgresql/data  # Fast, ephemeral storage for tests

  test-redis:
    image: redis:7-alpine
    ports:
      - '6380:6379'
    command: redis-server --save "" --appendonly no  # No persistence for tests

  test-localstack:
    image: localstack/localstack:3.0
    ports:
      - '4566:4566'
    environment:
      SERVICES: s3,sqs,sns,secretsmanager
      AWS_DEFAULT_REGION: us-east-1
    tmpfs:
      - /var/lib/localstack
```

### Test Container Pattern

```typescript
// test/helpers/test-containers.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: StartedPostgreSqlContainer | null = null;

async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('deerflow_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  process.env.TEST_DATABASE_URL = postgresContainer.getConnectionUri();
  return postgresContainer;
}

async function stopTestDatabase(): Promise<void> {
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }
}

// Global setup
beforeAll(async () => {
  await startTestDatabase();
  await runMigrations(process.env.TEST_DATABASE_URL!);
}, 60000); // 60s timeout for container startup

afterAll(async () => {
  await stopTestDatabase();
}, 30000);
```

---

## Test Data Management

### Test Data Builder Pattern

```typescript
// test/builders/order.builder.ts
class OrderBuilder {
  private id: string = generateId();
  private userId: string = 'user-test';
  private status: OrderStatus = 'PENDING';
  private items: OrderItemBuilder[] = [];
  private createdAt: Date = new Date();
  private total: number = 0;

  withId(id: string): OrderBuilder {
    this.id = id;
    return this;
  }

  withUserId(userId: string): OrderBuilder {
    this.userId = userId;
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.status = status;
    return this;
  }

  addItem(productId: string, quantity: number, unitPrice: number): OrderBuilder {
    this.items.push(new OrderItemBuilder(productId, quantity, unitPrice));
    return this;
  }

  createdOn(date: Date): OrderBuilder {
    this.createdAt = date;
    return this;
  }

  build(): CreateOrderInput {
    return {
      id: this.id,
      userId: this.userId,
      status: this.status,
      items: this.items.map(item => item.build()),
      total: this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      createdAt: this.createdAt,
    };
  }
}

// Usage
const order = new OrderBuilder()
  .withId('order-test-1')
  .withUserId('user-123')
  .withStatus('PAID')
  .addItem('prod-1', 3, 29.99)
  .addItem('prod-2', 1, 99.99)
  .createdOn(new Date('2024-01-01'))
  .build();
```

### Test Data Snapshots

```typescript
// test/fixtures/snapshots/api-responses/order-created.json
{
  "id": "order-test-123",
  "status": "PENDING",
  "items": [
    {
      "productId": "prod-1",
      "quantity": 2,
      "unitPrice": 29.99,
      "subtotal": 59.98
    }
  ],
  "total": 59.98,
  "currency": "USD",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "_links": {
    "self": { "href": "/api/v1/orders/order-test-123" },
    "payment": { "href": "/api/v1/orders/order-test-123/payment" }
  }
}
```

---

## Test Isolation Techniques

### Technique 1: Database Transaction Rollback

```typescript
// Wrap each test in a transaction, rollback at the end
beforeEach(async () => {
  await prisma.$executeRawUnsafe('BEGIN');
});

afterEach(async () => {
  await prisma.$executeRawUnsafe('ROLLBACK');
});
```

### Technique 2: Namespace Isolation

```typescript
// Use unique namespaces per test to avoid collisions
const testNamespace = `test-${expect.getState().currentTestName?.replace(/\s/g, '-')}`;
const testQueue = `${testNamespace}-orders`;
const testCacheKey = `${testNamespace}:user:123`;
```

### Technique 3: Time Isolation

```typescript
// Use fake timers to control time-dependent behavior
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Technique 4: Parallel Test Isolation

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
```

---

## Contract Testing

### Consumer-Driven Contract Testing with Pact

```typescript
// test/contracts/order-service.consumer.ts
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({
  consumer: 'PaymentService',
  provider: 'OrderService',
});

describe('OrderService Contract', () => {
  beforeAll(() => provider.setup());

  it('returns order details for a valid order ID', async () => {
    await provider.addInteraction({
      state: 'order order-123 exists',
      uponReceiving: 'a request for order details',
      withRequest: {
        method: 'GET',
        path: '/api/v1/orders/order-123',
        headers: { Authorization: 'Bearer valid-token' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: like('order-123'),
          status: term({ matcher: 'PENDING|PAID|SHIPPED|DELIVERED|CANCELLED', generate: 'PAID' }),
          items: eachLike({
            productId: like('prod-1'),
            quantity: integer(1),
            unitPrice: decimal(29.99),
          }),
          total: decimal(59.98),
          createdAt: iso8601DateTime('2024-01-15T10:30:00.000Z'),
        },
      },
    });

    const response = await orderClient.getOrder('order-123', 'valid-token');
    expect(response.id).toBe('order-123');
    expect(response.status).toBe('PAID');
  });

  afterAll(() => provider.finalize());
});
```

---

## Performance Testing Under Load

### Load Test Template

```typescript
// test/performance/order-api-load.test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },     // Sustained load
    { duration: '30s', target: 100 },   // Peak load
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                    // Less than 1% failure rate
    checks: ['rate>0.99'],                            // 99% of checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const response = http.get(`${BASE_URL}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body has orders array': (r) => {
      const body = JSON.parse(r.body as string);
      return Array.isArray(body.orders);
    },
  });
}
```

### Smoke Test Performance Checks

```typescript
describe('API Performance Smoke Tests', () => {
  const MAX_RESPONSE_TIME = 500; // ms

  it('GET /api/v1/orders responds within SLA', async () => {
    const start = performance.now();
    const response = await api.get('/api/v1/orders');
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
  });

  it('handles 10 concurrent requests without errors', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      api.get(`/api/v1/orders/${i}`)
    );

    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === 'rejected');

    expect(failures).toHaveLength(0);
  });
});
```

---

## Integration Test Configuration Template

```yaml
# .deerflow/integration-test.config.yaml
integration_tests:
  environment:
    database: required
    redis: optional
    external_services: mocked

  timeouts:
    default: 30000
    database_setup: 60000
    external_service: 15000

  isolation:
    strategy: transaction_rollback
    parallel_safe: true
    max_parallel: 4

  reporting:
    format: [junit, html, console]
    output_dir: ./test-results/integration

  coverage:
    enabled: true
    thresholds:
      statements: 70
      branches: 60
      functions: 70
      lines: 70
```

---

*Integration tests are the bridge between "it works in isolation" and "it works in production."
Write them with the same care and rigor as production code.*
