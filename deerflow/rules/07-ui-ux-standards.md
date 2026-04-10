# Deerflow Agent Framework — 07: UI/UX Standards

> **Status:** Core Rule
> **Priority:** P1 (High — User experience directly impacts product quality)
> **Applies to:** All frontend code, component libraries, and design systems

---

## 1. Overview

User interface and user experience quality are critical differentiators for modern
applications. These standards ensure that every Deerflow agent produces interfaces
that are accessible, responsive, performant, and consistent with established design
principles.

---

## 2. Responsive Design (Mobile-First)

### 2.1 Rules

- **RULE 2.1.1** — All layouts must be designed mobile-first. Start with the
  smallest viewport and progressively enhance for larger screens.
- **RULE 2.1.2** — The minimum supported viewport width is 320px (small mobile).
  The maximum supported viewport width is 1920px (full HD desktop).
- **RULE 2.1.3** — Breakpoints must be defined as CSS custom properties or
  Tailwind CSS breakpoints. Avoid hardcoded pixel values in component styles.
- **RULE 2.1.4** — Touch targets must be at minimum 44x44px (WCAG 2.1 AA).
- **RULE 2.1.5** — Text must be readable without horizontal scrolling at any
  viewport width.
- **RULE 2.1.6** — Images and media must scale proportionally within their
  containers.

### 2.2 Breakpoint Standards

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

```text
Tailwind CSS breakpoints (default):
  sm: 640px   — Small tablets, large phones
  md: 768px   — Tablets
  lg: 1024px  — Laptops
  xl: 1280px  — Desktops
  2xl: 1536px — Large desktops
```

### 2.3 Examples

```tsx
// DO: Mobile-first responsive layout
function ProductGrid({ products }: ProductGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// DON'T: Desktop-first with no mobile consideration
function ProductGrid({ products }: ProductGridProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-4">
      {products.map(product => (
        <div className="w-[300px]">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
```

---

## 3. Accessibility (WCAG 2.1 AA)

### 3.1 Rules

- **RULE 3.1.1** — All interactive elements must be keyboard accessible. Users
  must be able to navigate and operate the interface using only the keyboard
  (Tab, Enter, Space, Escape, Arrow keys).
- **RULE 3.1.2** — All images must have descriptive `alt` text. Decorative images
  must have `alt=""` to be skipped by screen readers.
- **RULE 3.1.3** — Color contrast ratios must meet WCAG 2.1 AA standards:
  - Normal text: minimum 4.5:1 contrast ratio
  - Large text (18px+ bold or 24px+): minimum 3:1 contrast ratio
  - UI components and graphical objects: minimum 3:1 contrast ratio
- **RULE 3.1.4** — All form inputs must have associated labels (`<label>` with
  `htmlFor` or `aria-label` / `aria-labelledby`).
- **RULE 3.1.5** — Use semantic HTML elements (`<nav>`, `<main>`, `<aside>`,
  `<article>`, `<section>`, `<header>`, `<footer>`) instead of generic `<div>`.
- **RULE 3.1.6** — Provide ARIA attributes for custom components:
  - `role` for component type
  - `aria-label` for accessible name
  - `aria-expanded` for toggleable content
  - `aria-live` for dynamic content updates
  - `aria-busy` during loading states
- **RULE 3.1.7** — Focus management must be implemented for modals, dialogs, and
  dynamic content (trap focus in modals, return focus on close).
- **RULE 3.1.8** — Skip navigation links must be provided as the first focusable
  element.

### 3.2 Examples

```tsx
// DO: Accessible button with aria attributes
function ExpandableSection({ title, children }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex items-center justify-between w-full p-4"
      >
        {title}
        <ChevronIcon rotated={isOpen} />
      </button>
      <div id={contentId} role="region" hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
}

// DON'T: Inaccessible div-based button
function ExpandableSection({ title, children }: Props): JSX.Element {
  return (
    <div>
      <div onClick={() => setShowChildren(!showChildren)}>
        {title}
      </div>
      {showChildren && <div>{children}</div>}
    </div>
  );
  // Not keyboard accessible, no ARIA attributes, no semantic meaning
}
```

---

## 4. Consistent Design System

### 4.1 Rules

- **RULE 4.1.1** — All components must be built using a shared design system or
  component library (e.g., shadcn/ui, Radix UI, Headless UI).
- **RULE 4.1.2** — If no design system exists, the agent must establish one
  before building components. At minimum, the design system must define:
  - Color palette
  - Typography scale
  - Spacing scale
  - Border radius scale
  - Shadow scale
  - Component variants
