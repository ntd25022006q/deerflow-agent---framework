# Deerflow Agent Framework — 03: Dependency Management

> **Status:** Core Rule
> **Priority:** P1 (High — Dependencies can introduce security vulnerabilities)
> **Applies to:** All package installation, removal, and version management

---

## 1. Overview

Dependencies are the foundation of any modern software project, but they also
represent risk. Outdated dependencies, version conflicts, and unnecessary packages
can introduce bugs, security vulnerabilities, and bloat. This rule establishes
strict protocols for managing dependencies in Deerflow-managed projects.

---

## 2. Check Conflicts Before Installing

### 2.1 Rules

- **RULE 2.1.1** — Before installing a new package, check the project's existing
  `package.json` and `package-lock.json` to identify potential conflicts.
- **RULE 2.1.2** — Check for peer dependency requirements. The new package may
  require specific versions of existing packages.
- **RULE 2.1.3** — Run `npm ls` or `yarn list` to inspect the current dependency
  tree before and after installation.
- **RULE 2.1.4** — If a conflict is detected, report it to the user with a clear
  explanation of the conflict and potential resolution strategies.
- **RULE 2.1.5** — Never force-install a conflicting dependency (`--force`,
  `--legacy-peer-deps`) without explicit user approval and a documented
  justification.

### 2.2 Conflict Detection Checklist

```text
[ ] Read current package.json dependencies
[ ] Read current package.json devDependencies
[ ] Check peer dependency requirements of the new package
[ ] Verify Node.js version compatibility
[ ] Verify TypeScript version compatibility
[ ] Check for known breaking changes in the target version
[ ] Run npm ls to inspect current tree
```

### 2.3 Examples

```text
DO:   "I noticed that react-query v5 requires React 18. Your project uses
      React 17. Upgrading to react-query v5 will require a React upgrade.
      Shall I proceed with both upgrades, or would you prefer react-query v4?"

DON'T: "Installing react-query@latest..." (proceeds without checking React version)
```

---

## 3. Use Lock Files

### 3.1 Rules

- **RULE 3.1.1** — Always commit the lock file (`package-lock.json`, `yarn.lock`,
  or `pnpm-lock.yaml`) to version control.
- **RULE 3.1.2** — Never delete the lock file. Deleting the lock file means the
  next install may resolve different versions, causing non-reproducible builds.
- **RULE 3.1.3** — When installing dependencies, always use the lock file
  (`npm ci` for CI environments, `npm install` for development).
- **RULE 3.1.4** — If the lock file becomes corrupted or out of sync, regenerate
  it by deleting `node_modules/` and running `npm install` (not by deleting the
  lock file directly).
- **RULE 3.1.5** — Never manually edit the lock file. It must be managed by the
  package manager only.

### 3.2 Lock File Best Practices

```text
Development:
  npm install           → Resolves and updates lock file
  npm install <package> → Adds package and updates lock file

CI/CD:
  npm ci                → Installs from lock file only (fast, strict)

Verification:
  npm audit             → Check for vulnerabilities
  npm ls                → Inspect dependency tree
```

---

## 4. No Duplicate Packages

### 4.1 Rules

- **RULE 4.1.1** — Before adding a new package, verify that the project does not
  already have another package that serves the same purpose.
- **RULE 4.1.2** — Common duplicate categories:
  - Utility libraries: `lodash` vs `ramda` vs `radash`
  - Date libraries: `moment` vs `date-fns` vs `dayjs`
  - HTTP clients: `axios` vs `ky` vs `got`
  - State management: multiple state management libraries
  - Validation: `zod` vs `yup` vs `joi`
- **RULE 4.1.3** — If a duplicate is detected, suggest consolidating on one
  library rather than adding another.
- **RULE 4.1.4** — Check for sub-dependency duplication (e.g., two packages that
  both depend on different versions of the same library).

### 4.2 Examples

```text
DO:   "I see you're already using date-fns for date formatting. I'll use
      date-fns functions instead of installing dayjs for this feature."

DON'T: "This feature needs dayjs for date parsing." (installs despite date-fns
      already being a dependency)
```

---

## 5. Semantic Versioning

### 5.1 Rules

- **RULE 5.1.1** — Understand and respect semantic versioning (SemVer):
  - `MAJOR.MINOR.PATCH` (e.g., `1.4.2`)
  - MAJOR: Breaking changes
  - MINOR: New features, backwards compatible
  - PATCH: Bug fixes, backwards compatible
