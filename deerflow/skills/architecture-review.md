# Architecture Review Agent Skill

> **Skill ID:** architecture-review
> **Version:** 1.0.0
> **Category:** Architecture & Design
> **Priority:** HIGH — Must be invoked for any significant architectural change, new module,
> service boundary modification, or system design decision.

---

## Purpose

This skill provides a structured framework for reviewing software architecture within the
Deerflow Agent Framework. It ensures that architectural decisions are deliberate, documented,
and aligned with system quality goals. Every architectural decision should be traceable,
reversible, and justified by clear reasoning.

---

## Architecture Decision Records (ADRs)

### ADR Template

Every significant architectural decision MUST be documented using this format:

```markdown
# ADR-{NUMBER}: {TITLE}

## Status
{Proposed | Accepted | Deprecated | Superseded by ADR-{NUMBER}}

## Context
What is the issue that we're seeing that is motivating this decision or change?

### Forces
What are the constraints, requirements, and driving forces that shape this decision?
- Force 1: {description}
- Force 2: {description}
- Force 3: {description}

## Decision
What is the change that we're proposing and/or doing?

### Rationale
Why did we make this decision? What alternatives did we consider?

## Consequences
What becomes easier or more difficult because of this change?

### Positive
- {benefit 1}
- {benefit 2}

### Negative
- {trade-off 1}
- {trade-off 2}

### Risks
- {risk 1 and mitigation strategy}
- {risk 2 and mitigation strategy}

## Compliance
- [ ] Performance impact assessed
- [ ] Security impact assessed
- [ ] Scalability impact assessed
- [ ] Migration path documented (if applicable)
- [ ] Rollback plan documented
- [ ] Stakeholders notified
```

### ADR Lifecycle Management

```
Draft → Review → Accepted → (Implemented) → Active
                                        ↓
                                  Deprecated ← Superseded by newer ADR
                                        ↓
                                    Archived
```

### ADR Index File

```markdown
# Architecture Decision Records

| ADR | Status | Date | Title |
|-----|--------|------|-------|
| ADR-001 | Accepted | 2024-01-10 | Use PostgreSQL as primary database |
| ADR-002 | Accepted | 2024-01-12 | Adopt event-driven architecture for order processing |
| ADR-003 | Proposed | 2024-01-15 | Migrate from REST to GraphQL for client API |
| ADR-004 | Deprecated | 2024-01-08 | Use Redis for caching (superseded by ADR-007) |
```

---

## Design Pattern Selection Criteria

### Pattern Selection Decision Matrix

```yaml
pattern_selection:
  creational:
    factory_method:
      when: "Need to defer instantiation to subclasses, framework integration points"
      avoid: "When creation is simple and doesn't vary"
    builder:
      when: "Complex objects with many optional parameters, immutable objects"
      avoid: "Simple objects with few parameters"
    singleton:
      when: "Genuinely one instance needed (connection pool, config, logger)"
      avoid: "When it's just for convenience — prefer dependency injection"
    abstract_factory:
      when: "Need to create families of related objects"
      avoid: "When only one family of objects exists"

  structural:
    adapter:
      when: "Integrating third-party APIs, legacy system interfaces"
      avoid: "When interfaces already match"
    decorator:
      when: "Adding responsibilities dynamically, cross-cutting concerns"
      avoid: "When inheritance would be simpler"
    facade:
      when: "Simplifying complex subsystem interfaces"
      avoid: "When the subsystem is already simple"
    proxy:
      when: "Lazy loading, access control, logging, remote access"
      avoid: "When direct access is sufficient"

  behavioral:
    strategy:
      when: "Swappable algorithms, selecting behavior at runtime"
      avoid: "When algorithm rarely changes"
    observer:
      when: "One-to-many dependency, event systems, pub/sub"
      avoid: "When tight coupling is acceptable, or when ordering matters critically"
    command:
      when: "Undo/redo, queuing, transactional behavior"
      avoid: "Simple operations without these needs"
    template_method:
      when: "Algorithm skeleton with variable steps, framework hooks"
      avoid: "When steps are too different across implementations"
```

### Anti-Pattern Quick Reference

