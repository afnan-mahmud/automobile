import { requirePageRole } from "@/lib/auth";
import { listInvoices } from "@/actions/invoices";
import { InvoiceList } from "./invoice-list";

export default async function InvoicesPage() {
  await requirePageRole(["admin", "manager"]);
  const invoices = await listInvoices("all");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Invoices</h2>
      <p className="text-sm text-muted-foreground">
        Invoices are generated from a job card&apos;s detail page.
      </p>
      <InvoiceList initialInvoices={invoices} />
    </div>
  );
}
