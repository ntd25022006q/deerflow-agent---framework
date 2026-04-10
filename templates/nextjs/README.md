# Next.js Project Template with Deerflow

This template provides a production-ready Next.js project structure pre-configured with
the Deerflow Agent Framework for automated quality assurance, code review, and
deployment governance.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Creating a New Project](#creating-a-new-project)
4. [Required Dependencies](#required-dependencies)
5. [Folder Structure](#folder-structure)
6. [Configuration Files](#configuration-files)
7. [Deerflow Integration](#deerflow-integration)
8. [Quality Gates](#quality-gates)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This template bootstraps a Next.js (14+) application using the App Router paradigm,
integrated with Deerflow's agent-based quality gates. It enforces:

- **TypeScript strict mode** with comprehensive type coverage
- **ESLint + Prettier** with Next.js-optimized rules
- **Automated quality gates** via Deerflow agents
- **Testing standards** with Vitest and Playwright
- **Environment variable validation** at build time

---

## Prerequisites

Ensure the following tools are installed on your development machine:

| Tool         | Minimum Version | Purpose                        |
|--------------|-----------------|--------------------------------|
| Node.js      | 20.x            | JavaScript runtime             |
| pnpm         | 8.x             | Package manager (recommended)  |
| Deerflow CLI | 1.0.0+          | Agent framework CLI            |
| Git          | 2.40+           | Version control                |
| Docker       | 24.x            | Containerization (optional)    |

Install the Deerflow CLI globally:

```bash
npm install -g @deerflow/cli
# or
pnpm add -g @deerflow/cli
```

---

## Creating a New Project

### Option A: Use the Deerflow Scaffolder (Recommended)

```bash
deerflow init nextjs my-app
cd my-app
```

This command automatically:
1. Creates the Next.js project with TypeScript
2. Copies all Deerflow configuration files
3. Installs required dependencies
4. Sets up Git hooks via Husky
5. Validates the project structure against Deerflow rules

### Option B: Manual Setup

```bash
# 1. Create a Next.js app with TypeScript
pnpm create next-app@latest my-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm

cd my-app

# 2. Copy the Deerflow config template
cp path/to/deerflow-agent-framework/templates/nextjs/deerflow.config.yaml ./deerflow.config.yaml

# 3. Install additional dependencies
pnpm add -D @deerflow/core @deerflow/eslint-plugin vitest @testing-library/react @testing-library/jest-dom jsdom husky lint-staged
```

---

## Required Dependencies

### Production Dependencies

```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "zod": "^3.23.0",
  "@tanstack/react-query": "^5.50.0"
}
```

### Development Dependencies

```json
{
  "@deerflow/core": "^1.0.0",
  "@deerflow/eslint-plugin": "^1.0.0",
  "@types/node": "^20.14.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "typescript": "^5.5.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "autoprefixer": "^10.4.0",
  "eslint": "^8.57.0",
  "eslint-config-next": "^14.2.0",
  "eslint-config-prettier": "^9.1.0",
  "prettier": "^3.3.0",
  "prettier-plugin-tailwindcss": "^0.6.0",
  "vitest": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.4.0",
  "jsdom": "^24.1.0",
  "@playwright/test": "^1.45.0",
  "husky": "^9.0.0",
  "lint-staged": "^15.2.0"
}
```

---

## Folder Structure

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/        # Dashboard route group
│   │   │   └── page.tsx
│   │   ├── api/                # API routes
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── loading.tsx         # Global loading state
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   └── features/           # Feature-specific components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API service layer
│   ├── stores/                 # State management (Zustand)
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript type definitions
│   ├── constants/              # Constants and config
│   ├── middleware.ts            # Next.js middleware
│   └── env.ts                  # Environment variable schema (Zod)
├── public/
│   ├── images/
│   ├── fonts/
│   └── icons/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── deerflow.config.yaml        # Deerflow configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json
```

---

## Configuration Files

### Copy these files into your project root:

| Source Template                             | Target Destination    |
|---------------------------------------------|-----------------------|
| `templates/nextjs/deerflow.config.yaml`     | `./deerflow.config.yaml` |
| `templates/nextjs/.eslintrc.json`           | `./.eslintrc.json`    |
| `templates/nextjs/.prettierrc`              | `./.prettierrc`       |
| `templates/nextjs/tsconfig.strict.json`     | `./tsconfig.json`     |

### Example deerflow.config.yaml for Next.js

```yaml
# See templates/nextjs/deerflow.config.yaml for the full configuration.
# This file is the single source of truth for all Deerflow agent behavior
# in your Next.js project. Place it in your project root.

version: "1.0"
framework: nextjs
project_root: "."

agents:
  code_review:
    enabled: true
    auto_merge: false
    required_approvals: 1
    review_focus:
      - "server_components"
      - "client_components"
      - "api_routes"
      - "data_fetching"

  quality_gate:
    enabled: true
    block_merge_on_failure: true
    checks:
      - type_check
      - lint
      - test
      - build

  deployment:
    enabled: true
    provider: vercel
    preview_branches:
      - "feat/*"
      - "fix/*"
      - "chore/*"

rules:
  strict_ts: true
  no_any: true
  no_console_log: true
  max_bundle_size_kb: 250
```

---

## Deerflow Integration

### Enabling Deerflow Agents

After placing `deerflow.config.yaml` in your project root, run:

```bash
deerflow validate
```

This command checks:
- Configuration schema validity
- Required dependencies installed
- Project structure compliance
- TypeScript strict mode enabled

### Pre-commit Hooks

Deerflow integrates with Husky to run quality checks on every commit:

```bash
# .husky/pre-commit
npx deerflow pre-commit
```

The pre-commit hook runs:
1. **ESLint** — catches lint errors
2. **TypeScript type check** — ensures type safety
3. **Prettier** — formats code consistently
4. **Vitest (related)** — runs tests for changed files only

### CI/CD Integration

Add Deerflow to your CI pipeline (e.g., GitHub Actions):

```yaml
# .github/workflows/deerflow.yml
name: Deerflow Quality Gates
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: npx deerflow ci --all
```

---

## Quality Gates

Deerflow enforces the following quality gates for Next.js projects:

| Gate              | Description                                        | Blocking |
|-------------------|----------------------------------------------------|----------|
| `type_check`      | TypeScript strict mode compilation                 | Yes      |
| `lint`            | ESLint with Next.js + Deerflow rules              | Yes      |
| `test`            | Vitest unit and integration tests (80% coverage)  | Yes      |
| `build`           | Production build succeeds without errors           | Yes      |
| `bundle_size`     | Individual route bundles under 250 KB              | Warning  |
| `lighthouse`      | Lighthouse CI score >= 90 for Core Web Vitals      | Warning  |
| `accessibility`   | axe-core automated accessibility audit             | Warning  |

---

## Development Workflow

```bash
# 1. Start development server
pnpm dev

# 2. Run Deerflow quality checks locally
deerflow check --watch

# 3. Run tests
pnpm test
pnpm test:e2e

# 4. Build for production
pnpm build

# 5. Validate before pushing
deerflow validate --strict
```

---

## Troubleshooting

### Common Issues

**Q: Deerflow reports missing configuration**
Ensure `deerflow.config.yaml` is in your project root and the `version` field
matches the installed Deerflow CLI version.

**Q: Type check fails but IDE shows no errors**
Run `pnpm exec tsc --noEmit` to verify. Ensure `tsconfig.json` has
`"strict": true` and `"noUncheckedIndexedAccess": true`.

**Q: Bundle size gate triggers false positives**
Adjust `max_bundle_size_kb` in `deerflow.config.yaml` under `rules`, or
use `// @deerflow-ignore-bundle` comments for specific imports.

**Q: Husky pre-commit hook is slow**
Deerflow runs checks incrementally on staged files only. If still slow,
check `deerflow.config.yaml` → `agents.quality_gate.parallel` and set to `true`.

---

## License

This template is provided under the MIT License. The Deerflow Agent Framework
has its own license — see [deerflow.dev/license](https://deerflow.dev/license).
