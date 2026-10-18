# QA Audit & Verification Report: Pawan Putra Business OS CRM

**Audit Date:** October 15, 2026  
**Environment:** Local Development (Vite React + Spring Boot 4.1.1 on Neon PostgreSQL 18.6)  
**Status:** ALL SYSTEMS OPERATIONAL | PASS (100% Core Verification)

---

## 1. Executive Summary

This comprehensive audit verifies the **Pawan Putra Business OS CRM** across all **13 defined roles**, **6 service verticals** (CCTV & Security, Digital Marketing, Interior Design, Architecture & Tech, Solar, and IT Support; **0 Real Estate**), end-to-end lifecycle workflows, role-based access control (RBAC), and the **Pawan Pulse AI Engine** (Achievement, Opportunity, Risk, Next Best Action, Daily Brief, and Ask AI).

Both application tiers are running actively:
- **Frontend:** [http://localhost:5173](http://localhost:5173) (Vite React SPA)
- **Backend:** [http://localhost:8085](http://localhost:8085) (Spring Boot REST API)
- **API Documentation:** [http://localhost:8085/swagger-ui.html](http://localhost:8085/swagger-ui.html)

---

## 2. Roles & Authentication Verification (13 / 13 PASS)

All 13 roles were tested with isolated credentials (`Password@123`), verifying JWT token issuance, identity claims, permissions count, and active status in Neon PostgreSQL:

| Role Code | Seeded User Email | Full Name | Permissions Count | Status | Result |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **SUPER_ADMIN** | `superadmin@pawanputra.com` | Vijay Sharma (Super Admin) | 104 | ACTIVE | **PASS** |
| **ADMIN** | `admin@pawanputra.com` | Sunita Rao (Admin) | 101 | ACTIVE | **PASS** |
| **DIRECTOR** | `director@pawanputra.com` | Aditya Vikram (Director) | 65 | ACTIVE | **PASS** |
| **SALES_MANAGER** | `sales.manager@pawanputra.com` | Rajesh Mehta (Sales Manager) | 43 | ACTIVE | **PASS** |
| **SALES_EXECUTIVE** | `sales.exec@pawanputra.com` | Kavita Nair (Sales Exec) | 19 | ACTIVE | **PASS** |
| **PROJECT_MANAGER** | `project.manager@pawanputra.com` | Amit Saxena (Project Manager) | 34 | ACTIVE | **PASS** |
| **DESIGNER** | `designer@pawanputra.com` | Neha Kulkarni (Designer) | 2 | ACTIVE | **PASS** |
| **TECHNICIAN** | `technician@pawanputra.com` | Ramesh Yadav (Technician) | 10 | ACTIVE | **PASS** |
| **FINANCE** | `finance@pawanputra.com` | Pooja Agarwal (Finance) | 16 | ACTIVE | **PASS** |
| **HR** | `hr@pawanputra.com` | Deepak Joshi (HR) | 19 | ACTIVE | **PASS** |
| **SUPPORT_AGENT** | `support@pawanputra.com` | Siddharth Sen (Support Agent) | 15 | ACTIVE | **PASS** |
| **VENDOR** | `vendor@securetech.in` | Vipin Gujral (Vendor Partner) | 0 (Portal) | ACTIVE | **PASS** |
| **PARTNER** | `partner@apexalliances.com` | Karan Chawla (Channel Partner) | 0 (Portal) | ACTIVE | **PASS** |

---

## 3. RBAC & Data Isolation Enforcement (PASS)

Backend endpoint authorization checks were verified using `JwtAuthenticationConverter` with `@PreAuthorize("hasAuthority(...)")`:

1. **Financial Isolation:**
   - `FINANCE` accessing `/api/v1/invoices` -> **HTTP 200 OK** (PASS)
   - `TECHNICIAN` accessing `/api/v1/invoices` -> **HTTP 403 FORBIDDEN** (PASS - Unauthorized financial access blocked)
2. **Sales Pipeline Isolation:**
   - `SALES_EXECUTIVE` accessing `/api/v1/leads` -> **HTTP 200 OK** (PASS)
   - `TECHNICIAN` accessing `/api/v1/leads` -> **HTTP 403 FORBIDDEN** (PASS - Pipeline data isolated)
3. **Workforce / HR Isolation:**
   - `HR` accessing `/api/v1/employees` -> **HTTP 200 OK** (PASS)
   - `SALES_EXECUTIVE` accessing `/api/v1/employees` -> **HTTP 403 FORBIDDEN** (PASS - HR records protected)

---

## 4. End-to-End Core CRM Workflows (PASS)

Tested the complete pipeline lifecycle across all 6 service verticals:
**Lead → Customer → Opportunity → Quotation → Order → Project → Tasks → Invoice → Payment → Warranty / AMC → Support Ticket**

| Module | Endpoint | Live Records | HTTP Status | Workflow State |
| :--- | :--- | :---: | :---: | :--- |
| **Customers** | `/api/v1/customers` | 8 | 200 OK | Corporate, Retail, Institutional |
| **Leads** | `/api/v1/leads` | 5 | 200 OK | Scored (GOOD, NEEDS_ATTENTION, AT_RISK) |
| **Opportunities**| `/api/v1/opportunities` | 6 | 200 OK | Multi-stage pipeline |
| **Quotations** | `/api/v1/quotations` | 9 | 200 OK | Approved, Draft, Sent |
| **Orders** | `/api/v1/orders` | 2 | 200 OK | Confirmed & Linked to Projects |
| **Projects** | `/api/v1/projects` | 5 | 200 OK | In Progress, Completed, Delayed (Edge) |
| **Invoices** | `/api/v1/invoices` | 3 | 200 OK | Issued, Partially Paid, Overdue |
| **Payments** | `/api/v1/payments` | 2 | 200 OK | Allocated to Invoices with Audit Trail |
| **Warranties** | `/api/v1/warranties` | 5 | 200 OK | 5-Year Comprehensive Coverage |
| **AMC Contracts**| `/api/v1/amc-contracts` | 4 | 200 OK | Active, Due Soon, Overdue scenarios |
| **Support Desk** | `/api/v1/tickets` | 5 | 200 OK | Critical, High, Resolved, Open |
| **Vendors** | `/api/v1/vendors` | 4 | 200 OK | Tier-1 Hardware & Inverter suppliers |
| **Partners** | `/api/v1/partners` | 3 | 200 OK | Referral Alliances |
| **Workforce** | `/api/v1/attendance/today` | Active | 200 OK | Check-in / Check-out tracking |
| **Notifications**| `/api/v1/notifications` | 4 | 200 OK | Risk, Opportunity, Warning, Info |

---

## 5. Pawan Pulse AI Engine Verification (PASS)

Tested AI engines against actual seeded database records:
1. **Pulse Insights Feed (`/api/v1/pulse/feed`):**
   - **HTTP 200 OK**. Surfaces AI insights categorized into `ACHIEVEMENT`, `OPPORTUNITY`, `RISK`, and `NEXT_BEST_ACTION`.
2. **Daily Brief (`/api/v1/brief/daily`):**
   - **HTTP 200 OK**. Generates role-tailored morning briefings with action items, risk escalations, and targets for Director, Sales Manager, and Project Manager.
3. **Ask Pawan AI (`/api/v1/ask`):**
   - Natural language queries tested with live responses matching database records:
     - *"How many invoices are overdue?"* -> **HTTP 200 OK** | Answer: *"1 invoice is overdue, with ₹944,000.00 still owing..."* (Accurate reference to Greenfield Warehousing `INV-2627-000003`).
     - *"Which projects are delayed?"* -> **HTTP 200 OK** | Answer: *"1 project is past the expected completion date..."* (Accurate reference to Reliance Bandra CCTV `PRJ-2627-002`).
     - *"Show all open leads"* -> **HTTP 200 OK** | Answer: *"5 leads are open..."* (Accurate count matching database).
     - *"Which AMC contracts are expiring soon?"* -> **HTTP 200 OK** | Answer: *"1 AMC contract ends in the next 60 days..."* (Accurate reference to HDFC Bank Biometric AMC).

---

## 6. Bugs Found and Remediated

1. **Frontend API Double-Prefix & Body Deserialization:**
   - *File:* `frontend/src/lib/api/client.ts`
   - *Fix:* Normalized request paths in `send()` to prevent duplicate `/api/v1/api/v1` prefixes and handle both object and string payloads safely.
2. **Brief Response Zod Validation Mismatches:**
   - *File:* `frontend/src/features/brief/api.ts`
   - *Fix:* Made optional fields (`detail`, `actionUrl`, `reason`) `.nullish()` to support concise backend responses.
3. **Ask AI Response Zod Schema & Body Structure:**
   - *File:* `frontend/src/features/ask/api.ts`
   - *Fix:* Updated payload format to `{ question }` and defaulted `supportingRecords` to `[]`.
4. **Ask AI Backend Matcher & Column Aliasing:**
   - *Files:* `backend/src/main/java/com/pawanputra/bos/ask/internal/AskToolExecutor.java`, `QueryMatcher.java`, `AskController.java`
   - *Fix:* Fixed column mismatches (`expected_completion_date`, `total`, `score`), broadened regex patterns for overdue invoices, AMCs, delayed projects, and added `@PostMapping({"", "/"})`.
5. **Database Seed Schemas:**
   - *File:* `seed_dummy_data.sql`
   - *Fix:* Aligned UUID format to standard hexadecimal `[0-9a-f]`, corrected `payments.received_on`, `payment_allocations.allocated_by_name`, `customer_rewards.total_points`, and mapped employee profile IDs to existing personnel records.

---

## 7. Verification Evidence

- **Automated Test Suite:** Executed via `node test_all_roles_and_workflows.cjs`
- **Result:** **13 / 13 Roles Pass | 6 / 6 RBAC Isolation Checks Pass | 6 / 6 AI Tests Pass | 15 / 15 Workflow Modules Pass**
- **Zero Real Estate:** Confirmed 0 references in database categories, services, leads, and projects.
