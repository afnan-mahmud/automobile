import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { STOCK_TRANSACTION_TYPES } from "@/types/stockTransaction";

export { STOCK_TRANSACTION_TYPES };
export type { StockTransactionType } from "@/types/stockTransaction";

const stockTransactionSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    quantity: { type: Number, required: true },
    relatedJobCardId: { type: Schema.Types.ObjectId, ref: "JobCard", default: null },
    relatedInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ productId: 1 });
stockTransactionSchema.index({ relatedJobCardId: 1 });

export type StockTransactionDoc = InferSchemaType<typeof stockTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StockTransaction =
  models.StockTransaction || model("StockTransaction", stockTransactionSchema);
