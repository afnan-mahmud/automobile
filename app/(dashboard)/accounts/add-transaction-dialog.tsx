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
import { createAccountTransaction } from "@/actions/accounts";
import {
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  PAYMENT_METHODS,
  type TransactionType,
  type TransactionCategory,
  type PaymentMethod,
} from "@/types/accountTransaction";
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { TrendingUp, Tag, DollarSign, CreditCard, Calendar, FileText } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export function AddTransactionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState<TransactionCategory>("operational_cost");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be positive");
      return;
    }
    setIsSubmitting(true);
    const result = await createAccountTransaction({
      type,
      category,
      amount: Number(amount),
      paymentMethod,
      description: description || undefined,
      date: new Date(date),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setAmount("");
    setDescription("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add Transaction</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select value={type} onValueChange={(v) => v && setType(v as TransactionType)}>
                <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Category">
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v as TransactionCategory)}
              >
                <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (৳)" htmlFor="txn-amount">
              <div className="flex items-center gap-2 px-3">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="txn-amount"
                  type="number"
                  placeholder="0"
                  className={fieldInputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </FormField>

            <FormField label="Payment Method">
              <Select
                value={paymentMethod}
                onValueChange={(v) => v && setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Date" htmlFor="txn-date">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="txn-date"
                type="date"
                className={fieldInputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Description" htmlFor="txn-description" optional>
            <div className="flex items-center gap-2 px-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="txn-description"
                placeholder="e.g. Engine parts purchase"
                className={fieldInputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </FormField>

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
