import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt, Tag, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import { getDiscountCardById, getDiscountCardUsage } from "@/actions/discountCards";

export default async function DiscountCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const card = await getDiscountCardById(id);
  if (!card) {
    notFound();
  }

  const usage = await getDiscountCardUsage(id);
  const expired =
    !card.active || (card.validTo && new Date(card.validTo).getTime() < Date.now());

  return (
    <div className="space-y-6">
      <Link
        href="/discount-cards"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to discount cards
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <Tag className="size-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>{card.discountPercent}% Discount Card</CardTitle>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="size-3.5" />
                {card.customerId?.name ?? "Unassigned"}
                {card.customerId?.phone ? ` · ${card.customerId.phone}` : ""}
              </p>
            </div>
          </div>
          <Badge variant={expired ? "outline" : "success"}>
            {expired ? "Expired" : "Active"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Validity</p>
            <p className="mt-1 font-medium">
              {new Date(card.validFrom).toLocaleDateString()}
              {card.validTo
                ? ` — ${new Date(card.validTo).toLocaleDateString()}`
                : " — Indefinite"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Times used</p>
            <p className="mt-1 text-lg font-semibold">{usage.timesUsed}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total discount given
            </p>
            <p className="mt-1 text-lg font-semibold">
              ৳{usage.totalDiscountAmount.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {card.termsAndConditions && (
        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {card.termsAndConditions}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Receipt className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Not used yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usage appears here once an invoice using this card is marked paid
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{invoice.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      −৳{invoice.discountAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{invoice.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
