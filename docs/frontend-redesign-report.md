# Frontend redesign report

Scope of this pass: the **application shell, design tokens and shared component layer** of `frontend/`,
plus route-level performance and quality fixes. Individual module pages were **not** redesigned one by
one; they inherit the new tokens, card/button styling, shell, theming and error handling. See
"Remaining work" for what that leaves open.

## Starting point (inspection findings)

- React 19, Vite 8, TypeScript 6, Tailwind 4, TanStack Query/Table, React Hook Form + Zod, Recharts,
  react-router-dom 7, lucide-react were already in place and current. The package manager (npm) and
  lockfile were kept.
- 255 `.tsx` files across ~38 feature folders; nearly every module in the brief already has routes and
  API wiring (CRM, sales, projects, field jobs, finance, receivables, service contracts, support,
  workforce, performance, vendors/partners, documents, notifications, recruitment, rewards, analytics,
  Pulse, intelligence, Daily Brief, Ask Pawan, admin, integrations, workflow).
- The build had 50+ TypeScript errors and 6 lint errors (fixed earlier in this session).
- The single JS bundle was **1.85 MB** (every page eagerly imported in the router).
- The login form shipped with a pre-filled development email and password.

## Design system

Tokens live in `src/index.css` (semantic CSS variables mapped through Tailwind `@theme`):

| Area | Decision |
| --- | --- |
| Palette | Cool neutral surfaces, one indigo `primary`, plus `success`, `warning`, `info`, `destructive` |
| Theming | Light and dark token sets; `.dark` class on `<html>`; Light / Dark / System choice remembered per browser |
| Shape and depth | 10px base radius, 1px borders, subtle `shadow-soft`; `shadow-pop` for menus and dialogs |
| Motion | Short fades and slides only, disabled by `prefers-reduced-motion` |
| Focus | Global 2px `focus-visible` ring |

Existing `Card`, `Button` and the token names were kept so all existing pages restyle automatically.

### Shared components

New (all typed, in `src/components`):

- Layout: `AppShell`, `Sidebar` / `SidebarNav`, `Breadcrumbs`, `UserMenu` (header), existing `PageHeader`
  (now accepts `ReactNode` descriptions).
- Shell behavior: collapsible icon rail on desktop (remembered), collapsible navigation groups
  (remembered, active group always open), slide-in drawer on mobile, skip-to-content link, sticky header
  with breadcrumbs, global search, theme toggle, notifications and account menu.
- Shared: `ErrorBoundary` (per route; resets on navigation), `EmptyState`, `StatCard`,
  `ConfirmationDialog`, `PermissionGate`, `PageLoader`, `ThemeProvider` / `ThemeToggle`.
- UI primitives: `Dialog` (also used as a left/right drawer), `DropdownMenu`, `Tooltip`, toast host
  (`sonner`).
- Already present and kept: `DataTable` (TanStack Table), `ErrorState` (now takes `title`, `message`,
  `error`, `onRetry`), `StatusBadge`, `Tabs`, `Form` helpers, `Timeline`, list controls.

## Dependencies changed

Added: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `sonner`.
No dependency was removed or downgraded. Versions were resolved by npm against the registry at install
time and were not otherwise verified against each library's documentation.

## Performance

- All 110 page routes are now `React.lazy` chunks, with a skeleton `Suspense` fallback inside the shell.
- Main bundle: **1,850 kB to 624 kB** (gzip 460 kB to 188 kB). The remainder is shared vendor code
  (React, router, query, Radix, recharts is split with its pages).

## Quality fixes made along the way

- All TypeScript, lint and React Hook violations resolved (conditional hooks, impure render, setState
  inside effects, unused declarations, `ErrorState` / `PageHeader` prop mismatches).
- Login page no longer pre-fills a development account and password.
- E2E tests updated only where the shell legitimately changed (sign-out now lives in the account menu;
  the header search is a combobox, so the "no controls" check is scoped to the page content), and one
  test made deterministic by mocking the notification unread-count call that raced the call under test.

## Test results

| Check | Result |
| --- | --- |
| `npm run build` (`tsc -b` + Vite) | passes |
| `npm run lint` | passes, 0 errors |
| Playwright e2e (`npm run test:e2e`, 90 tests, API mocked) | 90 passed (one run had a single timing flake in `auth.spec.ts` that passed on rerun) |

Not done: visual checks at desktop and mobile widths, and manual passes against a live backend. The shell
was verified through the e2e suite and the type/lint/build pipeline only.

## Remaining work and blockers

1. **Per-module page redesign.** Pages still use their own layouts. Next steps, in priority order:
   adopt `StatCard`, `EmptyState` and `ConfirmationDialog` on the dashboards and list pages; move
   success/failure feedback onto `toast`; replace ad-hoc status colours with a shared `StatusBadge`
   mapping for each domain status.
2. **Mobile visual review** of data-heavy tables and the Kanban/pipeline views.
3. **Bundle:** the main chunk is still above 500 kB. Candidates: a vendor chunk split in `vite.config.ts`
   and lazy-loading the chart-heavy dashboards' libraries.
4. **Accessibility audit** (contrast in dark mode, screen reader pass) has not been run.
5. **Scope gaps against the brief:** chat/communication is limited to notifications (no chat routes
   exist); a customer-facing career application page and a dedicated pipeline board for sales are not
   present in the routes. These need product decisions and backend support before UI work.
6. Pulse, Daily Brief and Ask Pawan render only what the existing services return; no mock AI content
   was added.
