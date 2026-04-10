# Deerflow Agent Framework — 05: Security Checklist

> **Status:** Core Rule
> **Priority:** P0 (Critical — Security vulnerabilities are unacceptable)
> **Applies to:** All code, configuration, and infrastructure managed by agents

---

## 1. Overview

Security is the highest-priority concern in the Deerflow Agent Framework. A single
security vulnerability can compromise user data, system integrity, and organizational
reputation. This checklist defines the mandatory security requirements that every
agent must follow.

---

## 2. Never Hardcode Secrets

### 2.1 Rules

- **RULE 2.1.1** — NEVER embed API keys, passwords, authentication tokens, database
  credentials, or any secret values in source code.
- **RULE 2.1.2** — All secrets must be loaded from environment variables,
  secret management systems (AWS Secrets Manager, HashiCorp Vault), or
  `.env` files that are git-ignored.
- **RULE 2.1.3** — The `.env` file must be listed in `.gitignore` BEFORE it is
  created. If it is accidentally committed, rotate the secrets immediately.
- **RULE 2.1.4** — Provide a `.env.example` file that documents all required
  environment variables without actual values.
- **RULE 2.1.5** — Never log secrets, even at debug level. Mask secrets in all
  log output.
- **RULE 2.1.6** — Never include secrets in error messages or stack traces sent
  to the client.

### 2.2 Examples

```typescript
// DO: Load secrets from environment variables
const config = {
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.STRIPE_API_KEY,
  jwtSecret: process.env.JWT_SECRET,
};

// DON'T: Hardcoded secrets
const config = {
  databaseUrl: 'postgresql://admin:password123@localhost:5432/mydb',
  apiKey: 'sk_live_abc123def456ghi789',
  jwtSecret: 'my-super-secret-key',
};
```

### 2.3 .env.example Template

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys
STRIPE_API_KEY=sk_test_...
SENDGRID_API_KEY=SG....

# JWT
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

---

## 3. Input Validation on ALL User Inputs

### 3.1 Rules

