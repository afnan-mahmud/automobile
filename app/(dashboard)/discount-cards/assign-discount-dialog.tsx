"use client";

import { useEffect, useState } from "react";
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
import { searchCustomers } from "@/actions/customers";
import { createDiscountCard } from "@/actions/discountCards";

type Customer = { _id: string; name: string; phone: string };

const today = () => new Date().toISOString().slice(0, 10);

export function AssignDiscountDialog({ presetCustomerId }: { presetCustomerId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [discountPercent, setDiscountPercent] = useState("10");
  const [validFrom, setValidFrom] = useState(today());
  const [validTo, setValidTo] = useState("");
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selected || presetCustomerId) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setCandidates([]);
        return;
      }
      const results = await searchCustomers(query);
      setCandidates(results as Customer[]);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected, presetCustomerId]);

  async function handleSubmit() {
    setError(null);
    const customerId = presetCustomerId ?? selected?._id;
    if (!customerId) {
      setError("Select a customer first");
      return;
    }
    setIsSubmitting(true);
    const result = await createDiscountCard({
      customerId,
      discountPercent: Number(discountPercent),
      termsAndConditions: terms || undefined,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : null,
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
      <DialogTrigger render={<Button size="sm">Assign Discount Card</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Discount Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!presetCustomerId && (
            <>
              {!selected ? (
                <div className="space-y-2">
                  <Label>Search customer</Label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} />
                  {candidates.length > 0 && (
                    <div className="rounded-md border">
                      {candidates.map((c) => (
                        <button
                          type="button"
                          key={c._id}
                          onClick={() => {
                            setSelected(c);
                            setCandidates([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Customer: <span className="font-medium">{selected.name}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Change
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label>Discount %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Valid From</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Valid To (optional)</Label>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Terms (optional)</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Assign Card"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
