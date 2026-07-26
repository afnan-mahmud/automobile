import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const warrantyCardSchema = new Schema(
  {
    jobCardId: { type: Schema.Types.ObjectId, ref: "JobCard", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    cardNumber: { type: String, required: true, unique: true },
    coveredItems: { type: [String], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    terms: { type: String, trim: true },
  },
  { timestamps: true }
);

warrantyCardSchema.index({ jobCardId: 1 });

export type WarrantyCardDoc = InferSchemaType<typeof warrantyCardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WarrantyCard = models.WarrantyCard || model("WarrantyCard", warrantyCardSchema);
