# Deerflow Agent Framework — 08: Documentation Standards

> **Status:** Core Rule
> **Priority:** P2 (Medium — Documentation enables maintainability)
> **Applies to:** All documentation, code comments, and technical writing

---

## 1. Overview

Documentation is the bridge between the code and the humans who interact with it.
Good documentation reduces onboarding time, prevents knowledge loss, and enables
confident maintenance and evolution of the codebase. This rule establishes the
minimum documentation standards for all Deerflow-managed projects.

---

## 2. README.md for Every Project

### 2.1 Rules

- **RULE 2.1.1** — Every project must have a `README.md` at the root directory.
- **RULE 2.1.2** — The README must include the following sections:
  - **Project Name & Description** — What the project does and why it exists
  - **Getting Started** — Prerequisites, installation, and first-run instructions
  - **Development** — How to set up the development environment
  - **Architecture** — High-level overview of the project structure
  - **Testing** — How to run tests
  - **Building** — How to build for production
  - **Deployment** — How to deploy (if applicable)
  - **Contributing** — Contribution guidelines (if open source)
  - **License** — License information

- **RULE 2.1.3** — The README must be written in clear, concise language. Avoid
  jargon unless the audience is expected to understand it.
- **RULE 2.1.4** — The README must be kept up-to-date. When the project changes,
  the README must be updated accordingly.
- **RULE 2.1.5** — Include badges for CI status, coverage, and license.

### 2.2 README Template

```markdown
# Project Name

Brief description of what the project does and why it exists.

[![CI Status](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)]
[![Coverage](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg)]
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm >= 9.0.0

### Installation
\```bash
git clone https://github.com/org/repo.git
cd repo
npm install
cp .env.example .env  # Configure environment variables
npm run dev
\```

## Development
\```bash
npm run dev       # Start development server
npm run test      # Run tests
npm run lint      # Run linter
npm run build     # Build for production
\```

## Architecture
Brief overview of the project architecture and key design decisions.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License
This project is licensed under the MIT License.
```

---

## 3. JSDoc on All Public APIs

### 3.1 Rules

- **RULE 3.1.1** — Every exported function, class, interface, and type must have
  JSDoc documentation.
- **RULE 3.1.2** — JSDoc must include:
  - A one-line summary of the purpose
  - `@param` tags for all parameters (with type and description)
  - `@returns` tag describing the return value
  - `@throws` tag for documented error cases
  - `@example` for complex or non-obvious usage
- **RULE 3.1.3** — JSDoc should explain the **why**, not the **what**. The code
  already shows what; the JSDoc should explain the intent, context, and caveats.
- **RULE 3.1.4** — Avoid obvious JSDoc that restates the function signature:
  ```typescript
  // DON'T: Obvious JSDoc
  /**
   * Sets the name.
   * @param name The name to set.
   */
  function setName(name: string): void { ... }
  ```
- **RULE 3.1.5** — Internal functions should have JSDoc if the behavior is not
  obvious from the name and parameter types.

### 3.2 Examples

```typescript
/**
 * Rotates a refresh token to prevent replay attacks.
 *
 * This function invalidates the current refresh token and issues a new one.
 * The old token is added to a denylist and the new token is returned to the
 * caller. This must be called on every token refresh to maintain security.
 *
 * @param currentToken - The refresh token to rotate.
 * @returns An object containing the new access token and refresh token.
 * @throws {InvalidTokenError} If the current token is invalid or already revoked.
 * @throws {TokenReuseError} If the current token has been previously used (replay detected).
 *
 * @example
 * ```typescript
 * const { accessToken, refreshToken } = await rotateRefreshToken(currentToken);
 * // Store the new tokens and discard the old ones
 * ```
 */
export async function rotateRefreshToken(
  currentToken: string
): Promise<TokenPair> {
  // implementation
}
```

---

## 4. Inline Comments for Complex Logic

### 4.1 Rules

- **RULE 4.1.1** — Complex or non-obvious logic must be explained with inline
  comments. The threshold for "complex" is subjective, but if a future reader
  might ask "why is this done this way?", a comment is needed.
- **RULE 4.1.2** — Inline comments should explain **why**, not **what**:
  ```typescript
  // DON'T: Commenting what the code does (the code already says this)
  // Increment the counter by 1
  counter++;

  // DO: Explaining why
  // Counter must be incremented before validation because the validation
  // step depends on the counter being accurate for the current request.
  counter++;
  ```
- **RULE 4.1.3** — Comments must be kept in sync with the code. A comment that
  contradicts the code is worse than no comment at all.
- **RULE 4.1.4** — Use `TODO:` comments for deferred work with a reference to an
  issue number:
  ```typescript
  // TODO(#123): Replace with proper rate limiting when migration is complete
  ```
- **RULE 4.1.5** — Use `FIXME:` comments for known issues that need attention.
- **RULE 4.1.6** — Use `HACK:` comments for temporary workarounds that need to
  be revisited. Include a brief explanation of why the hack exists.