- **RULE 5.1.2** — When specifying dependency versions:
  - Use `^` (caret) for MINOR and PATCH updates: `^1.4.2` → `>=1.4.2 <2.0.0`
  - Use `~` (tilde) for PATCH updates only: `~1.4.2` → `>=1.4.2 <1.5.0`
  - Use exact version for critical dependencies: `1.4.2`
- **RULE 5.1.3** — Never use `*` or `latest` as a version specifier in
  `package.json`. These cause non-reproducible builds.
- **RULE 5.1.4** — Before upgrading a MAJOR version, read the migration guide
  or changelog and assess the impact on the project.
- **RULE 5.1.5** — Pin exact versions for tooling dependencies (ESLint, Prettier,
  TypeScript) to prevent unexpected changes.

### 5.2 Version Specifier Guidelines

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "zod": "^3.22.0",
    "express": "~4.18.2"
  },
  "devDependencies": {
    "typescript": "5.3.3",
    "eslint": "8.56.0",
    "prettier": "3.2.4"
  }
}
```

---

## 6. Security Audit Before Install

### 6.1 Rules

- **RULE 6.1.1** — Run `npm audit` (or equivalent for your package manager)
  before and after installing new dependencies.
- **RULE 6.1.2** — If `npm audit` reports a high or critical vulnerability,
  report it to the user before proceeding.
- **RULE 6.1.3** — Check the package's maintenance status:
  - When was the last release?
  - How many open issues?
  - Is the repository archived or unmaintained?
- **RULE 6.1.4** — Check the package's GitHub repository for:
  - Recent commit activity
  - Number of contributors
  - Security policy (SECURITY.md)
  - Known security advisories
- **RULE 6.1.5** — Prefer packages with active maintenance, a large user base,
  and a clear security policy.
- **RULE 6.1.6** — Use `npm audit --production` for production-only checks to
  reduce noise from dev dependency issues.

### 6.2 Security Assessment Template

```text
Package: <name>@<version>
License: <license type>
Last release: <date>
Weekly downloads: <number>
Known vulnerabilities: <yes/no, details>
Maintenance status: <active/maintenance/archived/unknown>
Repository: <URL>
Recommendation: <APPROVE / REJECT / REVIEW NEEDED>
Justification: <reason>
```

---

## 7. Minimal Dependencies Principle

### 7.1 Rules

- **RULE 7.1.1** — Every new dependency must have a clear justification. "It might
  be useful later" is not sufficient justification.
- **RULE 7.1.2** — Before adding a dependency, consider whether the functionality
  can be implemented with native APIs or existing dependencies.
- **RULE 7.1.3** — Prefer lightweight alternatives over heavy frameworks. A 2KB
  utility is better than a 200KB framework for a single feature.
- **RULE 7.1.4** — Avoid adding dependencies for trivial functionality:
  - String manipulation → Use native `String` methods
  - Deep clone → Use `structuredClone()`
  - Date formatting → Use `Intl.DateTimeFormat`
  - Debounce/throttle → Implement inline (it's 10 lines of code)
- **RULE 7.1.5** — If a dependency is added for a specific feature and that
  feature is later removed, remove the dependency as well.
- **RULE 7.1.6** — Track the bundle size impact of every new dependency. Use
  `bundlephobia.com` or `packagephobia.com` to check.

### 7.2 Size Impact Guide

```text
Acceptable:     < 10KB gzipped (per utility)
Caution:        10-50KB gzipped (justify the cost)
Heavy:          50-200KB gzipped (strong justification needed)
Avoid:          > 200KB gzipped (unless it's a core framework)
```

---

## 8. Peer Dependency Management

### 8.1 Rules

- **RULE 8.1.1** — When a package has peer dependencies, verify that the required
  peer versions are satisfied by the project's installed packages.
- **RULE 8.1.2** — Never ignore peer dependency warnings. They indicate potential
  runtime incompatibilities.
- **RULE 8.1.3** — If a peer dependency conflict cannot be resolved by version
  adjustment, consider alternative packages or discuss with the user.
- **RULE 8.1.4** — Document any accepted peer dependency conflicts with a
  justification in the project's `package.json` comments or a `DEPENDENCIES.md`
  file.

---

## 9. DevDependencies vs Dependencies

### 9.1 Rules

- **RULE 9.1.1** — A package is a `dependency` if it is required at runtime
  (e.g., `express`, `react`, `zod`).
- **RULE 9.1.2** — A package is a `devDependency` if it is only needed during
  development (e.g., `typescript`, `eslint`, `jest`, `vite`).
- **RULE 9.1.3** — Incorrectly categorizing a dependency can lead to missing
  packages in production deployments.
- **RULE 9.1.4** — Type-only packages (`@types/*`) are always `devDependencies`.

### 9.2 Classification Guide

```text
DEPENDENCY (runtime):
  → Frameworks: react, vue, express, fastify
  → Libraries: lodash, zod, date-fns
  → Runtimes: @prisma/client (runtime engine)
  → Utilities used in production code

DEVDEPENDENCY (development):
  → Compilers: typescript, esbuild, swc
  → Linters: eslint, prettier, stylelint
  → Test tools: jest, vitest, testing-library
  → Build tools: vite, webpack, rollup
  → Type definitions: @types/node, @types/express
```

---

## 10. Build Tool Compatibility

### 10.1 Rules

- **RULE 10.1.1** — Verify that new dependencies are compatible with the project's
  build tool (Vite, Webpack, esbuild, etc.).
- **RULE 10.1.2** — Check for CommonJS vs ESM compatibility issues. Mixing module
  systems can cause subtle bugs.
- **RULE 10.1.3** — Some packages require special build tool configuration:
  - Native modules (node-gyp, prebuild)
  - WASM packages
  - Packages with conditional exports
- **RULE 10.1.4** — After adding a new dependency, verify the build succeeds.

### 10.2 ESM Compatibility Checklist

```text
[ ] Check if the package provides ESM exports (check "exports" in package.json)
[ ] Check if the package has a "module" or "main" field
[ ] Verify compatibility with the project's module resolution strategy
[ ] Test the build after installation
[ ] Test runtime behavior (some packages behave differently in ESM vs CJS)
```

---

## 11. Dependency Removal

### 11.1 Rules

- **RULE 11.1.1** — When removing a dependency, first verify it is not imported
  anywhere in the project (search for import statements).
- **RULE 11.1.2** — Remove the dependency from `package.json` using the package
  manager's uninstall command (`npm uninstall <package>`) rather than manually
  editing `package.json`.
- **RULE 11.1.3** — After removal, verify the build and tests still pass.
- **RULE 11.1.4** — Check if the removed dependency was a peer dependency of any
  remaining packages. This may require adjusting version ranges.

---

## 12. Dependency Update Protocol

### 12.1 Rules

- **RULE 12.1.1** — When updating dependencies, update one package at a time (or
  one group at a time for closely related packages).
- **RULE 12.1.2** — After each update, run the build and test suite before
  proceeding to the next update.
- **RULE 12.1.3** — MAJOR version updates require a changelog review and
  potentially code changes (breaking changes).
- **RULE 12.1.4** — Use `npm outdated` or `npx npm-check-updates` to identify
  outdated packages.
- **RULE 12.1.5** — Document the reason for dependency updates in the changelog.

### 12.2 Update Priority

```text
Priority 1 (Immediate): Security vulnerability fixes
Priority 2 (High):      Breaking bug fixes, compatibility issues
Priority 3 (Medium):    MINOR version updates with useful features
Priority 4 (Low):       PATCH version updates, cosmetic changes
Priority 5 (Deferrable): Major version updates (requires migration)
```

---

## 13. Monorepo Considerations

### 13.1 Rules

- **RULE 13.1.1** — In monorepo setups, install dependencies at the correct level:
  root for shared dependencies, package-level for package-specific dependencies.
- **RULE 13.1.2** — Use workspace protocols (`workspace:*`) for internal package
  references instead of versioned dependencies.
- **RULE 13.1.3** — Deduplicate shared dependencies across packages to reduce
  bundle size and avoid version conflicts.
- **RULE 13.1.4** — Hoist commonly used dependencies to the root `package.json`
  when appropriate, but respect each workspace's dependency boundaries.

---

## 14. Summary

Dependency management is a critical aspect of project health. Every dependency is
a trust relationship — you are trusting the package maintainer with your project's
security, stability, and maintenance burden. These rules ensure that dependencies
are added deliberately, maintained carefully, and removed when no longer needed.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-003*
