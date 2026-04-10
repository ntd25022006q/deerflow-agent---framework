# Vue Project Template with Deerflow

This template provides a production-ready Vue 3 project structure pre-configured
with the Deerflow Agent Framework for automated quality assurance, code review,
and deployment governance.

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

This template bootstraps a Vue 3 application using Vite as the build tool with
the Composition API (`<script setup>`), integrated with Deerflow's agent-based
quality gates. It enforces:

- **TypeScript strict mode** with comprehensive type coverage
- **Vue 3 Composition API** with `<script setup>` syntax
- **Pinia** for state management
- **Vue Router** with typed route definitions
- **ESLint + Prettier** with Vue-optimized rules
- **Automated quality gates** via Deerflow agents
- **Testing standards** with Vitest and Playwright

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
deerflow init vue my-app
cd my-app
```

This command automatically creates the Vue project, copies Deerflow
configuration, installs dependencies, and sets up Git hooks.

### Option B: Manual Setup with Vite

```bash
# 1. Create a Vue + TypeScript project with Vite
pnpm create vue@latest my-app
cd my-app

# During setup, select:
# - TypeScript: Yes
# - JSX Support: No (use SFC)
# - Vue Router: Yes
# - Pinia: Yes
# - Vitest: Yes
# - E2E Testing: Playwright
# - ESLint: Yes
# - Prettier: Yes

# 2. Copy the Deerflow config template
cp path/to/deerflow-agent-framework/templates/vue/deerflow.config.yaml ./deerflow.config.yaml

# 3. Install additional dependencies
pnpm add -D @deerflow/core @deerflow/eslint-plugin tailwindcss postcss autoprefixer
```

---

## Required Dependencies

### Production Dependencies

```json
{
  "vue": "^3.5.0",
  "vue-router": "^4.4.0",
  "pinia": "^2.2.0",
  "@vueuse/core": "^11.0.0",
  "axios": "^1.7.0",
  "zod": "^3.23.0"
}
```

### Development Dependencies

```json
{
  "@deerflow/core": "^1.0.0",
  "@deerflow/eslint-plugin": "^1.0.0",
  "@vitejs/plugin-vue": "^5.1.0",
  "typescript": "^5.5.0",
  "vite": "^5.4.0",
  "vue-tsc": "^2.1.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "autoprefixer": "^10.4.0",
  "eslint": "^8.57.0",
  "eslint-plugin-vue": "^9.27.0",
  "@typescript-eslint/eslint-plugin": "^7.16.0",
  "@typescript-eslint/parser": "^7.16.0",
  "eslint-config-prettier": "^9.1.0",
  "prettier": "^3.3.0",
  "vitest": "^2.0.0",
  "@vue/test-utils": "^2.4.0",
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
│   │   │   ├── AppButton.vue
│   │   │   ├── AppInput.vue
│   │   │   ├── AppModal.vue
│   │   │   └── index.ts
│   │   ├── layout/             # Layout components
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── AppSidebar.vue
│   │   │   └── DefaultLayout.vue
│   │   └── features/           # Feature-specific components
│   │       ├── auth/
│   │       ├── dashboard/
│   │       └── settings/
│   ├── composables/            # Vue composables (equivalent to hooks)
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   ├── views/                  # Page-level components (route targets)
│   │   ├── HomeView.vue
│   │   ├── NotFoundView.vue
│   │   └── ErrorView.vue
│   ├── router/                 # Vue Router configuration
│   │   ├── index.ts
│   │   └── routes.ts
│   ├── stores/                 # Pinia stores
│   │   ├── useAuthStore.ts
│   │   └── useUIStore.ts
│   ├── services/               # API service layer
│   │   ├── api.ts              # Axios instance
│   │   ├── userService.ts
│   │   └── authService.ts
│   ├── utils/                  # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── cn.ts
│   ├── types/                  # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── user.ts
│   │   └── env.d.ts
│   ├── constants/              # Constants and configuration
│   │   ├── routes.ts
│   │   └── config.ts
│   ├── styles/                 # Global styles
│   │   └── main.css
│   ├── assets/                 # Static assets (SVG, images, fonts)
│   ├── plugins/                # Vue plugins
│   │   └── i18n.ts
│   ├── App.vue                 # Root application component
│   └── main.ts                 # Application entry point
├── public/
│   ├── images/
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

| Source Template                         | Target Destination        |
|-----------------------------------------|---------------------------|
| `templates/vue/deerflow.config.yaml`    | `./deerflow.config.yaml`  |
| `templates/vue/.eslintrc.cjs`           | `./.eslintrc.cjs`         |
| `templates/vue/.prettierrc`             | `./.prettierrc`           |

### Key Vue-Specific Settings

The Deerflow configuration for Vue enforces:

- **`<script setup>` syntax** — prefer `<script setup lang="ts">` over Options API
- **Composition API** — composables over mixins
- **Typed props and emits** — using `defineProps<T>()` and `defineEmits<T>()`
- **Single File Component order** — `<script>`, `<template>`, `<style>` (top to bottom)
- **Pinia stores** — prefer setup store syntax for TypeScript ergonomics
- **Vue Router typing** — typed route meta and params

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

The pre-commit hook runs:
1. **ESLint** — Vue-specific lint rules via `eslint-plugin-vue`
2. **TypeScript type check** — `vue-tsc --noEmit`
3. **Prettier** — consistent formatting
4. **Vitest** — tests for changed files only

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
| `type_check`      | `vue-tsc --noEmit` strict mode check             | Yes      |
| `lint`            | ESLint with Vue + Deerflow rules                 | Yes      |
| `format`          | Prettier formatting check                        | Yes      |
| `test`            | Vitest + @vue/test-utils (80% coverage)          | Yes      |
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

**Q: `vue-tsc` reports errors that don't appear in the IDE**
Ensure your IDE uses the workspace version of TypeScript. Run
`pnpm exec vue-tsc --noEmit` to verify the CLI output.

**Q: Deerflow warns about Options API usage**
The Vue template enforces Composition API with `<script setup>`. If you're
migrating from Options API, add files to the exclusion list in
`deerflow.config.yaml` under `exclude.rules`.

**Q: Component prop types not inferred**
Use `defineProps<T>()` with TypeScript interfaces instead of runtime
declarations. Ensure `lang="ts"` is set in the `<script setup>` tag.

---

## License

This template is provided under the MIT License. The Deerflow Agent Framework
has its own license — see [deerflow.dev/license](https://deerflow.dev/license).
