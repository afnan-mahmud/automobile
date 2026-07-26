# Dhaka Automobiles — Build Prompts (Scaffolding → Deployment)

This file contains one detailed, self-contained prompt per build phase. Paste them into an AI coding assistant **one at a time, in order** — each phase assumes every earlier phase is already built and working.

Every prompt assumes the assistant has read (or will read) these three files first:
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/api-structure.md`

Do not skip phases — later phases reference models, Server Actions, and routes created in earlier ones by exact name.

---

## Phase 0 — Project Scaffolding

```
Set up a new Next.js 14+ App Router project in TypeScript for a car workshop
management system called "Dhaka Automobiles". Read docs/architecture.md,
docs/database-schema.md, and docs/api-structure.md first for full context.

Requirements:
1. Initialize Next.js with TypeScript, App Router, Tailwind CSS, ESLint.
2. Install and configure shadcn/ui (init it, add button, input, form, table,
   card, dialog, dropdown-menu, badge, select, tabs components).
3. Install: mongoose, next-auth (Auth.js v5), bcryptjs, @react-pdf/renderer,
   nanoid, zod, react-hook-form, @hookform/resolvers.
4. Create this folder structure:
   - app/(auth)/login/page.tsx
   - app/(dashboard)/layout.tsx  — authenticated shell with sidebar nav
   - app/(dashboard)/dashboard/page.tsx — placeholder home after login
   - app/track/[token]/page.tsx — public route, no auth, empty for now
   - lib/db.ts — MongoDB connection helper (cached connection for
     serverless/dev hot-reload, using MONGODB_URI env var)
   - lib/auth.ts — Auth.js config (built out in Phase 1)
   - models/ — one file per Mongoose model, added phase by phase
   - actions/ — one file per domain for Server Actions (e.g. actions/customers.ts)
   - components/ — shared UI components
   - types/ — shared TypeScript types
5. Create .env.example with: MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL.
   Create .env.local (gitignored) with placeholder values for local dev.
6. Set up lib/db.ts to connect to MongoDB Atlas via Mongoose, with a cached
   global connection pattern so Next.js dev server hot-reload doesn't open
   duplicate connections.
7. Initialize git, add a sensible .gitignore (node_modules, .env.local,
   .next, /uploads), make an initial commit.
8. Add npm scripts: dev, build, start, lint.

Acceptance criteria:
- `npm run dev` starts with no errors.
- Visiting the app shows a blank dashboard layout with a sidebar containing
  placeholder links: Customers, Job Cards, Invoices, Employees, Stock,
  Accounts, Tracking, Messages, Warranty Cards, Discount Cards.
- lib/db.ts successfully connects to a real MongoDB Atlas cluster (test
  with a temporary console.log connection check, then remove it).
- Project builds with `npm run build` with zero TypeScript errors.
```

---

## Phase 1 — Auth & Roles

```
Implement authentication and role-based access for the Dhaka Automobiles
system, on top of the Phase 0 scaffold. Reference docs/database-schema.md
for the `users` collection shape and docs/architecture.md section 3 for the
permission matrix.

