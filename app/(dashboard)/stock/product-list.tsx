"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddProductDialog } from "./add-product-dialog";
import { StockActionDialog } from "./stock-action-dialog";

type ProductRow = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel?: number;
};

export function ProductList({ initialProducts }: { initialProducts: ProductRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddProductDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>In Stock</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No products yet.
              </TableCell>
            </TableRow>
          )}
          {initialProducts.map((product) => {
            const isLow =
              product.reorderLevel !== undefined &&
              product.quantityInStock <= product.reorderLevel;
            return (
              <TableRow key={product._id}>
                <TableCell>
                  <Link href={`/stock/${product._id}`} className="font-medium hover:underline">
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell className="capitalize">{product.category}</TableCell>
                <TableCell>৳{product.unitPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={isLow ? "font-semibold text-destructive" : ""}>
                    {product.quantityInStock}
                  </span>
                  {isLow && (
                    <Badge variant="outline" className="ml-2 border-destructive text-destructive">
                      Low Stock
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <StockActionDialog productId={product._id} productName={product.name} mode="purchase" />
                    <StockActionDialog productId={product._id} productName={product.name} mode="sell" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
