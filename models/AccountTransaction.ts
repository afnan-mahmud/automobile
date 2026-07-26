import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { TRANSACTION_TYPES, TRANSACTION_CATEGORIES, PAYMENT_METHODS } from "@/types/accountTransaction";

export { TRANSACTION_TYPES, TRANSACTION_CATEGORIES, PAYMENT_METHODS };
export type {
  TransactionType,
  TransactionCategory,
  PaymentMethod,
} from "@/types/accountTransaction";

const accountTransactionSchema = new Schema(
  {
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    category: { type: String, enum: TRANSACTION_CATEGORIES, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    relatedInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

accountTransactionSchema.index({ date: 1 });
accountTransactionSchema.index({ type: 1 });

export type AccountTransactionDoc = InferSchemaType<typeof accountTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AccountTransaction =
  models.AccountTransaction || model("AccountTransaction", accountTransactionSchema);
