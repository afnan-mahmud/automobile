import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

export const ROLES = ["admin", "manager", "technician"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = models.User || model("User", userSchema);
