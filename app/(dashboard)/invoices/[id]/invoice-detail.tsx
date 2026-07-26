"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { invoiceStatusVariant } from "@/lib/statusBadge";
import type { InvoiceStatus } from "@/types/invoice";

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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex gap-2">
            <a
              href={`/api/invoices/${invoice._id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Download PDF
            </a>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline">Edit</Button>} />
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Line Items</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {lineItems.map((li, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Input
                          value={li.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                        />
                      </div>
                      <div className="w-16 space-y-1">
                        <label className="text-xs text-muted-foreground">Qty</label>
                        <Input
                          type="number"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLine(index, { quantity: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs text-muted-foreground">Unit Price</label>
                        <Input
                          type="number"
                          value={li.unitPrice}
                          onChange={(e) =>
                            updateLine(index, { unitPrice: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    Add Line
                  </Button>
                  {editError && <p className="text-sm text-destructive">{editError}</p>}
                  <Button onClick={handleSaveEdit} disabled={isSaving} className="w-full">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger render={<Button size="sm">Mark Paid</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Invoice Paid</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm">Payment Method</label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => v && setPaymentMethod(v as typeof paymentMethod)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={partial}
                      onChange={(e) => setPartial(e.target.checked)}
                    />
                    Partial payment
                  </label>
                  {payError && <p className="text-sm text-destructive">{payError}</p>}
                  <Button onClick={handleMarkPaid} disabled={isPaying} className="w-full">
                    {isPaying ? "Saving..." : "Confirm Payment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((li, index) => (
                <TableRow key={index}>
                  <TableCell>{li.description}</TableCell>
                  <TableCell>{li.quantity}</TableCell>
                  <TableCell>৳{li.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>৳{li.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <p>Subtotal: ৳{invoice.subtotal.toFixed(2)}</p>
            <p>
              Discount ({invoice.discountPercent}%): -৳{invoice.discountAmount.toFixed(2)}
            </p>
            <p className="text-base font-semibold">Total: ৳{invoice.total.toFixed(2)}</p>
            <Badge variant={invoiceStatusVariant(invoice.status)}>
              {STATUS_LABEL[invoice.status]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {invoice.revisions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {invoice.revisions.length} prior revision(s) preserved.
        </p>
      )}
    </div>
  );
}
