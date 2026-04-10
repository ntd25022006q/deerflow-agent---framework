# Documentation Generation Agent Skill

> **Skill ID:** documentation-gen
> **Version:** 1.0.0
> **Category:** Documentation
> **Priority:** MEDIUM-HIGH — Documentation must be generated alongside code changes.
> Code without documentation is only half-delivered.

---

## Purpose

This skill defines the standards, templates, and practices for generating all forms of
documentation within the Deerflow Agent Framework. Well-maintained documentation is
essential for team collaboration, onboarding, API consumption, and long-term
maintainability. Every significant code change should include corresponding
documentation updates.

---

## Documentation Principles

### Core Values

1. **Accuracy over completeness** — Partial accurate docs > comprehensive wrong docs
2. **Living documentation** — Keep docs in sync with code through automated tooling
3. **Reader-centric** — Write for the audience, not for yourself
4. **Discoverable** — Structure docs so information is easy to find
5. **Maintainable** — Keep docs close to the code they describe
6. **Tested** — Code examples in documentation should be tested and correct

### Documentation Types by Audience

```yaml
audiences:
  end_users:
    docs: [README, user guide, FAQ, changelog]
    tone: "Clear, non-technical, task-oriented"
    format: "Markdown, HTML"

  developers:
    docs: [API reference, architecture docs, developer guide, contributing guide]
    tone: "Technical, precise, example-driven"
    format: "Markdown with code blocks"

  operators:
    docs: [deployment guide, runbook, monitoring docs, incident response]
    tone: "Procedural, checklist-oriented"
    format: "Markdown, YAML templates"

  architects:
    docs: [ADRs, design docs, system diagrams, tech radar]
    tone: "Analytical, decision-focused"
    format: "Markdown with diagrams"
```

---

## README Generation Template

### Standard Project README

```markdown
# Project Name

> One-line description of what the project does and why it exists.

## Overview

{2-3 sentences explaining the purpose, target audience, and key value proposition.
Answer: What is this? Who is it for? Why should I use it?}

## Features

- **Feature 1**: Brief description of what it does
- **Feature 2**: Brief description of what it does
- **Feature 3**: Brief description of what it does

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- Redis >= 7.0

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/org/repo.git
cd repo

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
\`\`\`

### Verify Installation

\`\`\`bash
# Run health check
curl http://localhost:3000/health

# Expected response: {"status":"ok","version":"1.0.0"}
\`\`\`

## Usage

### Basic Usage

\`\`\`typescript
import { createClient } from '@org/repo';

const client = createClient({
  apiKey: process.env.API_KEY,
  baseUrl: 'https://api.example.com',
});

const result = await client.doSomething({ option: 'value' });
console.log(result);
\`\`\`

### Advanced Configuration

\`\`\`typescript
const client = createClient({
  apiKey: process.env.API_KEY,
  timeout: 5000,
  retries: 3,
  logger: console,
});
\`\`\`

## Architecture

{Brief overview of the system architecture. Link to detailed architecture docs.}

\`\`\`
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Client  │────▶│  API Server  │────▶│ Database │
└──────────┘     └──────────────┘     └──────────┘
\`\`\`

## API Reference

See [API Documentation](./docs/api.md) for detailed endpoint documentation.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_KEY` | Yes | — | Your API key |
| `BASE_URL` | No | `https://api.example.com` | API base URL |
| `TIMEOUT` | No | `30000` | Request timeout in ms |
| `LOG_LEVEL` | No | `info` | Logging verbosity |

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run linter
pnpm lint

# Build
pnpm build
\`\`\`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

[MIT](./LICENSE) © {Year} {Organization}
```

### README Quality Checklist

- [ ] Does the project name clearly convey what the project does?
- [ ] Is there a one-line description that a non-expert can understand?
- [ ] Are prerequisites listed completely?
- [ ] Can a new developer get started in under 15 minutes?
- [ ] Are all code examples tested and accurate?
- [ ] Is the license clearly stated?
- [ ] Is there a link to more detailed documentation?
- [ ] Are badges shown (build status, version, coverage)?

