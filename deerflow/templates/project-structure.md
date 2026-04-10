# Master Project Structure Template

This document defines the canonical project structure that ALL projects managed
by the Deerflow Agent Framework must follow. Individual framework templates
(NestJS, React, Vue, Python) extend this structure with their specific
conventions, but the core layout and naming principles remain universal.

---

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Universal Directory Structure](#universal-directory-structure)
3. [Directory Descriptions](#directory-descriptions)
4. [File Naming Conventions](#file-naming-conventions)
5. [Framework-Specific Extensions](#framework-specific-extensions)
6. [Configuration File Standards](#configuration-file-standards)
7. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
8. [Migration Guide](#migration-guide)

---

## Guiding Principles

### 1. Separation of Concerns
Each directory has a single, well-defined responsibility. Business logic
does not leak into UI components. Data access is isolated from API routes.

### 2. Feature-Based Organization
When a project grows beyond 20 components, organize by feature rather than
by type. Place related components, hooks, services, and tests together.

### 3. Consistency Across Projects
A developer switching between Deerflow-managed projects should feel
immediately familiar with the structure. Consistency reduces cognitive load.

### 4. Scalability
The structure must work for a 10-file prototype and a 1,000-file production
application without requiring a disruptive reorganization.

### 5. Discoverability
New team members should be able to find any file within 30 seconds based
on its name and the directory it resides in.

---

## Universal Directory Structure

```
project-root/
├── src/
│   ├── components/              # UI components
│   │   ├── ui/                  # Base UI components
│   │   ├── layout/              # Layout components
│   │   └── features/            # Feature-specific components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API services
│   ├── stores/                  # State management
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript type definitions
│   ├── constants/               # Constants and configuration
│   ├── styles/                  # Global styles
│   ├── assets/                  # Static assets
│   ├── tests/                   # Test files
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── middleware/              # Middleware functions
├── public/                      # Public static files
├── docs/                        # Project documentation
├── scripts/                     # Development scripts
├── tests/                       # Root-level test directory (alternative)
├── [config files]               # See Configuration File Standards
└── README.md
```

---

## Directory Descriptions

### `src/` — Source Code Root

All application source code lives under `src/`. This separation keeps source
files distinct from configuration, build artifacts, and test infrastructure.

**Deerflow Rule:** No application logic may exist outside `src/`. Configuration
files and scripts in the project root are the only exception.

---

### `src/components/` — UI Components

All reusable UI components. Components are the building blocks of your
application's interface. Each component should be a self-contained unit with
clear props, events, and styles.

#### `src/components/ui/` — Base UI Components

Primitive UI elements that are framework-agnostic in design. These are the
atoms of your design system. They should have no business logic and accept
all configuration through props.

**Contents:** Button, Input, Select, Modal, Dialog, Tooltip, Badge, Card,
Table, Tabs, Avatar, Dropdown, Checkbox, Radio, Switch, Spinner, Alert,
Toast, ProgressBar, Skeleton, Accordion, Carousel, etc.

**Naming Convention:** PascalCase (e.g., `Button.tsx`, `AppModal.vue`)

**Rules:**
- One component per file
- Must include a corresponding test file
- Must accept a `className` or `class` prop for custom styling
- Must be fully accessible (ARIA attributes, keyboard navigation)
- Must have TypeScript prop interfaces or typed defineProps
- No direct API calls or state management side effects

**Example Structure:**
```
components/ui/
├── Button.tsx              # Component implementation
├── Button.test.tsx         # Unit tests
├── Button.stories.tsx      # Storybook stories (if applicable)
└── index.ts                # Barrel export
```

#### `src/components/layout/` — Layout Components

Components that define the page structure: headers, footers, sidebars, page
wrappers, and grid systems. Layout components compose UI components and
provide the structural skeleton of your application.

**Contents:** Header, Footer, Sidebar, AppLayout, PageWrapper, Container,
Grid, Stack, Divider, Navigation, Breadcrumbs, etc.

**Rules:**
- Layout components should not contain business logic
- They may use router context for active link highlighting
- They should be responsive by default
- Slot/projection patterns should be used for flexible content areas

#### `src/components/features/` — Feature-Specific Components

Components that belong to a specific feature domain. Organized by feature
name for clarity. These components may compose UI components, use hooks,
access stores, and call services.

**Example Structure:**
```
components/features/
├── auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── SocialLoginButtons.tsx
│   └── index.ts
├── dashboard/
│   ├── DashboardHeader.tsx
│   ├── StatsCard.tsx
│   ├── RecentActivity.tsx
│   ├── QuickActions.tsx
│   └── index.ts
├── settings/
│   ├── ProfileSettings.tsx
│   ├── SecuritySettings.tsx
│   ├── NotificationSettings.tsx
│   └── index.ts
└── ...
```

**Rules:**
- Feature directories must contain an `index.ts` barrel file
- Feature components should be co-located with feature hooks when possible
- Keep feature directories flat — avoid more than 2 levels of nesting

---

### `src/hooks/` — Custom Hooks / Composables

Reusable stateful logic encapsulated as custom hooks (React) or composables
(Vue). These extract complex state management, side effects, and data
fetching patterns into reusable units.

**Naming Convention:** camelCase with `use` prefix (e.g., `useAuth.ts`,
`useDebounce.ts`, `useLocalStorage.ts`)

**Rules:**
- Every hook must start with `use` (React) or `use` (Vue composable)
- Hooks must be pure functions that accept configuration and return values
- No direct DOM manipulation inside hooks
- Hooks calling other hooks must document dependencies
- Each hook should have a corresponding test file
- Maximum 150 lines per hook file

**Examples:** `useAuth`, `useDebounce`, `useLocalStorage`,
`useMediaQuery`, `useClickOutside`, `useFetch`, `usePagination`,
`useForm`, `useIntersectionObserver`

---

### `src/services/` — API Services

The service layer encapsulates all external communication: REST APIs,
GraphQL queries, WebSocket connections, and third-party integrations.
Components and hooks call services; services never import components.

**Naming Convention:** camelCase with domain suffix (e.g., `userService.ts`,
`authService.ts`, `paymentService.ts`)

**Structure:**
```
services/
├── api.ts                  # HTTP client configuration (axios/fetch instance)
├── userService.ts          # User-related API calls
├── authService.ts          # Authentication API calls
├── paymentService.ts       # Payment processing API calls
├── notificationService.ts  # Notification API calls
├── websocketService.ts     # WebSocket connection management
└── index.ts                # Barrel export
```

**Rules:**
- All API calls must be typed (request params and response types)
- Services must handle errors and return typed error objects
- No UI logic or component imports in service files
- Services should use the configured HTTP client from `api.ts`
- All external URLs must be configurable via environment variables
- Retry logic and timeouts should be centralized in the HTTP client

---

### `src/stores/` — State Management

Global state management stores (Zustand, Pinia, Redux, Vuex). Stores hold
application-wide state that needs to be shared across unrelated components.

**Naming Convention:** camelCase with `use` prefix and `Store` suffix for
hook-based stores (e.g., `useAuthStore.ts`, `useUIStore.ts`)

**Rules:**
- Keep stores minimal — prefer local state when possible
- Stores must be typed with TypeScript
- Complex derived state should use selectors
- Store mutations must be atomic and predictable
- No direct API calls in store actions — delegate to services
- Each store should have a corresponding test file

---

### `src/utils/` — Utility Functions

Pure, stateless utility functions. These should have no side effects, no
dependencies on application state, and no imports from components, hooks,
or services. They are the most reusable part of your codebase.

**Naming Convention:** camelCase descriptive names (e.g., `formatCurrency.ts`,
`validateEmail.ts`, `parseDate.ts`, `cn.ts`)

**Common Utilities:**
- `format.ts` — Number, date, currency formatters
- `validation.ts` — Input validation helpers
- `cn.ts` — Class name merging utility (clsx + tailwind-merge)
- `storage.ts` — Local/session storage helpers
- `helpers.ts` — General-purpose helper functions
- `constants.ts` — (Deprecated — use `src/constants/` instead)

**Rules:**
- Functions must be pure (same input → same output, no side effects)
- Must be fully typed with TypeScript
- Must have unit tests
- No imports from components, hooks, stores, or services
- Maximum 100 lines per utility file

---

### `src/types/` — TypeScript Type Definitions

Shared TypeScript interfaces, types, enums, and type guards. These are the
contract definitions that ensure type safety across the application.

**Naming Convention:** PascalCase for types/interfaces (e.g., `User.ts`,
`ApiResponse.ts`), `*.d.ts` for ambient declarations

**Structure:**
```
types/
├── user.ts                 # User-related types
├── auth.ts                 # Authentication types
├── api.ts                  # API response/request types
├── common.ts               # Shared types (Pagination, SortOrder, etc.)
├── env.d.ts                # Environment variable types
└── index.ts                # Barrel export
```

**Rules:**
- Export types, not values (prefer `export type` over `export`)
- Use interfaces for object shapes that may be extended
- Use `type` for unions, intersections, and utility types
- No runtime code in type files
- Prefer branded types for important domain concepts
- Use Zod schemas alongside types for runtime validation (co-location)

---

### `src/constants/` — Constants and Configuration

Immutable values used throughout the application. These include route paths,
API endpoints, feature flags, enums, and configuration objects.

**Naming Convention:** SCREAMING_SNAKE_CASE for values (e.g.,
`API_BASE_URL`, `MAX_RETRY_COUNT`), PascalCase for exported objects

**Structure:**
```
constants/
├── routes.ts               # Route path constants
├── api.ts                  # API endpoint paths
├── config.ts               # App configuration constants
├── enums.ts                # Enum definitions
├── breakpoints.ts          # Responsive breakpoints
└── index.ts                # Barrel export
```

**Rules:**
- All constants must be `as const` or `Object.freeze()`
- No mutable exports
- No business logic in constants files
- Environment-specific values belong in `.env` files, not here
- Import constants from this directory — do not duplicate string literals

---

### `src/styles/` — Global Styles

Global CSS, Tailwind base styles, CSS custom properties, and theme
definitions. Component-specific styles should be co-located with the
component or use Tailwind utility classes.

**Structure:**
```
styles/
├── globals.css             # Global styles and Tailwind directives
├── variables.css           # CSS custom properties (--color-primary, etc.)
├── animations.css          # Shared animation keyframes
├── typography.css          # Font-face declarations and type scale
└── overrides.css           # Third-party component style overrides
```

**Rules:**
- Prefer Tailwind utility classes over custom CSS
- Global CSS should be minimal — keep styles scoped when possible
- CSS custom properties for theme values (colors, spacing, radii)
- No component-specific styles in global files

---

### `src/assets/` — Static Assets

Static files that are processed by the build tool: images, fonts, icons,
and SVGs. These files are hashed and optimized during the build process.

**Structure:**
```
assets/
├── images/                 # Raster images (PNG, JPG, WebP, SVG)
│   ├── logo.svg
│   ├── hero.png
│   └── icons/              # Small UI icons
├── fonts/                  # Self-hosted font files
│   ├── Inter-Regular.woff2
│   └── Inter-Bold.woff2
└── lotties/                # Lottie animation files (if applicable)
```

**Rules:**
- Use WebP format for photographs
- Use SVG for icons and illustrations
- All images must have alt text or aria-label in components
- Optimize images before committing (use SVGO for SVGs)
- Maximum image file size: 200 KB (exceptions require justification)

---

### `src/tests/` — Test Files (Alternative Location)

When tests are co-located with source code, this directory may contain only
shared test utilities, fixtures, and mocks.

**Structure:**
```
tests/
├── unit/                   # Unit tests (isolated, fast)
├── integration/            # Integration tests (multiple modules)
├── e2e/                    # End-to-end tests (full stack)
├── fixtures/               # Test data fixtures
│   ├── users.json
│   └── products.json
├── mocks/                  # Mock implementations
│   ├── handlers.ts         # MSW handlers (for frontend)
│   └── repositories.py     # Mock repositories (for backend)
└── utils/                  # Test utility functions
    ├── render.tsx          # Custom render with providers
    └── factories.ts        # Factory functions for test data
```

**Rules:**
- Test files must mirror the source structure
- Test file naming: `*.test.ts`, `*.spec.ts`, `test_*.py`
- Each test must be independent and idempotent
- Shared fixtures go in `tests/fixtures/`
- Mock implementations go in `tests/mocks/`
- E2E tests must run against a dedicated test environment

---

### `src/middleware/` — Middleware Functions

Request/response interceptors, authentication guards, rate limiters,
logging middleware, and CORS handlers.

**Naming Convention:** camelCase (e.g., `authGuard.ts`, `rateLimiter.ts`,
`requestLogger.ts`)

**Rules:**
- Middleware must be composable (chainable)
- Each middleware file should handle one concern
- Middleware must not modify the request body
- All middleware must have error handling

---

## File Naming Conventions

### General Rules

| Category           | Convention           | Example                  |
|--------------------|----------------------|--------------------------|
| Components         | PascalCase           | `UserProfile.tsx`        |
| Hooks/Composables  | camelCase, `use` prefix | `useAuth.ts`         |
| Services           | camelCase, suffix     | `userService.ts`         |
| Stores             | camelCase, `use`+Store | `useAuthStore.ts`      |
| Utilities          | camelCase             | `formatCurrency.ts`      |
| Types              | PascalCase            | `UserProfile.ts`         |
| Constants          | SCREAMING_SNAKE_CASE  | `MAX_RETRY_COUNT`        |
| Test files         | *.test.* or *.spec.*  | `Button.test.tsx`        |
| Config files       | kebab-case            | `deerflow.config.yaml`   |
| Style files        | kebab-case            | `animation-keyframes.css`|

### Framework-Specific File Extensions

| Framework | Component Files | Style Files   | Type Files    |
|-----------|-----------------|---------------|---------------|
| Next.js   | `.tsx`          | `.css`        | `.ts`, `.d.ts`|
| React     | `.tsx`          | `.css`, `.module.css` | `.ts` |
| Vue       | `.vue`          | `.vue` (scoped) | `.ts`, `.d.ts`|
| Python    | `.py`           | N/A           | `.pyi` (stubs)|

### Barrel Exports (`index.ts`)

Every directory that exports public APIs must include an `index.ts` barrel
file that re-exports all public items. This enables clean import paths:

```typescript
// Good — clean import path
import { Button, Modal } from "@/components/ui";

// Bad — deep import path
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
```

**Rules for barrel files:**
- Export only public APIs — never re-export internal/private items
- Keep barrel files minimal — prefer tree-shakeable named exports
- Do not import barrel files from other barrel files (prevents circular deps)
- Barrel files should not contain logic — only re-exports

---

## Framework-Specific Extensions

### Next.js Additions

```
src/
├── app/                    # App Router directory
│   ├── (auth)/             # Route groups with parentheses
│   ├── api/                # API routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── middleware.ts            # Next.js middleware
└── env.ts                  # Zod environment variable schema
```

### Vue Additions

```
src/
├── composables/            # Vue composables (same as hooks/)
├── views/                  # Route target components
├── router/                 # Vue Router configuration
├── plugins/                # Vue plugins
└── stores/                 # Pinia stores
```

### Python Additions

```
src/
├── my_app/
│   ├── api/                # API routes/endpoints
│   ├── models/             # Database models
│   ├── schemas/            # Pydantic schemas
│   ├── repositories/       # Data access layer
│   ├── config.py           # Settings
│   └── exceptions.py       # Custom exceptions
├── tests/                  # Test directory at root
├── alembic/                # Database migrations
└── scripts/                # Utility scripts
```

---

## Configuration File Standards

All Deerflow-managed projects must include these configuration files in the
project root:

| File                         | Purpose                               |
|------------------------------|---------------------------------------|
| `deerflow.config.yaml`       | Deerflow agent framework config       |
| `.gitignore`                 | Git ignored files                     |
| `.editorconfig`              | Editor configuration                  |
| `README.md`                  | Project documentation                 |
| `package.json` / `pyproject.toml` | Project metadata and scripts    |

**Additional framework configs:**

| Framework | Files                                         |
|-----------|-----------------------------------------------|
| TypeScript | `tsconfig.json`                              |
| Next.js   | `next.config.ts`, `tailwind.config.ts`        |
| React     | `vite.config.ts`, `tailwind.config.ts`        |
| Vue       | `vite.config.ts`, `tailwind.config.ts`        |
| Python    | `ruff.toml`, `mypy.ini`, `pyproject.toml`     |

---

## Anti-Patterns to Avoid

### Structural Anti-Patterns

1. **God Components** — A single component exceeding 300 lines. Break it
   into smaller, focused sub-components.

2. **Service Classes in Components** — Direct API calls inside components.
   Always delegate to the service layer.

3. **Deeply Nested Directories** — More than 4 levels of nesting indicates
   the project needs restructuring.

4. **Utility Drawers** — A single `utils.ts` file with 500+ lines. Split
   into focused utility files by domain.

5. **Orphan Files** — Files that don't belong to any clear directory.
   Every file must have a logical home.

6. **Circular Dependencies** — Module A imports Module B which imports
   Module A. Use barrel exports carefully and consider dependency injection.

7. **Duplicate Types** — The same interface defined in multiple files.
   Define types once in `src/types/` and import everywhere.

8. **Untested Utilities** — Utility functions without corresponding tests.
   Pure functions are the easiest to test — there is no excuse.

---

## Migration Guide

### For Existing Projects

If you are migrating an existing project to this structure:

1. **Phase 1 — Create Directories**: Create all directories listed above
2. **Phase 2 — Move Files**: Move existing files to the appropriate directories
3. **Phase 3 — Update Imports**: Fix all import paths after moves
4. **Phase 4 — Add Barrel Exports**: Create `index.ts` files in each directory
5. **Phase 5 — Validate**: Run `deerflow validate --strict` to verify compliance
6. **Phase 6 — Address Violations**: Fix any structural violations reported by Deerflow

### Automation

Use the Deerflow CLI to automate structural validation:

```bash
# Check current structure against the template
deerflow structure check

# Auto-fix common structural issues
deerflow structure fix

# Generate a migration plan for existing projects
deerflow structure plan --from-existing
```

---

*This template is maintained by the Deerflow Agent Framework team. For questions
or contributions, visit [deerflow.dev](https://deerflow.dev).*
