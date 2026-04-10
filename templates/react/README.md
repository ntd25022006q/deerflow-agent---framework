# React Project Template with Deerflow

This template provides a production-ready React (18+) single-page application
structure pre-configured with the Deerflow Agent Framework for automated
quality assurance, code review, and deployment governance.

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

This template bootstraps a React SPA using Vite as the build tool, integrated
with Deerflow's agent-based quality gates. It enforces:

- **TypeScript strict mode** with comprehensive type coverage
- **Vite** for fast development and optimized builds
- **ESLint + Prettier** with React-optimized rules
- **Automated quality gates** via Deerflow agents
- **Testing standards** with Vitest and Playwright
- **Component library patterns** with a scalable architecture

---

## Prerequisites

| Tool         | Minimum Version | Purpose                        |
|--------------|-----------------|--------------------------------|
| Node.js      | 20.x            | JavaScript runtime             |
| pnpm         | 8.x             | Package manager (recommended)  |
| Deerflow CLI | 1.0.0+          | Agent framework CLI            |
| Git          | 2.40+           | Version control                |

Install the Deerflow CLI globally:

```bash
npm install -g @deerflow/cli
```

---

## Creating a New Project

### Option A: Use the Deerflow Scaffolder (Recommended)

```bash
deerflow init react my-app
cd my-app
```

This command automatically creates the React project, copies Deerflow
configuration, installs dependencies, and sets up Git hooks.

### Option B: Manual Setup with Vite

```bash
# 1. Create a React + TypeScript project with Vite
pnpm create vite@latest my-app --template react-ts
cd my-app

# 2. Copy the Deerflow config template
cp path/to/deerflow-agent-framework/templates/react/deerflow.config.yaml ./deerflow.config.yaml

# 3. Install additional dependencies
pnpm add -D @deerflow/core @deerflow/eslint-plugin vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom husky lint-staged tailwindcss postcss autoprefixer
pnpm add react-router-dom @tanstack/react-query zustand zod
```

---

## Required Dependencies

### Production Dependencies

```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.25.0",
  "@tanstack/react-query": "^5.50.0",
  "zustand": "^4.5.0",
  "zod": "^3.23.0"
}
```

### Development Dependencies

```json
{
  "@deerflow/core": "^1.0.0",
  "@deerflow/eslint-plugin": "^1.0.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "typescript": "^5.5.0",
  "vite": "^5.4.0",
  "@vitejs/plugin-react": "^4.3.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "autoprefixer": "^10.4.0",
  "eslint": "^8.57.0",
  "eslint-plugin-react": "^7.34.0",
  "eslint-plugin-react-hooks": "^4.6.0",
  "eslint-config-prettier": "^9.1.0",
  "prettier": "^3.3.0",
  "vitest": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.4.0",
  "@testing-library/user-event": "^14.5.0",
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
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── index.ts
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── AppLayout.tsx
│   │   │   └── index.ts
│   │   └── features/           # Feature-specific components
│   │       ├── auth/
│   │       ├── dashboard/
│   │       └── settings/
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   └── index.ts
│   ├── pages/                  # Route page components
│   │   ├── HomePage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ErrorPage.tsx
│   ├── services/               # API service layer
│   │   ├── api.ts              # Axios/fetch instance
│   │   ├── userService.ts
│   │   └── authService.ts
│   ├── stores/                 # State management (Zustand)
│   │   ├── useAuthStore.ts
│   │   └── useUIStore.ts
│   ├── context/                # React context providers
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── utils/                  # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── cn.ts               # Class name utility
│   ├── types/                  # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── user.ts
│   │   └── global.d.ts
│   ├── constants/              # Constants and configuration
│   │   ├── routes.ts
│   │   └── config.ts
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   ├── assets/                 # Static assets
│   ├── App.tsx                 # Root application component
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts           # Vite type declarations
├── public/
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── deerflow.config.yaml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
├── index.html
└── package.json
```

---

## Configuration Files

### Copy these files into your project root:

| Source Template                           | Target Destination        |
|-------------------------------------------|---------------------------|
| `templates/react/deerflow.config.yaml`    | `./deerflow.config.yaml`  |
| `templates/react/.eslintrc.cjs`           | `./.eslintrc.cjs`         |
| `templates/react/.prettierrc`             | `./.prettierrc`           |

### Example deerflow.config.yaml for React

```yaml
version: "1.0"
framework: react
project_root: "."

agents:
  code_review:
    enabled: true
    auto_merge: false
    required_approvals: 1
    review_focus:
      - "components"
      - "hooks"
      - "services"
      - "state_management"

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
    provider: netlify
    preview_branches:
      - "feat/*"
      - "fix/*"

rules:
  strict_ts: true
  no_any: true
  no_console_log: true
  max_bundle_size_kb: 300
```

---

## Deerflow Integration

### Enabling Deerflow Agents

Place `deerflow.config.yaml` in your project root and run:

```bash
deerflow validate
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
npx deerflow pre-commit
```

### CI/CD Integration

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

| Gate              | Description                                      | Blocking |
|-------------------|--------------------------------------------------|----------|
| `type_check`      | TypeScript strict mode compilation               | Yes      |
| `lint`            | ESLint with React + Deerflow rules               | Yes      |
| `format`          | Prettier formatting check                        | Yes      |
| `test`            | Vitest unit tests (80% coverage)                 | Yes      |
| `build`           | Vite production build succeeds                   | Yes      |
| `bundle_size`     | Bundle under 300 KB total                        | Warning  |
| `e2e`             | Playwright end-to-end tests pass                 | Warning  |

---

## Development Workflow

```bash
# Start dev server
pnpm dev

# Run Deerflow checks with watch mode
deerflow check --watch

# Run tests
pnpm test
pnpm test:e2e

# Production build
pnpm build

# Validate before pushing
deerflow validate --strict
```

---

## Troubleshooting

**Q: Deerflow reports missing configuration**
Ensure `deerflow.config.yaml` is in the project root with the correct `version` field.

**Q: Vite HMR is slow with Deerflow watch mode**
Disable parallel checks in `deerflow.config.yaml` → `agents.quality_gate.parallel: false`.

**Q: Type check fails but IDE shows no errors**
Run `pnpm exec tsc --noEmit` directly. Ensure `tsconfig.json` has `"strict": true`.

---

## License

This template is provided under the MIT License. The Deerflow Agent Framework
has its own license — see [deerflow.dev/license](https://deerflow.dev/license).
