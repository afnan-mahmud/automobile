import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const vehicleSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    color: { type: String, trim: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ customerId: 1 });

export type VehicleDoc = InferSchemaType<typeof vehicleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Vehicle = models.Vehicle || model("Vehicle", vehicleSchema);
