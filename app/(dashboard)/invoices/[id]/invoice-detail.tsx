"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInvoice, markInvoicePaid } from "@/actions/invoices";
import type { InvoiceStatus } from "@/types/invoice";
import { FileText, CheckCircle2, Clock, CreditCard, Download, Edit, Settings2, Banknote, Percent, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type LineItem = { description: string; quantity: number; unitPrice: number; total: number };

type Invoice = {
  _id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  revisions: { version: number }[];
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partially_paid: "Partially Paid",
};

export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.lineItems);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "mobile_banking">("cash");
  const [partial, setPartial] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li;
        const merged = { ...li, ...patch };
        return { ...merged, total: merged.quantity * merged.unitPrice };
      })
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdit() {
    setEditError(null);
    setIsSaving(true);
    const result = await updateInvoice({ id: invoice._id, lineItems });
    setIsSaving(false);
    if (!result.success) {
      setEditError(result.error);
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  async function handleMarkPaid() {
    setPayError(null);
    setIsPaying(true);
    const result = await markInvoicePaid({ id: invoice._id, paymentMethod, partial });
    setIsPaying(false);
    if (!result.success) {
      setPayError(result.error);
      return;
    }
    setPayOpen(false);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">
        
        {/* HERO BOX */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <FileText className="size-5" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Invoice Details
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                INV-{invoice.invoiceNumber}
              </h1>
            </div>
            
            <div className="flex items-center gap-4 rounded-2xl bg-background/60 backdrop-blur-md border px-5 py-3 shadow-sm">
              <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", 
                invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' :
                invoice.status === 'partially_paid' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' :
                'bg-muted text-muted-foreground'
              )}>
                {invoice.status === 'paid' ? <CheckCircle2 className="size-6" /> : 
                 invoice.status === 'partially_paid' ? <CreditCard className="size-6" /> :
                 <Clock className="size-6" />}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {STATUS_LABEL[invoice.status]}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment Status
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Layers className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Subtotal</p>
            <p className="mt-1 font-semibold">৳{invoice.subtotal.toFixed(2)}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-pink-50/50 p-4 text-center text-pink-600 dark:bg-pink-950/20 dark:text-pink-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-pink-600 dark:text-pink-400">
              <Percent className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Discount</p>
            <p className="mt-1 font-semibold">{invoice.discountPercent}% (-৳{invoice.discountAmount.toFixed(2)})</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-emerald-50/50 p-4 text-center text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-emerald-600 dark:text-emerald-400">
              <Banknote className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total</p>
            <p className="mt-1 font-semibold">৳{invoice.total.toFixed(2)}</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Items</p>
            <p className="mt-1 font-semibold">{invoice.lineItems.length}</p>
          </div>
        </div>

        {/* LINE ITEMS LIST */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Line Items</h3>
            <Badge variant="secondary" className="rounded-full px-3">{invoice.lineItems.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {invoice.lineItems.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No items found</p>
              </div>
            ) : (
              invoice.lineItems.map((li, index) => (
                <div key={index} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card p-4 transition-all hover:bg-muted/30 hover:shadow-sm">
                  <div className="flex flex-1 items-start gap-4 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-base leading-tight">
                        {li.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Qty: {li.quantity}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          @ ৳{li.unitPrice.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0 pl-14 sm:pl-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Total</p>
                    <p className="font-bold text-lg">৳{li.total.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 flex flex-col items-end pt-4 border-t gap-1">
            <p className="text-sm text-muted-foreground">Subtotal: ৳{invoice.subtotal.toFixed(2)}</p>
            {invoice.discountAmount > 0 && (
              <p className="text-sm text-pink-600 dark:text-pink-400">Discount ({invoice.discountPercent}%): -৳{invoice.discountAmount.toFixed(2)}</p>
            )}
            <p className="text-xl font-bold mt-1">Final Total: ৳{invoice.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (SIDEBAR) ── */}
      <div className="space-y-6">
        
        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="size-4 text-primary" /> 
              Invoice Actions
            </h3>
          </div>
          <div className="p-5 space-y-3 flex flex-col">
            <a
              href={`/api/invoices/${invoice._id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-start rounded-xl border bg-background hover:bg-muted/50 px-4 text-sm font-medium transition-colors"
            >
              <Download className="mr-2 size-4 text-muted-foreground" />
              Download PDF
            </a>
            
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={
                <Button variant="outline" className="w-full justify-start rounded-xl h-11 bg-background hover:bg-muted/50">
                  <Edit className="mr-2 size-4 text-muted-foreground" />
                  Edit Line Items
                </Button>
              } />
              <DialogContent className="sm:max-w-xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Line Items</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-2">
                  {lineItems.map((li, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 border rounded-xl bg-muted/20">
                      <div className="flex-1 w-full space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                        <Input
                          value={li.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="flex items-end gap-3 w-full sm:w-auto">
                        <div className="w-20 shrink-0 space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</label>
                          <Input
                            type="number"
                            value={li.quantity}
                            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 0 })}
                            className="rounded-lg"
                          />
                        </div>
                        <div className="w-24 shrink-0 space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</label>
                          <Input
                            type="number"
                            value={li.unitPrice}
                            onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) || 0 })}
                            className="rounded-lg"
                          />
                        </div>
                        <Button variant="destructive" size="icon" className="h-9 w-9 shrink-0 rounded-lg mb-0.5" onClick={() => removeLine(index)}>
                          <span className="sr-only">Remove</span>
                          &times;
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full rounded-xl border-dashed h-10" onClick={addLine}>
                    + Add New Line
                  </Button>
                  {editError && <p className="text-sm text-destructive">{editError}</p>}
                  <Button onClick={handleSaveEdit} disabled={isSaving} className="w-full rounded-xl h-11">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger render={
                <Button className="w-full justify-start rounded-xl h-11">
                  <CreditCard className="mr-2 size-4" />
                  Mark Paid
                </Button>
              } />
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Mark Invoice Paid</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => v && setPaymentMethod(v as typeof paymentMethod)}
                    >
                      <SelectTrigger className="w-full rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-3 text-sm p-3 border rounded-xl hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partial}
                      onChange={(e) => setPartial(e.target.checked)}
                      className="size-4 rounded border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">Partial payment</span>
                      <span className="text-xs text-muted-foreground">Check this if the customer is not paying the full amount</span>
                    </div>
                  </label>
                  {payError && <p className="text-sm text-destructive">{payError}</p>}
                  <Button onClick={handleMarkPaid} disabled={isPaying} className="w-full rounded-xl h-11">
                    {isPaying ? "Saving..." : "Confirm Payment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {invoice.revisions.length > 0 && (
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">
              {invoice.revisions.length} prior revision(s) preserved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