---

## API Documentation Generation

### REST API Documentation Standard

```markdown
# API Reference

## Authentication

All API requests require authentication via Bearer token in the Authorization header.

\`\`\`
Authorization: Bearer {token}
\`\`\`

## Endpoints

### List Resources

\`\`\`
GET /api/v1/{resource}
\`\`\`

Retrieves a paginated list of resources.

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | `1` | Page number (1-indexed) |
| `limit` | integer | No | `20` | Items per page (max: 100) |
| `sort` | string | No | `createdAt:desc` | Sort field and direction |
| `filter[field]` | string | No | — | Filter by field value |

**Response**

\`\`\`json
{
  "data": [
    {
      "id": "res-123",
      "name": "Example Resource",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
\`\`\`

**Status Codes**

| Code | Meaning |
|------|---------|
| `200` | Success — returns paginated list |
| `401` | Unauthorized — missing or invalid token |
| `422` | Validation error — invalid query parameters |

**Example**

\`\`\`bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/resources?page=1&limit=10&sort=name:asc"
\`\`\`

---

### Create Resource

\`\`\`
POST /api/v1/{resource}
\`\`\`

Creates a new resource.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Resource name (1-255 characters) |
| `description` | string | No | Resource description |
| `config` | object | No | Configuration object |

**Request Example**

\`\`\`json
{
  "name": "My Resource",
  "description": "An example resource",
  "config": {
    "enabled": true,
    "threshold": 50
  }
}
\`\`\`

**Response**

\`\`\`json
{
  "data": {
    "id": "res-456",
    "name": "My Resource",
    "description": "An example resource",
    "config": {
      "enabled": true,
      "threshold": 50
    },
    "status": "active",
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
\`\`\`

**Status Codes**

| Code | Meaning |
|------|---------|
| `201` | Created — resource created successfully |
| `400` | Bad Request — malformed request body |
| `401` | Unauthorized — missing or invalid token |
| `409` | Conflict — resource with same unique key exists |
| `422` | Validation error — invalid field values |

---

### Error Response Format

All errors follow a consistent format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid fields",
    "details": [
      {
        "field": "name",
        "message": "Name must be between 1 and 255 characters",
        "code": "STRING_TOO_SHORT"
      }
    ],
    "requestId": "req-abc123"
  }
}
\`\`\`

**Error Codes**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request failed validation |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
```

### OpenAPI / Swagger Integration

```yaml
# openapi.yaml generation guidelines
openapi_standards:
  version: "3.1.0"
  naming:
    paths: "kebab-case"
    operationIds: "camelCase"
    schemas: "PascalCase"
    properties: "camelCase"
  required_fields:
    - "paths[*].summary"
    - "paths[*].description"
    - "paths[*].responses[*].description"
    - "components.schemas[*].description"
    - "info.description"
    - "info.version"
  conventions:
    responses: "Use $ref for common response schemas"
    parameters: "Use $ref for reusable parameters"
    examples: "Provide at least one example per schema"
```

---

## Code Comment Standards

### When to Comment

```yaml
comment_rules:
  always_comment:
    - "Public API contracts (JSDoc / TSDoc / docstrings)"
    - "Non-obvious business logic (WHY, not WHAT)"
    - "Workarounds for bugs in dependencies (link to issue)"
    - "Performance-critical sections (explain the optimization)"
    - "Security-sensitive operations (explain the security consideration)"
    - "TODO/FIXME with context and ticket reference"

  never_comment:
    - "Code that is self-explanatory"
    - "Code that just restates what the code does"
    - "Commented-out code (delete it, git preserves history)"
    - "Changelog-style entries in comments (use git commit messages)"
    - "Author names or dates (git tracks this)"
```

### Comment Style Guide

