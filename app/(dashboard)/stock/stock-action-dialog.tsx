"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { recordStockPurchase, recordRetailSale } from "@/actions/stock";

export function StockActionDialog({
  productId,
  productName,
  mode,
}: {
  productId: string;
  productName: string;
  mode: "purchase" | "sell";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "mobile_banking">("cash");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Quantity must be positive");
      return;
    }
    setIsSubmitting(true);
    const result =
      mode === "purchase"
        ? await recordStockPurchase({ productId, quantity: qty })
        : await recordRetailSale({ productId, quantity: qty, paymentMethod });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setQuantity("1");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={mode === "purchase" ? "outline" : "default"}>
            {mode === "purchase" ? "Record Purchase" : "Sell Item"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "purchase" ? "Record Stock Purchase" : "Sell Item"} — {productName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          {mode === "sell" && (
            <div className="space-y-1">
              <Label>Payment Method</Label>
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
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