### 4.2 Comment Quality Examples

```typescript
// DON'T: Noise comments
const timeout = 5000; // timeout in milliseconds
const MAX_RETRIES = 3; // max retries

// DO: Contextual comments
const timeout = 5000;
// 5 second timeout balances responsiveness with reliability for API calls
// that typically respond within 200ms but occasionally spike to 3-4 seconds
// under heavy load.

// DON'T: Obvious comment
if (user.role === 'admin') {
  // Check if user is admin
  grantAccess();
}

// DO: Explaining business rule
if (user.role === 'admin') {
  // Admins bypass the approval workflow because they are trusted
  // to follow the organization's change management policy.
  // See ADR-007 for the full discussion of this decision.
  grantAccess();
}
```

---

## 5. Architecture Decision Records (ADRs)

### 5.1 Rules

- **RULE 5.1.1** — Significant architectural decisions must be documented in
  Architecture Decision Records (ADRs).
- **RULE 5.1.2** — An ADR must be created when:
  - Choosing a framework, library, or technology
  - Establishing a project structure or pattern
  - Making a trade-off between competing approaches
  - Setting a precedent that will affect future decisions
- **RULE 5.1.3** — ADRs must be stored in `docs/adr/` with sequential numbering:
  `0001-database-selection.md`, `0002-authentication-strategy.md`, etc.
- **RULE 5.1.4** — Each ADR must include:
  - **Title** — Short, descriptive name
  - **Status** — Proposed, Accepted, Deprecated, Superseded
  - **Context** — What is the issue and why are we deciding?
  - **Decision** — What was decided?
  - **Consequences** — What are the positive and negative outcomes?

### 5.2 ADR Template

```markdown
# ADR-0001: Title of the Decision

## Status
Accepted

## Context
Why is this decision needed? What forces are at play?

## Decision
What was decided? State the decision clearly.

## Consequences
What are the positive and negative outcomes of this decision?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Drawback 1
- Drawback 2

### Risks
- Risk 1 and mitigation strategy
```

---

## 6. API Documentation (OpenAPI/Swagger)

### 6.1 Rules

- **RULE 6.1.1** — All REST APIs must have OpenAPI (Swagger) documentation.
- **RULE 6.1.2** — API documentation must include:
  - All endpoints with HTTP methods, paths, and descriptions
  - Request parameters (path, query, header, body) with types and validation
  - Response schemas for all status codes (200, 400, 401, 403, 404, 500)
  - Authentication requirements
  - Error response formats
- **RULE 6.1.3** — API documentation must be generated from code annotations when
  possible (e.g., using `tsoa`, `nestjs/swagger`, or `swagger-jsdoc`).
- **RULE 6.1.4** — API documentation must be served at the `/docs` endpoint in
  development mode.
- **RULE 6.1.5** — API documentation must be versioned alongside the API.

### 6.2 OpenAPI Example

```yaml
paths:
  /api/users/{id}:
    get:
      summary: Get a user by ID
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

---

## 7. Changelog Maintenance

### 7.1 Rules

- **RULE 7.1.1** — Every project must maintain a `CHANGELOG.md` file.
- **RULE 7.1.2** — The changelog must follow the [Keep a Changelog](https://keepachangelog.com/)
  format:
  - **Added** — New features
  - **Changed** — Changes to existing functionality
  - **Deprecated** — Soon-to-be-removed features
  - **Removed** — Removed features
  - **Fixed** — Bug fixes
  - **Security** — Security vulnerability fixes
- **RULE 7.1.3** — Every release must have a corresponding changelog entry.
- **RULE 7.1.4** — Consider automating changelog generation with tools like
  `standard-version`, `semantic-release`, or `conventional-changelog`.

### 7.2 Changelog Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-15

### Added
- User profile image upload
- Email notification preferences

### Changed
- Improved search performance by 40%

### Fixed
- Login redirect loop on mobile devices

### Security
- Updated lodash to 4.17.21 (CVE-2024-XXXX)
```

---

## 8. Code Comments in User's Language

### 8.1 Rules

- **RULE 8.1.1** — Code comments, documentation, and error messages must be written
  in the same language the user communicates in.
- **RULE 8.1.2** — If the user communicates in English, all comments and docs
  are in English. If the user communicates in another language, match that language.
- **RULE 8.1.3** — Code identifiers (variable names, function names, class names)
  should always be in English, regardless of the user's language. This is a
  universal programming convention.
- **RULE 8.1.4** — README and documentation files follow the user's language.
- **RULE 8.1.5** — If the user switches languages mid-conversation, match the
  current language for new content but do not retroactively change existing content.

---

## 9. Summary

Documentation is an investment in the future. Code is read far more often than it
is written, and documentation bridges the gap between the author's intent and the
reader's understanding. These standards ensure that every project has comprehensive,
accurate, and useful documentation.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-008*
