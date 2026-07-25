# API / Route Structure

Companion to [`architecture.md`](./architecture.md) and [`database-schema.md`](./database-schema.md).

Internal mutations/queries (used from the app's own UI) are **Server Actions** — no separate REST contract needed since caller and callee are both TypeScript in the same app. **Route Handlers** (`/api/*`) are used only where an external/public/non-React-tree consumer needs a URL: auth, file upload, PDF download, the public tracking link, and SMS.

Role column shows who **can call** the action; Server Actions must re-check `session.role` server-side regardless of what the UI hides.

## Auth

| Route | Method | Purpose | Role |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js credential login/session/logout | public (login form) |

## Customers & Vehicles

| Action | Purpose | Role |
|---|---|---|
| `createCustomer` | add new customer | admin, manager |
| `updateCustomer` | edit customer details | admin, manager |
| `searchCustomers` | search by name/phone | admin, manager |
| `createVehicle` | add vehicle under a customer | admin, manager |
| `updateVehicle` | edit vehicle details | admin, manager |
| `getCustomerWithVehicles` | fetch customer + linked vehicles | admin, manager |

## Job Cards & Tasks

| Action/Route | Purpose | Role |
|---|---|---|
| `createJobCard` | new job card for a vehicle, initial task list | admin, manager |
| `updateJobCardStatus` | change status (open/in_progress/completed/delivered) | admin, manager |
| `addTask` | add a task to an existing job card | admin, manager |
| `updateTaskStatus` | mark own task complete/in-progress | admin, manager, technician (own task only — checked server-side against `assignedTo`) |
| `addPartsUsed` | record parts consumed on a job card → triggers stock deduction | admin, manager |
| `listJobCards` | list/filter job cards | admin, manager |
| `getJobCardById` | full job card detail | admin, manager, technician (own assigned) |
| `POST /api/uploads` | upload job card photo (before/after) to `/uploads` | admin, manager |

## Invoices

| Action/Route | Purpose | Role |
|---|---|---|
| `generateInvoiceFromJobCard` | create invoice from a job card's line items | admin, manager |
| `updateInvoice` | edit line items — pushes old version into `revisions[]` | admin, manager |
| `markInvoicePaid` | update payment status → creates `accountTransactions` entry | admin, manager |
| `GET /api/invoices/[id]/pdf` | stream generated invoice PDF (`@react-pdf/renderer`) | admin, manager (signed URL or session-checked) |

## Employees, Attendance, Salary

| Action | Purpose | Role |
|---|---|---|
| `createEmployee` / `updateEmployee` | manage employee profile | admin |
| `markAttendance` | record daily check-in/check-out | admin, manager |
| `getAttendanceByEmployee` | attendance history for one employee | admin, manager, technician (own only) |
| `generateSalaryForMonth` | batch-calculate salary for all/one employee for a month | admin |
| `getSalaryRecord` | view a salary record | admin, technician (own only) |
| `getEmployeeWorkReport` | tasks completed + attendance summary | admin, manager, technician (own only) |

## Stock

| Action | Purpose | Role |
|---|---|---|
| `createProduct` / `updateProduct` | manage product catalog | admin, manager |
| `recordRetailSale` | sell a product directly → decrements stock, creates `stockTransactions` + `accountTransactions` | admin, manager |
| `recordStockPurchase` | stock-in from supplier purchase | admin, manager |
| `listProducts` | product list with current stock levels | admin, manager |
| `getStockTransactions` | audit log for a product | admin, manager |

## Accounts

| Action | Purpose | Role |
|---|---|---|
| `createAccountTransaction` | manual income/expense entry | admin, manager |
| `listAccountTransactions` | filterable transaction list | admin, manager |
| `getFinanceDashboardSummary` | totals: sales, profit, dues, expenses by category | admin only |

## Live Tracking

| Action/Route | Purpose | Role |
|---|---|---|
| `createTrackingLink` | generate/regenerate a shareable token for a job card | admin, manager |
| `GET /api/track/[token]` | public JSON status endpoint, polled client-side (~10s) | public (no auth) |
| `/track/[token]` (page) | public page rendering live task progress | public (no auth) |

## Messages (SMS)

| Action | Purpose | Role |
|---|---|---|
| `sendReminderMessage` | send an SMS to a customer via `lib/sms.ts`, logs to `messageLogs` regardless of outcome | admin, manager |
| `listMessageLogs` | view send history | admin, manager |

## Warranty Card

| Action/Route | Purpose | Role |
|---|---|---|
| `createWarrantyCard` | issue warranty card for a completed job card | admin, manager |
| `GET /api/warranty/[id]/pdf` | generated warranty card PDF | admin, manager; customer via tracking link |

## Discount Card

| Action | Purpose | Role |
|---|---|---|
| `createDiscountCard` | assign a fixed discount % to a customer | admin, manager |
| `updateDiscountCard` | edit terms/validity | admin, manager |
| `listDiscountCards` | view all discount cards | admin, manager |

## Cross-cutting background logic (not user-triggered routes)

| Job | Trigger | Purpose |
|---|---|---|
| Task carry-forward | daily cron (or lazy check on job-card read) | moves incomplete tasks to the next day, marks original `carried_forward` |
| Salary generation | manual trigger (`generateSalaryForMonth`) — not automatic | keeps admin in control of when payroll is finalized |
