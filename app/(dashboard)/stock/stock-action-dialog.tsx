"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { Package, CreditCard } from "lucide-react";

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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "purchase" ? "Record Stock Purchase" : "Sell Item"} — {productName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <FormField label="Quantity" htmlFor="stock-qty">
            <div className="flex items-center gap-2 px-3">
              <Package className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="stock-qty"
                type="number"
                min={1}
                className={fieldInputClass}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </FormField>

          {mode === "sell" && (
            <FormField label="Payment Method">
              <Select
                value={paymentMethod}
                onValueChange={(v) => v && setPaymentMethod(v as typeof paymentMethod)}
              >
                <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