```yaml
anti_patterns:
  god_class:
    description: "A class that knows too much or does too much"
    detection: ">500 LOC, >10 public methods, handles multiple responsibilities"
    fix: "Extract classes using Single Responsibility Principle"

  service_locator:
    description: "Hidden dependencies through a global registry"
    detection: "Classes fetch their own dependencies instead of receiving them"
    fix: "Replace with constructor injection"

  spaghetti_code:
    description: "No clear structure, tangled control flow"
    detection: "Deep nesting, goto-like jumps, unclear data flow"
    fix: "Refactor into clear functions with single responsibility"

  golden_hammer:
    description: "Using the same pattern/tool for every problem"
    detection: "Everything is a microservice / event / class hierarchy"
    fix: "Evaluate each problem independently against pattern criteria"

  copy_paste_programming:
    description: "Duplicated code instead of proper abstraction"
    detection: "Similar blocks across files, diverging slowly"
    fix: "Extract shared logic, use template method or strategy"

  premature_optimization:
    description: "Optimizing before measuring, over-engineering for scale"
    detection: "Complex caching, sharding, or async before there's a problem"
    fix: "Measure first, optimize when data shows it's needed"
```

---

## Scalability Review Checklist

### Horizontal Scalability

```yaml
horizontal_scalability:
  statelessness:
    - "Can requests be handled by any instance?"
    - "Is session state externalized (Redis, database)?"
    - "Are there any in-memory caches that would diverge across instances?"

  data_partitioning:
    - "Can data be partitioned (sharded) by a natural key?"
    - "Are there cross-partition queries that would be expensive?"
    - "Is the partitioning strategy documented and configurable?"

  load_distribution:
    - "Can load be distributed evenly across instances?"
    - "Are there hot keys or hot partitions?"
    - "Is connection pooling configured for downstream services?"

  deployment_scalability:
    - "Can new instances be added without reconfiguration?"
    - "Can instances be removed gracefully (draining)?"
    - "Is there a strategy for rolling updates with zero downtime?"
```

### Vertical Scalability

```yaml
vertical_scalability:
  resource_utilization:
    - "Is CPU utilization monitored and alerting configured?"
    - "Is memory utilization monitored with OOM prevention?"
    - "Are there memory leaks (growing heaps, unclosed connections)?"
    - "Is disk I/O monitored for database and file operations?"

  database_scalability:
    - "Are connection pools properly sized?"
    - "Are queries optimized (EXPLAIN ANALYZE reviewed)?"
    - "Are there missing indexes on frequently queried columns?"
    - "Is read replication available for read-heavy workloads?"
    - "Are slow queries logged and reviewed?"

  caching_strategy:
    - "Is caching used for frequently accessed, rarely changing data?"
    - "Is cache invalidation strategy defined and correct?"
    - "Are cache hit rates monitored?"
    - "Is there a fallback when cache is unavailable?"
```

### Scalability Red Flags

```yaml
red_flags:
  critical:
    - "Synchronous calls to external services in request path"
    - "Unbounded database queries (no LIMIT, no pagination)"
    - "File uploads processed in-memory"
    - "No circuit breakers for downstream dependencies"
    - "Shared mutable state across requests"

  warning:
    - "Large objects stored in session"
    - "Full table scans in hot paths"
    - "No request timeouts configured"
    - "No rate limiting on public endpoints"
    - "Single points of failure without redundancy"
```

---

## Maintainability Assessment

### Maintainability Scoring Framework

```yaml
maintainability_score:
  categories:
    readability:
      weight: 0.25
      indicators:
        - naming_quality: "Self-documenting names, consistent conventions"
        - code_complexity: "Cyclomatic complexity < 10 per function"
        - documentation: "README, inline comments for complex logic"
        - consistency: "Uniform patterns across codebase"

    modifiability:
      weight: 0.25
      indicators:
        - coupling: "Low coupling between modules"
        - cohesion: "High cohesion within modules"
        - abstraction: "Appropriate abstraction levels"
        - encapsulation: "Implementation details hidden"

    testability:
      weight: 0.20
      indicators:
        - test_coverage: ">80% line coverage"
        - test_quality: "Tests check behavior, not implementation"
        - test_isolation: "Tests can run independently"
        - mocking_ease: "Dependencies are injectable"

    deployability:
      weight: 0.15
      indicators:
        - build_process: "Automated, reproducible builds"
        - deployment_automation: "CI/CD pipeline configured"
        - environment_parity: "Dev/staging/prod environments aligned"
        - rollback_capability: "Rollback plan exists"

    observability:
      weight: 0.15
      indicators:
        - logging: "Structured logging with correlation IDs"
        - monitoring: "Health checks, metrics, alerting"
        - error_tracking: "Error aggregation and notification"
        - tracing: "Distributed tracing for request flows"
```

### Maintainability Review Questions

