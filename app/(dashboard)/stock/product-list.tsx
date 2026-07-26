"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddProductDialog } from "./add-product-dialog";
import { StockActionDialog } from "./stock-action-dialog";
import { Package, Barcode, Tag, AlertTriangle, ShoppingCart, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductRow = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel?: number;
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  part: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", icon: "⚙️" },
  consumable: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", icon: "🧴" },
  accessory: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", icon: "🔧" },
  tool: { bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", icon: "🛠️" },
};
const DEFAULT_CAT = { bg: "bg-muted", text: "text-muted-foreground", icon: "📦" };

export function ProductList({ initialProducts }: { initialProducts: ProductRow[] }) {
  const lowStockCount = initialProducts.filter(
    (p) => p.reorderLevel !== undefined && p.quantityInStock <= p.reorderLevel
  ).length;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {initialProducts.length} product{initialProducts.length !== 1 ? "s" : ""}
          </span>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="size-3" />
              {lowStockCount} low stock
            </Badge>
          )}
        </div>
        <AddProductDialog />
      </div>

      {/* Empty state */}
      {initialProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Package className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No products yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first product to get started</p>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {initialProducts.map((product) => {
          const isLow =
            product.reorderLevel !== undefined &&
            product.quantityInStock <= product.reorderLevel;
          const catStyle = CATEGORY_STYLES[product.category] ?? DEFAULT_CAT;
          const stockPercent = product.reorderLevel
            ? Math.min(100, Math.round((product.quantityInStock / (product.reorderLevel * 3)) * 100))
            : null;

          return (
            <div
              key={product._id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                isLow && "border-destructive/30"
              )}
            >
              {/* Low stock top stripe */}
              {isLow && (
                <div className="h-1.5 w-full bg-gradient-to-r from-destructive to-orange-400" />
              )}
              {!isLow && (
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 to-primary/10" />
              )}

              <div className="flex flex-col gap-4 p-5">
                {/* Category badge + Low stock indicator */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize",
                      catStyle.bg,
                      catStyle.text
                    )}
                  >
                    <span>{catStyle.icon}</span>
                    {product.category}
                  </span>
                  {isLow && (
                    <Badge variant="destructive" className="gap-1 text-[10px] shrink-0">
                      <TrendingDown className="size-2.5" />
                      Low
                    </Badge>
                  )}
                </div>

                {/* Product name */}
                <div>
                  <Link
                    href={`/stock/${product._id}`}
                    className="text-sm font-semibold leading-snug hover:text-primary transition-colors"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Barcode className="size-3" />
                    {product.sku}
                  </div>
                </div>

                {/* Price + Stock stats */}
                <div className="grid grid-cols-2 divide-x rounded-xl border bg-muted/30">
                  <div className="flex flex-col items-center py-2.5">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <span className="text-sm font-semibold">৳{product.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center py-2.5">
                    <span className="text-xs text-muted-foreground">In Stock</span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isLow ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {product.quantityInStock}
                    </span>
                  </div>
                </div>

                {/* Stock level bar */}
                {stockPercent !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Stock level</span>
                      <span>{stockPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          stockPercent < 30
                            ? "bg-destructive"
                            : stockPercent < 60
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${stockPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="mt-auto flex items-center gap-2 border-t bg-muted/30 px-4 py-3">
                <StockActionDialog productId={product._id} productName={product.name} mode="purchase" />
                <StockActionDialog productId={product._id} productName={product.name} mode="sell" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
