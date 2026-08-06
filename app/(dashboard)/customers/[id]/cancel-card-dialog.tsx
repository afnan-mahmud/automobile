"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelDiscountCard } from "@/actions/discountCards";
import { AlertTriangle, XCircle } from "lucide-react";
import { FormError } from "@/components/ui/form-field";

export function CancelCardDialog({
  discountCardId,
  customerName,
  discountPercent,
  trigger,
}: {
  discountCardId: string;
  customerName: string;
  discountPercent: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancelCard() {
    setError(null);
    setIsSubmitting(true);

    const result = await cancelDiscountCard(discountCardId);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
            >
              <XCircle className="size-4" />
              Cancel Card
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <DialogTitle className="text-center">Cancel Discount Card?</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to cancel the active{" "}
            <span className="font-semibold text-foreground">
              {discountPercent}% discount card
            </span>{" "}
            for <span className="font-semibold text-foreground">{customerName}</span>?
            Future invoices will not receive this discount unless a new card is assigned.
          </DialogDescription>
        </DialogHeader>

        {error && <FormError message={error} />}

        <DialogFooter className="mt-4 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Keep Active
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancelCard}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cancelling..." : "Yes, Cancel Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