```markdown
## Maintainability Review

### Code Organization
- [ ] Is the project structure intuitive for new contributors?
- [ ] Are modules/packages organized by feature or by concern consistently?
- [ ] Is there a clear separation between domain logic and infrastructure?
- [ ] Are entry points and public APIs clearly defined?

### Dependencies
- [ ] Are all dependencies necessary and actively maintained?
- [ ] Are dependency versions pinned or ranged appropriately?
- [ ] Is there a dependency update strategy (Renovate, Dependabot)?
- [ ] Are there circular dependencies?

### Development Experience
- [ ] Is the project buildable with a single command?
- [ ] Are development instructions clear and accurate?
- [ ] Is there a fast feedback loop (hot reload, fast tests)?
- [ ] Are linting and formatting automated?

### Onboarding
- [ ] Can a new developer be productive within 2 hours?
- [ ] Is there an architecture overview document?
- [ ] Are there example configurations for common scenarios?
- [ ] Is there a CONTRIBUTING guide?
```

---

## Technical Debt Identification

### Technical Debt Categories

```yaml
technical_debt:
  architectural_debt:
    description: "Structural issues that affect the overall system"
    examples:
      - "Monolith that should be modularized"
      - "Missing abstraction layers"
      - "Tight coupling between services"
      - "No clear module boundaries"
    impact: "HIGH — Affects velocity across the entire codebase"
    remediation_cost: "HIGH — Requires significant refactoring"

  design_debt:
    description: "Poor design choices in individual modules"
    examples:
      - "God classes or god objects"
      - "Missing or wrong design patterns"
      - "Over-engineered abstractions"
      - "Under-engineered (missing) abstractions"
    impact: "MEDIUM — Affects velocity in specific modules"
    remediation_cost: "MEDIUM — Localized refactoring"

  code_debt:
    description: "Code-level issues"
    examples:
      - "Dead code (unreachable, unused)"
      - "Duplicated code (copy-paste)"
      - "Complex functions (high cyclomatic complexity)"
      - "Poor naming conventions"
    impact: "LOW-MEDIUM — Accumulates over time"
    remediation_cost: "LOW — Incremental fixes possible"

  infrastructure_debt:
    description: "Build, deploy, and operational issues"
    examples:
      - "Missing CI/CD pipeline"
      - "No automated testing"
      - "Manual deployment process"
      - "No monitoring or alerting"
    impact: "MEDIUM — Affects reliability and speed of delivery"
    remediation_cost: "MEDIUM — Tooling investment required"

  documentation_debt:
    description: "Missing or outdated documentation"
    examples:
      - "No README or outdated README"
      - "No API documentation"
      - "No architecture documentation"
      - "Undocumented business rules"
    impact: "LOW-MEDIUM — Slows onboarding and decision-making"
    remediation_cost: "LOW — Can be addressed incrementally"

  test_debt:
    description: "Missing, broken, or inadequate tests"
    examples:
      - "Low test coverage"
      - "Flaky tests"
      - "Tests that test implementation, not behavior"
      - "No integration tests for critical paths"
    impact: "HIGH — Prevents safe refactoring and changes"
    remediation_cost: "MEDIUM — Requires disciplined effort"
```

### Technical Debt Register

```markdown
# Technical Debt Register

| ID | Category | Description | Impact | Cost | Priority | Owner | Status |
|----|----------|-------------|--------|------|----------|-------|--------|
| TD-001 | Code | Dead code in payment module (200+ lines) | Low | Low | P3 | — | Open |
| TD-002 | Architecture | No separation between API and business logic | High | High | P1 | — | In Progress |
| TD-003 | Test | Order processing has 30% coverage | High | Medium | P2 | — | Open |
| TD-004 | Design | UserService handles notifications too | Medium | Medium | P2 | — | Open |
| TD-005 | Infrastructure | No automated E2E tests | High | Medium | P1 | — | Planned |
```

---

## Coupling Analysis

### Coupling Types and Assessment

