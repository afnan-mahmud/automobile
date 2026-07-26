"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types/invoice";

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

export function InvoiceList({ initialInvoices }: { initialInvoices: InvoiceRow[] }) {
  const [tab, setTab] = useState<"all" | InvoiceStatus>("all");

  const filtered = useMemo(
    () => (tab === "all" ? initialInvoices : initialInvoices.filter((i) => i.status === tab)),
    [initialInvoices, tab]
  );

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        {INVOICE_STATUSES.map((status) => (
          <TabsTrigger key={status} value={status}>
            {STATUS_LABEL[status]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((invoice) => (
              <TableRow key={invoice._id}>
                <TableCell>
                  <Link
                    href={`/invoices/${invoice._id}`}
                    className="font-medium hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{invoice.customerId?.name ?? "—"}</TableCell>
                <TableCell>৳{invoice.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[invoice.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