- **RULE 4.1.3** — Never introduce a new visual pattern without adding it to the
  design system first.
- **RULE 4.1.4** — Component variants (primary, secondary, outline, ghost, etc.)
  must be defined systematically, not ad hoc.

---

## 5. No Hardcoded Colors or Spacing

### 5.1 Rules

- **RULE 5.1.1** — Colors must be defined as CSS custom properties or Tailwind
  CSS theme tokens. Never use raw hex codes, RGB values, or named colors in
  component styles.
- **RULE 5.1.2** — Spacing must use a consistent scale (e.g., Tailwind's 4px
  grid: 1 = 4px, 2 = 8px, 4 = 16px, 8 = 32px). Never use arbitrary pixel
  values without justification.
- **RULE 5.1.3** — Font sizes must be defined in the typography scale. Never use
  arbitrary font sizes.
- **RULE 5.1.4** — Z-index values must be defined in a scale with documented
  usage. Never use arbitrary z-index values (e.g., `z-index: 9999`).

### 5.2 CSS Custom Properties Example

```css
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-border: #e2e8f0;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Z-index scale */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-tooltip: 60;
  --z-toast: 70;
}
```

### 5.3 Examples

```tsx
// DO: Using design system tokens
<button className="bg-primary text-white px-md py-sm rounded-md hover:bg-primary-hover">
  Submit
</button>

// DON'T: Hardcoded values
<button style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '6px' }}>
  Submit
</button>
```

---

## 6. Loading States for All Async Operations

### 6.1 Rules

- **RULE 6.1.1** — Every async operation (data fetching, form submission, file
  upload) must have a visible loading state.
- **RULE 6.1.2** — Loading states must provide clear feedback about what is
  happening:
  - Skeleton loaders for content areas
  - Spinners for short operations (< 1 second)
  - Progress bars for long operations (> 1 second)
- **RULE 6.1.3** — Buttons that trigger async operations must be disabled during
  the operation and show a loading indicator.
- **RULE 6.1.4** — The loading state must prevent duplicate submissions
  (disable the button, ignore double clicks).
- **RULE 6.1.5** — Skeleton loaders should approximate the shape and size of the
  expected content for a smoother loading experience.

### 6.2 Examples

```tsx
// DO: Loading state for data fetching
function UserProfile({ userId }: { userId: string }): JSX.Element {
  const { data: user, isLoading, error } = useQuery(['user', userId], () => fetchUser(userId));

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 w-24 rounded-full bg-muted" />
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} />;

  return <UserCard user={user} />;
}

// DON'T: No loading state — blank screen while data loads
function UserProfile({ userId }: { userId: string }): JSX.Element {
  const { data: user } = useQuery(['user', userId], () => fetchUser(userId));
  return <UserCard user={user} />; // user is undefined during loading!
}
```

---

## 7. Error States for All Error Scenarios

### 7.1 Rules

- **RULE 7.1.1** — Every component that can encounter an error must display a
  user-friendly error state.
- **RULE 7.1.2** — Error states must include:
  - A clear, non-technical error message
  - A visual indicator (icon, color change)
  - A recovery action (retry button, contact support link)
- **RULE 7.1.3** — Never expose technical error details (stack traces, internal
  error codes) to end users. Log them server-side and show a generic message.
- **RULE 7.1.4** — Form errors must be displayed inline, next to the relevant
  field, with clear instructions for correction.
- **RULE 7.1.5** — Network errors must be handled gracefully with a clear message
  and retry option.

### 7.2 Examples

```tsx
// DO: Comprehensive error state
function ErrorState({ error, onRetry }: ErrorStateProps): JSX.Element {
  const isNetworkError = error instanceof NetworkError;
  const message = isNetworkError
    ? 'Unable to connect. Please check your internet connection.'
    : 'Something went wrong. Please try again.';

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircleIcon className="h-12 w-12 text-error mb-4" />
      <h3 className="text-lg font-semibold mb-2">Oops!</h3>
      <p className="text-secondary mb-6 max-w-sm">{message}</p>
      <button onClick={onRetry} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}

// DON'T: Raw error display
{error && <div className="text-red-500">{error.message}</div>}
// Technical details like "TypeError: Cannot read properties of undefined" mean nothing to users
```

---

## 8. Empty States for Empty Data

### 8.1 Rules

- **RULE 8.1.1** — Every list, table, or collection view must have an empty state
  when no data is available.
- **RULE 8.1.2** — Empty states must include:
  - An illustration or icon
  - A clear message explaining why the list is empty
  - A call-to-action to add the first item (when applicable)