```yaml
coupling_analysis:
  content_coupling:
    description: "One module directly accesses another's internal data"
    severity: "CRITICAL"
    detection: "Direct field access across module boundaries"
    fix: "Encapsulate behind accessors or methods"

  common_coupling:
    description: "Modules share global data (global variables, shared databases)"
    severity: "HIGH"
    detection: "Global state, shared mutable variables"
    fix: "Dependency injection, event-driven communication"

  control_coupling:
    description: "One module controls the flow of another (passing flags)"
    severity: "MEDIUM"
    detection: "Boolean flags, enum parameters that change behavior"
    fix: "Strategy pattern, polymorphism, separate functions"

  stamp_coupling:
    description: "Modules share a composite data structure but only use part of it"
    severity: "LOW-MEDIUM"
    detection: "Passing large objects when only a few fields are needed"
    fix: "Pass only needed data, create focused interfaces"

  data_coupling:
    description: "Modules communicate by passing data (parameters, return values)"
    severity: "ACCEPTABLE"
    detection: "Function calls with primitive/simple parameters"
    note: "This is the ideal level of coupling"

  message_coupling:
    description: "Modules communicate via messages or events"
    severity: "LOWEST (for distributed systems)"
    detection: "Event emitters, message queues, pub/sub"
    note: "Ideal for decoupled architectures"
```

### Dependency Direction Rules

```
RULE 1: Dependencies must point INWARD (toward the domain core)
  Infrastructure → Application → Domain
  NEVER: Domain → Infrastructure

RULE 2: Higher-level modules must not depend on lower-level modules
  Both must depend on abstractions (Dependency Inversion Principle)

RULE 3: Cross-cutting concerns must be implemented as aspects/interceptors
  NOT as direct dependencies between unrelated modules

RULE 4: Shared kernel must be kept minimal
  Only truly shared types should live in the shared kernel

RULE 5: No circular dependencies
  If A depends on B, B must not depend on A (directly or transitively)
```

### Dependency Graph Analysis

```typescript
// Dependency graph health metrics
interface DependencyMetrics {
  totalModules: number;
  totalDependencies: number;
  averageDependenciesPerModule: number;  // Target: < 5
  maxDependencies: number;               // Target: < 10
  circularDependencies: number;          // Target: 0
  modulesWithExcessiveCoupling: number;  // Target: 0 (coupling > 8)
  depthOfDependencyTree: number;         // Target: < 5
}

// Assessment thresholds
const THRESHOLDS = {
  healthy: {
    avgDeps: 3,
    maxDeps: 7,
    circularDeps: 0,
    excessiveCoupling: 0,
    maxDepth: 4,
  },
  warning: {
    avgDeps: 5,
    maxDeps: 10,
    circularDeps: 0,
    excessiveCoupling: 2,
    maxDepth: 5,
  },
  critical: {
    avgDeps: 7,
    maxDeps: 15,
    circularDeps: 1,
    excessiveCoupling: 5,
    maxDepth: 7,
  },
};
```

---

## Cohesion Analysis

### Cohesion Levels

```yaml
cohesion_levels:
  functional_cohesion:
    level: "HIGHEST"
    description: "All elements contribute to a single, well-defined task"
    example: "EmailService.sendVerificationEmail()"
    target: "All public methods should have functional cohesion"

  sequential_cohesion:
    level: "HIGH"
    description: "Output of one element is input to the next"
    example: "PipelineProcessor.validate() → transform() → persist()"
    acceptable: "Yes, when the sequence is the primary responsibility"

  communicational_cohesion:
    level: "MEDIUM-HIGH"
    description: "Elements operate on the same data"
    example: "UserRepository.findById() and UserRepository.update()"
    acceptable: "Yes, when the data type defines the module's responsibility"

  procedural_cohesion:
    level: "MEDIUM"
    description: "Elements are related by control flow but not data"
    example: "A function that validates input AND logs it AND sends notification"
    concern: "Consider splitting into separate modules"

  temporal_cohesion:
    level: "LOW-MEDIUM"
    description: "Elements are grouped because they execute at the same time"
    example: "init() that sets up database, cache, logger, and config"
    acceptable: "Only in initialization/startup code"

  logical_cohesion:
    level: "LOW"
    description: "Elements do similar things but the 'thing' varies"
    example: "process(type: 'email' | 'sms' | 'push') with a big switch"
    concern: "Replace with strategy pattern"

  coincidental_cohesion:
    level: "LOWEST"
    description: "Elements are grouped arbitrarily"
    example: "utils.ts with unrelated helper functions"
    fix: "Split into domain-specific modules"
```

### Cohesion Metrics

```typescript
interface CohesionMetrics {
  lackOfCohesionOfMethods: number;  // LCOM — Target: < 0.5
  // LCOM = 1 - (sum of methods accessing each attribute / (numMethods * numAttributes))
  // LCOM close to 1 = low cohesion (bad)
  // LCOM close to 0 = high cohesion (good)
}
```

---

## Architecture Fitness Functions

### Definition

