import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { DEPARTMENTS } from "@/types/department";

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, enum: DEPARTMENTS, required: true },
    expectedCosting: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export type ServiceDoc = InferSchemaType<typeof serviceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Service = models.Service || model("Service", serviceSchema);
