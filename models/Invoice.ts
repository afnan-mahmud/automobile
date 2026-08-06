import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { INVOICE_STATUSES } from "@/types/invoice";

export { INVOICE_STATUSES };
export type { InvoiceStatus } from "@/types/invoice";

const lineItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const revisionSchema = new Schema(
  {
    version: { type: Number, required: true },
    lineItems: { type: [lineItemSchema], default: [] },
    total: { type: Number, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    jobCardId: { type: Schema.Types.ObjectId, ref: "JobCard", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    lineItems: { type: [lineItemSchema], default: [] },
    discountPercent: { type: Number, default: 0 },
    discountCardId: {
      type: Schema.Types.ObjectId,
      ref: "DiscountCard",
      default: null,
    },
    subtotal: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: { type: String, enum: INVOICE_STATUSES, default: "draft" },
    revisions: { type: [revisionSchema], default: [] },
  },
  { timestamps: true }
);

invoiceSchema.index({ jobCardId: 1 });
invoiceSchema.index({ discountCardId: 1, status: 1 });

export type InvoiceDoc = InferSchemaType<typeof invoiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Invoice = models.Invoice || model("Invoice", invoiceSchema);