```typescript
/**
 * JSDoc/TSDoc format for PUBLIC APIs
 *
 * This format is required for all exported functions, classes, and interfaces.
 * Include description, parameters, return value, and examples.
 *
 * @example
 * ```typescript
 * const client = new PaymentClient({ apiKey: 'key-123' });
 * const charge = await client.createCharge({
 *   amount: 999,
 *   currency: 'usd',
 *   customerId: 'cust-456',
 * });
 * ```
 *
 * @throws {PaymentError} When the payment provider rejects the charge
 * @since 1.0.0
 */
export async function createCharge(
  input: CreateChargeInput
): Promise<Charge> {
  // Implementation
}

/**
 * Process a payment using the idempotency key pattern.
 *
 * WHY: Payment providers may retry requests due to network issues.
 * Without idempotency, a retry could result in double-charging the customer.
 *
 * The idempotency key is stored in Redis with a TTL of 24 hours,
 * which covers the retry window defined by the payment provider.
 *
 * See: https://docs.stripe.com/api/idempotent_requests
 * Related: ADR-012 (Idempotency for financial operations)
 */
async function processIdempotentPayment(
  chargeInput: ChargeInput,
  idempotencyKey: string
): Promise<ChargeResult> {
  // Implementation
}

// BAD: Comments that restate the code
// Increment the counter by 1
counter++;

// GOOD: Comments that explain WHY
// Using Math.floor instead of Math.round because partial items
// shouldn't round up (business rule: overcharging is worse than undercharging)
const chargeableItems = Math.floor(totalItems / bundleSize);
```

### Inline Comment Patterns

```typescript
// TODO(PAYMENTS-123): Replace with webhook-based reconciliation
// when the payment provider supports it (ETA: Q2 2024)
const reconciliationResult = await manualReconciliation();

// HACK: The legacy API returns "success" for 2xx AND 3xx status codes.
// This is documented in their issue #4521. We explicitly filter 3xx.
// Remove this when we migrate to API v3.
if (response.status >= 200 && response.status < 400) {
  // ...
}

// NOTE: This calculation must match the frontend implementation
// in src/components/OrderSummary.tsx:calculateTotal()
// If you change this, update the frontend too.
function calculateTotal(items: OrderItem[]): number {
  // ...
}

// SAFETY: This input is already validated by the Zod schema
// at the API boundary, so we can safely assume the shape.
const validatedInput = input as ValidatedInput;
```

---

## Architecture Documentation

### Architecture Overview Template

```markdown
# System Architecture

## High-Level Overview

{Description of the overall system architecture, key components,
and how they interact. Include a diagram.}

## Design Decisions

Link to relevant ADRs:

| Decision | ADR | Status |
|----------|-----|--------|
| Primary database choice | ADR-001 | Accepted |
| Event-driven processing | ADR-002 | Accepted |
| API gateway pattern | ADR-003 | Proposed |

## Component Inventory

### Core Services

| Service | Responsibility | Technology | Owner |
|---------|---------------|------------|-------|
| API Gateway | Request routing, auth | Node.js + Fastify | Platform |
| User Service | User management | Node.js + Prisma | Identity |
| Order Service | Order lifecycle | Node.js + Prisma | Commerce |
| Payment Service | Payment processing | Node.js + Stripe SDK | Commerce |
| Notification Service | Email, push, SMS | Node.js + SendGrid | Platform |

### Infrastructure

| Component | Purpose | Technology |
|-----------|---------|------------|
| Database | Primary data store | PostgreSQL 16 |
| Cache | Session + data caching | Redis 7 |
| Queue | Async job processing | BullMQ + Redis |
| Storage | File uploads | AWS S3 |
| Search | Full-text search | Elasticsearch 8 |

## Data Flow

\`\`\`
User Request → API Gateway → [Auth] → Service → [DB/Cache/Queue]
                                                    ↓
                                              [Event] → Notification Service
\`\`\`

## Deployment Architecture

{Describe how the system is deployed: cloud provider, regions,
containerization, orchestration, CDN, etc.}
```

---

## Change Log Management

### Changelog Format (Keep a Changelog Standard)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New feature description (#123)

