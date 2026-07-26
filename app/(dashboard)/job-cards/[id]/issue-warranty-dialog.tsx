"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWarrantyCard } from "@/actions/warranty";

const today = () => new Date().toISOString().slice(0, 10);
const inOneYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export function IssueWarrantyDialog({
  jobCardId,
  disabled,
}: {
  jobCardId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coveredItems, setCoveredItems] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(inOneYear());
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const items = coveredItems
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);
    if (items.length === 0) {
      setError("List at least one covered item, one per line");
      return;
    }
    setIsSubmitting(true);
    const result = await createWarrantyCard({
      jobCardId,
      coveredItems: items,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      terms: terms || undefined,
    });
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
          <Button size="sm" variant="outline" disabled={disabled}>
            Issue Warranty Card
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Warranty Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Covered Items (one per line)</Label>
            <Textarea
              value={coveredItems}
              onChange={(e) => setCoveredItems(e.target.value)}
              rows={4}
              placeholder={"Engine overhaul\nBrake pads"}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Terms (optional)</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Issue Card"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
