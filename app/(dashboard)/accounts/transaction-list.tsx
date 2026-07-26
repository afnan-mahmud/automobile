"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types/accountTransaction";
import { AddTransactionDialog } from "./add-transaction-dialog";

type TransactionRow = {
  _id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  date: string;
};

export function TransactionList({
  initialTransactions,
}: {
  initialTransactions: TransactionRow[];
}) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all");

  const filtered = useMemo(
    () =>
      paymentFilter === "all"
        ? initialTransactions
        : initialTransactions.filter((t) => t.paymentMethod === paymentFilter),
    [initialTransactions, paymentFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={paymentFilter}
          onValueChange={(v) => setPaymentFilter((v ?? "all") as PaymentMethod | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddTransactionDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No transactions found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((t) => (
            <TableRow key={t._id}>
              <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={t.type === "income" ? "secondary" : "outline"} className="capitalize">
                  {t.type}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{t.category.replace("_", " ")}</TableCell>
              <TableCell className={t.type === "income" ? "text-emerald-600" : "text-destructive"}>
                {t.type === "income" ? "+" : "-"}৳{t.amount.toFixed(2)}
              </TableCell>
              <TableCell className="capitalize">{t.paymentMethod.replace("_", " ")}</TableCell>
              <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