Architecture fitness functions are objective, measurable tests that verify whether
a system's architecture meets its quality goals. They are the "tests for architecture."

### Categories of Fitness Functions

```yaml
fitness_functions:
  # Triggered on every commit/build
  continuous:
    build_time:
      description: "Build completes within time limit"
      measurement: "build_time_seconds < 120"
      threshold: 120

    test_coverage:
      description: "Code coverage meets minimum threshold"
      measurement: "coverage_percentage >= 80"
      threshold: 80

    dependency_count:
      description: "No module has excessive dependencies"
      measurement: "max_module_dependencies <= 7"
      threshold: 7

    cyclic_dependencies:
      description: "No circular dependencies in module graph"
      measurement: "circular_dependency_count == 0"
      threshold: 0

  # Triggered periodically (daily/weekly)
  periodic:
    security_scan:
      description: "No critical or high vulnerabilities"
      measurement: "critical_and_high_vulnerabilities == 0"
      threshold: 0
      frequency: "daily"

    dependency_freshness:
      description: "No dependencies >2 major versions behind"
      measurement: "outdated_major_versions == 0"
      threshold: 0
      frequency: "weekly"

    api_stability:
      description: "No breaking changes to public APIs without deprecation"
      measurement: "undocumented_breaking_changes == 0"
      threshold: 0
      frequency: "weekly"

  # Triggered on demand
  on_demand:
    performance_baseline:
      description: "Key endpoints meet response time SLAs"
      measurement: "p95_response_time_ms < 500"
      threshold: 500

    scalability_test:
      description: "System handles expected peak load"
      measurement: "error_rate_at_peak_load < 0.01"
      threshold: 0.01

    architecture_compliance:
      description: "Code follows defined module boundaries"
      measurement: "cross_boundary_imports == 0"
      threshold: 0
```

### Implementing Fitness Functions

```typescript
// architecture-fitness.test.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Fitness Functions', () => {
  describe('Module Dependency Boundaries', () => {
    it('domain layer has no infrastructure imports', () => {
      const domainPath = './src/domain';
      const files = getAllFiles(domainPath, '.ts');

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = extractImports(content);

        const infraImports = imports.filter(
          imp => imp.includes('infrastructure') || imp.includes('@prisma') || imp.includes('drizzle')
        );

        expect(infraImports, `File ${file} has infrastructure imports: ${infraImports.join(', ')}`)
          .toHaveLength(0);
      }
    });

    it('no circular dependencies between modules', () => {
      const result = execSync('npx madge --circular --extensions ts ./src', { encoding: 'utf-8' });
      expect(result).toContain('No circular dependencies found');
    });
  });

  describe('Coupling Metrics', () => {
    it('no module exceeds dependency threshold', () => {
      const result = JSON.parse(
        execSync('npx madge --json ./src', { encoding: 'utf-8' })
      );

      const moduleDeps = Object.entries(result);
      const maxDeps = Math.max(...moduleDeps.map(([_, deps]) => deps.length));

      expect(maxDeps).toBeLessThanOrEqual(7);
    });
  });

  describe('Architecture Compliance', () => {
    it('API controllers are in the correct directory', () => {
      const controllerFiles = getAllFiles('./src', '.controller.ts');
      for (const file of controllerFiles) {
        expect(file).toMatch(/src\/modules\/.+\/(http|api)\//);
      }
    });

    it('domain entities have no API types', () => {
      const entityFiles = getAllFiles('./src/domain', '.entity.ts');
      for (const file of entityFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('Express.Request');
        expect(content).not.toContain('FastifyRequest');
      }
    });
  });
});
```

---

## System Boundary Definition

### Boundary Identification Checklist

```yaml
system_boundaries:
  identify_boundaries:
    - "What are the distinct business domains?"
    - "What are the distinct user types/actors?"
    - "What data has different confidentiality levels?"
    - "What services have different scaling requirements?"
    - "What services have different availability requirements?"
    - "What teams own different parts of the system?"

  define_interfaces:
    - "What data crosses each boundary?"
    - "What is the contract (schema) at each boundary?"
    - "What is the communication protocol at each boundary?"
    - "What are the error handling semantics at each boundary?"
    - "What authentication/authorization is required at each boundary?"
    - "What is the SLA at each boundary?"

  document_boundaries:
    - "Create a context diagram showing all boundaries"
    - "Document the contract at each boundary"
    - "Define the ownership and responsibility for each boundary"
    - "List the monitoring and alerting for each boundary"
```

### Context Diagram Template

