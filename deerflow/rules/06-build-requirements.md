# Deerflow Agent Framework — 06: Build Requirements

> **Status:** Core Rule
> **Priority:** P1 (High — A broken build is a broken product)
> **Applies to:** All build, bundle, and deployment preparation operations

---

## 1. Overview

A successful build is the final gate between development and production. Every
Deerflow agent must ensure that the build process is reliable, reproducible, and
produces a correct, optimized output. This rule defines the requirements for build
verification, optimization, and deployment readiness.

---

## 2. Build Must Succeed Without Errors

### 2.1 Rules

- **RULE 2.1.1** — The build command must exit with code 0 (success) with zero
  errors. Any non-zero exit code or error output is a build failure.
- **RULE 2.1.2** — Build warnings must be addressed. A build with warnings is
  acceptable temporarily but must be resolved before release.
- **RULE 2.1.3** — The agent must run the build command after any change that
  could affect the build output (code changes, configuration changes, dependency
  changes).
- **RULE 2.1.4** — If the build fails, the agent must:
  1. Analyze the error output.
  2. Identify the root cause.
  3. Fix the issue.
  4. Re-run the build to verify the fix.
- **RULE 2.1.5** — Never proceed with deployment when the build is failing.

### 2.2 Build Commands by Framework

```text
Next.js:      npm run build      → next build
Vite:         npm run build      → vite build
Create React: npm run build      → react-scripts build
Express:      npm run build      → tsc (TypeScript compilation only)
Node (TS):    npm run build      → tsc --project tsconfig.json
```

### 2.3 Examples

```text
DO:   After code changes, run `npm run build` and verify exit code 0.
      Analyze any warnings and fix them before committing.

DON'T: Assume the build will succeed because TypeScript compiled without errors.
      The bundler may catch issues that tsc does not.
```

---

## 3. Build Output Size Verification

### 3.1 Rules

- **RULE 3.1.1** — For meaningful frontend projects, the build output must be
  larger than 100KB. If the build output is suspiciously small (< 100KB),
  investigate whether assets are missing or tree-shaking is too aggressive.
- **RULE 3.1.2** — The build output should not be excessively large. Use bundle
  analysis to identify and eliminate bloat.
- **RULE 3.1.3** — Individual JavaScript chunks should not exceed 250KB (gzipped).
  If a chunk exceeds this limit, it should be code-split further.
- **RULE 3.1.4** — The agent must verify build output size as part of the build
  verification process.

### 3.2 Size Guidelines

```text
Minimal app (Hello World):     ~10-50KB
Small app (few features):       ~100-300KB
Medium app (standard SaaS):     ~300KB-1MB
Large app (feature-rich):       ~1-3MB
Enterprise app (complex):       ~3-5MB+

Per chunk maximum:              ~250KB gzipped
```

---

## 4. All Assets Must Be Included

### 4.1 Rules

- **RULE 4.1.1** — The build output must include all required assets:
  - JavaScript bundles
  - CSS stylesheets
  - Images (PNG, JPG, SVG, WebP)
  - Fonts (WOFF2, WOFF)
  - Favicon and app icons
  - Manifest files (manifest.json, robots.txt, sitemap.xml)
  - Static HTML files (if applicable)
- **RULE 4.1.2** — Verify that asset references in code resolve correctly in the
  build output. Broken asset references after build are a critical issue.
- **RULE 4.1.3** — Check for 404 errors on assets by comparing the list of
  imported assets against the build output directory.
- **RULE 4.1.4** — SVGs used as React components (via SVGR or similar) must be
  included in the JS bundle, not as separate files.
- **RULE 4.1.5** — Fonts must be properly referenced in CSS and included in the
  build output with correct MIME types.

### 4.2 Asset Verification Checklist

```text
[ ] JavaScript bundles present in output
[ ] CSS stylesheets present in output
[ ] Images referenced in code exist in output
[ ] Fonts referenced in CSS exist in output
[ ] Favicon and icons present
[ ] No 404 errors for asset references
[ ] Asset file names include content hashes (for cache busting)
```

---

## 5. Source Maps in Development

### 5.1 Rules

- **RULE 5.1.1** — Source maps must be enabled in development builds to enable
  meaningful debugging.
- **RULE 5.1.2** — Source maps in production builds should be:
  - Generated but not served publicly (store them separately and upload to
    error monitoring tools like Sentry).
  - OR disabled entirely if error monitoring does not require them.
- **RULE 5.1.3** — Source maps must never be committed to version control as
  part of the build output.
