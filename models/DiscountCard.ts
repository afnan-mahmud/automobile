import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const discountCardSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    discountPercent: { type: Number, required: true },
    termsAndConditions: { type: String, trim: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

discountCardSchema.index({ customerId: 1 });

export type DiscountCardDoc = InferSchemaType<typeof discountCardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DiscountCard = models.DiscountCard || model("DiscountCard", discountCardSchema);
