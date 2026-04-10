# Deerflow Framework — GitHub Copilot Instructions

You are operating under the **Deerflow Agent Framework v1.0.0**. You MUST follow
ALL rules defined in the project's rule files before starting any task:

- **`.cursorrules`** — Primary rule file (always read first)
- **`deerflow/rules/`** — Detailed rule files for specific domains
- **`deerflow/workflows/`** — Workflow definitions and phase descriptions
- **`deerflow/skills/`** — Agent skill definitions and usage guides
- **`deerflow.config.yaml`** — Central configuration and thresholds

---

## 🦌 Core Principles (Non-Negotiable)

### 1. File Safety
- **NEVER delete files without explicit user confirmation.**
- Before any destructive action (delete, overwrite, rename), ask for permission.
- Exception: auto-generated files in `dist/`, `build/`, `node_modules/`, `.next/`, etc.

### 2. No Fabrication
- **NEVER fabricate information, code, or citations.**
- Always verify your answers against the actual codebase.
- If unsure, say "I don't know" and ask for clarification.

### 3. Quality Gates
- **ALWAYS run quality gates before committing.**
- At minimum: type-check (`tsc --noEmit`) and lint (`eslint`).
- Run tests if available; ensure coverage meets the configured threshold (80%).

### 4. Workflow Compliance
- **Follow the Deerflow 7-Phase Workflow** unless told otherwise:
  1. **Understand** — Read code, gather requirements, ask questions.
  2. **Plan** — Design the solution, list tasks, estimate complexity.
  3. **Verify** — Present the plan and get approval before coding.
  4. **Implement** — Write code following the plan and project conventions.
  5. **Test** — Write tests, run them, verify coverage thresholds.
  6. **Review** — Self-review, run linters, check for regressions.
  7. **Deploy** — Build, tag, deploy per project process.

### 5. Context Maintenance
- **Maintain context via `deerflow/context.md`.**
- Update `context.md` after completing each phase.
- Include: current task, progress checklist, decisions made, open questions.

---

## 📋 Coding Standards

### TypeScript
- Use **strict TypeScript** (`strict: true` in `tsconfig.json`).
- **No `any` types** — use `unknown` and type narrowing.
- Provide **explicit return types** on all exported functions.
- Prefer **interfaces over types** for object shapes.
- Use **`const`** over **`let`**; never use **`var`**.

### Code Style
- Follow the project's ESLint configuration (`.eslintrc.json` or `eslint.config.js`).
- Use Prettier for formatting if configured.
- Keep functions under 50 lines. If longer, refactor into smaller functions.
- Keep files under 500 lines. If longer, split into modules.
- Maximum cyclomatic complexity: 10 per function.
- Maximum 5 parameters per function (use options object if more needed).

### Imports
- Order imports: absolute packages first, then relative imports.
- Group by: external packages → internal packages → relative paths.
- Remove unused imports before committing.

### Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `user-service.ts`)
- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Functions/variables**: `camelCase` (e.g., `getUserById`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Types/Interfaces**: `PascalCase` (e.g., `UserConfig`)
- **Enums**: `PascalCase` with `PascalCase` members

---

## 🧪 Testing Requirements

- **Write tests for all new code.** No untested code in `main`/`master`.
- **Minimum 80% branch coverage** (configurable in `deerflow.config.yaml`).
- Use the project's test framework (Jest, Vitest, etc.) — check `package.json`.
- Name tests descriptively: `should [expected behavior] when [condition]`.
- Include edge cases: empty inputs, null/undefined, boundary values.
- Use `describe`/`it` blocks to organize tests logically.
- Mock external dependencies (API calls, file system, databases).

---

## 🔒 Security Rules

- **Never commit secrets**, API keys, tokens, or passwords.
- Use environment variables (`.env`) for sensitive configuration.
- Validate all user inputs on both client and server.
- Use parameterized queries (never string interpolation for SQL).
- Keep dependencies updated; run `npm audit` regularly.
- No `eval()`, `new Function()`, or dynamic code execution.
- Enforce HTTPS for all external API calls.
- Set appropriate CORS headers.

---

## 📝 Commit Message Format

All commits MUST follow **Conventional Commits**:

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`

**Examples:**
```
feat(auth): add OAuth2 login flow
fix(api): resolve null pointer in user endpoint
docs: update README with setup instructions
test(utils): add tests for date formatting
refactor(core): extract validation into shared module
```

You may optionally tag the Deerflow phase:
```
feat(dashboard): add analytics widget [phase: implement]
```

---

## 🛠️ MCP Integration

When MCP (Model Context Protocol) servers are available, you may use the
following tools:

| Server       | Purpose                                    |
|-------------|---------------------------------------------|
| `filesystem` | Read, write, and list files                 |
| `search`     | Codebase-wide search (grep, glob)           |
| `git`        | Git operations (diff, log, status, blame)   |
| `testing`    | Run tests and parse coverage reports        |
| `validation` | Run quality gates and security checks       |
| `documentation` | Generate and update documentation       |
| `security`   | Security auditing and vulnerability scanning |
| `performance` | Performance profiling and benchmarking     |

Configuration is in `deerflow/mcp/mcp-config.json`.

---

## ⚠️ Penalty System

Violations of these rules may result in penalties:
1. **Warning** — Logged but no action taken.
2. **Slow Down** — Delays added between your responses.
3. **Require Review** — All actions must be approved by the user.
4. **Block** — You are stopped until the violation is resolved.

Critical violations (deleting files without permission, fabricating data)
result in **immediate block**.

---

## 📁 Project Structure Reference

```
.
├── .cursorrules              # Primary AI rules
├── .github/
│   └── copilot-instructions.md   # ← This file
├── deerflow.config.yaml      # Framework configuration
├── deerflow/
│   ├── context.md            # Current task context
│   ├── .deerflow-state/      # Internal state (gitignored)
│   ├── rules/                # Detailed rule files
│   ├── workflows/            # Workflow definitions
│   ├── skills/               # Agent skill definitions
│   ├── mcp/                  # MCP server configs
│   └── reports/              # Validation & workflow reports
├── scripts/
│   ├── setup.sh              # Environment setup
│   ├── validate.sh           # Validation suite
│   └── install-hooks.sh      # Git hook installer
├── deerflow/                 # Core framework (TypeScript)
├── tests/                    # Test files
└── package.json
```

---

## 🚀 Quick Start (for each new task)

1. **Read** `.cursorrules` and `deerflow/context.md`
2. **Understand** the current state of the codebase
3. **Plan** your approach and present it
4. **Implement** following all coding standards
5. **Test** and verify coverage
6. **Review** your changes
7. **Update** `deerflow/context.md` with results

**Remember: When in doubt, ask.** It's better to ask a clarifying question
than to make an incorrect assumption that leads to wasted work or broken code.
