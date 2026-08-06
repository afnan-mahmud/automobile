"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type InvoiceStatus } from "@/types/invoice";
import { deleteInvoice } from "@/actions/invoices";
import {
  Search,
  FileText,
  FileEdit,
  Send,
  PieChart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  _id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number;
  customerId: { name: string; phone: string } | null;
  createdAt: string;
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partially_paid: "Partially Paid",
};

const STATUS_META: Record<
  InvoiceStatus | "all",
  { label: string; color: string; bg: string; textColor: string; icon: React.ReactNode }
> = {
  all: {
    label: "All Invoices",
    color: "from-primary to-purple-600",
    bg: "bg-primary/10",
    textColor: "text-primary",
    icon: <FileText className="size-5" />,
  },
  draft: {
    label: "Draft",
    color: "from-slate-500 to-gray-600",
    bg: "bg-slate-50 dark:bg-slate-950/40",
    textColor: "text-slate-600 dark:text-slate-400",
    icon: <FileEdit className="size-5" />,
  },
  sent: {
    label: "Sent",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: <Send className="size-5" />,
  },
  partially_paid: {
    label: "Partially Paid",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    textColor: "text-amber-600 dark:text-amber-400",
    icon: <PieChart className="size-5" />,
  },
  paid: {
    label: "Paid",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-5" />,
  },
};

const BADGE_STYLE: Record<InvoiceStatus, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-900",
  sent: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  partially_paid: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  paid: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
};

const PAGE_SIZE = 10;

export function InvoiceList({ initialInvoices }: { initialInvoices: InvoiceRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | InvoiceStatus>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteInvoiceNumber, setDeleteInvoiceNumber] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteInvoice(deletingId);
    setIsDeleting(false);
    if (!result.success) {
      setDeleteError(result.error);
      return;
    }
    setDeletingId(null);
    router.refresh();
  }

  const counts: Record<"all" | InvoiceStatus, number> = useMemo(() => ({
    all: initialInvoices.length,
    draft: initialInvoices.filter((i) => i.status === "draft").length,
    sent: initialInvoices.filter((i) => i.status === "sent").length,
    partially_paid: initialInvoices.filter((i) => i.status === "partially_paid").length,
    paid: initialInvoices.filter((i) => i.status === "paid").length,
  }), [initialInvoices]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? initialInvoices : initialInvoices.filter((i) => i.status === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerId?.name?.toLowerCase().includes(q) ||
          i.customerId?.phone?.includes(q)
      );
    }
    return list;
  }, [initialInvoices, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleTabChange(newTab: typeof tab) {
    setTab(newTab);
    setPage(1);
  }

  const statTabs: Array<InvoiceStatus> = ["draft", "sent", "partially_paid", "paid"];

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
              placeholder="Search invoices…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
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
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b bg-muted/40 px-5 py-3">
          {["Invoice Number", "Customer", "Amount", "Date", "Status", ""].map((h, index) => (
            <span key={index} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
              <FileText className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No invoices found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query ? `No results for "${query}"` : "Invoices generated from orders will appear here"}
            </p>
          </div>
        )}

        {/* Rows */}
        {paginated.map((inv, i) => (
          <div
            key={inv._id}
            className={cn(
              "group grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 transition-colors cursor-pointer",
              "hover:bg-muted/40",
              i > 0 && "border-t"
            )}
            onClick={() => {
              router.push(`/invoices/${inv._id}`);
            }}
          >
            {/* Invoice # */}
            <div>
              <p className="text-sm font-semibold text-primary">{inv.invoiceNumber}</p>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {inv.customerId?.name ?? "—"}
                </p>
                {inv.customerId?.phone && (
                  <p className="text-xs text-muted-foreground">{inv.customerId.phone}</p>
                )}
              </div>
            </div>

            {/* Total */}
            <div>
              <p className="text-sm font-semibold">৳{inv.total.toFixed(2)}</p>
            </div>

            {/* Date */}
            <div>
              <p className="text-sm text-muted-foreground">
                {new Date(inv.createdAt).toLocaleDateString("en-GB", {
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
                  BADGE_STYLE[inv.status]
                )}
              >
                {STATUS_LABEL[inv.status]}
              </span>
            </div>

            {/* Actions */}
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeletingId(inv._id);
                  setDeleteInvoiceNumber(inv.invoiceNumber);
                  setDeleteError(null);
                }}
                className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                title="Delete Invoice"
                aria-label="Delete Invoice"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
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

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg">Delete Invoice {deleteInvoiceNumber}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-center text-sm text-muted-foreground">
            <p>
              Are you sure you want to delete this invoice?
            </p>
            <div className="rounded-xl border border-rose-200/50 bg-rose-50/50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              ⚠️ Deleting this invoice will permanently remove it and automatically reverse/deduct any payments recorded for it in Accounts and Finance calculations.
            </div>
            {deleteError && <p className="text-sm font-medium text-destructive">{deleteError}</p>}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
