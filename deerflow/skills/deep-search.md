# Deep Search Agent Skill

> **Skill ID:** deep-search
> **Version:** 1.0.0
> **Category:** Research & Verification
> **Priority:** CRITICAL — Must execute before writing any code that references external APIs, libraries, or services.

---

## Purpose

This skill governs how AI agents search for, verify, and cite information before writing code.
It prevents hallucination, ensures accuracy, and establishes a rigorous verification protocol
that every agent in the Deerflow framework MUST follow.

---

## Core Principle: NEVER Fabricate

### The Golden Rule

```
If you are not 100% certain about an API signature, library behavior, configuration option,
or framework version detail — YOU MUST SEARCH AND VERIFY BEFORE WRITING CODE.
```

### Fabrication Detection Triggers

Any of the following MUST trigger a mandatory search:

1. You are about to reference an external library API you haven't used recently
2. You are about to use a configuration option or flag
3. You are about to specify a version constraint or compatibility matrix
4. You are about to write code against a third-party service endpoint
5. You are about to reference a CLI command with specific flags
6. You are about to use a language feature introduced in a specific version
7. You are about to reference a deprecation notice or breaking change
8. You are about to cite a performance characteristic or benchmark
9. You are about to reference security best practices for a specific library
10. You are uncertain about ANY detail in your proposed code

### Fabrication Consequences

- Incorrect code that fails at runtime
- Security vulnerabilities from wrong API usage
- Time wasted debugging non-existent methods or options
- Loss of user trust in agent output
- Cascading errors when other code depends on fabricated details

---

## Search Protocol Hierarchy

### Level 1: Official Documentation (Highest Priority)

Always check official documentation first. This is the single most authoritative source.

| Source Type | Priority | URL Pattern |
|-------------|----------|-------------|
| Official library docs | ★★★★★ | `docs.{library}.com` or `{library}.dev/docs` |
| GitHub README + docs | ★★★★★ | `github.com/{org}/{repo}` |
| Official API reference | ★★★★★ | Provider's developer portal |
| RFC/Specification | ★★★★★ | `rfc-editor.org`, `tc39.es`, `wg21.link` |

### Level 2: Package Registry Documentation

| Registry | When to Use | Search Strategy |
|----------|-------------|-----------------|
| npmjs.com | Node.js packages | Check README, version history, dependencies |
| pypi.org | Python packages | Check classifiers, trove info, project links |
| crates.io | Rust crates | Check documentation link, repository |
| rubygems.org | Ruby gems | Check documentation, wiki links |
| Maven Central | Java/Kotlin | Check project URL, categories |

### Level 3: Community Resources (Verify Before Trusting)

| Source | Trust Level | Verification Required |
|--------|-------------|-----------------------|
| Stack Overflow | Medium-High | Check date, votes, accepted answer, comments |
| GitHub Issues | Medium | Check if issue is still open, if advice is confirmed |
| Dev.to / Medium | Low-Medium | Verify against official docs, check author credibility |
| Blog posts | Low-Medium | Always cross-reference with official sources |
| Reddit / HN | Low | Use only as leads, never as primary source |

### Level 4: Search Engines (Starting Points, Not Endpoints)

Search engines are tools to FIND authoritative sources, not authoritative sources themselves.

---

## GitHub Documentation Search Protocol

### Step 1: Repository Discovery

```
1. Search: "{library name} site:github.com"
2. Verify: Check star count (>1000 = significant adoption), last commit date,
          open issue count, contributor count
3. Confirm: Ensure this is the OFFICIAL repository, not a fork or mirror
```

### Step 2: Repository Documentation Inventory

Check these locations in order:

```
/github.com/{org}/{repo}
├── README.md                    → Quick start, basic usage
├── /tree/main/docs              → Detailed documentation
├── /wiki                        → Community wiki (if available)
├── /blob/main/CHANGELOG.md      → Version history, breaking changes
├── /releases                    → Release notes per version
├── /blob/main/package.json      → Dependencies, entry points
├── /blob/main/tsconfig.json     → TypeScript configuration
├── /issues?q=is%3Aissue+label%3Adocs → Documentation issues
└── /discussions                 → Community discussions
```

### Step 3: Source Code Verification

When documentation is unclear:

```
1. Navigate to /tree/main/src (or /lib, /packages)
2. Find the relevant module/class file
3. Read the actual function signature and type definitions
4. Check for JSDoc / TSDoc / docstrings inline
5. Look at test files for usage examples (tests are documentation)
```

### Step 4: GitHub-Specific Search Operators

