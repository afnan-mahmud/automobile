"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { type JobCardStatus } from "@/types/jobCard";
import {
  Search,
  Plus,
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle2,
  Car,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type JobCardRow = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  vehicle: { registrationNumber: string; make?: string; model?: string } | null;
  customer: { name: string; phone: string } | null;
  taskTotal: number;
  taskCompleted: number;
  createdAt: string;
};

const STATUS_META: Record<
  JobCardStatus | "all",
  { label: string; color: string; bg: string; textColor: string; icon: React.ReactNode }
> = {
  all: {
    label: "All Orders",
    color: "from-primary to-purple-600",
    bg: "bg-primary/10",
    textColor: "text-primary",
    icon: <ClipboardList className="size-5" />,
  },
  open: {
    label: "New Orders",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: <ClipboardList className="size-5" />,
  },
  in_progress: {
    label: "In Progress",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    textColor: "text-amber-600 dark:text-amber-400",
    icon: <Wrench className="size-5" />,
  },
  completed: {
    label: "Completed",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    textColor: "text-violet-600 dark:text-violet-400",
    icon: <Clock className="size-5" />,
  },
  delivered: {
    label: "Delivered",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-5" />,
  },
};

const BADGE_STYLE: Record<JobCardStatus, string> = {
  open: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  in_progress: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  completed: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900",
  delivered: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
};

const PAGE_SIZE = 10;

export function JobCardList({
  initialJobCards,
  showNewButton,
}: {
  initialJobCards: JobCardRow[];
  showNewButton?: boolean;
}) {
  const [tab, setTab] = useState<"all" | JobCardStatus>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const counts: Record<"all" | JobCardStatus, number> = useMemo(() => ({
    all: initialJobCards.length,
    open: initialJobCards.filter((jc) => jc.status === "open").length,
    in_progress: initialJobCards.filter((jc) => jc.status === "in_progress").length,
    completed: initialJobCards.filter((jc) => jc.status === "completed").length,
    delivered: initialJobCards.filter((jc) => jc.status === "delivered").length,
  }), [initialJobCards]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? initialJobCards : initialJobCards.filter((jc) => jc.status === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (jc) =>
          jc.jobCardNumber.toLowerCase().includes(q) ||
          jc.customer?.name?.toLowerCase().includes(q) ||
          jc.customer?.phone?.includes(q) ||
          jc.vehicle?.registrationNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialJobCards, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleTabChange(newTab: typeof tab) {
    setTab(newTab);
    setPage(1);
  }

  const statTabs: Array<"open" | "in_progress" | "completed" | "delivered"> = [
    "open",
    "in_progress",
    "completed",
    "delivered",
  ];

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statTabs.map((status) => {
          const meta = STATUS_META[status];
          const active = tab === status;
          return (
            <button
              key={status}
              onClick={() => handleTabChange(active ? "all" : status)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
                "hover:-translate-y-0.5 hover:shadow-lg",
                active
                  ? "border-transparent shadow-lg ring-2 ring-primary/30"
                  : "bg-card hover:border-primary/20"
              )}
            >
              {/* gradient bg when active */}
              {active && (
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-10",
                    meta.color
                  )}
                />
              )}

              <div className="relative flex flex-col gap-3">
                {/* Title + Icon */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl",
                      active ? `bg-gradient-to-br ${meta.color} text-white` : meta.bg,
                      active ? "text-white" : meta.textColor
                    )}
                  >
                    {meta.icon}
                  </div>
                </div>

                {/* Count */}
                <div className="flex items-end gap-3">
                  <span
                    className={cn(
                      "text-4xl font-bold leading-none tracking-tight",
                      active ? meta.textColor : "text-foreground"
                    )}
                  >
                    {counts[status]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r", meta.color)}
                    style={{
                      width: counts.all > 0 ? `${Math.round((counts[status] / counts.all) * 100)}%` : "0%",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active filter chip */}
          {tab !== "all" && (
            <button
              onClick={() => handleTabChange("all")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                "hover:bg-muted"
              )}
            >
              {STATUS_META[tab].label}
              <span className="text-muted-foreground">×</span>
            </button>
          )}

          {showNewButton && (
            <Link href="/job-cards/new" className={buttonVariants({ size: "sm" }) + " gap-1.5"}>
              <Plus className="size-3.5" />
              New Order
            </Link>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr_auto] items-center gap-4 border-b bg-muted/40 px-5 py-3">
          {["Order Number", "Customer", "Vehicle", "Tasks", "Date", "Status"].map((h) => (
            <span key={h} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
              <ClipboardList className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No orders found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query ? `No results for "${query}"` : "Create a new order to get started"}
            </p>
          </div>
        )}

        {/* Rows */}
        {paginated.map((jc, i) => (
          <Link
            key={jc._id}
            href={`/job-cards/${jc._id}`}
            className={cn(
              "grid grid-cols-[2fr_2fr_2fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40",
              i > 0 && "border-t"
            )}
          >
            {/* Order # */}
            <div>
              <p className="text-sm font-semibold text-primary">{jc.jobCardNumber}</p>
            </div>

            {/* Customer */}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {jc.customer?.name ?? "—"}
              </p>
              {jc.customer?.phone && (
                <p className="text-xs text-muted-foreground">{jc.customer.phone}</p>
              )}
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Car className="size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {jc.vehicle?.registrationNumber ?? "—"}
                </p>
                {jc.vehicle?.make && (
                  <p className="truncate text-xs text-muted-foreground">
                    {jc.vehicle.make} {jc.vehicle.model}
                  </p>
                )}
              </div>
            </div>

            {/* Tasks progress */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {jc.taskCompleted}/{jc.taskTotal}
              </span>
              {jc.taskTotal > 0 && (
                <div className="h-1 w-full max-w-[48px] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((jc.taskCompleted / jc.taskTotal) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <p className="text-sm text-muted-foreground">
                {new Date(jc.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                })}
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize",
                  BADGE_STYLE[jc.status]
                )}
              >
                {jc.status.replace("_", " ")}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="rounded-md p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4 text-muted-foreground" />
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className="size-8 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
