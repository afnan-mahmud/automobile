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
import { createProduct } from "@/actions/stock";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/types/product";
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { Tag, Barcode, Layers, DollarSign, Package, AlertTriangle } from "lucide-react";

export function AddProductDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<ProductCategory>("part");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [quantityInStock, setQuantityInStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !sku.trim() || !unitPrice) {
      setError("Name, SKU, and unit price are required");
      return;
    }
    setIsSubmitting(true);
    const result = await createProduct({
      name,
      sku,
      category,
      unitPrice: Number(unitPrice),
      costPrice: costPrice ? Number(costPrice) : undefined,
      quantityInStock: Number(quantityInStock) || 0,
      reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add Product</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <FormField label="Product Name" htmlFor="prod-name">
            <div className="flex items-center gap-2 px-3">
              <Tag className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="prod-name"
                placeholder="e.g. Engine Oil Filter"
                className={fieldInputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="SKU" htmlFor="prod-sku">
              <div className="flex items-center gap-2 px-3">
                <Barcode className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="prod-sku"
                  placeholder="OIL-001"
                  className={fieldInputClass}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </FormField>

            <FormField label="Category" htmlFor="prod-category">
              <Select value={category} onValueChange={(v) => v && setCategory(v as ProductCategory)}>
                <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Unit Price (৳)" htmlFor="prod-unit-price">
              <div className="flex items-center gap-2 px-3">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="prod-unit-price"
                  type="number"
                  placeholder="0"
                  className={fieldInputClass}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
            </FormField>
            <FormField label="Cost Price (৳)" htmlFor="prod-cost-price" optional>
              <div className="flex items-center gap-2 px-3">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="prod-cost-price"
                  type="number"
                  placeholder="0"
                  className={fieldInputClass}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Initial Stock" htmlFor="prod-qty">
              <div className="flex items-center gap-2 px-3">
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="prod-qty"
                  type="number"
                  className={fieldInputClass}
                  value={quantityInStock}
                  onChange={(e) => setQuantityInStock(e.target.value)}
                />
              </div>
            </FormField>
            <FormField label="Reorder Level" htmlFor="prod-reorder" optional>
              <div className="flex items-center gap-2 px-3">
                <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="prod-reorder"
                  type="number"
                  placeholder="e.g. 5"
                  className={fieldInputClass}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </div>
            </FormField>
          </div>

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