```
{query} in:file                → Search within files
{query} language:typescript    → Filter by language
{query} repo:{owner}/{repo}    → Search within specific repo
{query} is:issue is:open       → Search open issues
{query} label:bug              → Filter by label
{query} author:{username}      → Filter by author
{query} path:src/              → Search specific directory
```

---

## npm / PyPI Package Documentation Verification

### npm Package Verification

```bash
# Step 1: Get package info
npm info {package-name}

# Step 2: Check critical fields
npm info {package-name} version        # Latest version
npm info {package-name} deprecated     # Is it deprecated?
npm info {package-name} dependencies   # What does it depend on?
npm info {package-name} time           # Release timeline
npm info {package-name} homepage       # Official website

# Step 3: Check download stats
npm info {package-name} --json | jq '.downloads'
```

### PyPI Package Verification

```bash
# Step 1: Get package info
pip index versions {package-name}
pip show {package-name}

# Step 2: Check classifiers for Python compatibility
pip install {package-name} --dry-run

# Step 3: Check on PyPI directly
# Visit: https://pypi.org/project/{package-name}/
# Verify: Maintainers, project links, classifiers, license
```

### Verification Checklist for Any Package

- [ ] Is this the canonical package name? (check for typosquatting)
- [ ] What is the latest stable version?
- [ ] Is the package actively maintained? (commits within last 6 months)
- [ ] Does the package have a security audit history?
- [ ] Are there known critical vulnerabilities? (check `npm audit`, `safety`)
- [ ] Does the package support the target runtime/framework version?
- [ ] What is the license? Is it compatible with the project?
- [ ] How many direct dependencies does it add?
- [ ] Is there an alternative with fewer dependencies?

---

## MDN Web Docs as Primary Source for Web APIs

### When to Use MDN

MDN Web Docs is the authoritative source for:

- HTML elements and attributes
- CSS properties and values
- JavaScript/ECMAScript APIs
- Web APIs (Fetch, WebSocket, IntersectionObserver, etc.)
- HTTP headers and status codes
- Browser compatibility information
- Web security features (CSP, CORS, etc.)

### MDN Search Protocol

```
1. Direct search: mdn {API name}
   Example: "mdn IntersectionObserver"

2. For browser compatibility:
   Navigate to the "Browser compatibility" section at the bottom of any MDN page

3. For deprecated features:
   Check the "Deprecated" banner and "Deprecated" column in compatibility table

4. For experimental features:
   Check the "Experimental" banner — these may not be production-ready
```

### MDN Anti-Patterns to Avoid

```
❌ DON'T: Assume all JavaScript APIs work in Node.js (many are browser-only)
❌ DON'T: Use experimental APIs without checking browser support
❌ DON'T: Ignore the "Specification" link — it may clarify edge cases
❌ DON'T: Skip the "Examples" section — they show correct usage
❌ DON'T: Trust memory about which methods are static vs instance
```

---

## Search Query Formulation Techniques

### Query Structure Template

```
{technology} {specific API/feature} {version} site:{trusted-domain}
```

### Progressive Refinement Technique

```
Round 1 (Broad):     "prisma ORM findMany include"
Round 2 (Specific):  "prisma findMany include nested relation TypeScript"
Round 3 (Precise):   "prisma findMany include deep nesting site:prisma.io"
Round 4 (Verified):  Check prisma.io/docs for the specific section
```

### Query Modifiers by Source

```
# GitHub
"{repo} {feature}" site:github.com
"{repo} issue {problem}" site:github.com
"{repo} example {use-case}" site:github.com

# Stack Overflow
"{problem} {technology}" site:stackoverflow.com
"{error-message}" site:stackoverflow.com
"{API} deprecation" site:stackoverflow.com

# Official Docs
"{library} {feature}" site:docs.{library}.com
"{library} {feature}" site:{library}.dev/docs
"{library} migration {version}" site:{library}.com

# MDN
"{Web API}" site:developer.mozilla.org
"{CSS property}" site:developer.mozilla.org
```

### Negative Search Operators

```
# Exclude noise
"{API} tutorial" -youtube -medium -dev.to
"{library} {feature}" -site:reddit.com -site:medium.com
"{error}" -site:stackoverflow.com/questions/1[0-9]  # exclude low-ID spam
```

---

## Multi-Source Cross-Referencing

### The Three-Source Rule

For any critical technical claim, verify against at least THREE independent sources:

```
Source 1: Official documentation (required)
Source 2: Source code / type definitions (required)
Source 3: Community verification (Stack Overflow, GitHub issues)
```

### Cross-Referencing Protocol

