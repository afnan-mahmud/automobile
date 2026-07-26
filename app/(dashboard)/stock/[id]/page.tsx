import { notFound } from "next/navigation";
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
import { getProductById, getStockTransactions } from "@/actions/stock";

const TYPE_LABEL: Record<string, string> = {
  retail_sale: "Retail Sale",
  job_card_usage: "Order Card Usage",
  purchase_in: "Purchase In",
  adjustment: "Adjustment",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }
  const transactions = await getStockTransactions(id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>SKU: {product.sku}</p>
          <p>Category: {product.category}</p>
          <p>Unit Price: ৳{product.unitPrice.toFixed(2)}</p>
          <p>Current Stock: {product.quantityInStock}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((t: { _id: string; createdAt: string; type: string; quantity: number }) => (
                <TableRow key={t._id}>
                  <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABEL[t.type] ?? t.type}</Badge>
                  </TableCell>
                  <TableCell className={t.quantity < 0 ? "text-destructive" : "text-emerald-600"}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
