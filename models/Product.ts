import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { PRODUCT_CATEGORIES } from "@/types/product";

export { PRODUCT_CATEGORIES };
export type { ProductCategory } from "@/types/product";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    unitPrice: { type: Number, required: true },
    costPrice: { type: Number },
    quantityInStock: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number },
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Product = models.Product || model("Product", productSchema);