- **RULE 3.1.1** — ALL data received from external sources must be validated:
  - HTTP request bodies, query parameters, headers
  - WebSocket messages
  - File uploads
  - Environment variables (non-secret)
  - Database query results (don't trust the DB either)
- **RULE 3.1.2** — Use a schema validation library (Zod, Yup, Joi, or AJV) for
  structured input validation. Never write custom validation regex for complex
  structures.
- **RULE 3.1.3** — Validation must happen at the system boundary (API route,
  event handler), not deep inside business logic.
- **RULE 3.1.4** — Validate both structure (types, required fields) and content
  (string length, value range, format).
- **RULE 3.1.5** — Reject unexpected fields in input (no `...rest` spreading
  unvalidated properties into internal objects).

### 3.2 Examples

```typescript
// DO: Comprehensive schema validation with Zod
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254).toLowerCase(),
  password: z.string().min(12).max(128),
  role: z.enum(['user', 'admin']).default('user'),
});

type CreateUserDTO = z.infer<typeof CreateUserSchema>;

// Validation at the boundary
app.post('/api/users', async (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  // result.data is fully typed and validated
  const user = await userService.create(result.data);
  return res.status(201).json(user);
});

// DON'T: No validation, trusting user input
app.post('/api/users', async (req, res) => {
  const user = await userService.create(req.body); // DANGER: unvalidated
  return res.status(201).json(user);
});
```

---

## 4. SQL Injection Prevention

### 4.1 Rules

- **RULE 4.1.1** — NEVER concatenate user input into SQL queries. Always use
  parameterized queries or an ORM/QueryBuilder that supports parameterized queries.
- **RULE 4.1.2** — If using a query builder (Knex, Kysely), always use the
  binding syntax (e.g., `where('email', email)`) rather than string interpolation.
- **RULE 4.1.3** — If using raw SQL, use the parameter binding syntax of the
  database driver (e.g., `$1`, `?`, `:param`).
- **RULE 4.1.4** — Never use `eval()`, `new Function()`, or template string
  interpolation to construct SQL queries.

### 4.2 Examples

```typescript
// DO: Parameterized query
const user = await db.query(
  'SELECT * FROM users WHERE email = $1 AND is_active = $2',
  [email, true]
);

// DO: ORM/QueryBuilder
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// DON'T: String interpolation (SQL INJECTION!)
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
// If email is "admin' OR '1'='1", this returns ALL users.
```

---

## 5. XSS Prevention

### 5.1 Rules

- **RULE 5.1.1** — All user-supplied content rendered in the browser must be
  sanitized or escaped.
- **RULE 5.1.2** — When using React, JSX automatically escapes string content.
  However, `dangerouslySetInnerHTML` bypasses this protection and must be used
  with extreme caution.
- **RULE 5.1.3** — If `dangerouslySetInnerHTML` is necessary, sanitize the HTML
  first using a library like DOMPurify or sanitize-html.
- **RULE 5.1.4** — Set Content Security Policy (CSP) headers to mitigate XSS:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
  ```
- **RULE 5.1.5** — Avoid `eval()`, `document.write()`, and `innerHTML` in
  client-side code.

### 5.2 Examples

```typescript
// DON'T: Using dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userComment }} />
// If userComment contains <script>alert('xss')</script>, this executes it.

// DO: Sanitize before rendering
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />
```

---

## 6. CSRF Protection

### 6.1 Rules

- **RULE 6.1.1** — All state-changing HTTP requests (POST, PUT, PATCH, DELETE)
  must be protected against Cross-Site Request Forgery (CSRF).
- **RULE 6.1.2** — Use CSRF tokens for server-rendered applications. Generate a
  unique token per session and validate it on every state-changing request.
- **RULE 6.1.3** — For API-based applications, use the SameSite cookie attribute
  (`SameSite=Strict` or `SameSite=Lax`) as a first line of defense.
- **RULE 6.1.4** — For SPAs with JWT authentication, use the Authorization header
  (which is not automatically sent by browsers) instead of cookies for
  authentication tokens.

### 6.2 Express CSRF Example

```typescript
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Provide CSRF token to the client
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

## 7. Rate Limiting

### 7.1 Rules

- **RULE 7.1.1** — All public-facing API endpoints must have rate limiting to
  prevent abuse, brute-force attacks, and denial-of-service.
- **RULE 7.1.2** — Authentication endpoints (login, password reset, registration)
  must have stricter rate limits (e.g., 5 requests per minute per IP).
- **RULE 7.1.3** — Rate limiting should be applied per IP address and per user
  (if authenticated).
- **RULE 7.1.4** — Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset`) should be included in responses.
- **RULE 7.1.5** — Use a robust rate limiting library (express-rate-limit for
  Express) or a gateway-level solution (Nginx, API Gateway).

### 7.2 Examples

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/auth/register', authLimiter, registerHandler);
```

---

## 8. HTTPS Only

### 8.1 Rules

- **RULE 8.1.1** — All production applications must serve content over HTTPS only.
- **RULE 8.1.2** — Redirect all HTTP traffic to HTTPS.
- **RULE 8.1.3** — Set the `Strict-Transport-Security` header to enforce HTTPS:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```
- **RULE 8.1.4** — Use HSTS preload for production applications to ensure browsers
  only connect over HTTPS.
- **RULE 8.1.5** — Development environments may use HTTP, but the agent must not
  remove HTTPS configuration from production configurations.

---

## 9. Authentication Best Practices

### 9.1 Rules

- **RULE 9.1.1** — Passwords must be hashed using a strong algorithm (bcrypt with
  cost factor >= 12, argon2id). Never store plaintext passwords.
- **RULE 9.1.2** — JWTs must have a reasonable expiration time (15 minutes for
  access tokens, 7 days for refresh tokens).
- **RULE 9.1.3** — JWTs must be signed with a strong key (minimum 256 bits for
  HMAC-SHA256).
- **RULE 9.1.4** — Implement token revocation for logout and security incidents.
- **RULE 9.1.5** — Multi-factor authentication (MFA) should be supported for
  sensitive operations.
- **RULE 9.1.6** — Account lockout after a configurable number of failed login
  attempts.

### 9.2 Examples

```typescript
// DO: Secure password hashing with bcrypt
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## 10. Authorization Checks

### 10.1 Rules

- **RULE 10.1.1** — Every API endpoint that accesses protected resources must
  verify the user's authorization level before processing the request.
- **RULE 10.1.2** — Authorization must be checked server-side, never client-side
  only. Client-side checks are for UX only; server-side checks enforce security.
- **RULE 10.1.3** — Use the principle of least privilege: users should only have
  access to the resources they need.
- **RULE 10.1.4** — Implement resource-level authorization (e.g., "user A can only
  edit their own posts") in addition to role-level authorization.
- **RULE 10.1.5** — Authorization checks must be performed in middleware or
  decorators, not scattered throughout route handlers.

### 10.2 Examples

```typescript
// DO: Authorization middleware
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireOwnership(resourceGetter: (id: string) => Promise<{ userId: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resource = await resourceGetter(req.params.id);
    if (resource.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.delete('/api/posts/:id',
  authenticate,
  requireOwnership((id) => postService.findById(id)),
  deletePostHandler
);
```

---

## 11. Content Security Policy

### 11.1 Rules

- **RULE 11.1.1** — Set a Content Security Policy (CSP) header on all responses.
- **RULE 11.1.2** — The CSP should be as restrictive as possible while still
  allowing the application to function.
- **RULE 11.1.3** — Use nonce-based CSP for inline scripts if needed, rather than
  `unsafe-inline`.
- **RULE 11.1.4** — Report CSP violations to a monitoring endpoint.

### 11.2 Examples

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles are common in React
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL!],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
```

---

## 12. Helmet.js for Express

### 12.1 Rules

- **RULE 12.1.1** — All Express applications must use Helmet.js to set security
  headers automatically.
- **RULE 12.1.2** — Helmet must be configured with explicitly defined policies,
  not default settings alone. Review each header and configure appropriately.
- **RULE 12.1.3** — The following Helmet middlewares must be enabled:
  - `contentSecurityPolicy` (see Section 11)
  - `hsts` (HTTP Strict Transport Security)
  - `noSniff` (X-Content-Type-Options: nosniff)
  - `referrerPolicy` (Referrer-Policy)
  - `xssFilter` (X-XSS-Protection — legacy, but still useful)

### 12.3 Examples

```typescript
import helmet from 'helmet';

app.use(helmet());
// Sets 11 security headers by default:
// - Content-Security-Policy
// - Strict-Transport-Security
// - X-Content-Type-Options
// - X-Frame-Options
// - X-XSS-Protection
// - Referrer-Policy
// - And more...
```

---

## 13. Dependency Vulnerability Scanning

### 13.1 Rules

- **RULE 13.1.1** — Run `npm audit` (or `yarn audit`, `pnpm audit`) before every
  release.
- **RULE 13.1.2** — Integrate a dependency scanning tool (Snyk, Dependabot,
  Renovate) into the CI/CD pipeline.
- **RULE 13.1.3** — Critical and high severity vulnerabilities must be fixed
  before release. Do not ship known vulnerabilities.
- **RULE 13.1.4** — When a vulnerability is discovered, assess the actual impact
  (is the vulnerable code path used?), but default to upgrading.
- **RULE 13.1.5** — Subscribe to security advisories for all direct dependencies.

### 13.2 Scanning Commands

```bash
# npm audit (built-in)
npm audit --production --audit-level=high

# Snyk (third-party)
npx snyk test --severity-threshold=high

# npm-check-updates (check for outdated packages)
npx npm-check-updates
```

---

## 14. Additional Security Measures

### 14.1 Rules

- **RULE 14.1.1** — Never expose stack traces, internal error messages, or
  framework details in production error responses.
- **RULE 14.1.2** — Implement request size limits to prevent payload-based attacks.
- **RULE 14.1.3** — Disable directory listing on the web server.
- **RULE 14.1.4** — Set appropriate CORS headers. Use `cors` middleware with
  explicit origin whitelisting, not wildcard `*`.
- **RULE 14.1.5** — Log security-relevant events (failed logins, permission
  denials, suspicious activity) for audit purposes.
- **RULE 14.1.6** — Use secure cookie settings:
  ```
  Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/
  ```

---

## 15. Summary

Security is not an afterthought — it is a continuous process that must be applied
to every line of code, every configuration change, and every deployment. These
rules represent the minimum security baseline for any Deerflow-managed project.
When in doubt, choose the more secure option.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-005*
