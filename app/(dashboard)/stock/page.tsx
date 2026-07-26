import { requirePageRole } from "@/lib/auth";
import { listProducts } from "@/actions/stock";
import { ProductList } from "./product-list";

export default async function StockPage() {
  await requirePageRole(["admin", "manager"]);
  const products = await listProducts();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Stock</h2>
      <ProductList initialProducts={products} />
    </div>
  );
}
