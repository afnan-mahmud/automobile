"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Product, PRODUCT_CATEGORIES } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";
import { AccountTransaction, PAYMENT_METHODS } from "@/models/AccountTransaction";
import type { ActionResult } from "@/actions/customers";

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

const productInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.enum(PRODUCT_CATEGORIES),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional(),
  quantityInStock: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).optional(),
});

export async function createProduct(
  input: z.infer<typeof productInputSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  try {
    const product = await Product.create(parsed.data);
    revalidatePath("/stock");
    return { success: true, data: { id: product._id.toString() } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { success: false, error: "A product with this SKU already exists" };
    }
    throw err;
  }
}

const updateProductSchema = productInputSchema.partial().extend({
  id: z.string().min(1),
});

export async function updateProduct(
  input: z.infer<typeof updateProductSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { id, ...rest } = parsed.data;

  try {
    const updated = await Product.findByIdAndUpdate(id, rest, { new: true });
    if (!updated) {
      return { success: false, error: "Product not found" };
    }
    revalidatePath("/stock");
    revalidatePath(`/stock/${id}`);
    return { success: true, data: { id } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { success: false, error: "A product with this SKU already exists" };
    }
    throw err;
  }
}

const stockPurchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

export async function recordStockPurchase(
  input: z.infer<typeof stockPurchaseSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = stockPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const product = await Product.findByIdAndUpdate(
    parsed.data.productId,
    { $inc: { quantityInStock: parsed.data.quantity } },
    { new: true }
  );
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  await StockTransaction.create({
    productId: product._id,
    type: "purchase_in",
    quantity: parsed.data.quantity,
    createdBy: session.user.id,
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${parsed.data.productId}`);
  return { success: true, data: { id: product._id.toString() } };
}

const retailSaleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export async function recordRetailSale(
  input: z.infer<typeof retailSaleSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = retailSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  // Atomic conditional decrement: only succeeds if enough stock exists,
  // so concurrent sales can never push quantityInStock negative.
  const product = await Product.findOneAndUpdate(
    { _id: parsed.data.productId, quantityInStock: { $gte: parsed.data.quantity } },
    { $inc: { quantityInStock: -parsed.data.quantity } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findById(parsed.data.productId).lean();
    if (!existing) {
      return { success: false, error: "Product not found" };
    }
    return {
      success: false,
      error: `Insufficient stock for ${existing.name}: only ${existing.quantityInStock} available`,
    };
  }

  await StockTransaction.create({
    productId: product._id,
    type: "retail_sale",
    quantity: -parsed.data.quantity,
    createdBy: session.user.id,
  });

  await AccountTransaction.create({
    type: "income",
    category: "other",
    amount: product.unitPrice * parsed.data.quantity,
    paymentMethod: parsed.data.paymentMethod,
    description: `Retail sale: ${product.name} x${parsed.data.quantity}`,
    date: new Date(),
    createdBy: session.user.id,
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${parsed.data.productId}`);
  return { success: true, data: { id: product._id.toString() } };
}

export async function listProducts() {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const products = await Product.find().sort({ name: 1 }).lean();
  return serialize(products);
}

export async function getProductById(id: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const product = await Product.findById(id).lean();
  return product ? serialize(product) : null;
}

export async function getStockTransactions(productId: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const transactions = await StockTransaction.find({ productId })
    .sort({ createdAt: -1 })
    .lean();

  return serialize(transactions);
}
