import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const employeeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, trim: true },
    hourlyRate: { type: Number, required: true },
    requiredHoursPerDay: { type: Number, default: 8 },
    joinDate: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type EmployeeDoc = InferSchemaType<typeof employeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Employee = models.Employee || model("Employee", employeeSchema);