### Changed
- Change description (#124)

### Fixed
- Bug fix description (#125)

## [1.2.0] - 2024-01-15

### Added
- Support for batch order processing (#98)
- WebSocket integration for real-time updates (#101)
- Rate limiting configuration API (#105)

### Changed
- Improved error messages for validation failures (#99)
- Updated default timeout from 30s to 60s (#102)
- Refactored payment module for better testability (#108)

### Deprecated
- `OrderService.calculateTotal()` — use `OrderService.computeTotal()` instead (#103)
- REST API v1 — migrate to v2 before 2024-06-01 (#107)

### Removed
- Removed legacy `XMLParser` module (#104)
- Removed support for Node.js 16 (#106)

### Fixed
- Fixed race condition in concurrent order updates (#100)
- Fixed memory leak in WebSocket connection handler (#109)
- Fixed incorrect tax calculation for international orders (#110)

### Security
- Updated `jsonwebtoken` dependency to fix CVE-2024-XXXX (#111)
- Added input sanitization for user-provided file names (#112)
```

### Changelog Generation Rules

```yaml
changelog_rules:
  categories:
    - "Added: New features"
    - "Changed: Changes to existing functionality"
    - "Deprecated: Features to be removed in future versions"
    - "Removed: Features removed in this version"
    - "Fixed: Bug fixes"
    - "Security: Security vulnerability fixes"

  requirements:
    - "Every pull request MUST have a changelog entry"
    - "Entries MUST reference the PR/issue number"
    - "Entries MUST be written in imperative mood ('Add' not 'Added')"
    - "Breaking changes MUST be noted in both Deprecated/Removed and a migration guide"
    - "Version numbers MUST follow Semantic Versioning"
    - "Dates MUST be in ISO 8601 format (YYYY-MM-DD)"

  automation:
    tool: "conventional-changelog or commitizen"
    commit_types:
      feat: "Added"
      fix: "Fixed"
      perf: "Changed"
      refactor: "Changed"
      docs: "Changed"
      breaking: "Removed (if removal) or Changed (if modification)"
```

---

## Developer Guide Writing

### Developer Guide Template

```markdown
# Developer Guide

## Getting Started

### Prerequisites
{List all tools, accounts, and access required}

### Local Development Setup
\`\`\`bash
# Step-by-step setup instructions
\`\`\`

### Running Tests
\`\`\`bash
# Test commands with explanations
\`\`\`

## Project Structure

\`\`\`
src/
├── domain/           # Business logic (pure, no framework dependencies)
│   ├── entities/     # Domain entities and value objects
│   ├── events/       # Domain events
│   └── services/     # Domain services
├── application/      # Application services (use cases)
│   ├── commands/     # Command handlers
│   ├── queries/      # Query handlers
│   └── ports/        # Port interfaces (dependency inversion)
├── infrastructure/   # Technical implementations
│   ├── database/     # Database access (repository implementations)
│   ├── external/     # External service integrations
│   └── messaging/    # Message queue implementations
├── api/              # API layer (HTTP, GraphQL, WebSocket)
│   ├── controllers/  # Request handlers
│   ├── middleware/   # HTTP middleware
│   └── schemas/      # Request/response validation schemas
└── shared/           # Shared utilities and types
\`\`\`

## Adding a New Feature

### Step 1: Define the Domain Entity
{Location and template for new entities}

### Step 2: Create the Repository Interface
{Location and template for repository interfaces}

### Step 3: Implement the Application Service
{Location and template for application services}

### Step 4: Create the API Endpoint
{Location and template for API endpoints}

### Step 5: Write Tests
{Test locations and templates}

## Common Tasks

### Adding a New Environment Variable
1. Add to `.env.example`
2. Add to validation schema in `src/config/env.ts`
3. Add to deployment documentation
4. Document in this guide's Configuration section

### Adding a New Database Migration
\`\`\`bash
pnpm db:create-migration add_new_column_to_users
pnpm db:migrate
\`\`\`

### Adding a New External Service Integration
1. Create adapter in `src/infrastructure/external/{service}/`
2. Define port interface in `src/application/ports/`
3. Register in dependency injection container
4. Add configuration to `.env.example`
5. Write integration tests with proper mocking
```

---

## Inline Documentation Patterns

### File Header Documentation

```typescript
/**
 * @file payment.service.ts
 * @description Handles payment processing, refund management, and payment method
 *   operations. This service acts as the application-layer orchestrator for all
 *   payment-related use cases.
 *
 * @module application/services
 * @since 1.0.0
 * @see ADR-002 - Event-driven payment processing
 * @see ADR-012 - Idempotency for financial operations
 */
```

### Module Documentation

```typescript
/**
 * @module utils/validation
 *
 * Provides runtime type validation using Zod schemas.
 * All validation schemas in this module are registered with
 * the global schema registry for automatic OpenAPI documentation
 * generation.
 *
 * Usage:
 * \`\`\`typescript
 * import { createUserSchema } from '@/utils/validation';
 * const result = createUserSchema.safeParse(input);
 * \`\`\`
 */
```

---

## Example Code Documentation

### Example Code Standards

```yaml
example_standards:
  requirements:
    - "All examples MUST be syntactically correct"
    - "All examples MUST run without modification (or clearly note modifications needed)"
    - "All examples MUST include import statements"
    - "All examples MUST use realistic data (not 'foo', 'bar', 'test')"
    - "All examples MUST show the expected output as a comment"

  formatting:
    - "Use full, copy-pasteable code blocks"
    - "Include comments explaining non-obvious steps"
    - "Show both success and error cases"
    - "Group related examples under a common heading"

  maintenance:
    - "Examples SHOULD be covered by test suites (snapshot tests, doctests)"
    - "Examples MUST be updated when APIs change"
    - "Mark deprecated examples clearly"
```

### Example Code Template

```typescript
/**
 * Creates a new user and sends a verification email.
 *
 * @example
 * ```typescript
 * import { createUser } from '@/application/services/user.service';
 *
 * const user = await createUser({
 *   email: 'alice@example.com',
 *   name: 'Alice Johnson',
 *   password: 'SecureP@ssw0rd!',
 * });
 *
 * console.log(user.id);      // "usr_a1b2c3d4e5f6"
 * console.log(user.status);  // "PENDING_VERIFICATION"
 *
 * // Note: A verification email is automatically sent to alice@example.com
 * ```
 *
 * @example
 * ```typescript
 * // Handling duplicate email error
 * try {
 *   await createUser({ email: 'existing@example.com', name: 'Test', password: '123' });
 * } catch (error) {
 *   if (error instanceof UserAlreadyExistsError) {
 *     console.error('User already exists:', error.existingUserId);
 *   }
 * }
 * ```
 */
```

---

## Documentation Quality Checklist

```markdown
## Documentation Review Checklist

### Accuracy
- [ ] Are all code examples tested and correct?
- [ ] Are all configuration options documented and up to date?
- [ ] Are version numbers accurate?
- [ ] Are links valid (no broken links)?
- [ ] Are API endpoints matching the actual implementation?

### Completeness
- [ ] Are all public APIs documented?
- [ ] Are all configuration options listed?
- [ ] Are all error codes documented?
- [ ] Are all prerequisites listed?
- [ ] Are migration/upgrade paths documented?

### Clarity
- [ ] Is the writing concise and focused?
- [ ] Is technical jargon explained or linked?
- [ ] Are examples provided for complex concepts?
- [ ] Is the structure logical and navigable?
- [ ] Are headings descriptive (not just "Overview")?

### Maintainability
- [ ] Is the documentation version-controlled?
- [ ] Is there a process for updating docs with code changes?
- [ ] Are docs co-located with the code they describe (where appropriate)?
- [ ] Is there automated doc generation for APIs?
- [ ] Are docs included in the CI/CD pipeline (link checking, example testing)?
```

---

*Documentation is a first-class artifact, not an afterthought. The best code in the
world is useless if nobody knows how to use it, extend it, or operate it. Write docs
as if the reader has never seen this code before — because they haven't.*
