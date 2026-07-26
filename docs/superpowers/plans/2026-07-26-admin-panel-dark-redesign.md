# Admin Panel Dark Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole Dhaka Automobiles admin panel (shell + every module page) to a dark, purple-accented theme matching a reference "FoCar" dashboard screenshot, with a light/dark toggle and a mobile-friendly slide-in nav drawer, plus a real role-aware dashboard home page.

**Architecture:** Token-driven restyle. Every existing page already uses shadcn/Tailwind semantic CSS variables (`bg-card`, `text-muted-foreground`, etc.) rather than hardcoded colors, so most of the app inherits the new palette automatically once `app/globals.css`'s tokens change. New shared components (sidebar, header, mobile drawer, stat card) carry the bespoke visual polish; a handful of existing files get direct edits to replace their few hardcoded colors with the new semantic tokens.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 + shadcn (`base-nova` style, Base UI primitives), `next-themes` (new dependency) for the theme toggle, `recharts` (already a dependency) for charts/sparklines, `lucide-react` (already a dependency) for icons.

## Global Constraints

- This is a **visual/presentational redesign only** — no Server Action, data model, or business-logic change. The existing 14 automated tests (`npm test`) must keep passing unmodified.
- `npm run build`, `npm run lint`, and `npm test` must all stay green after every task.
- Follow the existing conventions already established in the codebase: Server Actions return `ActionResult<T>` / plain data, client components are marked `"use client"`, shared UI primitives live in `components/ui/`, domain-specific enum/type constants that a client component needs live in `types/*.ts` (never import a Mongoose model file — which pulls in the `mongoose` driver — from a `"use client"` file; this bug has bitten this codebase before).
- Follow BASE UI composition patterns already used in `components/ui/dialog.tsx` (e.g. `<Trigger render={<Button>...</Button>} />` with no separate children on the trigger itself).
- Keep every existing route, role guard, and nav `href` unchanged — this plan only touches presentation.

---

### Task 1: Rewrite the theme tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: two new CSS custom properties, `--success` and `--warning` (plus their `@theme inline` exposure as `--color-success` / `--color-warning`, which makes Tailwind utilities like `bg-success`, `text-success`, `border-success` available everywhere), on top of the existing token set. Later tasks (2, 4, 10, 12, 13, 14, 15, 16, 18) depend on these utilities existing.
- Produces: dark-by-default near-black/purple palette in `.dark`, and a purple `--primary` in both `:root` and `.dark` for brand consistency.
- Produces: a `.force-light` class that pins the light-mode variable values regardless of an ancestor `.dark` class — used by Task 18 for the public tracking page.

- [ ] **Step 1: Replace the full token block**

Replace the entire contents of `app/globals.css` with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.55 0.19 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --success: oklch(0.6 0.14 155);
  --warning: oklch(0.7 0.15 80);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.7 0.12 180);
  --chart-2: oklch(0.78 0.15 80);
  --chart-3: oklch(0.55 0.19 292);
  --chart-4: oklch(0.7 0.15 340);
  --chart-5: oklch(0.65 0.15 230);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.55 0.19 292);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.14 0.005 285);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.19 0.006 285);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.19 0.006 285);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.62 0.19 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.24 0.01 285);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.24 0.01 285);
  --muted-foreground: oklch(0.65 0.01 285);
  --accent: oklch(0.26 0.02 285);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.65 0.2 25);
  --success: oklch(0.72 0.16 155);
  --warning: oklch(0.78 0.15 80);
  --border: oklch(1 0 0 / 8%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.62 0.19 292 / 50%);
  --chart-1: oklch(0.7 0.12 180);
  --chart-2: oklch(0.78 0.15 80);
  --chart-3: oklch(0.62 0.19 292);
  --chart-4: oklch(0.7 0.15 340);
  --chart-5: oklch(0.65 0.15 230);
  --sidebar: oklch(0.12 0.006 285);
  --sidebar-foreground: oklch(0.92 0 0);
  --sidebar-primary: oklch(0.62 0.19 292);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.22 0.01 285);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: oklch(0.62 0.19 292 / 50%);
}

/*
 * Forces the light-mode token values regardless of an ancestor `.dark`
 * class. Used only by the public, no-login tracking page
 * (app/track/[token]/tracking-view.tsx), which stays light/neutral even
 * when staff have the dashboard in dark mode, since customers view it on
 * arbitrary devices. Keeps the brand purple `--primary` either way.
 */
