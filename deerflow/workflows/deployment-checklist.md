# Deerflow Pre-Deployment Checklist

> **Comprehensive Deployment Verification**
> This checklist MUST be completed before any deployment to staging or production.
> Every item requires an explicit PASS/FAIL determination. All items must PASS
> before proceeding with deployment. No exceptions.

---

## Table of Contents

1. [Overview](#overview)
2. [Build Verification](#1-build-verification)
3. [Environment Variable Check](#2-environment-variable-check)
4. [Database Migration Check](#3-database-migration-check)
5. [Asset Optimization](#4-asset-optimization)
6. [Security Scan](#5-security-scan)
7. [Performance Testing](#6-performance-testing)
8. [Accessibility Audit](#7-accessibility-audit)
9. [Cross-Browser Testing](#8-cross-browser-testing)
10. [Mobile Responsiveness Check](#9-mobile-responsiveness-check)
11. [SEO Verification](#10-seo-verification)
12. [Monitoring Setup](#11-monitoring-setup)
13. [Rollback Plan](#12-rollback-plan)
14. [Final Sign-Off](#final-sign-off)

---

## Overview

### Checklist Usage

1. **Go through each section in order.**
2. **Mark each item as PASS ☑ or FAIL ☐.**
3. **If any item FAILS, resolve it before proceeding.**
4. **Document the resolution for any initially-failed items.**
5. **Complete the Final Sign-Off to authorize deployment.**

### Deployment Types

| Type | Full Checklist | Abbreviated Checklist |
|------|:--------------:|:---------------------:|
| Production Deploy | ✅ All items required | ❌ Not allowed |
| Staging Deploy | ✅ All items required | ❌ Not allowed |
| Preview/Canary | ⚠️ Items 1-6 required | ✅ Items 7-12 optional |
| Hotfix | ⚠️ Items 1, 5-6, 12 required | ✅ Others as applicable |

### Deployment Metadata

```yaml
deployment:
  id: DEPLOY-YYYYMMDD-SEQUENCE
  task_id: TASK-YYYYMMDD-SEQUENCE
  environment: staging | production
  type: full | canary | hotfix | rollback
  operator: agent-id
  started_at: ISO-8601-timestamp
  completed_at: ISO-8601-timestamp
  status: pending | in_progress | completed | failed | rolled_back
```

---

## 1. Build Verification

Ensure the project builds cleanly for the target environment.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 1.1 | **Production build succeeds** (`npm run build`) | ☐ | |
| 1.2 | **Build produces zero warnings** | ☐ | |
| 1.3 | **Build output exists in expected location** | ☐ | |
| 1.4 | **Bundle size is within acceptable limits** (≤ 10% increase from baseline) | ☐ | Baseline: ___ KB, Current: ___ KB |
| 1.5 | **No source map exposure** in production build | ☐ | |
| 1.6 | **No development-only code** in production build (console.log, debug flags) | ☐ | |
| 1.7 | **Static assets are hashed** for cache busting | ☐ | |
| 1.8 | **Environment-specific build variables** are correctly set | ☐ | |
| 1.9 | **Docker image builds successfully** (if containerized) | ☐ | |
| 1.10 | **Build is reproducible** (same commit → same output) | ☐ | |

### Build Verification Commands

```bash
# Standard build
npm run build

# Build with verbose output
npm run build -- --verbose

# Bundle analysis
npx vite-bundle-visualizer    # For Vite projects
npx webpack-bundle-analyzer   # For Webpack projects

# Check for console.log in production code
rg "console\.(log|debug|info|warn)" --type ts --type tsx src/

# Check for debug-only code
rg "DEBUG|DEV_ONLY|__DEV__" --type ts src/ | rg -v "node_modules"
```

---

## 2. Environment Variable Check

Verify all required environment variables are configured for the target environment.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 2.1 | **All required env vars are set** (checked against `.env.example`) | ☐ | |
| 2.2 | **No default/placeholder values** remain in production configuration | ☐ | |
| 2.3 | **Secrets are NOT committed** to version control | ☐ | |
| 2.4 | **Secrets are stored in secure vault** (not plain text files) | ☐ | |
| 2.5 | **API keys are valid** and not expired | ☐ | |
| 2.6 | **Database connection strings** point to correct environment | ☐ | |
| 2.7 | **Feature flags** are configured correctly for target environment | ☐ | |
| 2.8 | **CORS origins** are restricted to allowed domains | ☐ | |
| 2.9 | **Rate limiting** is configured appropriately | ☐ | |
| 2.10 | **Logging level** is appropriate for the environment (info for prod) | ☐ | |

### Environment Variable Validation

```bash
# Check for committed secrets
rg "PASSWORD|SECRET|API_KEY|TOKEN" .env* --no-ignore-vcs

# Verify .env.example is up to date
diff <(rg -o '^\w+' .env.example | sort) <(rg -o '^\w+' .env.production | sort)

# Check for placeholder values
rg "placeholder|changeme|todo|xxx|example\.com" .env.production
```

---

## 3. Database Migration Check

Verify database schema changes are safe and migration-ready.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 3.1 | **All migrations are backward compatible** (no destructive changes) | ☐ | |
| 3.2 | **Migration scripts tested** on a copy of production data | ☐ | |
| 3.3 | **Migration rollback script exists** and has been tested | ☐ | |
| 3.4 | **Data migration is idempotent** (safe to re-run) | ☐ | |
| 3.5 | **Migration estimated runtime** is acceptable (< 30 seconds for online) | ☐ | Estimated: ___ seconds |
| 3.6 | **No locked tables** during migration that would block the application | ☐ | |
| 3.7 | **Index additions** analyzed for performance impact | ☐ | |
| 3.8 | **Foreign key constraints** are valid | ☐ | |
| 3.9 | **Schema version is tracked** and matches deployment version | ☐ | |
| 3.10 | **Database backup is taken** before migration (production) | ☐ | |

### Migration Verification Commands

```bash
# Run pending migrations (dry run)
npm run migrate:status

# Run migration with verbose output
npm run migrate -- --verbose

# Verify migration rollback
npm run migrate:rollback --dry-run

# Check schema consistency
npm run db:schema:verify
```

---

## 4. Asset Optimization

Ensure static assets are optimized for production delivery.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 4.1 | **Images are optimized** (WebP/AVIF, compressed, properly sized) | ☐ | |
| 4.2 | **JavaScript bundles are minified** and tree-shaken | ☐ | |
| 4.3 | **CSS is minified** and purged of unused styles | ☐ | |
| 4.4 | **Fonts are optimized** (subset, woff2 format, preloaded) | ☐ | |
| 4.5 | **Static assets have cache headers** set (long max-age for hashed assets) | ☐ | |
| 4.6 | **Critical CSS is inlined** for above-the-fold content | ☐ | |
| 4.7 | **Large assets (> 500KB) are lazy-loaded** | ☐ | |
| 4.8 | **Source maps are NOT served** to clients in production | ☐ | |
| 4.9 | **Asset CDN is configured** (if applicable) | ☐ | |
| 4.10 | **Favicon and app icons** are present and correct sizes | ☐ | |

### Asset Analysis Commands

```bash
# Analyze bundle size
npm run build -- --analyze

# List largest assets
find dist/ -type f -size +100k -exec ls -lh {} \; | sort -k5 -hr

# Check image optimization
npx imagemin dist/assets/images/* --out-dir=optimized/ --plugin=mozjpeg --plugin=pngquant

# Check for unoptimized images
rg -l "\.(png|jpg|jpeg|gif)" dist/ --files-with-matches
```

---

## 5. Security Scan

Run comprehensive security checks on the deployment artifact.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 5.1 | **No critical or high vulnerabilities** in dependencies (`npm audit`) | ☐ | |
| 5.2 | **No hardcoded secrets** in the codebase | ☐ | |
| 5.3 | **No debug endpoints** exposed in production | ☐ | |
| 5.4 | **CORS policy** is correctly configured | ☐ | |
| 5.5 | **CSP headers** are set and restrictive | ☐ | |
| 5.6 | **HTTPS is enforced** on all endpoints | ☐ | |
| 5.7 | **Authentication is required** for all protected routes | ☐ | |
| 5.8 | **Rate limiting** is active on public endpoints | ☐ | |
| 5.9 | **Input validation** is implemented on all user-facing inputs | ☐ | |
| 5.10 | **No SQL injection vectors** (parameterized queries everywhere) | ☐ | |
| 5.11 | **No XSS vectors** (output encoding on all user content) | ☐ | |
| 5.12 | **HTTP security headers** are set (X-Frame-Options, HSTS, etc.) | ☐ | |

### Security Scan Commands

```bash
# Dependency vulnerability scan
npm audit --production --audit-level=high

# Check for secrets in code
npx gitleaks detect --source .

# OWASP dependency check
npx dependency-check .

# Static application security testing
npx snyk code test

# TLS/SSL check (for production URLs)
npx ssl-checker example.com

# Security headers check
npx security-headers https://example.com
```

---

## 6. Performance Testing

Verify the application meets performance requirements.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 6.1 | **Lighthouse Performance score** ≥ 90 | ☐ | Score: ___ |
| 6.2 | **First Contentful Paint (FCP)** ≤ 1.8s (mobile, 4G) | ☐ | Time: ___ s |
| 6.3 | **Largest Contentful Paint (LCP)** ≤ 2.5s (mobile, 4G) | ☐ | Time: ___ s |
| 6.4 | **Total Blocking Time (TBT)** ≤ 200ms | ☐ | Time: ___ ms |
| 6.5 | **Cumulative Layout Shift (CLS)** ≤ 0.1 | ☐ | Score: ___ |
| 6.6 | **Time to Interactive (TTI)** ≤ 3.8s (mobile, 4G) | ☐ | Time: ___ s |
| 6.7 | **API response time (p95)** ≤ 500ms | ☐ | Time: ___ ms |
| 6.8 | **Database query time (p95)** ≤ 200ms | ☐ | Time: ___ ms |
| 6.9 | **No memory leaks** detected under sustained load (10 min) | ☐ | |
| 6.10 | **Error rate under load** ≤ 0.1% | ☐ | Rate: ___% |

### Performance Test Commands

```bash
# Lighthouse audit
npx lighthouse https://staging.example.com --output json --output-path ./lighthouse-report.json

# API load test
npx artillery run load-test.yml

# Memory leak check
node --inspect app.js
# Then connect Chrome DevTools → Memory tab → Record allocation over time

# Bundle size comparison
npm run build
npx size-limit
```

### Performance Budget Configuration

```json
{
  "sizeLimit": [
    {
      "path": "dist/assets/*.js",
      "limit": "250 KB"
    },
    {
      "path": "dist/assets/*.css",
      "limit": "50 KB"
    },
    {
      "path": "dist/index.html",
      "limit": "5 KB"
    }
  ]
}
```

---

## 7. Accessibility Audit

Ensure the application is accessible to all users.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 7.1 | **All images have alt text** (or `aria-hidden` for decorative) | ☐ | |
| 7.2 | **All form inputs have associated labels** | ☐ | |
| 7.3 | **Color contrast ratio** ≥ 4.5:1 (AA standard) | ☐ | |
| 7.4 | **All interactive elements are keyboard accessible** | ☐ | |
| 7.5 | **Focus indicators are visible** on all focusable elements | ☐ | |
| 7.6 | **ARIA attributes are used correctly** (roles, states, properties) | ☐ | |
| 7.7 | **Page has proper heading hierarchy** (h1 → h2 → h3, no skipping) | ☐ | |
| 7.8 | **Skip navigation link** is present | ☐ | |
| 7.9 | **Language attribute** is set on `<html>` element | ☐ | |
| 7.10 | **Lighthouse Accessibility score** ≥ 95 | ☐ | Score: ___ |

### Accessibility Test Commands

```bash
# Automated accessibility check
npx axe http://localhost:3000

# Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility

# Pa11y CI (continuous accessibility)
npx pa11y-ci --config .pa11yci.json
```

---

## 8. Cross-Browser Testing

Verify the application works across all supported browsers.

| # | Browser | Status | Notes |
|---|---------|:------:|-------|
| 8.1 | **Chrome** (latest 2 versions) | ☐ | |
| 8.2 | **Firefox** (latest 2 versions) | ☐ | |
| 8.3 | **Safari** (latest 2 versions) | ☐ | |
| 8.4 | **Edge** (latest 2 versions) | ☐ | |
| 8.5 | **iOS Safari** (latest) | ☐ | |
| 8.6 | **Android Chrome** (latest) | ☐ | |

### Cross-Browser Test Areas

For each browser, verify:

- [ ] Page renders correctly without visual glitches.
- [ ] All interactive elements work (buttons, forms, navigation).
- [ ] CSS features render correctly (flexbox, grid, animations).
- [ ] JavaScript features work (ES2020+, APIs).
- [ ] Fonts load and display correctly.
- [ ] File uploads work (if applicable).
- [ ] Copy/paste works correctly.

### Browser Testing Tools

```bash
# Playwright cross-browser tests
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Visual regression testing
npx playwright test --update-snapshots  # First run
npx playwright test                     # Subsequent runs
```

---

## 9. Mobile Responsiveness Check

Verify the application adapts correctly to mobile screen sizes.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 9.1 | **Layout adapts** at 320px (small mobile) | ☐ | |
| 9.2 | **Layout adapts** at 375px (iPhone SE) | ☐ | |
| 9.3 | **Layout adapts** at 428px (iPhone Pro Max) | ☐ | |
| 9.4 | **Layout adapts** at 768px (iPad portrait) | ☐ | |
| 9.5 | **Layout adapts** at 1024px (iPad landscape) | ☐ | |
| 9.6 | **Touch targets** are ≥ 44×44px (Apple HIG) | ☐ | |
| 9.7 | **Text is readable** without horizontal scrolling | ☐ | |
| 9.8 | **No horizontal scrollbar** at any viewport width | ☐ | |
| 9.9 | **Images scale responsively** (no overflow) | ☐ | |
| 9.10 | **Viewport meta tag** is correctly set | ☐ | |

### Responsiveness Test Checklist

```html
<!-- Verify viewport meta tag exists -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

```bash
# Test with Playwright at different viewports
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
npx playwright test --project=tablet
```

---

## 10. SEO Verification

Ensure search engine optimization fundamentals are in place.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 10.1 | **Title tag** is unique and descriptive (≤ 60 chars) | ☐ | |
| 10.2 | **Meta description** is present (≤ 160 chars) | ☐ | |
| 10.3 | **Canonical URL** is set for each page | ☐ | |
| 10.4 | **Open Graph tags** are present (og:title, og:description, og:image) | ☐ | |
| 10.5 | **Structured data** (JSON-LD) is valid and correct | ☐ | |
| 10.6 | **robots.txt** allows crawling of public pages | ☐ | |
| 10.7 | **sitemap.xml** is present and up to date | ☐ | |
| 10.8 | **No broken links** (internal or external) | ☐ | |
| 10.9 | **Images have descriptive alt text** for indexing | ☐ | |
| 10.10 | **Page load speed** meets Core Web Vitals thresholds | ☐ | |

### SEO Test Commands

```bash
# Validate structured data
npx schema-dts https://example.com

# Check for broken links
npx broken-link-checker https://example.com

# Lighthouse SEO audit
npx lighthouse https://example.com --only-categories=seo
```

---

## 11. Monitoring Setup

Verify monitoring and alerting are configured for the deployment.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 11.1 | **Application health endpoint** is responding | ☐ | |
| 11.2 | **Error tracking** is configured (Sentry, DataDog, etc.) | ☐ | |
| 11.3 | **Performance monitoring** is active (APM) | ☐ | |
| 11.4 | **Uptime monitoring** is configured | ☐ | |
| 11.5 | **Alert rules** are defined for critical metrics | ☐ | |
| 11.6 | **Log aggregation** is receiving application logs | ☐ | |
| 11.7 | **Custom metrics** are being collected | ☐ | |
| 11.8 | **Dashboard** is updated with new metrics (if applicable) | ☐ | |
| 11.9 | **On-call rotation** is aware of the deployment | ☐ | |
| 11.10 | **Runbook is updated** with new troubleshooting steps | ☐ | |

### Health Check Verification

```bash
# Check application health endpoint
curl -f https://staging.example.com/health

# Expected response:
# { "status": "ok", "version": "1.2.3", "uptime": 3600 }
```

### Required Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Error Rate Spike | Error rate > 1% for 5 minutes | Critical |
| Response Time Degradation | p95 latency > 2x baseline for 10 minutes | Warning |
| Memory Usage | > 80% of allocated memory | Warning |
| CPU Usage | > 90% for 5 minutes | Critical |
| Database Connection Pool | > 80% utilization | Warning |
| Disk Space | > 90% utilization | Warning |
| Deployment Failure | Any step fails | Critical |

---

## 12. Rollback Plan

Verify a rollback plan is in place and tested before deployment.

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 12.1 | **Previous deployment artifact** is preserved and accessible | ☐ | |
| 12.2 | **Database rollback script** is tested and ready | ☐ | |
| 12.3 | **Feature flags** can disable new features without redeployment | ☐ | |
| 12.4 | **Rollback procedure** is documented and reviewed | ☐ | |
| 12.5 | **Rollback can be executed** within 5 minutes | ☐ | Estimated: ___ minutes |
| 12.6 | **Stakeholders are notified** of the rollback plan | ☐ | |
| 12.7 | **Post-rollback verification steps** are documented | ☐ | |
| 12.8 | **Data consistency after rollback** is verified | ☐ | |
| 12.9 | **Canary deployment** is used for high-risk changes | ☐ | |
| 12.10 | **Deployment is tagged** for easy rollback identification | ☐ | |

### Rollback Procedure

```markdown
## Rollback Procedure for DEPLOY-{ID}

### 1. Application Rollback
```bash
# Rollback to previous deployment
kubectl rollback deployment/app --to-revision={prev-revision}
# or
docker-compose up -d --no-deps --build app:{previous-tag}
```

### 2. Database Rollback
```bash
# Rollback last migration
npm run migrate:rollback -- --step 1
```

### 3. Cache Invalidation
```bash
# Clear CDN cache
# Clear application cache
# Invalidate any stale session data
```

### 4. Verification
- [ ] Health endpoint returns 200
- [ ] Smoke tests pass
- [ ] Error rate returns to baseline
- [ ] Users report normal behavior

### 5. Communication
- Notify stakeholders of rollback completion
- Create incident ticket if needed
- Schedule post-mortem within 24 hours
```

---

## Final Sign-Off

### Checklist Summary

| Section | Items | Passed | Failed | Status |
|---------|:-----:|:------:|:------:|:------:|
| 1. Build Verification | 10 | ___ | ___ | ☐ |
| 2. Environment Variables | 10 | ___ | ___ | ☐ |
| 3. Database Migration | 10 | ___ | ___ | ☐ |
| 4. Asset Optimization | 10 | ___ | ___ | ☐ |
| 5. Security Scan | 12 | ___ | ___ | ☐ |
| 6. Performance Testing | 10 | ___ | ___ | ☐ |
| 7. Accessibility Audit | 10 | ___ | ___ | ☐ |
| 8. Cross-Browser Testing | 6 | ___ | ___ | ☐ |
| 9. Mobile Responsiveness | 10 | ___ | ___ | ☐ |
| 10. SEO Verification | 10 | ___ | ___ | ☐ |
| 11. Monitoring Setup | 10 | ___ | ___ | ☐ |
| 12. Rollback Plan | 10 | ___ | ___ | ☐ |
| **TOTAL** | **118** | **___** | **___** | ☐ |

### Deployment Authorization

```yaml
deployment_authorization:
  deployment_id: DEPLOY-YYYYMMDD-SEQUENCE
  task_id: TASK-YYYYMMDD-SEQUENCE
  environment: [staging|production]
  checklist_total_items: 118
  checklist_passed: ___
  checklist_failed: ___
  all_items_passed: [true|false]

  authorization:
    agent_id: agent-identifier
    signed_at: ISO-8601-timestamp
    decision: [APPROVED|REJECTED]

  notes: |
    Any additional notes about the deployment decision.
```

### Deployment Decision

**APPROVED** if:
- All 118 checklist items are marked PASS.
- All failed items from earlier have been resolved and re-verified.
- Rollback plan is documented and tested.
- Monitoring is active.

**REJECTED** if:
- Any checklist item remains FAIL.
- Rollback plan is not in place.
- Monitoring is not configured.

---

*This deployment checklist is a core component of the Deerflow Agent Framework.
No deployment may proceed without completing this checklist. Safety first.*
