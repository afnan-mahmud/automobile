# Manual QA Checklist

Walk through every line below once, in order, against a real environment
(local dev against a real MongoDB Atlas cluster, then again against
production after Phase 14 deployment) before considering a release done.
Each line maps directly to an acceptance criterion in `docs/prompt.md`.

## Phase 0 — Project Scaffolding

- [ ] `npm run dev` starts with no errors.
- [ ] Visiting the app shows the dashboard layout with a sidebar containing
      links for every module (Job Cards, Customers, Invoices, Employees,
      Attendance, Salary, Stock, Accounts, Messages, Warranty Cards,
      Discount Cards).
- [ ] `lib/db.ts` connects successfully to a real MongoDB Atlas cluster.
- [ ] `npm run build` completes with zero TypeScript errors.

## Phase 1 — Auth & Roles

- [ ] `npx tsx scripts/seed-admin.ts` creates an admin user in MongoDB.
- [ ] Logging in with the seeded admin's credentials reaches `/dashboard`.
- [ ] Visiting `/dashboard` while logged out redirects to `/login`.
- [ ] An invalid password shows a visible error and does not redirect.
- [ ] The session's role is visible in a badge in the dashboard header.
- [ ] Sign out returns to `/login`; re-visiting `/dashboard` redirects again.

## Phase 2 — Customers & Vehicles

- [ ] Creating a customer with a duplicate phone number shows a clear error
      instead of a raw MongoDB duplicate-key exception.
- [ ] Searching by partial name or partial phone returns matching customers.
- [ ] Adding a vehicle to a customer immediately shows it in that customer's
      detail page vehicle table without a full page reload.
- [ ] A technician-role user cannot access `/customers` (server-side
      redirect, not just a hidden nav link).

## Phase 3 — Job Cards & Tasks

- [ ] Two job cards created back-to-back get sequential `jobCardNumber`s
      with no collisions.
- [ ] A technician can only mark their own assigned tasks complete;
      attempting `updateTaskStatus` for someone else's task is rejected
      server-side.
- [ ] Uploading a non-image file to `/api/uploads` is rejected with a clear
      error; a file over 5MB is also rejected.
- [ ] The job card detail page reflects task status changes without a full
      reload.

## Phase 4 — Invoices & PDF Generation

- [ ] Generating an invoice from a job card totals all tasks/parts.
- [ ] Editing an invoice's line items twice results in exactly 2 entries in
      `revisions[]` (verify in MongoDB).
- [ ] Downloading the PDF via `/api/invoices/[id]/pdf` produces a valid,
      openable PDF with correct totals.
- [ ] Marking an invoice paid updates its status and reflects immediately
      in the UI.

## Phase 5 — Employees, Attendance & Salary

- [ ] Marking attendance with `checkOut` earlier than `checkIn` is rejected
      with a validation error.
- [ ] An employee who works fewer hours than required for the month shows a
      positive `deduction`; one who works more shows `overtimeAmount`.
- [ ] Generating salary twice for the same employee/month/year updates the
      existing record rather than creating a duplicate.
- [ ] A technician can view their own attendance/salary; a request for
      another employee's data is rejected server-side.

## Phase 6 — Stock Management

- [ ] Concurrent `recordRetailSale` calls for the same product never push
      `quantityInStock` negative (see automated concurrency test).
- [ ] Adding parts to a job card that exceed available stock is rejected
      with an error naming the product and available quantity.
- [ ] The product detail page's transaction log shows both `retail_sale`
      and `job_card_usage` entries with correct signs; running total
      matches `quantityInStock`.
- [ ] Low-stock products are visually flagged on the stock list.

## Phase 7 — Accounts / Finance Dashboard

- [ ] A manager can create a manual expense entry, but calling
      `getFinanceDashboardSummary` as a manager is rejected server-side.
- [ ] The dashboard's total income matches the sum of all `income`-type
      transactions for the period (spot-check by manual sum).
- [ ] Outstanding dues equals the sum of totals from invoices with status
      `sent` or `partially_paid`.
- [ ] Filtering the transaction list by `paymentMethod=cash` shows only
      cash entries.

## Phase 8 — Live Job Tracking

- [ ] Opening a tracking link in a private/incognito window (no session
      cookie) successfully shows live job status.
- [ ] An unknown token returns a 404 page, not a stack trace or leaked
      data.
- [ ] Marking a task complete in the dashboard is reflected on an open
      tracking page within ~10 seconds without a manual refresh.
- [ ] Requesting `createTrackingLink` twice for the same job card returns
      the same token both times.

## Phase 9 — SMS Reminders

- [ ] Sending to a valid phone number with real/sandbox credentials logs a
      `MessageLog` with status `sent`.
- [ ] Simulating a provider failure (e.g. invalid `SMS_API_KEY`) still
      writes a `MessageLog` with status `failed` and shows a visible error
      in the UI — no unhandled exception.
- [ ] The log table shows the most recent sends first, filterable by
      customer.

## Phase 10 — Warranty Cards

- [ ] Attempting to issue a warranty card for a job card still `open` or
      `in_progress` is rejected with a clear error.
- [ ] The generated PDF opens correctly and lists the exact covered items
      entered in the form.
- [ ] A customer viewing their tracking link sees a warranty card section
      only if one has been issued for that job card.

## Phase 11 — Discount Cards

- [ ] Generating an invoice for a customer with an active discount card
      applies the correct `discountPercent` automatically.
- [ ] A discount card with `validTo` in the past is not applied to a new
      invoice and shows as "Expired" in the discount card list.
- [ ] Assigning a second active discount card to the same customer
      deactivates the prior one (documented behavior in
      `actions/discountCards.ts`).

## Phase 12 — Cross-Cutting: Task Carry-Forward

- [ ] A task with `assignedDate` of yesterday and status `pending`, after
      `carryForwardOverdueTasks()` runs, has its original marked
      `carried_forward` and a new `pending` task with today's date appears
      on the same job card.
- [ ] Running `carryForwardOverdueTasks()` twice in the same day does not
      double-carry the same task.
- [ ] The UI clearly distinguishes a carried-forward task (amber "Carried
      forward from &lt;date&gt;" badge) from a fresh one.

## Phase 13 — Testing Pass

- [ ] `npm test` runs all tests and they pass.
- [ ] The stock concurrency test fires overlapping `recordRetailSale`
      calls via `Promise.all` and asserts `quantityInStock` never goes
      negative and matches the expected total.
- [ ] `docs/qa-checklist.md` (this file) exists and covers every phase.

## Phase 14 — Deployment to VPS

- [ ] The production domain loads over HTTPS with a valid certificate.
- [ ] Logging in with the seeded admin account works end-to-end against
      the production MongoDB Atlas cluster.
- [ ] Uploading a job card photo in production is retrievable at its
      `/uploads` URL, served directly by Nginx (confirm via response
      headers that it bypasses the Node process).
- [ ] `pm2 restart` / a VPS reboot brings the app back up automatically
      (`pm2 startup` + `pm2 save` configured).
- [ ] Every line above passes again against the live production URL.
