# Dhaka Automobiles — System Architecture

## 1. Overview

Full-stack web-based business management system for Dhaka Automobiles (single-branch car workshop). Covers job card & invoicing, employee management (attendance + salary), stock management, accounts/finance, live job tracking, customer SMS reminders, warranty cards, and discount cards.

Source requirements: `project-info.md` (project root).

Related docs:
- [`database-schema.md`](./database-schema.md) — detailed MongoDB collection schemas
- [`api-structure.md`](./api-structure.md) — server actions / route handlers per module

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript. Note: v16 renamed `middleware.ts` to `proxy.ts` (exported function must be named `proxy`), and `params`/`searchParams` in pages, layouts, and route handlers are always `Promise`s that must be `await`ed. |
| Backend logic | Server Actions (internal mutations/queries) + Route Handlers (`/api/*`) for public/external endpoints |
| Database | MongoDB Atlas, Mongoose ODM |
| Auth | Auth.js (NextAuth), Credentials provider (email/phone + password), JWT session with `role` claim |
| Styling/UI | Tailwind CSS + shadcn/ui |
| PDF generation | `@react-pdf/renderer` — generated on-the-fly (invoice, warranty card, discount card), not stored |
| File uploads | Local VPS filesystem (`/uploads`), served via Next.js static/route handler |
| SMS | Abstraction layer `lib/sms.ts` wrapping a BD SMS gateway provider (provider chosen at implementation time) |
| Deployment | VPS — Nginx (reverse proxy + SSL via Let's Encrypt) → PM2-managed Next.js process. MongoDB stays on Atlas (cloud), not self-hosted. |

**Why this stack:** single-branch shop, small team — a Next.js monolith (frontend + backend in one deployable) avoids running/maintaining a separate API server on the VPS. TypeScript end-to-end gives type safety across Server Actions without needing a separate API contract layer (tRPC, REST schemas, etc.).

## 3. Roles & Permissions

Four roles: `admin`, `manager`, `technician`, and an unauthenticated **customer** who only accesses public token-based links (no login).

| Action | Admin | Manager | Technician | Customer (public link) |
|---|---|---|---|---|
| Job card / Invoice create-edit | ✅ | ✅ | ❌ | ❌ view-only via link |
| Employee profile, attendance, salary | ✅ | ✅ (mark attendance only) | ❌ view own only | ❌ |
| Stock management | ✅ | ✅ | ❌ | ❌ |
| Accounts/finance — record transaction | ✅ | ✅ | ❌ | ❌ |
| Accounts/finance — full dashboard/summary | ✅ | ❌ | ❌ | ❌ |
| Task assign | ✅ | ✅ | ❌ | ❌ |
| Task complete (own) | ✅ | ✅ | ✅ | ❌ |
| Warranty/Discount card issue | ✅ | ✅ | ❌ | ❌ view own card |
| SMS reminder send | ✅ | ✅ | ❌ | ❌ |
| Live tracking view | ✅ | ✅ | ✅ (own job) | ✅ (shareable link) |

Assumption: full finance dashboard (profit, dues summary) is admin-only; manager can still record day-to-day cash/expense entries. Flag this to revisit if incorrect.

## 4. Core Data Model (summary)

Full field-level schema in [`database-schema.md`](./database-schema.md). Collections:

`users`, `customers`, `vehicles`, `jobCards` (embedded `tasks[]`, `partsUsed[]`, `photos[]`), `invoices` (with `revisions[]`), `employees`, `attendanceRecords`, `salaryRecords`, `products`, `stockTransactions`, `accountTransactions`, `warrantyCards`, `discountCards`, `messageLogs`, `trackingLinks`.

## 5. Cross-cutting Logic

- **Task carry-forward:** a daily check (cron or lazy check-on-read) finds tasks still `pending`/`in_progress` past their assigned date; marks the original `carried_forward` and creates a new task entry dated today.
- **Salary calculation:** monthly batch job compares each `attendanceRecords` entry's `hoursWorked` against the employee's `requiredHoursPerDay` × working days; shortfall → deduction at hourly rate, excess → overtime pay. Result written to `salaryRecords`.
- **Stock deduction:** both retail sale and job-card part usage write a `stockTransactions` entry and atomically decrement `products.quantityInStock` (MongoDB `$inc`, no read-then-write race).
- **Invoice revision:** any job card change that affects billing creates a new entry in `invoices.revisions[]`, preserving prior versions; the customer-facing PDF always reflects the latest version.
- **Live tracking:** each job card can have a `trackingLinks` document with a random unique token. Public route `/track/[token]` (no auth) renders job status; client polls a JSON route handler every ~10s for updates — no WebSocket/SSE infra needed.
- **SMS reminders:** manual trigger only (no automated drip) — admin/manager selects a customer + template and sends via `lib/sms.ts`; every send is logged in `messageLogs` regardless of success/failure.

## 6. File/Image Handling

Vehicle photos (before/after), employee photos, and any job-related documents are uploaded via a Route Handler to the VPS local filesystem under `/uploads/<category>/<id>/filename`, referenced by relative path in MongoDB. No cloud storage service — keeps cost at zero, acceptable at single-branch scale. Revisit if disk usage or multi-server scaling becomes a concern.

## 7. Deployment

```
Customer/Staff Browser
        │
        ▼
     Nginx (SSL termination, reverse proxy)
        │
        ▼
  PM2 → Next.js app (single Node process)
        │
        ▼
  MongoDB Atlas (cloud, not on VPS)
```

Local `/uploads` directory lives on the VPS disk itself (persists across deploys as long as it's outside the build output directory).

## 8. Non-goals / Out of Scope (v1)

- Multi-branch/location support
- Online payment gateway integration (bKash/Nagad/card) — accounts module is manual entry only
- WhatsApp or email-based reminders — SMS only
- True real-time push (WebSocket/SSE) — polling is sufficient for live tracking
- Customer login/account system — customers only ever use unauthenticated shareable links