- **RULE 8.1.3** — Differentiate between "no data yet" (first use) and "no
  results found" (filtered/ searched) with different empty states.

### 8.2 Examples

```tsx
// DO: Descriptive empty state
function TaskList({ tasks }: TaskListProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <ClipboardIcon className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
        <p className="text-secondary mb-6">Create your first task to get started.</p>
        <button onClick={onCreateTask} className="btn-primary">
          Create Task
        </button>
      </div>
    );
  }
  return tasks.map(task => <TaskItem key={task.id} task={task} />);
}
```

---

## 9. Hover and Focus States for Interactive Elements

### 9.1 Rules

- **RULE 9.1.1** — All interactive elements (buttons, links, inputs, cards) must
  have visible hover states that indicate interactivity.
- **RULE 9.1.2** — All interactive elements must have visible focus states that
  indicate keyboard focus. Focus rings must be clearly visible and not removed.
- **RULE 9.1.3** — Use `focus-visible` instead of `focus` to show focus rings only
  on keyboard navigation, not on mouse click.
- **RULE 9.1.4** — Focus rings must have a minimum 2px offset from the element
  border for visibility.
- **RULE 9.1.5** — Never use `outline: none` without providing a custom focus
  indicator.

### 9.2 Examples

```css
/* DO: Visible focus ring with focus-visible */
.btn {
  transition: all 150ms ease;
}
.btn:hover {
  background-color: var(--color-primary-hover);
}
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* DON'T: Removing focus indication */
.btn:focus {
  outline: none; /* NEVER do this without a replacement */
}
```

---

## 10. Animation Performance (60fps)

### 10.1 Rules

- **RULE 10.1.1** — All animations must run at 60fps. If an animation drops
  frames, simplify or remove it.
- **RULE 10.1.2** — Only animate properties that can be GPU-accelerated:
  - `transform` (translate, scale, rotate)
  - `opacity`
- **RULE 10.1.3** — Never animate `width`, `height`, `top`, `left`, `margin`,
  or `padding` directly — these trigger layout recalculations (reflow).
- **RULE 10.1.4** — Use `will-change` sparingly and only for elements that are
  about to be animated. Remove `will-change` after the animation completes.
- **RULE 10.1.5** — Respect the `prefers-reduced-motion` media query. Disable or
  simplify animations for users who prefer reduced motion.

### 10.2 Examples

```css
/* DO: GPU-accelerated animation */
.fade-in {
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* DON'T: Layout-triggering animation */
.expand {
  animation: expand 300ms ease-out;
}

@keyframes expand {
  from { height: 0; } /* Triggers reflow every frame */
  to   { height: 200px; }
}

/* DO: Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1;
  }
}
```

---

## 11. Font Loading Strategy

### 11.1 Rules

- **RULE 11.1.1** — Use `font-display: swap` for all custom fonts to prevent
  invisible text during loading (FOIT — Flash of Invisible Text).
- **RULE 11.1.2** — Preload critical fonts using `<link rel="preload">` to reduce
  layout shift.
- **RULE 11.1.3** — Define a fallback font stack that closely matches the custom
  font's metrics to minimize layout shift.
- **RULE 11.1.4** — Consider using system fonts for body text and custom fonts
  only for headings to reduce load time.

### 11.2 Font Loading Example

```html
<!-- Preload critical font -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin />

<!-- Font face declaration -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
</style>
```

---

## 12. Image Optimization

### 12.1 Rules

- **RULE 12.1.1** — Use modern image formats (WebP, AVIF) for photographic content.
  Use SVG for icons and illustrations.
- **RULE 12.1.2** — All images must have explicit `width` and `height` attributes
  to prevent layout shift (CLS — Cumulative Layout Shift).
- **RULE 12.1.3** — Use lazy loading (`loading="lazy"`) for images below the fold.
  Critical images (hero, above-the-fold) should be eagerly loaded.
- **RULE 12.1.4** — Provide responsive images with `srcset` for different viewport
  sizes.
- **RULE 12.1.5** — Compress images before adding them to the project. Use tools
  like `sharp`, `squoosh`, or `imagemin`.

---

## 13. Summary

UI/UX quality is measured by how well an application serves its users. These
standards ensure that every interface produced by a Deerflow agent is accessible,
responsive, performant, and delightful to use. Accessibility is not optional — it
is a fundamental right for all users.

---

*Last updated: 2025-01-01*
*Version: 1.0.0*
*Rule ID: DFR-007*
