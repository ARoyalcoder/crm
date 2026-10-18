# Pawan Putra Business OS

Business operating system (CRM + operations) for a multi-vertical service company.

**Six business verticals:** CCTV & Security · Digital Marketing · Interior Design · Architecture & Tech · Solar · IT Support

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, TanStack Table, React Hook Form, Zod, Tailwind CSS 4, shadcn/ui, Recharts, Lucide |
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA, Bean Validation, Flyway, Actuator, springdoc OpenAPI |
| Data | PostgreSQL, Redis, MinIO / S3-compatible object storage |
| Infrastructure | Docker, Docker Compose, Nginx |
| Testing | JUnit 5, Mockito, ArchUnit, Testcontainers, REST Assured, Playwright, k6 |

## Modules

| # | Module | Description |
| --- | --- | --- |
| 1 | **Identity & Access** | Users, roles, permissions, JWT auth, `@PreAuthorize` guards |
| 2 | **Organization** | Branches with location filtering |
| 3 | **Service Catalog** | Verticals → categories → services; billing types; site-visit flag |
| 4 | **Custom Fields** | Per-service lead fields configured by admins, rendered dynamically |
| 5 | **Customers** | Customer 360: health score, unified timeline, call/meeting log |
| 6 | **Leads** | Qualification scoring, priority, health, status pipeline |
| 7 | **Activities & Tasks** | Calls, meetings, follow-ups linked to customers/leads |
| 8 | **Opportunities** | Pipeline management, stage tracking, win/loss |
| 9 | **Quotations** | Quote builder, approval workflow, PDF generation |
| 10 | **Orders** | Order management linked to approved quotations |
| 11 | **Projects** | Project tracking with templates, milestones and phases |
| 12 | **Project Analytics** | Pipeline stages, delivery metrics, project dashboard |
| 13 | **Field Jobs** | Technician scheduling, job cards, proof-of-work, customer sign-off |
| 14 | **Invoices & Payments** | Invoice lifecycle, payment allocation, credit/debit notes |
| 15 | **Finance Ageing** | Ageing buckets for outstanding receivables |
| 16 | **Receivables** | Dashboard, outstanding, overdue, collection tasks |
| 17 | **Service Contracts (AMC)** | Annual maintenance contracts, renewal tracking, scheduled visits |
| 18 | **Warranties** | Product warranty tracking and expiry alerts |
| 19 | **Support Desk** | Ticket creation, assignment, SLA enforcement, resolution |
| 20 | **Workforce** | Employee profiles, attendance, my-profile view |
| 21 | **Performance** | Individual/team targets, actual-vs-target dashboards |
| 22 | **Commissions** | Commission rule engine, records, approval and payout |
| 23 | **Vendors & Partners** | Vendor scorecard, partner organisation management |
| 24 | **Documents** | File upload/download with MinIO, per-entity document tabs |
| 25 | **Notifications** | In-app notification centre, per-user preferences |
| 26 | **Workflow Rules** | Event-driven automation (conditions + actions), execution log |
| 27 | **Recruitment** | Job openings, candidates, applications, interview tracking |
| 28 | **Rewards** | Achievement rules, leaderboard, customer loyalty points |
| 29 | **Analytics** | Executive, sales, project, finance, service and workforce dashboards |
| 30 | **Customer Intelligence** | Health scores, CLV, segments, AI-powered score explanations |
| 31 | **Pawan Pulse** | AI insight feed: risks, opportunities, next-best-actions |
| 32 | **Admin Hub** | Unified admin dashboard linking all configuration areas |
| 33 | **Audit Log** | Tamper-evident audit trail for every write operation |
| 34 | **Integrations** | External service configuration and status management |

## Quick start

Prerequisites: JDK 21+, Node 22+, Docker.

```bash
cp .env.example .env            # local credentials for the containers
docker compose up -d            # PostgreSQL, Redis, MinIO

cd backend && ./mvnw spring-boot:run     # API on http://localhost:8080
cd frontend && npm install && npm run dev # UI on http://localhost:5173
```

- UI: <http://localhost:5173>
- API docs (local only): <http://localhost:8080/swagger-ui.html>
- Health: <http://localhost:8080/actuator/health>

Run everything in containers: `docker compose --profile app up -d --build` → <http://localhost:8088>

## Repository layout

```
backend/        Spring Boot modular monolith
frontend/       React SPA + Nginx config
perf/k6/        Load/smoke test scripts
docs/           Architecture and conventions
docker-compose.yml, .env.example
```

## Verifying a change

```bash
cd backend && ./mvnw verify
cd frontend && npm run lint && npm run build && npm run test:e2e
cd frontend && npm run test:e2e:text      # reads every text on every page and in the source; report in frontend/all-text-report/
```

## Documentation

See `docs/` for architecture, database, security, API conventions, and per-module guides.
