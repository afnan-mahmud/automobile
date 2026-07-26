import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/auth";
import { getInvoiceById } from "@/actions/invoices";
import { InvoiceDetail } from "./invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const invoice = await getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice {invoice.invoiceNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            Customer: {invoice.customerId?.name} ({invoice.customerId?.phone})
          </p>
          <p>Order Card: {invoice.jobCardId?.jobCardNumber}</p>
        </CardContent>
      </Card>

      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