Requirements:
1. Create models/User.ts (Mongoose schema): name, email (unique, sparse),
   phone (unique, sparse), passwordHash, role (enum: admin, manager,
   technician), employeeId (ObjectId ref Employee, optional, nullable for
   now since Employee model doesn't exist until Phase 5), active (default true).
2. Configure lib/auth.ts with Auth.js v5, Credentials provider:
   - Accepts either email or phone + password.
   - Looks up user in MongoDB, verifies password with bcryptjs.
   - On success, JWT session includes: id, name, role.
3. Add proxy.ts (Next.js 16 renamed `middleware.ts` to `proxy.ts` — export a
   function named `proxy`, not `middleware`) that protects all routes under
   app/(dashboard)/* — redirect to /login if unauthenticated. app/track/[token]/*
   stays public.
4. Build app/(auth)/login/page.tsx: email/phone + password form
   (react-hook-form + zod validation), calls Auth.js signIn, shows error on
   failure, redirects to /dashboard on success.
5. Add a `requireRole(allowedRoles: Role[])` server-side helper in lib/auth.ts
   that Server Actions can call to throw an authorization error if the
   current session's role isn't in the allowed list. Every Server Action in
   every later phase must call this at the top of the function.
6. Write a one-off seed script (scripts/seed-admin.ts, run via
   `npx tsx scripts/seed-admin.ts`) that creates a single admin user from
   env vars SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, for first-time setup.
7. Add a sign-out button in the dashboard layout header, showing the
   logged-in user's name and role badge.

Acceptance criteria:
- Running the seed script creates an admin user in MongoDB.
- Logging in with that admin's credentials reaches /dashboard.
- Visiting /dashboard while logged out redirects to /login.
- An invalid password shows a visible error, does not redirect.
- Session's role is visible in a badge in the dashboard header.
- Sign out returns to /login and re-visiting /dashboard redirects again.
```

---

## Phase 2 — Customers & Vehicles - Completed

```
Build the Customer and Vehicle management module. Reference
docs/database-schema.md for the `customers` and `vehicles` schemas and
docs/api-structure.md's "Customers & Vehicles" section for the required
Server Actions.

Requirements:
1. Create models/Customer.ts and models/Vehicle.ts per the schema doc,
   with the specified unique indexes (phone on Customer, registrationNumber
   on Vehicle).
2. Create actions/customers.ts with Server Actions: createCustomer,
   updateCustomer, searchCustomers, getCustomerWithVehicles. Each must call
   requireRole(['admin','manager']) first (from Phase 1's lib/auth.ts) and
   validate input with zod before writing to MongoDB.
3. Create actions/vehicles.ts with createVehicle, updateVehicle — same
   auth + validation pattern, require an existing customerId.
4. Build UI pages:
   - app/(dashboard)/customers/page.tsx — searchable, paginated customer
     list (search by name or phone).
   - app/(dashboard)/customers/new/page.tsx — create customer form.
   - app/(dashboard)/customers/[id]/page.tsx — customer detail, showing
     their vehicles in a table, with an "Add Vehicle" dialog.
5. Use shadcn/ui Table, Dialog, Form, Input, Button components throughout.
   Show inline validation errors from zod.

Acceptance criteria:
- Creating a customer with a duplicate phone number shows a clear error
  instead of a raw MongoDB duplicate-key exception.
- Searching by partial name or partial phone returns matching customers.
- Adding a vehicle to a customer immediately shows it in that customer's
  detail page vehicle table without a full page reload.
- A technician-role user cannot access /customers (server-side redirect or
  403 — not just a hidden nav link).
```

---

## Phase 3 — Job Cards & Tasks - Completed

```
Build the Job Card module — the core workflow of the system. Reference
docs/database-schema.md's `jobCards` schema (including the embedded `tasks`
and `partsUsed` subdocuments) and docs/api-structure.md's "Job Cards & Tasks"
section.

Requirements:
1. Create models/JobCard.ts with the embedded tasks[] and partsUsed[]
   subdocument schemas exactly as specified in database-schema.md. Include
   photos[] as specified, referencing files that will exist once Phase 3's
   upload route is built. jobCardNumber must auto-generate as a unique
   sequential string (e.g. "JC-000123") — implement via a MongoDB counter
   document (models/Counter.ts) incremented atomically with findOneAndUpdate.
2. Create actions/jobCards.ts: createJobCard (requires an existing
   vehicleId), updateJobCardStatus, addTask, updateTaskStatus, listJobCards,
   getJobCardById. updateTaskStatus must check that a technician caller is
   only updating a task where task.assignedTo matches their own
   session.employeeId — reject otherwise even though the button may be
   hidden client-side.
3. Create app/api/uploads/route.ts — a POST Route Handler accepting
   multipart form data, saving the file to /uploads/job-cards/<jobCardId>/
   on the VPS filesystem, returning the relative path to be stored in the
   job card's photos[] array. Reject non-image mime types and files over 5MB.
4. Build UI:
   - app/(dashboard)/job-cards/page.tsx — list with status filter tabs
     (open/in_progress/completed/delivered).
   - app/(dashboard)/job-cards/new/page.tsx — pick/search a vehicle
     (reusing Phase 2's search), add initial task list.
   - app/(dashboard)/job-cards/[id]/page.tsx — full detail: task list with
     status badges, assign-task dialog (admin/manager), "mark complete"
     button visible only to the assigned technician or admin/manager,
     photo upload widget, parts-used section (UI only for now — actual
     stock deduction wiring happens in Phase 6, so for now just store
     partsUsed entries on the job card).

Acceptance criteria:
- Two job cards created back-to-back get sequential jobCardNumbers with no
  collisions (test by creating several in quick succession).
- A technician can only mark their own assigned tasks complete; attempting
  to hit updateTaskStatus for someone else's task via a manually crafted
  call is rejected server-side.
- Uploading a non-image file is rejected with a clear error.
- Job card detail page reflects task status changes without full reload.
```

---

## Phase 4 — Invoices & PDF Generation - Completed

```
Build the Invoice module, generated from a Job Card, with PDF export and
revision history. Reference docs/database-schema.md's `invoices` schema and
docs/api-structure.md's "Invoices" section.

Requirements:
1. Create models/Invoice.ts per the schema doc, including the revisions[]
   array. invoiceNumber auto-generates via the same Counter pattern as
   jobCardNumber from Phase 3 (e.g. "INV-000123").
2. Create actions/invoices.ts: generateInvoiceFromJobCard (pulls tasks/parts
   from the given job card into lineItems, applies a discountPercent if the
   customer has an active discount card — leave a TODO-free stub function
   `getActiveDiscountForCustomer` returning 0 for now, to be wired for real
   in Phase 11), updateInvoice (must push the current lineItems/total into
   revisions[] before applying changes), markInvoicePaid (creates an
   accountTransactions-shaped record — for now insert directly into a
   temporary accountTransactions collection using the schema from
   database-schema.md; Phase 7 will build the full module around it).
3. Build a PDF template component using @react-pdf/renderer showing:
   business name/header, invoice number, customer + vehicle info, line
   items table, subtotal/discount/total, warranty note placeholder text
   ("See attached warranty card if applicable").
4. Create app/api/invoices/[id]/pdf/route.ts — Route Handler that fetches
   the invoice, renders the PDF component to a buffer, and streams it back
   with Content-Type: application/pdf.
5. Build UI:
   - app/(dashboard)/invoices/page.tsx — list with status filter.
   - app/(dashboard)/invoices/[id]/page.tsx — line item table, edit dialog
     (triggers updateInvoice + revision), "Download PDF" button linking to
     the Route Handler, "Mark Paid" action with payment method selector.

Acceptance criteria:
- Generating an invoice from a job card correctly totals all tasks/parts.
- Editing an invoice's line items preserves the previous version in
  revisions[] — verify by editing twice and inspecting the document in
  MongoDB (revisions[] should have 2 entries).
- Downloading the PDF produces a valid, openable PDF with correct totals.
- Marking an invoice paid updates its status and is reflected in the UI
  immediately.
```

---

## Phase 5 — Employees, Attendance & Salary - Completed

```
Build Employee profiles, daily attendance, and automatic salary calculation.
Reference docs/database-schema.md's `employees`, `attendanceRecords`, and
`salaryRecords` schemas, and docs/api-structure.md's corresponding section.

Requirements:
1. Create models/Employee.ts, models/AttendanceRecord.ts (compound unique
   index on employeeId+date), models/SalaryRecord.ts (compound unique index
   on employeeId+month+year) — exactly per database-schema.md.
2. Now that Employee exists, update models/User.ts's employeeId field to
   properly reference it, and update the seed script / add a
   createEmployee flow that optionally creates a linked User login for
   manager/technician roles.
3. Create actions/employees.ts: createEmployee, updateEmployee,
   markAttendance (computes hoursWorked from checkIn/checkOut),
   getAttendanceByEmployee (technician role restricted to their own
   employeeId), getEmployeeWorkReport (combines completed tasks from
   JobCard.tasks where assignedTo = employeeId, plus attendance summary,
   for a given date range).
4. Create actions/salary.ts: generateSalaryForMonth(employeeId, month, year)
   — sums attendanceRecords for that employee/month, compares
   totalHoursWorked against requiredHoursPerDay * workingDaysInMonth,
   computes deduction (shortfall * hourlyRate) or overtimeAmount (excess *
   hourlyRate), writes a SalaryRecord. Also generateSalaryForAllEmployees
   for batch admin use. getSalaryRecord (technician restricted to own).
5. Build UI:
   - app/(dashboard)/employees/page.tsx — employee list.
   - app/(dashboard)/employees/[id]/page.tsx — profile, attendance history
     table, work report, salary history.
   - app/(dashboard)/attendance/page.tsx — daily attendance marking grid
     (all active employees, check-in/check-out time pickers) for
     admin/manager.
   - app/(dashboard)/salary/page.tsx — admin-only, month/year picker,
     "Generate Salary" button, resulting salary table.

Acceptance criteria:
- Marking attendance with checkOut earlier than checkIn is rejected with a
  validation error.
- An employee who works fewer hours than required for the month shows a
  positive `deduction` in their generated SalaryRecord; one who works more
  shows `overtimeAmount` instead.
- Generating salary twice for the same employee/month/year updates the
  existing record rather than creating a duplicate (respect the compound
  unique index — use upsert).
- A technician logged in can view their own attendance/salary but a request
  for another employee's data is rejected server-side.
```

---

## Phase 6 — Stock Management - Completed

```
Build Product/Stock management, wired into both retail sales and Job Card
part usage from Phase 3. Reference docs/database-schema.md's `products` and
`stockTransactions` schemas and docs/api-structure.md's "Stock" section.

Requirements:
1. Create models/Product.ts (unique index on sku) and
   models/StockTransaction.ts per the schema doc.
2. Create actions/stock.ts: createProduct, updateProduct,
   recordStockPurchase (type: purchase_in, positive quantity, increments
   Product.quantityInStock), recordRetailSale (type: retail_sale, negative
   quantity, decrements Product.quantityInStock, and inserts an
   accountTransactions-shaped income record same as Phase 4 did for
   invoices), listProducts, getStockTransactions. All stock quantity
   changes MUST use MongoDB's atomic $inc operator directly on
   Product.quantityInStock (no read-modify-write) to avoid race conditions,
   and must reject if the resulting quantity would go negative (use a
   conditional filter in the update: quantityInStock >= requested amount).
3. Go back to actions/jobCards.ts from Phase 3: when partsUsed[] is added
   or modified on a job card, call the same atomic stock-decrement logic
   and write a stockTransactions entry with type job_card_usage and
   relatedJobCardId set. If a requested quantity exceeds available stock,
   reject the partsUsed update with a clear "insufficient stock" error.
4. Build UI:
   - app/(dashboard)/stock/page.tsx — product list with current quantity,
     low-stock highlighting (quantityInStock <= reorderLevel), "Add
     Product" and "Record Purchase" dialogs.
   - app/(dashboard)/stock/[id]/page.tsx — product detail with its full
     stockTransactions audit log.
   - A "Sell Item" quick-action on the stock list for retail sales.

Acceptance criteria:
- Two near-simultaneous recordRetailSale calls for the same product never
  push quantityInStock negative (test by firing concurrent requests).
- Adding parts to a job card that exceeds available stock is rejected with
  a specific error naming the product and available quantity.
- The product detail page's transaction log shows both retail_sale and
  job_card_usage entries with correct signs and running total matches
  quantityInStock.
- Low-stock products are visually flagged on the stock list.
```

---

## Phase 7 — Accounts / Finance Dashboard - Completed

```
Build the full Accounts module — manual transaction entry plus an
admin-only finance dashboard aggregating everything recorded so far (from
invoices in Phase 4 and stock sales in Phase 6). Reference
docs/database-schema.md's `accountTransactions` schema and
docs/api-structure.md's "Accounts" section.

Requirements:
1. Create models/AccountTransaction.ts per the schema doc. Migrate the
   temporary direct-insert logic from Phase 4 (markInvoicePaid) and Phase 6
   (recordRetailSale) to use this real model instead of ad-hoc inserts.
2. Create actions/accounts.ts: createAccountTransaction (manual entry for
   expenses like operational costs or product purchases not already
   covered by Phase 6's recordStockPurchase), listAccountTransactions
   (filterable by date range, type, category, paymentMethod),
   getFinanceDashboardSummary (admin only — aggregate via MongoDB
   aggregation pipeline: total income by category, total expense by
   category, breakdown by paymentMethod, net profit, and outstanding dues
   computed as sum of unpaid/partially_paid invoice totals).
3. Build UI:
   - app/(dashboard)/accounts/page.tsx — transaction list with filters, a
     manual "Add Transaction" dialog for admin/manager.
   - app/(dashboard)/accounts/dashboard/page.tsx — admin-only. Cards for
     total sales, total profit, outstanding dues, cash/bank/mobile-banking
     split, and a simple bar or line chart (recharts) of income vs expense
     over the last 30 days.
   - Enforce the admin-only restriction server-side in
     getFinanceDashboardSummary, and redirect non-admins away from
     /accounts/dashboard.

Acceptance criteria:
- A manager can create a manual expense entry but hitting
  getFinanceDashboardSummary directly as a manager is rejected server-side.
- The dashboard's total income matches the sum of all accountTransactions
  with type income for the selected period (spot-check by manual sum).
- Outstanding dues equals the sum of totals from invoices with status
  sent or partially_paid.
- Filtering the transaction list by paymentMethod=cash shows only cash
  entries.
```

---

## Phase 8 — Live Job Tracking - Completed

```
Build the public, no-login shareable tracking link for customers. Reference
docs/database-schema.md's `trackingLinks` schema and docs/api-structure.md's
"Live Tracking" section.

Requirements:
1. Create models/TrackingLink.ts (unique index on token) per the schema
   doc. Generate tokens with nanoid (already installed in Phase 0).
2. Create actions/tracking.ts: createTrackingLink(jobCardId) — admin/manager
   only, idempotent (if a live token already exists for the job card,
   return it instead of creating a duplicate).
3. Create app/api/track/[token]/route.ts — public GET Route Handler, no
   auth, looks up the TrackingLink by token, returns a JSON summary of the
   linked job card: vehicle info, task list with statuses, overall percent
   complete, last updated timestamp. Return 404 for an unknown/expired token
   without leaking any other job card data.
4. Build app/track/[token]/page.tsx — public page (already scaffolded empty
   in Phase 0), server-rendered initial state, then a client component that
   polls the Route Handler above every 10 seconds and re-renders task
   progress (a progress bar + task checklist), no login required, no
   dashboard chrome/sidebar.
5. Add a "Copy Tracking Link" button to the Job Card detail page (Phase 3)
   that calls createTrackingLink and copies the full public URL to the
   clipboard.

Acceptance criteria:
- Opening the tracking link in a private/incognito browser (no session
  cookie) successfully shows live job status.
- An unknown token returns a 404 page, not a stack trace or leaked data.
- Marking a task complete in the dashboard (Phase 3) is reflected on the
  open tracking page within ~10 seconds without the customer refreshing.
- Requesting createTrackingLink twice for the same job card returns the
  same token both times.
```

---

## Phase 9 — SMS Reminders - Completed

```
Build the manual customer SMS reminder feature. Reference
docs/database-schema.md's `messageLogs` schema and docs/api-structure.md's
"Messages (SMS)" section, and docs/architecture.md's note that
lib/sms.ts is an abstraction over a chosen BD SMS gateway provider.

Requirements:
1. Create models/MessageLog.ts per the schema doc.
2. Create lib/sms.ts exporting a single async function
   `sendSms(phone: string, message: string): Promise<{ success: boolean;
   providerResponse?: unknown; error?: string }>`. Implement it against one
   concrete BD SMS gateway provider's HTTP API (read the provider's API key
   from an env var SMS_API_KEY / SMS_SENDER_ID) — if no real provider
   credentials are available yet, implement it for a specific named
   provider's documented API shape and leave the API key unset in
   .env.example, so swapping in real credentials later requires no code
   change.
3. Create actions/messages.ts: sendReminderMessage(customerId, message,
   relatedJobCardId?) — calls lib/sms.ts, writes a MessageLog with status
   sent or failed based on the result, regardless of outcome.
   listMessageLogs (filterable by customer).
4. Build UI:
   - app/(dashboard)/messages/page.tsx — customer search/select, message
     textarea with a couple of quick-fill templates ("Your vehicle is
     ready for pickup", "Payment reminder: outstanding balance of ৳X"),
     send button, and a log table below showing recent sends with status.

Acceptance criteria:
- Sending to a valid phone number with real/sandbox credentials logs a
  MessageLog with status "sent".
- Simulating a provider failure (e.g. invalid API key) still writes a
  MessageLog with status "failed" and a visible error in the UI — it must
  not throw an unhandled exception.
- The log table shows the most recent sends first, filterable by customer.
```

---

## Phase 10 — Warranty Cards - Completed

```
Build the digital Warranty Card feature tied to completed Job Cards.
Reference docs/database-schema.md's `warrantyCards` schema and
docs/api-structure.md's "Warranty Card" section.

Requirements:
1. Create models/WarrantyCard.ts per the schema doc, cardNumber
   auto-generated via the Counter pattern from Phase 3/4 (e.g. "WC-000123").
2. Create actions/warranty.ts: createWarrantyCard(jobCardId, coveredItems,
   startDate, endDate, terms) — admin/manager only, requires the job card
   status to be completed or delivered. getWarrantyCardByJobCard.
3. Build a PDF template (reuse the @react-pdf/renderer setup from Phase 4)
   showing: business header, card number, customer + vehicle info, covered
   items list, warranty period, terms text.
4. Create app/api/warranty/[id]/pdf/route.ts — same streaming pattern as
   Phase 4's invoice PDF route.
5. Build UI:
   - Add a "Issue Warranty Card" button on the Job Card detail page
     (Phase 3), enabled only when status is completed/delivered.
   - app/(dashboard)/warranty-cards/page.tsx — list of issued cards.
   - Add the warranty card (view + PDF link) to the public tracking page
     from Phase 8, if one exists for that job card.

Acceptance criteria:
- Attempting to issue a warranty card for a job card still "open" or
  "in_progress" is rejected with a clear error.
- The generated PDF opens correctly and lists the exact covered items
  entered in the form.
- A customer viewing their tracking link (Phase 8) sees a warranty card
  section only if one has been issued for that job card.
```

---

## Phase 11 — Discount Cards - Completed

```
Build the Discount Card feature and wire it into real invoice generation
(replacing Phase 4's stubbed getActiveDiscountForCustomer). Reference
docs/database-schema.md's `discountCards` schema and
docs/api-structure.md's "Discount Card" section.

Requirements:
1. Create models/DiscountCard.ts per the schema doc.
2. Create actions/discountCards.ts: createDiscountCard, updateDiscountCard,
   listDiscountCards — admin/manager only.
3. Replace the stub in actions/invoices.ts (getActiveDiscountForCustomer)
   with a real implementation: find an active DiscountCard for the
   customer where today's date falls within validFrom/validTo (or validTo
   is null), return its discountPercent (0 if none found).
4. Build UI:
   - app/(dashboard)/discount-cards/page.tsx — list, "Assign Discount
     Card" dialog on a customer, showing active/expired status per card.
   - On the Customer detail page (Phase 2), show any active discount card
     badge.

Acceptance criteria:
- Generating an invoice for a customer with an active discount card
  applies the correct discountPercent automatically without manual entry.
- A discount card with validTo in the past is not applied to a new
  invoice, and shows as "expired" in the discount card list.
- Assigning a second active discount card to the same customer either
  replaces the prior one or is rejected — pick one behavior and document
  it in a comment at the top of actions/discountCards.ts.
```

---

## Phase 12 — Cross-Cutting: Task Carry-Forward - Completed

```
Implement the task carry-forward rule described in docs/architecture.md
section 5, wiring it into the Job Card module from Phase 3.

Requirements:
1. Create lib/taskCarryForward.ts exporting a function
   `carryForwardOverdueTasks()` that scans all jobCards with tasks where
   status is pending or in_progress and assignedDate is before today: marks
   the original task carried_forward and pushes a new task subdocument with
   the same description/assignedTo, assignedDate = today, status pending.
2. Wire this to run automatically once per day — implement as a scheduled
   check: on every request to the job cards list/dashboard, lazily run
   carryForwardOverdueTasks() if it hasn't run yet today (store a
   lastRunDate in a small system-settings collection to avoid re-running it
   on every request). Document in a code comment why a lazy check was
   chosen over a real cron (no background worker infra on the VPS by
   default) and how to swap it for a real cron job (e.g. node-cron or a
   system crontab hitting a dedicated route) later if needed.
3. Surface carried-forward tasks distinctly in the Job Card detail UI
   (Phase 3) — e.g. an amber "Carried forward from <date>" badge.

Acceptance criteria:
- A task with assignedDate of yesterday and status pending, after
  carryForwardOverdueTasks() runs, has its original marked
  carried_forward and a new pending task with today's date appears in the
  same job card.
- Running carryForwardOverdueTasks() twice in the same day does not
  double-carry the same task (idempotent within a day).
- The UI clearly distinguishes a carried-forward task from a fresh one.
```

---

## Phase 13 — Testing Pass - Completed

```
Add automated tests across the modules built in Phases 1-12, plus a manual
QA checklist. Use Vitest + React Testing Library for unit/component tests,
and a lightweight integration test setup using mongodb-memory-server for
Server Actions that hit the database.

Requirements:
1. Install vitest, @testing-library/react, @testing-library/jest-dom,
   mongodb-memory-server, and configure vitest.config.ts for the Next.js
   project (path aliases matching tsconfig.json).
2. Write integration tests (using mongodb-memory-server, not a real Atlas
   cluster) for the highest-risk logic:
   - Stock atomic decrement never goes negative under concurrent calls
     (Phase 6).
   - Salary calculation deduction/overtime math for a few representative
     attendance patterns (Phase 5).
   - Invoice revision history correctly preserves prior versions
     (Phase 4).
   - Task carry-forward idempotency within the same day (Phase 12).
   - Role enforcement: a technician-role call to an admin/manager-only
     action is rejected (spot-check a few actions across modules).
3. Write component tests for at least: the login form (Phase 1), job card
   task list rendering with status badges (Phase 3), and the public
   tracking page's polling behavior (Phase 8, mock the fetch).
4. Add an npm script `test` and `test:watch`.
5. Write a manual QA checklist as docs/qa-checklist.md covering every
   Phase's acceptance criteria from this prompt file as a flat checklist,
   for a human to walk through once before deployment.

Acceptance criteria:
- `npm test` runs all tests and they pass.
- The stock concurrency test genuinely fires overlapping requests (e.g.
  Promise.all of multiple recordRetailSale calls) and asserts the final
  quantityInStock never goes negative and matches expected total.
- docs/qa-checklist.md exists and every phase above has at least one
  corresponding checklist line.
```

---

## Phase 14 — Deployment to VPS - Completed (artifacts only; no live VPS access)

```
Deploy the completed application to a production VPS per
docs/architecture.md section 7 (Nginx → PM2 → Next.js, MongoDB Atlas cloud).

Requirements:
1. Write a production environment checklist: real MONGODB_URI (Atlas,
   with the VPS's IP added to Atlas's network access list), a strong
   NEXTAUTH_SECRET, real NEXTAUTH_URL (the production domain), real
   SMS_API_KEY/SMS_SENDER_ID, SEED_ADMIN_EMAIL/PASSWORD for the one-time
   admin seed.
2. On the VPS: install Node.js (matching the project's engines version),
   install PM2 globally, clone the repo, create /uploads with correct
   write permissions outside the Next.js build output directory.
3. Write an ecosystem.config.js for PM2 (app name, script: npm start or a
   built server.js, instances, env production settings, log paths).
4. Write nginx site config: reverse proxy to the PM2-managed port (e.g.
   3000), client_max_body_size increased to allow the photo uploads from
   Phase 3, and a location block for serving /uploads directly from disk
   for performance instead of proxying through Next.js.
5. Set up SSL via certbot (Let's Encrypt) for the production domain,
   confirm auto-renewal is configured.
6. Write a deploy script (deploy.sh) that: pulls latest git, npm ci,
   npm run build, pm2 reload ecosystem.config.js --env production.
7. Run the seed-admin script once against the production database.
8. Walk through docs/qa-checklist.md from Phase 13 against the live
   production URL.

Acceptance criteria:
- The production domain loads over HTTPS with a valid certificate.
- Logging in with the seeded admin account works end-to-end against the
  production MongoDB Atlas cluster.
- Uploading a job card photo in production is retrievable at its
  /uploads URL, served directly by Nginx (confirm via response headers
  that it's not passing through the Node process).
- pm2 restart / a VPS reboot brings the app back up automatically (confirm
  pm2 startup + pm2 save is configured).
- Every line in docs/qa-checklist.md passes against the live deployment.
```