.force-light {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.55 0.19 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --success: oklch(0.6 0.14 155);
  --warning: oklch(0.7 0.15 80);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds (Tailwind will regenerate utilities like `bg-success`/`text-success`/`bg-warning`/`text-warning` automatically from the new `--color-success`/`--color-warning` tokens — no other config file needs touching).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite theme tokens for dark purple palette + success/warning colors"
```

---

### Task 2: Add `success`/`warning` variants to the Badge component

**Files:**
- Modify: `components/ui/badge.tsx`

**Interfaces:**
- Consumes: `bg-success`, `text-success`, `bg-warning`, `text-warning` Tailwind utilities from Task 1.
- Produces: `<Badge variant="success">` and `<Badge variant="warning">`, used by Task 4's `lib/statusBadge.ts` return type and every task that applies it (12, 14, 15, 16, 18).

- [ ] **Step 1: Add the two variants**

In `components/ui/badge.tsx`, inside the `variants.variant` object of `badgeVariants`, add two entries right after the existing `destructive` entry:

```ts
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-success/10 text-success focus-visible:ring-success/20 dark:bg-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20",
```

- [ ] **Step 2: Verify types/build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "feat: add success/warning Badge variants"
```

---

### Task 3: Add `lib/chartColors.ts`

**Files:**
- Create: `lib/chartColors.ts`

**Interfaces:**
- Produces: `CHART_COLORS` object with literal hex color constants (recharts sets these as raw SVG `stroke`/`fill` attributes, which can't consume Tailwind classes or CSS custom properties reliably across browsers, so literal hex values are used, chosen to visually match the oklch tokens from Task 1). Consumed by Task 10 (`StatCard`), Task 12 (dashboard charts), and Task 13 (`income-expense-chart.tsx`).

- [ ] **Step 1: Create the file**

```ts
/**
 * Literal hex constants for recharts, which renders colors as raw SVG
 * stroke/fill attributes rather than CSS classes — it can't consume
 * Tailwind utilities or var(--token) references reliably across browsers.
 * Chosen to visually match the oklch tokens in app/globals.css.
 */
export const CHART_COLORS = {
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  chart1: "#2dd4bf",
  chart2: "#f59e0b",
  chart3: "#8b5cf6",
  chart4: "#ec4899",
  chart5: "#3b82f6",
} as const;
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/chartColors.ts
git commit -m "feat: add shared chart color constants"
```

---

### Task 4: Add `lib/statusBadge.ts` with unit tests

**Files:**
- Create: `lib/statusBadge.ts`
- Test: `tests/unit/statusBadge.test.ts`

**Interfaces:**
- Consumes: `JobCardStatus`/`TaskStatus` from `@/types/jobCard`, `InvoiceStatus` from `@/types/invoice`.
- Produces: `type BadgeVariant`, and functions `jobCardStatusVariant(status: JobCardStatus): BadgeVariant`, `taskStatusVariant(status: TaskStatus): BadgeVariant`, `invoiceStatusVariant(status: InvoiceStatus): BadgeVariant`, `messageStatusVariant(status: "sent" | "failed" | "pending"): BadgeVariant`, `positiveNegativeVariant(isPositive: boolean): BadgeVariant`, `lowStockVariant(isLow: boolean): BadgeVariant`. Consumed by Tasks 12, 14, 15, 16, 18.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/statusBadge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  jobCardStatusVariant,
  taskStatusVariant,
  invoiceStatusVariant,
  messageStatusVariant,
  positiveNegativeVariant,
  lowStockVariant,
} from "@/lib/statusBadge";

describe("statusBadge", () => {
  it("maps job card statuses to badge variants", () => {
    expect(jobCardStatusVariant("open")).toBe("outline");
    expect(jobCardStatusVariant("in_progress")).toBe("warning");
    expect(jobCardStatusVariant("completed")).toBe("success");
    expect(jobCardStatusVariant("delivered")).toBe("success");
  });

  it("maps task statuses to badge variants", () => {
    expect(taskStatusVariant("pending")).toBe("outline");
    expect(taskStatusVariant("in_progress")).toBe("warning");
    expect(taskStatusVariant("completed")).toBe("success");
    expect(taskStatusVariant("carried_forward")).toBe("warning");
  });

  it("maps invoice statuses to badge variants", () => {
    expect(invoiceStatusVariant("draft")).toBe("outline");
    expect(invoiceStatusVariant("sent")).toBe("warning");
    expect(invoiceStatusVariant("paid")).toBe("success");
    expect(invoiceStatusVariant("partially_paid")).toBe("warning");
  });

  it("maps message statuses to badge variants", () => {
    expect(messageStatusVariant("sent")).toBe("success");
    expect(messageStatusVariant("failed")).toBe("destructive");
    expect(messageStatusVariant("pending")).toBe("outline");
  });

  it("maps a boolean positive/negative flag to a badge variant", () => {
    expect(positiveNegativeVariant(true)).toBe("success");
    expect(positiveNegativeVariant(false)).toBe("destructive");
  });

  it("maps a low-stock flag to a badge variant", () => {
    expect(lowStockVariant(true)).toBe("warning");
    expect(lowStockVariant(false)).toBe("outline");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/statusBadge.test.ts`
Expected: FAIL — `Cannot find module '@/lib/statusBadge'`.

- [ ] **Step 3: Write the implementation**

Create `lib/statusBadge.ts`:

```ts
import type { JobCardStatus, TaskStatus } from "@/types/jobCard";
import type { InvoiceStatus } from "@/types/invoice";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export function jobCardStatusVariant(status: JobCardStatus): BadgeVariant {
  switch (status) {
    case "open":
      return "outline";
    case "in_progress":
      return "warning";
    case "completed":
    case "delivered":
      return "success";
  }
}

export function taskStatusVariant(status: TaskStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "outline";
    case "in_progress":
      return "warning";
    case "completed":
      return "success";
    case "carried_forward":
      return "warning";
  }
}

export function invoiceStatusVariant(status: InvoiceStatus): BadgeVariant {
  switch (status) {
    case "draft":
      return "outline";
    case "sent":
      return "warning";
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
  }
}

export function messageStatusVariant(
  status: "sent" | "failed" | "pending"
): BadgeVariant {
  switch (status) {
    case "sent":
      return "success";
    case "failed":
      return "destructive";
    case "pending":
      return "outline";
  }
}

export function positiveNegativeVariant(isPositive: boolean): BadgeVariant {
  return isPositive ? "success" : "destructive";
}

export function lowStockVariant(isLow: boolean): BadgeVariant {
  return isLow ? "warning" : "outline";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/statusBadge.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/statusBadge.ts tests/unit/statusBadge.test.ts
git commit -m "feat: add status-to-badge-variant mapping helpers"
```

---

### Task 5: Add `next-themes`, theme provider, and theme toggle

**Files:**
- Create: `components/theme-provider.tsx`
- Create: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `<ThemeProvider>` (wraps the app, defaults to dark), `<ThemeToggle />` (sun/moon icon button). Consumed by Task 8 (`dashboard-header.tsx`).

- [ ] **Step 1: Install the dependency**

Run: `npm install next-themes`

- [ ] **Step 2: Create the provider wrapper**

Create `components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: Create the toggle button**

Create `components/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 4: Wire the provider into the root layout**

Replace the full contents of `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dhaka Automobiles",
  description: "Workshop business management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/theme-provider.tsx components/theme-toggle.tsx app/layout.tsx
git commit -m "feat: add dark-default theme provider and toggle"
```

---

### Task 6: Add a `Sheet` (slide-in drawer) component

**Files:**
- Create: `components/ui/sheet.tsx`

**Interfaces:**
- Produces: `<Sheet>`, `<SheetTrigger>`, `<SheetContent>` — same Base UI `Dialog` primitive `components/ui/dialog.tsx` already uses, repositioned to slide in from the left edge instead of centering. Consumed by Task 8 (`dashboard-header.tsx`, mobile nav drawer).

- [ ] **Step 1: Create the component**

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground shadow-lg outline-none duration-200 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

export { Sheet, SheetTrigger, SheetContent }
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "feat: add Sheet slide-in drawer component"
```

---

### Task 7: Restyle `components/dashboard-nav.tsx` with icons and a purple active pill

**Files:**
- Modify: `components/dashboard-nav.tsx`

**Interfaces:**
- Produces: same `<DashboardNav role={role} />` component and prop signature as before (no breaking change) — now renders an icon per item, a "Dashboard" link at the top (new), and a filled purple pill for the active item. Consumed unchanged by Task 9 (desktop sidebar) and Task 8 (mobile drawer, same component reused as-is).

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Users,
  FileText,
  UserCog,
  CalendarCheck,
  Wallet,
  Package,
  Landmark,
  MessageSquare,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/models/User";

const navItems: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "technician"] },
  { href: "/job-cards", label: "Job Cards", icon: Wrench, roles: ["admin", "manager", "technician"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "manager"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["admin", "manager"] },
  { href: "/employees", label: "Employees", icon: UserCog, roles: ["admin"] },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["admin", "manager"] },
  { href: "/salary", label: "Salary", icon: Wallet, roles: ["admin"] },
  { href: "/stock", label: "Stock", icon: Package, roles: ["admin", "manager"] },
  { href: "/accounts", label: "Accounts", icon: Landmark, roles: ["admin", "manager"] },
  { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["admin", "manager"] },
  { href: "/warranty-cards", label: "Warranty Cards", icon: ShieldCheck, roles: ["admin", "manager"] },
  { href: "/discount-cards", label: "Discount Cards", icon: Tag, roles: ["admin", "manager"] },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (this component is currently only used inside `app/(dashboard)/layout.tsx`, which Task 9 rewrites next — a transient unused-import or layout mismatch here is expected and resolved by Task 9).

- [ ] **Step 3: Commit**

```bash
git add components/dashboard-nav.tsx
git commit -m "style: add icons and purple active pill to sidebar nav"
```

---

### Task 8: Build `components/dashboard-header.tsx`

**Files:**
- Create: `components/dashboard-header.tsx`

**Interfaces:**
- Consumes: `<Sheet>`/`<SheetTrigger>`/`<SheetContent>` (Task 6), `<ThemeToggle />` (Task 5), `<DashboardNav role={role} />` (Task 7).
- Produces: `<DashboardHeader role={role} />` — mobile hamburger + slide-in nav drawer, cosmetic search input, cosmetic notification bell, theme toggle. Consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "@/components/dashboard-nav";
import type { Role } from "@/models/User";

export function DashboardHeader({ role }: { role: Role }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent>
          <div className="border-b border-sidebar-border px-4 py-4">
            <span className="font-semibold text-sidebar-foreground">Dhaka Automobiles</span>
          </div>
          <DashboardNav role={role} />
        </SheetContent>
      </Sheet>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search here..." className="pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (not yet imported anywhere — resolved by Task 9).

- [ ] **Step 3: Commit**

```bash
git add components/dashboard-header.tsx
git commit -m "feat: add dashboard header with mobile nav drawer"
```

---

### Task 9: Restructure `app/(dashboard)/layout.tsx`

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `<DashboardHeader role={role} />` (Task 8), `<DashboardNav role={role} />` (Task 7), existing `<SignOutButton />`.
- Produces: same page-content contract as before (`children` slot) — every existing module page under `app/(dashboard)/*` needs no change to keep working inside this shell.

- [ ] **Step 1: Replace the file**

```tsx
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session!.user.role;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <span className="font-semibold text-sidebar-foreground">Dhaka Automobiles</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav role={role} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {session?.user?.name}
            </p>
            <Badge variant="secondary" className="mt-1">
              {role}
            </Badge>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader role={role} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, log in as admin, confirm: dark sidebar with purple active pill on the left at desktop width; at a narrow width (resize browser below ~768px) the sidebar disappears and a hamburger button appears in the header that opens a slide-in drawer with the same nav + backdrop; sidebar bottom shows name + role badge + sign-out button.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: restructure dashboard shell with mobile drawer and sidebar user chip"
```

---

### Task 10: Build `components/stat-card.tsx`

**Files:**
- Create: `components/stat-card.tsx`

**Interfaces:**
- Consumes: `CHART_COLORS` (Task 3), existing `Card`/`Badge` primitives.
- Produces: `<StatCard title value trend? sparkline? sparklineColor? />` where `trend` is `{ label: string; positive: boolean }` and `sparkline` is `{ value: number }[]`. Consumed by Tasks 12 and 13. When `sparkline` is omitted or has fewer than 2 points, no chart renders — used for point-in-time counts (e.g. Outstanding Dues) that have no natural time series; this is intentional, not a missing feature.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/lib/chartColors";

export type StatCardProps = {
  title: string;
  value: string;
  trend?: { label: string; positive: boolean };
  sparkline?: { value: number }[];
  sparklineColor?: string;
};

export function StatCard({
  title,
  value,
  trend,
  sparkline,
  sparklineColor = CHART_COLORS.chart3,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {trend && (
          <Badge variant={trend.positive ? "success" : "destructive"}>{trend.label}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sparkline && sparkline.length > 1 && (
          <div className="mt-3 h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  fill={sparklineColor}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/stat-card.tsx
git commit -m "feat: add reusable StatCard component with optional sparkline"
```

---

### Task 11: Add `actions/dashboard.ts` with integration tests

**Files:**
- Create: `actions/dashboard.ts`
- Test: `tests/integration/dashboard-aggregations.test.ts`

**Interfaces:**
- Consumes: `JobCard`/`JOB_CARD_STATUSES` (`@/models/JobCard`), `Invoice` (`@/models/Invoice`), `requireRole`/`auth` (`@/lib/auth`).
- Produces: `getJobCardStatusBreakdown(): Promise<{status: JobCardStatus; count: number}[]>` (admin/manager/technician), `getTopServicedVehicles(limit = 5): Promise<{vehicleId, registrationNumber, customerName, jobCardCount, lastServiceDate, lifetimeSpend}[]>` (admin/manager), `getTechnicianDashboard(): Promise<{pending: number; completedThisWeek: number; recentJobCards: JobCardSummary[]}>` (technician only, throws `Error("Unauthorized")` otherwise) where `JobCardSummary` has the same shape as `listJobCards()`'s rows (`_id, jobCardNumber, status, vehicle, customer, taskTotal, taskCompleted, createdAt`). Consumed by Task 12.

- [ ] **Step 1: Write the failing tests**

Create `tests/integration/dashboard-aggregations.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { JobCard } from "@/models/JobCard";
import { Vehicle } from "@/models/Vehicle";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import {
  getJobCardStatusBreakdown,
  getTopServicedVehicles,
  getTechnicianDashboard,
} from "@/actions/dashboard";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("getJobCardStatusBreakdown", () => {
  it("counts job cards per status, including zero for statuses with no cards", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    await JobCard.create({ jobCardNumber: "JC-1", vehicleId, customerId, status: "open" });
    await JobCard.create({ jobCardNumber: "JC-2", vehicleId, customerId, status: "open" });
    await JobCard.create({ jobCardNumber: "JC-3", vehicleId, customerId, status: "completed" });

    const breakdown = await getJobCardStatusBreakdown();
    const byStatus = Object.fromEntries(breakdown.map((b) => [b.status, b.count]));

    expect(byStatus.open).toBe(2);
    expect(byStatus.completed).toBe(1);
    expect(byStatus.in_progress).toBe(0);
    expect(byStatus.delivered).toBe(0);
  });
});

describe("getTopServicedVehicles", () => {
  it("ranks vehicles by job-card count and sums lifetime spend from paid invoices", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const customer = await Customer.create({ name: "Karim", phone: "01711111111" });
    const vehicle = await Vehicle.create({
      customerId: customer._id,
      registrationNumber: "DHA-1234",
    });

    const jobCard1 = await JobCard.create({
      jobCardNumber: "JC-1",
      vehicleId: vehicle._id,
      customerId: customer._id,
      status: "delivered",
    });
    const jobCard2 = await JobCard.create({
      jobCardNumber: "JC-2",
      vehicleId: vehicle._id,
      customerId: customer._id,
      status: "delivered",
    });

    await Invoice.create({
      invoiceNumber: "INV-1",
      jobCardId: jobCard1._id,
      customerId: customer._id,
      lineItems: [],
      subtotal: 1000,
      discountAmount: 0,
      total: 1000,
      status: "paid",
    });
    await Invoice.create({
      invoiceNumber: "INV-2",
      jobCardId: jobCard2._id,
      customerId: customer._id,
      lineItems: [],
      subtotal: 500,
      discountAmount: 0,
      total: 500,
      status: "partially_paid",
    });

    const results = await getTopServicedVehicles();

    expect(results).toHaveLength(1);
    expect(results[0].registrationNumber).toBe("DHA-1234");
    expect(results[0].jobCardCount).toBe(2);
    expect(results[0].lifetimeSpend).toBe(1500);
  });
});

describe("getTechnicianDashboard", () => {
  it("counts pending tasks and this-week completions for the caller's own employeeId only", async () => {
    await connectToDatabase();
    const myEmployeeId = new mongoose.Types.ObjectId();
    const otherEmployeeId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    await JobCard.create({
      jobCardNumber: "JC-1",
      vehicleId,
      customerId,
      tasks: [
        {
          description: "My pending task",
          assignedTo: myEmployeeId,
          status: "pending",
          assignedDate: new Date(),
        },
        {
          description: "Someone else's task",
          assignedTo: otherEmployeeId,
          status: "pending",
          assignedDate: new Date(),
        },
        {
          description: "My completed task",
          assignedTo: myEmployeeId,
          status: "completed",
          assignedDate: new Date(),
          completedDate: new Date(),
        },
      ],
    });

    setMockSession({
      user: {
        id: "507f1f77bcf86cd799439012",
        role: "technician",
        employeeId: myEmployeeId.toString(),
      },
    });

    const result = await getTechnicianDashboard();

    expect(result.pending).toBe(1);
    expect(result.completedThisWeek).toBe(1);
    expect(result.recentJobCards).toHaveLength(1);
  });

  it("rejects a non-technician session", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await expect(getTechnicianDashboard()).rejects.toThrow("Unauthorized");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/integration/dashboard-aggregations.test.ts`
Expected: FAIL — `Cannot find module '@/actions/dashboard'`.

- [ ] **Step 3: Write the implementation**

Create `actions/dashboard.ts`:

```ts
"use server";

import { auth, requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { JobCard, JOB_CARD_STATUSES, type JobCardStatus } from "@/models/JobCard";
import { Invoice } from "@/models/Invoice";
import "@/models/Vehicle";
import "@/models/Customer";

export async function getJobCardStatusBreakdown() {
  await requireRole(["admin", "manager", "technician"]);
  await connectToDatabase();

  const counts = await JobCard.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  return JOB_CARD_STATUSES.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
  }));
}

export async function getTopServicedVehicles(limit = 5) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const rows = await JobCard.aggregate([
    {
      $group: {
        _id: "$vehicleId",
        jobCardCount: { $sum: 1 },
        lastServiceDate: { $max: "$createdAt" },
      },
    },
    { $sort: { jobCardCount: -1 } },
    { $limit: limit },
    { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "vehicle" } },
    { $unwind: "$vehicle" },
    {
      $lookup: {
        from: "customers",
        localField: "vehicle.customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
  ]);

  const spendByVehicle = await Invoice.aggregate([
    { $match: { status: { $in: ["paid", "partially_paid"] } } },
    { $lookup: { from: "jobcards", localField: "jobCardId", foreignField: "_id", as: "jobCard" } },
    { $unwind: "$jobCard" },
    { $group: { _id: "$jobCard.vehicleId", totalSpend: { $sum: "$total" } } },
  ]);
  const spendMap = new Map(
    spendByVehicle.map((s) => [s._id.toString(), s.totalSpend as number])
  );

  const combined = rows.map((r) => ({
    vehicleId: r._id.toString(),
    registrationNumber: r.vehicle.registrationNumber as string,
    customerName: r.customer.name as string,
    jobCardCount: r.jobCardCount as number,
    lastServiceDate: r.lastServiceDate,
    lifetimeSpend: spendMap.get(r._id.toString()) ?? 0,
  }));

  combined.sort((a, b) =>
    b.jobCardCount !== a.jobCardCount
      ? b.jobCardCount - a.jobCardCount
      : b.lifetimeSpend - a.lifetimeSpend
  );

  return serialize(combined);
}

export async function getTechnicianDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.employeeId) {
    throw new Error("Unauthorized");
  }
  await connectToDatabase();

  const employeeId = session.user.employeeId;
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const jobCards = await JobCard.find({ "tasks.assignedTo": employeeId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("vehicleId", "registrationNumber")
    .populate("customerId", "name")
    .lean();

  let pending = 0;
  let completedThisWeek = 0;
  for (const jc of jobCards) {
    for (const task of jc.tasks) {
      if (task.assignedTo?.toString() !== employeeId) continue;
      if (task.status === "pending" || task.status === "in_progress") pending += 1;
      if (
        task.status === "completed" &&
        task.completedDate &&
        task.completedDate >= startOfWeek
      ) {
        completedThisWeek += 1;
      }
    }
  }

  const recentJobCards = jobCards.slice(0, 5).map((jc) => ({
    _id: jc._id,
    jobCardNumber: jc.jobCardNumber,
    status: jc.status as JobCardStatus,
    vehicle: jc.vehicleId,
    customer: jc.customerId,
    taskTotal: jc.tasks.length,
    taskCompleted: jc.tasks.filter((t: { status: string }) => t.status === "completed").length,
    createdAt: jc.createdAt,
  }));

  return serialize({ pending, completedThisWeek, recentJobCards });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/integration/dashboard-aggregations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests (previous 14 + new 6 + this task's 4 = 24) pass.

- [ ] **Step 6: Commit**

```bash
git add actions/dashboard.ts tests/integration/dashboard-aggregations.test.ts
git commit -m "feat: add dashboard aggregation actions (status breakdown, top vehicles, technician summary)"
```

---

### Task 12: Rebuild the dashboard home page with role-aware content

**Files:**
- Create: `app/(dashboard)/dashboard/job-card-status-chart.tsx`
- Create: `app/(dashboard)/dashboard/recent-job-cards-panel.tsx`
- Create: `app/(dashboard)/dashboard/top-vehicles-table.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `StatCard` (Task 10), `CHART_COLORS` (Task 3), `jobCardStatusVariant` (Task 4), `getJobCardStatusBreakdown`/`getTopServicedVehicles`/`getTechnicianDashboard` (Task 11), existing `getFinanceDashboardSummary`/`getDailyIncomeExpense` (`@/actions/accounts`), existing `listJobCards` (`@/actions/jobCards`), existing `listProducts` (`@/actions/stock`).

- [ ] **Step 1: Create the status chart**

`app/(dashboard)/dashboard/job-card-status-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chartColors";

type StatusRow = { status: string; count: number };

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

export function JobCardStatusChart({ data }: { data: StatusRow[] }) {
  const chartData = data.map((d) => ({
    label: STATUS_LABEL[d.status] ?? d.status,
    count: d.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Card Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS.chart3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the recent job cards panel**

`app/(dashboard)/dashboard/recent-job-cards-panel.tsx`:

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { jobCardStatusVariant } from "@/lib/statusBadge";
import type { JobCardStatus } from "@/types/jobCard";

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

type JobCardRow = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  vehicle: { registrationNumber: string } | null;
  customer: { name: string } | null;
};

export function RecentJobCardsPanel({ jobCards }: { jobCards: JobCardRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Job Cards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobCards.length === 0 && (
          <p className="text-sm text-muted-foreground">No job cards yet.</p>
        )}
        {jobCards.map((jc) => (
          <Link
            key={jc._id}
            href={`/job-cards/${jc._id}`}
            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent"
          >
            <div>
              <p className="font-medium">{jc.jobCardNumber}</p>
              <p className="text-muted-foreground">
                {jc.vehicle?.registrationNumber ?? "—"} · {jc.customer?.name ?? "—"}
              </p>
            </div>
            <Badge variant={jobCardStatusVariant(jc.status)}>{STATUS_LABEL[jc.status]}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create the top vehicles table**

`app/(dashboard)/dashboard/top-vehicles-table.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VehicleRow = {
  vehicleId: string;
  registrationNumber: string;
  customerName: string;
  jobCardCount: number;
  lastServiceDate: string;
  lifetimeSpend: number;
};

export function TopVehiclesTable({ vehicles }: { vehicles: VehicleRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Serviced Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Job Cards</TableHead>
              <TableHead>Last Service</TableHead>
              <TableHead>Lifetime Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No service history yet.
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((v) => (
              <TableRow key={v.vehicleId}>
                <TableCell className="font-medium">{v.registrationNumber}</TableCell>
                <TableCell>{v.customerName}</TableCell>
                <TableCell>{v.jobCardCount}</TableCell>
                <TableCell>{new Date(v.lastServiceDate).toLocaleDateString()}</TableCell>
                <TableCell>৳{v.lifetimeSpend.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Rebuild the page**

Replace `app/(dashboard)/dashboard/page.tsx`:

```tsx
import { requirePageRole } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { listProducts } from "@/actions/stock";
import { listJobCards } from "@/actions/jobCards";
import {
  getJobCardStatusBreakdown,
  getTopServicedVehicles,
  getTechnicianDashboard,
} from "@/actions/dashboard";
import { JobCardStatusChart } from "./job-card-status-chart";
import { RecentJobCardsPanel } from "./recent-job-cards-panel";
import { TopVehiclesTable } from "./top-vehicles-table";

function monthRange(monthOffset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end =
    monthOffset === 0
      ? now
      : new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function DashboardPage() {
  const session = await requirePageRole(["admin", "manager", "technician"]);
  const role = session.user.role;

  if (role === "technician") {
    const { pending, completedThisWeek, recentJobCards } = await getTechnicianDashboard();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard title="My Pending Tasks" value={String(pending)} />
          <StatCard title="Completed This Week" value={String(completedThisWeek)} />
        </div>
        <RecentJobCardsPanel jobCards={recentJobCards} />
      </div>
    );
  }

  const [statusBreakdown, jobCards, products] = await Promise.all([
    getJobCardStatusBreakdown(),
    listJobCards("all"),
    listProducts(),
  ]);
  const lowStockCount = products.filter(
    (p: { quantityInStock: number; reorderLevel?: number }) =>
      p.reorderLevel !== undefined && p.quantityInStock <= p.reorderLevel
  ).length;
  const openCount = jobCards.filter((jc: { status: string }) => jc.status === "open").length;
  const inProgressCount = jobCards.filter(
    (jc: { status: string }) => jc.status === "in_progress"
  ).length;

  if (role === "manager") {
    const topVehicles = await getTopServicedVehicles();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Open Job Cards" value={String(openCount)} />
          <StatCard title="In-Progress Job Cards" value={String(inProgressCount)} />
          <StatCard title="Low Stock Items" value={String(lowStockCount)} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <JobCardStatusChart data={statusBreakdown} />
          <RecentJobCardsPanel jobCards={jobCards.slice(0, 5)} />
        </div>
        <TopVehiclesTable vehicles={topVehicles} />
      </div>
    );
  }

  const thisMonth = monthRange(0);
  const prevMonth = monthRange(-1);
  const [thisMonthSummary, prevMonthSummary, daily, topVehicles] = await Promise.all([
    getFinanceDashboardSummary(thisMonth.start, thisMonth.end),
    getFinanceDashboardSummary(prevMonth.start, prevMonth.end),
    getDailyIncomeExpense(30),
    getTopServicedVehicles(),
  ]);
  const trendPercent =
    prevMonthSummary.totalIncome === 0
      ? null
      : Math.round(
          ((thisMonthSummary.totalIncome - prevMonthSummary.totalIncome) /
            prevMonthSummary.totalIncome) *
            100
        );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`৳${thisMonthSummary.totalIncome.toFixed(2)}`}
          trend={
            trendPercent === null
              ? undefined
              : {
                  label: `${trendPercent > 0 ? "+" : ""}${trendPercent}%`,
                  positive: trendPercent >= 0,
                }
          }
          sparkline={daily.map((d: { income: number }) => ({ value: d.income }))}
        />
        <StatCard
          title="Outstanding Dues"
          value={`৳${thisMonthSummary.outstandingDues.toFixed(2)}`}
        />
        <StatCard title="Open Job Cards" value={String(openCount)} />
        <StatCard title="Low Stock Items" value={String(lowStockCount)} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <JobCardStatusChart data={statusBreakdown} />
        <RecentJobCardsPanel jobCards={jobCards.slice(0, 5)} />
      </div>
      <TopVehiclesTable vehicles={topVehicles} />
    </div>
  );
}
```

- [ ] **Step 5: Verify build and full test suite**

Run: `npm run build && npm test`
Expected: both succeed.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. Log in as admin — confirm 4 KPI cards (with a sparkline under Total Revenue), status chart, recent job cards, top vehicles table render without error. Log in as manager — confirm 3 KPI cards, no revenue figures. Log in as a technician (create one via Employees → Add Employee with a login, or use an existing seeded one) — confirm the 2-card personal view.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/dashboard"
git commit -m "feat: build role-aware dashboard home page"
```

---

### Task 13: Wire `StatCard` into the Accounts Finance Dashboard

**Files:**
- Modify: `app/(dashboard)/accounts/dashboard/page.tsx`
- Modify: `app/(dashboard)/accounts/dashboard/income-expense-chart.tsx`

**Interfaces:**
- Consumes: `StatCard` (Task 10), `CHART_COLORS` (Task 3).

- [ ] **Step 1: Replace the KPI cards section**

In `app/(dashboard)/accounts/dashboard/page.tsx`, replace the whole file with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { requirePageRole } from "@/lib/auth";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { CHART_COLORS } from "@/lib/chartColors";
import { IncomeExpenseChart } from "./income-expense-chart";

export default async function FinanceDashboardPage() {
  await requirePageRole(["admin"]);

  const [summary, daily] = await Promise.all([
    getFinanceDashboardSummary(),
    getDailyIncomeExpense(30),
  ]);

  const incomeSparkline = daily.map((d: { income: number }) => ({ value: d.income }));
  const expenseSparkline = daily.map((d: { expense: number }) => ({ value: d.expense }));
  const profitSparkline = daily.map((d: { income: number; expense: number }) => ({
    value: d.income - d.expense,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Finance Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={`৳${summary.totalIncome.toFixed(2)}`}
          sparkline={incomeSparkline}
          sparklineColor={CHART_COLORS.success}
        />
        <StatCard
          title="Net Profit"
          value={`৳${summary.netProfit.toFixed(2)}`}
          sparkline={profitSparkline}
          sparklineColor={CHART_COLORS.chart3}
        />
        <StatCard title="Outstanding Dues" value={`৳${summary.outstandingDues.toFixed(2)}`} />
        <StatCard
          title="Total Expense"
          value={`৳${summary.totalExpense.toFixed(2)}`}
          sparkline={expenseSparkline}
          sparklineColor={CHART_COLORS.destructive}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash / Bank / Mobile Banking Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          {summary.byPaymentMethod.map((p) => (
            <div key={p.paymentMethod} className="space-y-1">
              <p className="font-medium capitalize">{p.paymentMethod.replace("_", " ")}</p>
              <p className="text-success">Income: ৳{p.income.toFixed(2)}</p>
              <p className="text-destructive">Expense: ৳{p.expense.toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpenseChart data={daily} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Swap the chart's literal colors for the shared constants**

In `app/(dashboard)/accounts/dashboard/income-expense-chart.tsx`, add the import and replace the two `stroke` literals:

```tsx
import { CHART_COLORS } from "@/lib/chartColors";
```

```tsx
          <Line type="monotone" dataKey="income" stroke={CHART_COLORS.success} name="Income" />
          <Line type="monotone" dataKey="expense" stroke={CHART_COLORS.destructive} name="Expense" />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/accounts/dashboard"
git commit -m "style: use StatCard and shared chart colors on the finance dashboard"
```

---

### Task 14: Apply status badge variants across Job Cards pages

**Files:**
- Modify: `app/(dashboard)/job-cards/job-card-list.tsx`
- Modify: `app/(dashboard)/job-cards/[id]/job-card-detail.tsx`

**Interfaces:**
- Consumes: `jobCardStatusVariant`, `taskStatusVariant` (Task 4).

- [ ] **Step 1: `job-card-list.tsx`**

Add the import:

```tsx
import { jobCardStatusVariant } from "@/lib/statusBadge";
```

Replace:

```tsx
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[jc.status]}</Badge>
                </TableCell>
```

with:

```tsx
                <TableCell>
                  <Badge variant={jobCardStatusVariant(jc.status)}>{STATUS_LABEL[jc.status]}</Badge>
                </TableCell>
```

- [ ] **Step 2: `job-card-detail.tsx` — status badge, task badges, and the amber carried-forward fix**

Add the import:

```tsx
import { jobCardStatusVariant, taskStatusVariant } from "@/lib/statusBadge";
```

Replace the plain status badge:

```tsx
            <Badge variant="secondary">{STATUS_LABEL[jobCard.status]}</Badge>
```

with:

```tsx
            <Badge variant={jobCardStatusVariant(jobCard.status)}>
              {STATUS_LABEL[jobCard.status]}
            </Badge>
```

(This appears twice in the file — once in the non-staff-manager branch's status display and nowhere else with this exact literal; if the editor's exact-match fails because the string appears only once, apply it to that single occurrence.)

Replace the amber carried-forward badge:

```tsx
                    {task.carriedForwardFromDate && (
                      <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
                        Carried forward from{" "}
                        {new Date(task.carriedForwardFromDate).toLocaleDateString()}
                      </Badge>
                    )}
```

with:

```tsx
                    {task.carriedForwardFromDate && (
                      <Badge variant="warning" className="ml-2">
                        Carried forward from{" "}
                        {new Date(task.carriedForwardFromDate).toLocaleDateString()}
                      </Badge>
                    )}
```

Replace the task status badge:

```tsx
                    <Badge variant="secondary">{TASK_STATUS_LABEL[task.status]}</Badge>
```

with:

```tsx
                    <Badge variant={taskStatusVariant(task.status)}>
                      {TASK_STATUS_LABEL[task.status]}
                    </Badge>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open a job card with tasks in different statuses, confirm badges show amber for in-progress/carried-forward, green for completed, and the neutral outline for pending/open.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/job-cards"
git commit -m "style: color-code job card and task status badges"
```

---

### Task 15: Apply status badge variants across Invoices, Messages, and Discount Cards

**Files:**
- Modify: `app/(dashboard)/invoices/invoice-list.tsx`
- Modify: `app/(dashboard)/invoices/[id]/invoice-detail.tsx`
- Modify: `app/(dashboard)/messages/messages-panel.tsx`
- Modify: `app/(dashboard)/discount-cards/discount-card-list.tsx`

**Interfaces:**
- Consumes: `invoiceStatusVariant`, `messageStatusVariant` (Task 4).

- [ ] **Step 1: `invoice-list.tsx`**

Add the import and replace:

```tsx
import { invoiceStatusVariant } from "@/lib/statusBadge";
```

```tsx
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[invoice.status]}</Badge>
                </TableCell>
```

with:

```tsx
                <TableCell>
                  <Badge variant={invoiceStatusVariant(invoice.status)}>
                    {STATUS_LABEL[invoice.status]}
                  </Badge>
                </TableCell>
```

- [ ] **Step 2: `invoice-detail.tsx`**

Add the import and replace:

```tsx
import { invoiceStatusVariant } from "@/lib/statusBadge";
```

```tsx
            <Badge variant="secondary">{STATUS_LABEL[invoice.status]}</Badge>
```

with:

```tsx
            <Badge variant={invoiceStatusVariant(invoice.status)}>
              {STATUS_LABEL[invoice.status]}
            </Badge>
```

- [ ] **Step 3: `messages-panel.tsx`**

Add the import and replace:

```tsx
import { messageStatusVariant } from "@/lib/statusBadge";
```

```tsx
                  <TableCell>
                    <Badge variant={log.status === "sent" ? "secondary" : "outline"}>
                      {log.status}
                    </Badge>
                  </TableCell>
```

with:

```tsx
                  <TableCell>
                    <Badge variant={messageStatusVariant(log.status)}>{log.status}</Badge>
                  </TableCell>
```

- [ ] **Step 4: `discount-card-list.tsx`**

Add the import and replace:

```tsx
import { positiveNegativeVariant } from "@/lib/statusBadge";
```

```tsx
                <TableCell>
                  <Badge variant={expired ? "outline" : "secondary"}>
                    {expired ? "Expired" : "Active"}
                  </Badge>
                </TableCell>
```

with:

```tsx
                <TableCell>
                  <Badge variant={expired ? "outline" : positiveNegativeVariant(true)}>
                    {expired ? "Expired" : "Active"}
                  </Badge>
                </TableCell>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/invoices" "app/(dashboard)/messages" "app/(dashboard)/discount-cards"
git commit -m "style: color-code invoice, message, and discount card status badges"
```

---

### Task 16: Apply status/color helpers across Stock, Employees, and Accounts transaction list

**Files:**
- Modify: `app/(dashboard)/stock/product-list.tsx`
- Modify: `app/(dashboard)/stock/[id]/page.tsx`
- Modify: `app/(dashboard)/employees/employee-list.tsx`
- Modify: `app/(dashboard)/accounts/transaction-list.tsx`
- Modify: `app/(dashboard)/accounts/dashboard/page.tsx`

**Interfaces:**
- Consumes: `lowStockVariant`, `positiveNegativeVariant` (Task 4).

- [ ] **Step 1: `product-list.tsx` — low-stock badge**

Add the import and replace:

```tsx
import { lowStockVariant } from "@/lib/statusBadge";
```

```tsx
                  {isLow && (
                    <Badge variant="outline" className="ml-2 border-destructive text-destructive">
                      Low Stock
                    </Badge>
                  )}
```

with:

```tsx
                  {isLow && (
                    <Badge variant={lowStockVariant(true)} className="ml-2">
                      Low Stock
                    </Badge>
                  )}
```

Also replace the low-stock quantity text color:

```tsx
                  <span className={isLow ? "font-semibold text-destructive" : ""}>
```

with:

```tsx
                  <span className={isLow ? "font-semibold text-warning" : ""}>
```

- [ ] **Step 2: `stock/[id]/page.tsx` — transaction quantity sign**

Add the import and replace:

```tsx
import { positiveNegativeVariant } from "@/lib/statusBadge";
import { Badge } from "@/components/ui/badge";
```

(keep the existing `Badge` import if already present — only add `positiveNegativeVariant`)

```tsx
                  <TableCell className={t.quantity < 0 ? "text-destructive" : "text-emerald-600"}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </TableCell>
```

with:

```tsx
                  <TableCell className={t.quantity < 0 ? "text-destructive" : "text-success"}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </TableCell>
```

(`positiveNegativeVariant` is imported for consistency with the other files in this task even though this particular cell uses a text color, not a `Badge`, in the existing design — no functional use here, so instead simply skip importing it in this file; only apply the `text-success` color-literal fix above.)

- [ ] **Step 3: `employee-list.tsx` — active/inactive badge**

Add the import and replace:

```tsx
import { positiveNegativeVariant } from "@/lib/statusBadge";
```

```tsx
                <Badge variant={emp.active ? "secondary" : "outline"}>
                  {emp.active ? "Active" : "Inactive"}
                </Badge>
```

with:

```tsx
                <Badge variant={emp.active ? positiveNegativeVariant(true) : "outline"}>
                  {emp.active ? "Active" : "Inactive"}
                </Badge>
```

- [ ] **Step 4: `transaction-list.tsx` — income/expense badge and amount color**

Add the import and replace:

```tsx
import { positiveNegativeVariant } from "@/lib/statusBadge";
```

```tsx
                <Badge variant={t.type === "income" ? "secondary" : "outline"} className="capitalize">
                  {t.type}
                </Badge>
```

with:

```tsx
                <Badge
                  variant={positiveNegativeVariant(t.type === "income")}
                  className="capitalize"
                >
                  {t.type}
                </Badge>
```

and:

```tsx
              <TableCell className={t.type === "income" ? "text-emerald-600" : "text-destructive"}>
```

with:

```tsx
              <TableCell className={t.type === "income" ? "text-success" : "text-destructive"}>
```

- [ ] **Step 5: `accounts/dashboard/page.tsx` — payment-method split colors**

This file was already rewritten in Task 13 to use `text-success`/`text-destructive` instead of `text-emerald-600`/`text-destructive` — no further change needed here; this step is a no-op verification.

Run: `grep -n "text-emerald-600" "app/(dashboard)/accounts/dashboard/page.tsx"`
Expected: no output (already fixed in Task 13).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Sweep for any remaining hardcoded colors**

Run: `grep -rn "text-emerald-600\|border-amber-500\|text-amber-600\|border-destructive text-destructive" app/ components/`
Expected: no output. If anything remains, apply the same `text-success`/`text-warning`/`text-destructive`/`positiveNegativeVariant`/`lowStockVariant` pattern used above to it before continuing.

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/stock" "app/(dashboard)/employees" "app/(dashboard)/accounts"
git commit -m "style: color-code stock, employee, and transaction status indicators"
```

---

### Task 17: Restyle the `/login` page

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:** none (presentational only, same `<LoginForm />` component/behavior).

- [ ] **Step 1: Replace the page**

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <p className="text-xl font-semibold text-primary">Dhaka Automobiles</p>
          <h1 className="text-sm text-muted-foreground">Sign in to your account</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, visit `/login` logged out — confirm dark background, centered card, purple brand text, working sign-in.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "style: restyle login page with dark branding"
```

---

### Task 18: Force light theme + status colors on the public tracking page

**Files:**
- Modify: `app/track/[token]/tracking-view.tsx`

**Interfaces:**
- Consumes: `.force-light` CSS class (Task 1), `jobCardStatusVariant`/`taskStatusVariant` (Task 4).

- [ ] **Step 1: Add the light-lock wrapper and status colors**

Add the import:

```tsx
import { jobCardStatusVariant, taskStatusVariant } from "@/lib/statusBadge";
```

Replace the root wrapper div's className:

```tsx
    <div className="mx-auto max-w-lg space-y-6 p-6">
```

with:

```tsx
    <div className="force-light mx-auto max-w-lg space-y-6 bg-background p-6 text-foreground">
```

Replace the job card status badge:

```tsx
          <Badge variant="secondary">{STATUS_LABEL[data.status]}</Badge>
```

with:

```tsx
          <Badge variant={jobCardStatusVariant(data.status)}>{STATUS_LABEL[data.status]}</Badge>
```

Replace the per-task status badge:

```tsx
                <Badge variant="outline">{TASK_STATUS_LABEL[task.status]}</Badge>
```

with:

```tsx
                <Badge variant={taskStatusVariant(task.status)}>
                  {TASK_STATUS_LABEL[task.status]}
                </Badge>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, toggle the app to dark mode from any dashboard page, then open a tracking link (`/track/<token>`, created via a job card's "Copy Tracking Link" button) in the same browser — confirm it renders light/neutral regardless of the dashboard's dark setting, with color-coded status badges.

- [ ] **Step 4: Commit**

```bash
git add "app/track/[token]/tracking-view.tsx"
git commit -m "style: force light theme and color-code status badges on public tracking page"
```

---

### Task 19: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full automated check**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all four succeed with zero errors/warnings beyond any pre-existing ones, and all tests (24 total after Tasks 4 and 11) pass.

- [ ] **Step 2: Manual visual QA — desktop**

Run: `npm run dev`. For each role (admin, manager, technician — use `scripts/seed-admin.ts` for admin, and the Employees → Add Employee flow with "Create a login" for the other two), log in and click through every sidebar item that role can see. Confirm dark background, purple accents, and readable text/contrast on every page, every table, every dialog.

- [ ] **Step 3: Manual visual QA — mobile width**

Resize the browser to ~375px wide (or use devtools device emulation). Confirm: sidebar is hidden, hamburger opens the slide-in drawer with a backdrop, drawer closes on nav click or backdrop click, and every page's tables/forms/dialogs remain usable (horizontal scroll on wide tables is acceptable, no cut-off buttons).

- [ ] **Step 4: Manual visual QA — light mode**

Toggle to light mode via the header button. Click through the same pages as Step 2. Confirm no regressions (text still readable, no invisible-on-white elements).

- [ ] **Step 5: Manual visual QA — public pages**

Log out. Visit `/login` (confirm dark branding) and an existing tracking link `/track/<token>` (confirm it stays light/neutral regardless of the dashboard's current theme setting).

- [ ] **Step 6: Final commit**

If any fixes were made during manual QA, commit them individually with descriptive messages as they're made (don't batch unrelated fixes into one commit). If no fixes were needed, this task requires no commit.

---

### Task 20: Roomier table rows

**Files:**
- Modify: `components/ui/table.tsx`

**Interfaces:** none — purely a padding/spacing tweak. The hover-row highlight the spec calls for already exists (`hover:bg-muted/50` on `TableRow`); this task only adds a touch more padding to match the reference image's roomier rows.

- [ ] **Step 1: Increase cell/head padding**

In `components/ui/table.tsx`, in `TableHead`, replace:

```tsx
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
```

with:

```tsx
        "h-11 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
```

In `TableCell`, replace:

```tsx
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
```

with:

```tsx
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ui/table.tsx
git commit -m "style: roomier table row padding"
```

---

## Task Dependency Summary

1 → 2, 4 (needs `--color-success`/`--color-warning`)
2 → 4 (needs `success`/`warning` Badge variants to exist for the type to make sense), 12, 14, 15, 16, 18
3 → 10, 12, 13
4 → 12, 14, 15, 16, 18
5 → 8
6 → 8
7 → 8, 9
8 → 9
9 → 12 (page renders inside this shell)
10 → 12, 13
11 → 12
20 → independent, no dependencies
12, 13, 14, 15, 16, 17, 18, 20 → 19 (final verification depends on everything else landing first)