```
┌─────────────────────────────────────────────────────────┐
│                    SYSTEM CONTEXT                         │
│                                                          │
│  ┌──────────┐     ┌──────────────────┐     ┌──────────┐ │
│  │  Users   │────▶│                  │────▶│ Stripe   │ │
│  │ (Web/Mob)│     │   Deerflow       │     │ (Payment)│ │
│  └──────────┘     │   Application    │     └──────────┘ │
│                   │                  │                   │
│  ┌──────────┐     │  ┌───────────┐  │     ┌──────────┐ │
│  │  Admin   │────▶│  │  Order    │  │────▶│ SendGrid │ │
│  │  Panel   │     │  │  Service  │  │     │ (Email)  │ │
│  └──────────┘     │  └───────────┘  │     └──────────┘ │
│                   │  ┌───────────┐  │                   │
│  ┌──────────┐     │  │  User     │  │     ┌──────────┐ │
│  │  Partner │────▶│  │  Service  │  │────▶│ S3       │ │
│  │    API   │     │  └───────────┘  │     │ (Storage)│ │
│  └──────────┘     │  ┌───────────┐  │     └──────────┘ │
│                   │  │ Notif.    │  │                   │
│                   │  │ Service   │  │                   │
│                   │  └───────────┘  │                   │
│                   └──────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

---

## Component Dependency Management

### Dependency Management Rules

```yaml
dependency_rules:
  versioning:
    - "Pin exact versions for production dependencies"
    - "Use ^ ranges only for dev dependencies"
    - "Document minimum version requirements in README"
    - "Use lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml)"

  update_strategy:
    - "Automated: Patch updates (no review needed)"
    - "Semi-automated: Minor updates (auto-PR, review required)"
    - "Manual: Major updates (assessment + migration plan required)"

  dependency_budget:
    direct_production: "max 30 direct production dependencies"
    direct_dev: "max 20 direct dev dependencies"
    total_depth: "max 5 levels of transitive dependencies"
    bundle_size: "max 500KB gzipped for frontend"
    duplicate_detection: "zero tolerance for duplicate major versions"
```

### Module Dependency Rules

```yaml
module_rules:
  layer_dependencies:
    domain:     "can depend on: [nothing external]"
    application: "can depend on: [domain]"
    infrastructure: "can depend on: [domain, application]"
    api:        "can depend on: [domain, application, infrastructure]"
    shared:     "can depend on: [nothing — shared kernel is leaf]"

  cross_module_dependencies:
    allowed: "via public interfaces only"
    forbidden: "direct internal module access"
    enforcement: "linter rules + architecture fitness tests"
```

---

## Architecture Review Checklist (Complete)

```markdown
## Architecture Review Checklist

### System Design
- [ ] Is there an up-to-date architecture diagram?
- [ ] Are system boundaries clearly defined?
- [ ] Are module responsibilities clearly separated?
- [ ] Is the data flow documented?
- [ ] Are the key design patterns documented with rationale?

### Scalability
- [ ] Has the system been assessed for horizontal scalability?
- [ ] Are there bottlenecks identified and mitigated?
- [ ] Is there a caching strategy?
- [ ] Is database scaling planned?
- [ ] Are there rate limiting and backpressure mechanisms?

### Reliability
- [ ] Are there circuit breakers for external dependencies?
- [ ] Are there retries with exponential backoff?
- [ ] Are there health checks and readiness probes?
- [ ] Is there a disaster recovery plan?
- [ ] Are there automated failover mechanisms?

### Security
- [ ] Is authentication enforced at all boundaries?
- [ ] Is authorization checked at the appropriate granularity?
- [ ] Are sensitive data encrypted at rest and in transit?
- [ ] Is there input validation at all entry points?
- [ ] Are dependencies free of known vulnerabilities?

### Observability
- [ ] Is structured logging implemented?
- [ ] Are there distributed traces for request flows?
- [ ] Are key metrics exposed and monitored?
- [ ] Are there alerts for critical conditions?
- [ ] Is there an on-call runbook?

### Evolvability
- [ ] Is the system modular enough to replace components?
- [ ] Are there abstraction layers that allow technology changes?
- [ ] Is there a migration path for breaking changes?
- [ ] Are ADRs maintained and up to date?
- [ ] Is technical debt tracked and prioritized?
```

---

*Architecture is not a one-time activity — it is a continuous process of decision-making,
documentation, validation, and evolution. Every change is an opportunity to improve or
degrade the architecture. Choose wisely.*