- **RULE 5.1.4** — Verify source maps work by testing stack traces in the browser
  dev tools.

### 5.2 Configuration Examples

```typescript
// Vite — vite.config.ts
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode === 'development',
  },
}));

// Webpack — webpack.config.js
module.exports = {
  devtool: isProduction ? 'hidden-source-map' : 'eval-source-map',
};

// Next.js — next.config.js
module.exports = {
  productionBrowserSourceMaps: true, // Upload to Sentry, don't serve publicly
};
```

---

## 6. Tree-Shaking Optimization

### 6.1 Rules

- **RULE 6.1.1** — The build must use tree-shaking to eliminate unused code from
  the final bundle.
- **RULE 6.1.2** — Verify tree-shaking is working by checking the bundle analysis
  for unused exports from imported libraries.
- **RULE 6.1.3** — Common tree-shaking blockers to avoid:
  - `export *` (re-export all) — prefer named exports
  - Side effects in modules (use `"sideEffects": false` in package.json)
  - Dynamic imports with string concatenation (breaks static analysis)
  - Class decorators that reference unused code
- **RULE 6.1.4** — Libraries must support ES modules (ESM) for tree-shaking to
  work. CommonJS libraries cannot be tree-shaken.
- **RULE 6.1.5** — Use `bundle analyzer` to verify the bundle composition and
  identify unexpected inclusions.

### 6.2 Tree-Shaking Verification

```bash
# Analyze bundle with Vite
npx vite-bundle-visualizer

# Analyze bundle with Webpack
npx webpack-bundle-analyzer dist/static/js/*.js

# Check for specific library size
npx bundle-phobia <package-name>@<version>
```

---

## 7. Bundle Analysis Required

### 7.1 Rules

- **RULE 7.1.1** — Every build must be accompanied by a bundle analysis report.
- **RULE 7.1.2** — The bundle analysis must identify:
  - Total bundle size (individual and gzipped)
  - Largest modules
  - Duplicate modules
  - Modules that could be tree-shaken
- **RULE 7.1.3** — If the bundle analysis reveals unexpected bloat, the agent
  must investigate and propose optimizations.
- **RULE 7.1.4** — Bundle size must be tracked over time. If a change increases
  the bundle size by more than 10%, the agent must explain why.

### 7.3 Bundle Analysis Output

```text
=== Bundle Analysis Report ===
Total size:     245.3 KB (gzipped: 78.2 KB)
Chunks:         3
Largest chunk:  vendor.js — 180.1 KB (gzipped: 58.4 KB)

Top 5 modules by size:
  1. react-dom/client.js    — 120.4 KB (49% of total)
  2. lodash-es/debounce.js   —  12.3 KB ( 5% of total)
  3. zod/lib/index.js        —   8.7 KB ( 4% of total)
  4. date-fns/locale/en.js   —   6.2 KB ( 3% of total)
  5. @tanstack/react-query   —   5.8 KB ( 2% of total)

⚠️  Warning: 'moment' detected (67.2 KB). Consider replacing with 'date-fns' (2.1 KB).
⚠️  Warning: Duplicate 'react' detected in multiple chunks.
```

---

## 8. No Circular Dependencies

### 8.1 Rules

- **RULE 8.1.1** — The build must not contain circular dependencies. Circular
  dependencies can cause runtime errors, incorrect module resolution, and
  unpredictable behavior.
- **RULE 8.1.2** — Use tools to detect circular dependencies:
  - `madge --circular --extensions ts src/`
  - `dpdm src/index.ts`
- **RULE 8.1.3** — When circular dependencies are detected, the agent must break
  the cycle by:
  1. Extracting shared code into a new module.
  2. Using dependency injection to invert the dependency direction.
  3. Merging one of the circular modules into the other.
- **RULE 8.1.4** — Circular dependencies must be resolved before the build can
  be considered successful.

### 8.2 Common Circular Dependency Patterns

```text
Pattern 1: A imports B, B imports A
  → Extract shared types to C, both A and B import C

Pattern 2: A imports B, B imports C, C imports A
  → Identify the lowest-level module and extract its shared code

Pattern 3: Barrel file creates circular imports
  → Replace barrel re-exports with direct imports
```

---

## 9. No Dead Code Elimination Issues

### 9.1 Rules

- **RULE 9.1.1** — The build process should eliminate dead code (code that is
  never executed). Verify that dead code elimination is working correctly.
