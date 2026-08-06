import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { DEPARTMENTS } from "@/types/department";

const employeeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    designation: { type: String, trim: true },
    departments: [{ type: String, enum: DEPARTMENTS }],
    salaryType: { type: String, enum: ["daily", "monthly"], default: "monthly" },
    salaryAmount: { type: Number },
    hourlyRate: { type: Number, required: true },
    overtimeHourlyRate: { type: Number },
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
