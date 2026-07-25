import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

export type CustomerDoc = InferSchemaType<typeof customerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Customer = models.Customer || model("Customer", customerSchema);
