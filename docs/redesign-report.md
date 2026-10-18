# Business OS redesign: progress report (interim)

Status as of 2026-10-13: **partly done.** The work stopped when the usage limit was reached. This file says what is finished and checked, what is written but not yet checked, and what has not been started. It is not the final report.

## Finished and checked

### Backend (Spring Boot)
- **Analytics rewritten on real data.** New endpoints under `/api/v1/analytics`: `control-tower`, `finance`, `sales`, `projects`, `service`, `workforce`, and `my-work`. Each takes `from` and `to` (default: last 30 days, in the business time zone Asia/Kolkata) and compares with the equal period before.
  - Opening a dashboard needs `ANALYTICS_VIEW` **and** the permission of the module it reads. Parts that need another permission (project margin, commissions, quotations, orders, ticket lists, AMC) come back as `null`, never as zero or an empty list.
  - Figures that cannot be worked out (no invoices, no closed leads) are `null`. Nothing is invented.
  - The old "expenses / gross profit / net profit" figures are gone: the system has no expense ledger, so they were not real. Project economics (recorded project costs against revenue) replaces them and says what it is.
  - Money definitions match the finance module: invoiced, collected (reversed payments excluded), outstanding, overdue, ageing bands.
- **Pulse, Daily Brief and Ask Pawan** now respect permissions. Insights are filtered by the record type's module permission; Brief and Ask answer only from what the caller may see. New `GET /ask/suggestions`.
- **Performance targets** gained a `tracked` flag so a target the system cannot measure is shown as "not measured", not 0%.
- **Migration V44** (additive, `IF NOT EXISTS`): indexes for the 7 foreign keys that had none, and for the date filters the dashboards use.
- **Security fix (found by the role audit):** global search (`/api/v1/search`, `/recent`) returned customers, leads, invoices, tickets and employees to *any* signed-in user, including zero-permission vendor/partner accounts. Each kind of result now needs its module's view permission, and search is refused for roles with none. See "Open problems" for the test that still fails.

### Tests (run against a throwaway local PostgreSQL, never the remote database)
- Fixed stale tests that were failing before this work: `SchemaMigrationIT` (now reads the migration folder), `PermissionCatalogIT`, `AuthFlowIT`, and the `RbacMatrixIT` harness.
- New: `AnalyticsAccessIT` (13), `AnalyticsFinanceIT` (4; checks the dashboard against the finance module's own report to the rupee, including reversed payments, credit notes, cancelled invoices, tenant isolation), `AnalyticsOperationsIT` (7; projects, tickets/SLA, leads funnel, pipeline). All 24 pass.
- Full backend run before the search fix: 249 integration tests, 1 failure (the search leak above); all unit tests and ArchUnit rules passed.

### Frontend (React)
- Design system and shell from the earlier part of this work: tokens (light and dark), UI primitives, `StatCard`, `ChartCard`, `TrendChart`, `BarsChart`, `DonutChart`, `FunnelBars`, `ProgressCard`, `DateRangeFilter`, `PageHeader`, `DataTable`, `EmptyState`, `ErrorState`, `SkeletonLoader`, sidebar, header, notification centre, global search. Chart colours were checked with a colour-blindness validator.
- Removed the `fintrack` demo feature and 66 unused image assets (the reference image is kept at `docs/design/reference-dashboard.png`).

## Written, type-checked and linted, but **not yet looked at in a browser**
`tsc -b` and `eslint` pass on all of these. The preview server started and the login page loaded, but no dashboard has been viewed yet.
- Home (`/`): the control tower for people with `ANALYTICS_VIEW`, "My work" for everyone else. `/my-work`, and `/analytics/executive` redirects to `/`.
- Dashboards: control tower, finance, sales, projects, service, workforce (`/analytics/*`), each with a table view of every chart, loading/empty/error states, and links into the records behind the numbers.
- My work: follow-ups, project tasks, field jobs, tickets, collection calls, targets, assigned projects, each shown only if the role has that module.
- Sidebar entries for dashboards now need the same permissions as the API; header search is hidden for roles that cannot search.

## Open problems
1. **`GlobalSearchIT`: 4 of 6 cases fail with HTTP 500** on any real query. The permission checks in it (403 for vendor/partner) pass and `RbacMatrixIT` now passes. The cause of the 500 is not diagnosed: it may be an existing problem in the search SQL or something in the new code. Start with the server log in `target/failsafe-reports` for that test.
2. Playwright tests still expect the old "Overview" page (`e2e/admin.spec.ts:337`, `e2e/overview.spec.ts`); they have not been updated or re-run.
3. `vite build` and the Playwright suite have not been run since the frontend changes.

## Not started
- Redesign pass over the module pages (CRM, sales, projects, field operations, finance, service, workforce, vendors, documents, recruitment, rewards, admin hub): they pick up the new look from the shared primitives, but about 121 files still use raw Tailwind palette colours and 32 have their own status badges instead of `StatusBadge`.
- Pawan Pulse, Daily Brief and Ask Pawan pages still use the old components and API shapes.
- The Performance summary page should honour the new `tracked` flag.
- Mobile and tablet visual checks, accessibility pass, dark-mode check, a theme script in `index.html` to avoid a flash, review of dependency updates.

## Things to know
- **Secrets are committed** in the backend's profile files (a database password and a Cloudinary secret). Rotate them and move them to environment variables. They were not printed or used here.
- The local profile uses `ddl-auto: update`; migrations should be the only way the schema changes.
- No dependencies were added or upgraded.
- Running the integration tests here needed Docker or `-Dit.db.url=jdbc:postgresql://host:port/db -Dit.db.username=...`. On this machine they ran in a copy of the backend with an extra test-only Tomcat setting (`-Dit.tomcat.nio2=true`) because the sandbox blocks a socket type the default connector needs; that helper is not in your project.
- Still running from this session (mine): a local preview backend on port 8190 and an embedded PostgreSQL on port 54329. Your own servers (8085, 5173) were not touched. The temporary `.claude/launch.json` used for the browser preview has been removed.