```
Step 1: Read the official documentation
         → Record the API signature, parameters, return type

Step 2: Check the TypeScript types / source code
         → Verify types match documentation
         → Note any optional parameters or overloads

Step 3: Check Stack Overflow / GitHub issues
         → Look for real-world usage patterns
         → Check for reported bugs or gotchas
         → Verify the documentation matches actual behavior

Step 4: Check test files in the library's repository
         → Tests are executable documentation
         → They reveal edge cases and expected behavior

Step 5: Synthesize findings
         → If all sources agree → HIGH confidence
         → If 3/4 agree → MEDIUM confidence (note discrepancy)
         → If sources disagree → LOW confidence (investigate further)
```

### Conflict Resolution

When sources disagree:

```
1. Official docs + source code = TRUTH (even if community says otherwise)
2. Source code > Documentation (if they conflict, code is the reality)
3. Recent issue/PR discussion > Old documentation
4. Release notes > README (release notes are version-specific)
5. Type definitions > Text documentation (types are machine-verified)
```

---

## Source Citation Format

### Inline Code Comments

```typescript
// Source: https://docs.prisma.io/reference/api-reference/prisma-client-reference#findmany
// Verified: 2024-01-15 against Prisma 5.8.0 source code
// Note: The `include` option does not work with `select` on the same query
const users = await prisma.user.findMany({
  include: { posts: true },
});
```

### ADR (Architecture Decision Record) Citations

```markdown
## Decision: Use Zod for runtime validation

### Sources Consulted
- Official docs: https://zod.dev (accessed 2024-01-15)
- npm: 2.1M weekly downloads, v3.22.4, MIT license
- GitHub: 32.4k stars, last commit 3 days ago, 410 contributors
- Stack Overflow: Confirmed Zod + tRPC integration pattern
- Source code: Verified `z.object()` type inference in `src/index.ts`

### Confidence Level: HIGH
```

### Agent Communication Citations

```
[CITATION: MDN - Fetch API - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API]
[CITATION: Prisma Docs v5.8 - findMany - https://prisma.io/docs/orm/reference/api-reference/prisma-client-reference#findmany]
[CITATION: GitHub Issue #1234 - Confirmed: useConnection() is the correct hook]
```

---

## Anti-Hallucination Checklist

Run this checklist mentally BEFORE writing any code that references external APIs:

### Pre-Code Verification

- [ ] Have I verified the API exists in the current version of the library?
- [ ] Have I checked the exact function/method signature (parameter names, types, order)?
- [ ] Have I confirmed the return type and structure?
- [ ] Have I checked for required vs optional parameters?
- [ ] Have I verified this API is not deprecated in the target version?
- [ ] Have I checked for breaking changes in recent releases?
- [ ] Have I confirmed the import path / module name is correct?
- [ ] Have I verified the configuration options I'm using are valid?

### During-Code Verification

- [ ] Are my type annotations matching the actual library types?
- [ ] Am I using the correct casing for methods and properties?
- [ ] Am I handling the correct error types?
- [ ] Am I using callbacks/promises/async-await as the library expects?
- [ ] Are my default values matching the library's actual defaults?
- [ ] Am I using the correct event names and payload structures?

### Post-Code Verification

- [ ] Does my code compile/type-check against the actual library types?
- [ ] Have I traced through the code path to verify correctness?
- [ ] Have I considered edge cases mentioned in the documentation?
- [ ] Have I checked for common pitfalls listed in library docs or issues?
- [ ] Does my error handling match the library's error patterns?

---

## Example Searches for Common Scenarios

### Scenario 1: Using a New React Hook

```
Question: "How do I use useTransition in React 18?"

Search Protocol:
1. MDN: No (React isn't an MDN topic)
2. React Docs: https://react.dev/reference/react/useTransition
3. GitHub: https://github.com/facebook/react — search useTransition in source
4. Stack Overflow: "react useTransition example" site:stackoverflow.com
5. Type Check: Check @types/react for useTransition signature

Verification: Confirmed useTransition returns [isPending, startTransition]
```

### Scenario 2: Configuring a Database Connection

```
Question: "What are the correct connection string options for PostgreSQL with Prisma?"

Search Protocol:
1. Prisma Docs: https://www.prisma.io/docs/concepts/database-connectors/postgresql
2. PostgreSQL Docs: https://www.postgresql.org/docs/current/libpq-connect.html
3. GitHub Issues: Search "prisma postgresql connection string ssl"
4. npm: Check latest prisma version and any breaking changes

Verification: Confirmed sslmode options, connection pool config, URL format
```

### Scenario 3: Implementing JWT Authentication