- **RULE 9.1.2** — Common dead code elimination issues:
  - `process.env.NODE_ENV` checks not being evaluated (runtime vs compile-time)
  - Feature flags not being eliminated in production
  - Conditional exports not being tree-shaken
- **RULE 9.1.3** — The `define` plugin in Webpack or `define` option in Vite
  should replace `process.env.NODE_ENV` at build time.
- **RULE 9.1.4** — Use the `"sideEffects": false` field in package.json to
  enable aggressive dead code elimination.

### 9.2 Examples

```typescript
// DO: Compile-time dead code elimination with NODE_ENV
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data); // Eliminated in production build
}

// DON'T: Runtime check that prevents tree-shaking
if (window.location.hostname !== 'production.example.com') {
  console.log('Debug info:', data); // NOT eliminated — runtime check
}
```

---

## 10. Environment-Specific Builds

### 10.1 Rules

- **RULE 10.1.1** — The build must support at minimum three environments:
  - `development` — Source maps, verbose errors, hot reload
  - `staging` — Production-like but with test data and endpoints
  - `production` — Optimized, minified, no source maps served
- **RULE 10.1.2** — Environment-specific variables must be injected at build time,
  not runtime, for security and performance.
- **RULE 10.1.3** — The agent must verify the build output matches the target
  environment. Building for development when deploying to production is a critical
  error.
- **RULE 10.1.4** — Environment configuration must be defined in `.env.*` files:
  - `.env.development`
  - `.env.staging`
  - `.env.production`

### 10.2 Build Matrix

```text
                    Development    Staging       Production
Source maps         ✅ Yes         ✅ Hidden      ❌ No / External
Minification        ❌ No          ✅ Yes         ✅ Yes
Dead code elim.     ❌ No          ✅ Yes         ✅ Yes
Optimization        ❌ No          ✅ Yes         ✅ Yes
API endpoint        localhost      staging.api   api.example.com
Logging             Verbose        Normal        Errors only
Feature flags       All enabled    All enabled   Production only
```

---

## 11. Version Tagging

### 11.1 Rules

- **RULE 11.1.1** — Every production build must have a version identifier that is:
  - Embedded in the build output (accessible at runtime)
  - Included in the deployment artifact
  - Logged in the CI/CD pipeline
- **RULE 11.1.2** — Version identifiers must follow Semantic Versioning (SemVer):
  `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **RULE 11.1.3** — Include a build hash or git SHA for traceability:
  `1.2.3+abc1234` (SemVer build metadata)
- **RULE 11.1.4** — Update the `package.json` version before building for release.

### 11.2 Version Information Access

```typescript
// version.ts — Generated at build time
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'unknown';
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? 'unknown';

// Usage: Display in footer, headers, or health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    build: BUILD_SHA,
    timestamp: BUILD_DATE,
  });
});
```

---

## 12. Build Verification Script

### 12.1 Recommended Verification Steps

```bash
#!/bin/bash
# build-verify.sh — Run after every build

set -euo pipefail

echo "=== Running Build Verification ==="

# Step 1: Clean previous build
echo "[1/6] Cleaning previous build..."
rm -rf dist/ .next/ build/

# Step 2: Run the build
echo "[2/6] Building..."
npm run build
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "❌ BUILD FAILED with exit code $BUILD_EXIT"
  exit 1
fi

# Step 3: Check output exists
echo "[3/6] Verifying build output..."
OUTPUT_DIR="dist/"
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "❌ Build output directory missing: $OUTPUT_DIR"
  exit 1
fi

# Step 4: Check minimum size
echo "[4/6] Checking build size..."
TOTAL_SIZE=$(du -sk "$OUTPUT_DIR" | cut -f1)
if [ "$TOTAL_SIZE" -lt 100 ]; then
  echo "⚠️  Build output is suspiciously small: ${TOTAL_SIZE}KB"
else
  echo "✅ Build size: ${TOTAL_SIZE}KB"
fi

# Step 5: Check for circular dependencies
echo "[5/6] Checking for circular dependencies..."
npx madge --circular --extensions ts src/ || echo "⚠️  Circular dependencies detected!"

# Step 6: Bundle analysis
echo "[6/6] Running bundle analysis..."
npx vite-bundle-visualizer --open false || true

echo "=== Build Verification Complete ==="
```

---

## 13. Summary

A reliable build process is essential for trustworthy deployments. These rules
ensure that every build is correct, optimized, and ready for its target
environment. By following these requirements, agents can confidently verify that
their changes produce valid, production-ready artifacts.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-006*