```
Question: "What is the correct way to verify JWT tokens with the jose library?"

Search Protocol:
1. npm: "jose" — check latest version (v5.x vs v4.x differences)
2. GitHub: https://github.com/panva/jose — read README and docs/
3. Official Docs: https://jose.pages.dev/
4. Stack Overflow: "jose jwt verify typescript" — check recent answers
5. Source Code: Check jwtVerify function signature in src/jwt/verify.ts

Verification: Confirmed jose v5 uses dynamic imports, different API from v4
```

### Scenario 4: Setting Up CORS Middleware

```
Question: "What are the correct CORS options for the cors npm package with Express?"

Search Protocol:
1. npm: "cors" — check version, README on npmjs.com
2. GitHub: https://github.com/expressjs/cors
3. MDN: "CORS" site:developer.mozilla.org — understand the underlying mechanism
4. Express Docs: Check if Express has updated CORS guidance
5. Stack Overflow: "cors express configuration" — verify common patterns

Verification: Confirmed origin option accepts string, array, regex, or function
```

### Scenario 5: Docker Multi-Stage Build

```
Question: "What is the correct syntax for COPY --from in Dockerfile?"

Search Protocol:
1. Docker Docs: https://docs.docker.com/reference/dockerfile/#copy
2. Docker GitHub: https://github.com/moby/moby — check parser implementation
3. Stack Overflow: "docker multistage copy from" — verify patterns

Verification: Confirmed COPY --from=stage works with named stages and indices
```

---

## Search Tool Integration

### Supported Search Actions

```yaml
deep-search:
  actions:
    - web-search:          # General web search
        query: string
        limit: number      # Max results (default: 5)
    - doc-lookup:          # Official documentation search
        library: string
        topic: string
        version: string    # Optional: specific version
    - source-verify:       # Verify a claim against sources
        claim: string
        min_sources: number # Minimum sources required (default: 3)
        confidence_threshold: string # LOW | MEDIUM | HIGH (default: HIGH)
    - package-check:       # Verify package information
        name: string
        registry: string   # npm | pypi | crates | maven
        check_fields:
          - version
          - deprecated
          - license
          - dependencies
          - downloads
```

### Search Result Confidence Scoring

```
Score 90-100: OFFICIAL — Verified against official documentation and source code
Score 70-89:  HIGH — Verified against official docs + one community source
Score 50-69:  MEDIUM — Verified against multiple community sources
Score 30-49:  LOW — Found in community sources but not cross-referenced
Score 0-29:   UNVERIFIED — Cannot verify, DO NOT use in code
```

---

## Emergency Protocol: When You Can't Find Information

### Step 1: Broaden Search
```
- Try alternative terminology
- Search for the underlying concept instead of the specific API
- Check if the feature was renamed or moved
```

### Step 2: Check Version History
```
- The feature may exist in a different version
- Check CHANGELOG, migration guides, release notes
- Search GitHub commits for the feature name
```

### Step 3: Check for Alternatives
```
- The feature may have been replaced by something else
- Check the library's GitHub issues for "removed", "deprecated", "replaced"
```

### Step 4: Ask for Clarification
```
- If the user specified a library/API, ask them to confirm the version
- If unsure about the approach, present verified alternatives with trade-offs
- NEVER guess and hope — ask instead
```

### Step 5: Document the Gap
```
Document what you couldn't verify:
"⚠️ Could not verify {specific detail}. Searched {sources checked}.
 The implementation uses {approach} based on {best available evidence}.
 Recommend manual verification before merging."
```

---

## Summary: The Deep Search Decision Tree

```
START: Need to write code using external API/library
  │
  ├─ Do I know this API with 100% certainty?
  │   ├─ YES → Write code, add source citation
  │   └─ NO  → Continue to search
  │
  ├─ Search official documentation
  │   ├─ Found & clear → Record findings, proceed to cross-reference
  │   └─ Not found → Search GitHub source code
  │
  ├─ Cross-reference with 2+ additional sources
  │   ├─ Sources agree → HIGH confidence, proceed
  │   ├─ Minor disagreement → Note discrepancy, proceed with caution
  │   └─ Major disagreement → Investigate further, do NOT proceed
  │
  ├─ Run anti-hallucination checklist
  │   ├─ All pass → Write code with citations
  │   └─ Any fail → Search more or ask for clarification
  │
  └─ Write code with proper source citations
      └─ Add confidence level notation
```

---

*This skill is mandatory for all agents. Violations of the deep-search protocol
will result in code that is unreliable, insecure, and incorrect. When in doubt,
always search.*
